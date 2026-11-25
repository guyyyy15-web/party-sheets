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
  if (owner) headers['X-Owner'] = typeof owner === 'string' ? owner : ownerKey()
  let r
  try { r = await fetch(apiBase() + path, { method, headers, body: body ? JSON.stringify(body) : undefined }) } catch { throw new ApiError(0, 'offline') }
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new ApiError(r.status, j.error || `error ${r.status}`), { body: j })
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
  window.dispatchEvent(new Event('ps-rooms'))
  return next.find((x) => x.id === r.id)
}
/** Groups from a backup file: added when this phone doesn't know them yet. */
export function restoreRooms(list) { for (const r of list) if (!roomById(r.id)) keepRoom({ id: r.id, name: r.name, playerKey: r.playerKey, dmKey: r.dmKey, initKey: r.initKey }) }
export const forgetRoom = (id) => { setSetting('rooms', listRooms().filter((r) => r.id !== id)); window.dispatchEvent(new Event('ps-rooms')) }
const roomKey = (r) => r.dmKey || r.playerKey

export async function createRoom(name) {
  const j = await api('/rooms', { method: 'POST', body: { name } })
  return keepRoom({ id: j.room.id, name: j.room.name, playerKey: j.playerKey, dmKey: j.dmKey, createdHere: true })
}
/** Opening an invite or DM link: check it with the server, then remember the room. */
export async function joinRoom({ kind, roomId, key }) {
  const j = await api(`/rooms/${roomId}`, { key })
  if (kind === 'dm' && j.role !== 'dm') throw new ApiError(403, 'not a DM link')
  if (kind === 'init' && j.role !== 'init' && j.role !== 'dm') throw new ApiError(403, 'not an Initiative link')
  return keepRoom({ id: roomId, name: j.room.name, settings: j.room.settings || {}, ...(kind === 'dm' ? { dmKey: key } : kind === 'init' ? { initKey: key } : { playerKey: key }) })
}
const page = () => location.href.split('#')[0]
// each kind of link opens through its own little page (join.html, dm.html, initiative.html) for its own link preview
const dir = () => page().split('?')[0].replace(/[^/]*$/, '')
export const inviteLink = (r) => (r.playerKey ? `${dir()}join.html#/join/${r.id}.${r.playerKey}` : null)
export const dmLink = (r) => (r.dmKey ? `${dir()}dm.html#/dm/${r.id}.${r.dmKey}` : null)
export const initLink = (r) => (r.initKey ? `${dir()}initiative.html#/init/${r.id}.${r.initKey}` : null)
/** The DM makes (or remakes: the old one stops working) the group's Initiative link. */
export const makeInitLink = (r) => api(`/rooms/${r.id}/init-link`, { method: 'POST', key: r.dmKey }).then((j) => keepRoom({ id: r.id, initKey: j.initKey }))

// ── the group's fight (initiative)
/** The key that runs the fight on this phone: the Initiative link's, or the DM's. */
export const runKey = (r) => r?.initKey || r?.dmKey || null
export const fetchEncounter = (r, key = runKey(r) || r.playerKey) => api(`/rooms/${r.id}/encounter`, { key })
/** Replace the fight; `rev` = the version last seen. A 409 carries the current one ({ rev, data }). */
export const putEncounter = (r, data, rev) => api(`/rooms/${r.id}/encounter`, { method: 'PUT', key: runKey(r), body: { data, rev } })
/** A player's own initiative (or the runner's for anyone). */
export const sendInitiative = (r, characterId, total) => api(`/rooms/${r.id}/encounter/initiative`, { method: 'POST', key: runKey(r) || r.playerKey, owner: true, body: { characterId, total } })
/** A player's damage to someone in the fight: applied at once or waiting for the runner ({ applied, data }). */
export const sendClaim = (r, characterId, target, amount, label, extra) => api(`/rooms/${r.id}/encounter/claim`, { method: 'POST', key: r.playerKey || runKey(r), owner: true, body: { characterId, target, amount, label, ...(extra || {}) } })
/** A spell on a party member: the buff goes on their sheet (the caster's owner key proves it's ours). */
export const sendBuff = (r, casterCh, targetId, buff) => api(`/rooms/${r.id}/characters/${targetId}/buffs`, { method: 'POST', key: r.playerKey || roomKey(r), owner: keyOf(casterCh), body: { buff } })
/** The caster's concentration ended (or "End"): take their buffs off a target. */
export const endBuffs = (r, casterCh, targetId, { spell, conc = true } = {}) => api(`/rooms/${r.id}/characters/${targetId}/buffs?from=${encodeURIComponent(casterCh.id)}${conc ? '&conc=1' : ''}${spell ? `&spell=${encodeURIComponent(spell)}` : ''}`, { method: 'DELETE', key: r.playerKey || roomKey(r), owner: keyOf(casterCh) })
/** HP / conditions / death saves of a character, by the DM or the initiative runner. */
export const runnerPatch = (r, charId, state) => api(`/rooms/${r.id}/characters/${charId}`, { method: 'PATCH', key: runKey(r), body: { state } })

/** The room as its members see it: the DM gets every full sheet, a player gets the party list. */
export async function fetchRoom(r, asDm) {
  const j = await api(`/rooms/${r.id}`, { key: asDm ? (asDm === 'run' ? runKey(r) : r.dmKey) : r.playerKey || r.dmKey || r.initKey })
  if (j.room.name !== r.name || JSON.stringify(j.room.settings || {}) !== JSON.stringify(r.settings || {})) keepRoom({ id: r.id, name: j.room.name, settings: j.room.settings || {} })
  return j
}
/** The DM deletes the group for everyone (characters stay saved, in no group); then this phone forgets it. */
export const deleteRoom = (r) => api(`/rooms/${r.id}`, { method: 'DELETE', key: r.dmKey }).then(() => forgetRoom(r.id))
/** The DM changes the group's name or settings (e.g. expansions on/off). */
export const updateRoom = (r, body) => api(`/rooms/${r.id}`, { method: 'PATCH', key: r.dmKey, body }).then((j) => keepRoom({ id: r.id, name: j.room.name, settings: j.room.settings || {} }))
/** Expansion subclasses: the group's DM decides; a character in no group follows this phone's table setting. */
export const expansionsAllowed = (ch) => { const r = ch?.roomId && roomById(ch.roomId); return r ? !!r.settings?.expansions : !!getSetting('table', {}).expansions }
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

/** The key that proves a character is ours: the phone's own, or the one it was restored with. */
const keyOf = (ch) => ch?.ownerKey || ownerKey()

/** Put a character in a group (it's already saved on the server; this links it to the group). */
export async function shareCharacter(ch, r) {
  const j = await api(`/rooms/${r.id}/characters/${ch.id}`, { method: 'PUT', key: r.playerKey || r.dmKey, owner: keyOf(ch), body: { patch: shareable(ch) } })
  setBase(ch.id, j.data, j.rev)
  setStatus(ch.id, { state: 'ok' })
  return { ...ch, roomId: r.id }
}
/** Take it out of its group. It stays saved, on this phone and on the server. */
export async function unshareCharacter(ch) {
  const r = roomById(ch.roomId)
  if (r) { try { await api(`/rooms/${r.id}/characters/${ch.id}`, { method: 'DELETE', key: roomKey(r), owner: keyOf(ch) }) } catch (e) { if (e.status !== 0 && e.status !== 404) throw e } }
  const { roomId, ...rest } = ch
  return rest
}
/** The character was deleted: delete it from the server too (best effort; offline it stays there). */
export async function deleteRemote(ch) {
  setBase(ch.id, null)
  delete status[ch.id]
  try { await api(`/me/characters/${ch.id}`, { method: 'DELETE', owner: keyOf(ch) }) } catch { /* offline: nothing more to do */ }
}

/** Something changed and isn't on the server yet. */
export const markPending = (id) => { if (status[id]?.state !== 'sending') setStatus(id, { state: 'pending' }) }

/** This phone's "cloud key" link: open it on another phone to bring every character back from the server. */
export const restoreLink = () => `${page()}#/restore/${ownerKey()}`
/** Bring back every character saved under a cloud key. Returns the characters to save on this phone. */
export async function restoreFrom(key) {
  const j = await api('/me/characters', { owner: key })
  return j.characters.map((c) => {
    setBase(c.id, c.data, c.rev)
    setStatus(c.id, { state: 'ok' })
    return { ...c.data, id: c.id, ...(c.roomId ? { roomId: c.roomId } : {}), ...(key !== ownerKey() ? { ownerKey: key } : {}) }
  })
}

const busy = new Set()
/**
 * Save one character on the server, and pick up changes made elsewhere (the DM's quick actions). One request:
 * send what changed since the last copy both agreed on, or, with nothing to send, fetch the server copy.
 * `latest()` returns this phone's newest copy (it may change while we wait). Returns the character to save here,
 * or null when nothing changed here.
 */
export async function syncCharacter(id, latest) {
  if (busy.has(id)) return null
  const sent = latest()
  if (!sent) return null
  busy.add(id)
  const owner = keyOf(sent)
  try {
    const b = getBase(id)
    let server, rev, roomId
    if (!b) {
      // the first save: the whole character
      setStatus(id, { state: 'sending' })
      const j = await api(`/me/characters/${id}`, { method: 'PUT', owner, body: { patch: shareable(sent) } })
      server = j.data; rev = j.rev; roomId = j.roomId
    } else {
      const patch = diff(sent, b)
      if (!isEmpty(patch)) {
        setStatus(id, { state: 'sending' })
        const j = await api(`/me/characters/${id}`, { method: 'PUT', owner, body: { patch } })
        server = j.data; rev = j.rev; roomId = j.roomId
      } else {
        const j = await api(`/me/characters/${id}`, { owner })
        roomId = j.roomId
        if (j.rev === b._rev) { setStatus(id, { state: 'ok' }); return null }
        server = j.data; rev = j.rev
      }
    }
    setBase(id, server, rev)
    setStatus(id, { state: 'ok' })
    const now = latest() || sent
    const next = { ...mergePatch(server, diff(now, sent)), id }
    for (const k of ['draft', 'wizardStep', 'ownerKey']) if (k in now) next[k] = now[k]
    if (roomId) next.roomId = roomId // the server knows which group it's in (joined or left on another phone, or by the owner's admin)
    return !isEmpty(diff(next, now)) || now.roomId !== next.roomId ? next : null
  } catch (e) {
    if (e.status === 0) setStatus(id, { state: 'offline' })
    else if (e.status === 403) setStatus(id, { state: 'error', msg: 'Saved under another cloud key. Open that phone\'s cloud key link here to take it over.' })
    else if (e.status === 404) { setBase(id, null); setStatus(id, { state: 'pending' }) } // gone from the server: the next sync saves it again
    else if (e.status === 507) setStatus(id, { state: 'error', msg: 'The server holds up to 50 characters per player.' })
    else setStatus(id, { state: 'error', msg: e.message })
    return null
  } finally { busy.delete(id) }
}
