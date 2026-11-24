// Characters live in IndexedDB on this phone (localStorage as a fallback). A backup file brings them anywhere.
import { makeBackup, parseBackup as parseKatsebushi } from '../dice.js'

const DB = 'party-sheets', STORE = 'characters'
let dbp = null
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' })
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  }).catch(() => null)
  return dbp
}
const LS = 'ps.characters'
const lsAll = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]') } catch { return [] } }
const lsSet = (list) => { try { localStorage.setItem(LS, JSON.stringify(list)) } catch { /* full or blocked */ } }

export async function allCharacters() {
  const d = await db()
  if (!d) return lsAll()
  return new Promise((res) => {
    const r = d.transaction(STORE).objectStore(STORE).getAll()
    r.onsuccess = () => res(r.result.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)))
    r.onerror = () => res(lsAll())
  })
}
export async function saveCharacter(ch) {
  const next = { ...ch, updatedAt: new Date().toISOString() }
  const d = await db()
  if (!d) { lsSet([next, ...lsAll().filter((c) => c.id !== ch.id)]); return next }
  await new Promise((res) => { const t = d.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(next); t.oncomplete = res; t.onerror = res })
  return next
}
export async function deleteCharacter(id) {
  const d = await db()
  if (!d) return lsSet(lsAll().filter((c) => c.id !== id))
  await new Promise((res) => { const t = d.transaction(STORE, 'readwrite'); t.objectStore(STORE).delete(id); t.oncomplete = res; t.onerror = res })
}

// ---------- settings (small, per phone) ----------
export const getSetting = (k, fallback) => { try { const v = localStorage.getItem(`ps.${k}`); return v == null ? fallback : JSON.parse(v) } catch { return fallback } }
export const setSetting = (k, v) => { try { localStorage.setItem(`ps.${k}`, JSON.stringify(v)) } catch { /* ignore */ } }

// ---------- backups ----------
export const BACKUP_KIND = 'party-sheets-backup'
export const backupText = (chars, rooms = []) => JSON.stringify({ kind: BACKUP_KIND, v: 1, exportedAt: new Date().toISOString(), characters: chars, rooms }, null, 1)
export const backupName = () => `party-sheets-${new Date().toISOString().slice(0, 10)}.json`

/** A backup file's text → characters to add (new ids, nothing overwritten). Throws a readable error. */
export function parseBackupFile(text) {
  let j
  try { j = JSON.parse(text) } catch { throw new Error("This file isn't a Party Sheets backup.") }
  if (j?.kind === 'katsebushi-backup') {
    parseKatsebushi(text) // validates
    throw new Error('This is a Katsebushi backup. Build Katsebushi in the wizard (Monk, Open Hand): the old sheet has no species or background to bring over.')
  }
  if (j?.kind !== BACKUP_KIND || !Array.isArray(j.characters)) throw new Error("This file isn't a Party Sheets backup.")
  const list = j.characters.filter((c) => c && typeof c === 'object' && c.v === 1 && typeof c.name === 'string' && c.scores)
  if (!list.length) throw new Error('No characters in this file.')
  // an imported character is a new copy: it isn't in any group until brought into one
  return list.map(({ roomId, ...c }) => ({ ...c, id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}` }))
}
/** The groups (with their links) saved in a backup file. */
export function backupRooms(text) {
  try { const j = JSON.parse(text); return Array.isArray(j?.rooms) ? j.rooms.filter((r) => r && /^[A-Za-z0-9_-]{6,40}$/.test(r.id) && typeof r.name === 'string' && (r.playerKey || r.dmKey || r.initKey)) : [] } catch { return [] }
}

/** Shares the file (iPhone share sheet) or downloads it. */
export async function shareFile(text, name) {
  const file = new File([text], name, { type: 'application/json' })
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); return 'shared' }
  } catch (e) { if (e?.name === 'AbortError') return 'cancelled' }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  return 'downloaded'
}

/** A photo → a small square JPEG data URL (the portrait). */
export function shrinkImage(file, size = 320) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = size
      const s = Math.min(img.width, img.height), g = c.getContext('2d')
      g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
      URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = rej
    img.src = URL.createObjectURL(file)
  })
}
export { makeBackup }
