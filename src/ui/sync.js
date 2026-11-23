// Rooms on the phone: the groups this phone knows (with their keys), and syncing shared characters with the server.
// A character in a room syncs in one request: send what changed since the last agreed copy (PUT, the answer is the
// merged server copy), or, with nothing to send, fetch the server copy (it may carry the DM's quick actions).
import { getSetting, setSetting } from './store.js'
import { diff, isEmpty, mergePatch, shareable } from '../sync-core.js'

const PROD = 'https://party-sheets-sync.guyyyy15-web.workers.dev'
export const apiBase = () => getSetting('api', PROD)

const randomKey = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
/** This phone's secret owner key: proves a shared character is ours. Kept in backups so a restored phone can still write. */
export function ownerKey() {
  let k = getSetting('owner', null)
  if (!k) { k = randomKey(); setSetting('owner', k) }
  return k
}

export class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status } }
async function api(path, { method = 'GET', key, owner, body } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (key) headers.Authorization = `Bearer ${key}`
  if (owner) headers['X-Owner'] = ownerKey()
  let r
  try { r = await fetch(apiBase() + path, { method, headers, body: body ? JSON.stringify(body) : undefined }) } catch { throw new ApiError(0, 'offline') }
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new ApiError(r.status, j.error || `error ${r.status}`)
  return j
}

// ── rooms this phone knows: [{ id, name, playerKey, dmKey? }]
export const listRooms = () => getSetting('rooms', [])
export const roomById = (id) => listRooms().find((r) => r.id === id) || null
function keepRoom(r) {
  const list = listRooms()
  const old = list.find((x) => x.id === r.id)
  const next = old ? list.map((x) => (x.id === r.id ? { ...x, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v != null)) } : x)) : [...list, r]
  setSetting('rooms', next)
  return next.find((x) => x.id === r.id)
}
/** Groups from a backup file: added when this phone doesn't know them yet. */
export function restoreRooms(list) { for (const r of list) if (!roomById(r.id)) keepRoom({ id: r.id, name: r.name, playerKey: r.playerKey, dmKey: r.dmKey }) }
export const forgetRoom = (id) => setSetting('rooms', listRooms().filter((r) => r.id !== id))
const roomKey = (r) => r.dmKey || r.playerKey

export async function createRoom(name) {
  const j = await api('/rooms', { method: 'POST', body: { name } })
  return keepRoom({ id: j.room.id, name: j.room.name, playerKey: j.playerKey, dmKey: j.dmKey, createdHere: true })
}
/** Opening an invite or DM link: check it with the server, then remember the room. */
export async function joinRoom({ kind, roomId, key }) {
  const j = await api(`/rooms/${roomId}`, { key })
  if (kind === 'dm' && j.role !== 'dm') throw new ApiError(403, 'not a DM link')
  return keepRoom({ id: roomId, name: j.room.name, ...(kind === 'dm' ? { dmKey: key } : { playerKey: key }) })
}
const page = () => location.href.split('#')[0]
export const inviteLink = (r) => (r.playerKey ? `${page()}#/join/${r.id}.${r.playerKey}` : null)
export const dmLink = (r) => (r.dmKey ? `${page()}#/dm/${r.id}.${r.dmKey}` : null)

/** The room as its members see it: the DM gets every full sheet, a player gets the party list. */
export async function fetchRoom(r, asDm) {
  const j = await api(`/rooms/${r.id}`, { key: asDm ? r.dmKey : r.playerKey || r.dmKey })
  if (j.room.name !== r.name) keepRoom({ id: r.id, name: j.room.name })
  return j
}
export const renameRoom = (r, name) => api(`/rooms/${r.id}`, { method: 'PATCH', key: r.dmKey, body: { name } }).then((j) => keepRoom({ id: r.id, name: j.room.name }))
/** DM quick actions: HP, temp HP, conditions, inspiration, exhaustion, death saves. */
export const dmPatch = (r, charId, state) => api(`/rooms/${r.id}/characters/${charId}`, { method: 'PATCH', key: r.dmKey, body: { state } })

// ── the last copy this phone and the server agreed on, per character (to know what changed since)
const baseKey = (id) => `base.${id}`
const getBase = (id) => getSetting(baseKey(id), null)
const setBase = (id, data, rev) => setSetting(baseKey(id), data ? { ...data, _rev: rev } : null)

// ── sync status, for the little cloud badge
const status = {}
const listeners = new Set()
export const syncStatus = (id) => status[id] || null
export function onSyncStatus(fn) { listeners.add(fn); return () => listeners.delete(fn) }
const setStatus = (id, s) => { status[id] = { ...s, at: Date.now() }; listeners.forEach((f) => f(id)) }

/** Put a character in a room (the first write claims it for this phone). Returns the character to save. */
export async function shareCharacter(ch, r) {
  const j = await api(`/rooms/${r.id}/characters/${ch.id}`, { method: 'PUT', key: r.playerKey || r.dmKey, owner: true, body: { patch: shareable(ch) } })
  setBase(ch.id, j.data, j.rev)
  setStatus(ch.id, { state: 'ok' })
  return { ...ch, roomId: r.id }
}
/** Take it out of its room (it stays on this phone). Works offline too: the server copy just stays. */
export async function unshareCharacter(ch) {
  const r = roomById(ch.roomId)
  if (r) { try { await api(`/rooms/${r.id}/characters/${ch.id}`, { method: 'DELETE', key: roomKey(r), owner: true }) } catch (e) { if (e.status !== 0 && e.status !== 404) throw e } }
  setBase(ch.id, null)
  delete status[ch.id]
  const { roomId, ...rest } = ch
  return rest
}

const busy = new Set()
/**
 * Sync one shared character. `latest()` returns this phone's newest copy (it may change while we wait). Returns the
 * character to save, or null when nothing changed here.
 */
export async function syncCharacter(id, latest) {
  if (busy.has(id)) return null
  const sent = latest()
  const r = sent && roomById(sent.roomId)
  if (!r) { if (sent?.roomId) setStatus(id, { state: 'error', msg: 'This phone doesn\'t have the group\'s link. Open the invite link again.' }); return null }
  busy.add(id)
  try {
    const b = getBase(id)
    if (!b) { await shareCharacter(sent, r); return null }
    const patch = diff(sent, b)
    let server, rev
    if (!isEmpty(patch)) {
      setStatus(id, { state: 'sending' })
      const j = await api(`/rooms/${r.id}/characters/${id}`, { method: 'PUT', key: r.playerKey || r.dmKey, owner: true, body: { patch } })
      server = j.data; rev = j.rev
    } else {
      const j = await api(`/rooms/${r.id}/characters/${id}`, { key: r.playerKey || r.dmKey, owner: true })
      if (j.rev === b._rev) { setStatus(id, { state: 'ok' }); return null }
      server = j.data; rev = j.rev
    }
    setBase(id, server, rev)
    setStatus(id, { state: 'ok' })
    const now = latest() || sent
    const next = { ...mergePatch(server, diff(now, sent)), id, roomId: r.id }
    for (const k of ['draft', 'wizardStep']) if (k in now) next[k] = now[k]
    return isEmpty(diff(next, now)) ? null : next
  } catch (e) {
    if (e.status === 0) setStatus(id, { state: 'offline' })
    else if (e.status === 403) setStatus(id, { state: 'error', msg: 'The group copy belongs to another phone. Leave the group and join it again.' })
    else if (e.status === 404) setStatus(id, { state: 'error', msg: e.message === 'no such room' ? 'This group no longer exists.' : 'Not in the group any more. Leave and join again.' })
    else setStatus(id, { state: 'error', msg: e.message })
    return null
  } finally { busy.delete(id) }
}
