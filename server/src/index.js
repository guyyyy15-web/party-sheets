// Party Sheets rooms: a Cloudflare Worker + D1. A room is one playing group. Its invite link carries a player key,
// its DM link a DM key; the server keeps only SHA-256 hashes of both. Characters belong to one room; only their
// owner (a device key) writes them, and the DM may apply quick actions (HP, temp HP, conditions, inspiration,
// exhaustion). Characters are stored as plain JSON (the owner chose no encryption). Request bodies are never logged.

export const LIMITS = {
  roomName: 60,
  characterBytes: 256 * 1024, // a character with a small portrait
  charactersPerRoom: 12,
  roomsPerClientPerHour: 10,
  writesPerClientPerMinute: 120,
  totalRooms: 5000,
}
const ID = /^[A-Za-z0-9_-]{6,40}$/
const KEY = /^[A-Za-z0-9_-]{24,64}$/
const DM_STATE_KEYS = ['hp', 'temp', 'conditions', 'inspiration', 'exhaustion', 'deathSaves']

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env)
    const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', ...cors }
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    try {
      const res = await route(req, env)
      for (const [k, v] of Object.entries(headers)) res.headers.set(k, v)
      return res
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status, headers)
      console.error(`${req.method} ${new URL(req.url).pathname}: ${err?.stack || err}`)
      return json({ error: 'server error' }, 500, headers)
    }
  },
}

class HttpError extends Error { constructor(status, message) { super(message); this.status = status } }
const fail = (status, message) => { throw new HttpError(status, message) }
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || ''
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
  const local = env.ALLOW_LOCALHOST === '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  if (!allowed.includes(origin) && !local) return {}
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Owner', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
}

async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
const randomKey = (bytes = 24) => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }

async function readJson(req, max) {
  const text = await req.text()
  if (text.length > max) fail(413, 'too large')
  try { return JSON.parse(text) } catch { fail(400, 'bad json') }
}

async function limit(env, req, kind, max, windowMs) {
  const ip = req.headers.get('CF-Connecting-IP') || 'local'
  const win = Math.floor(Date.now() / windowMs)
  const key = `${kind}:${(await sha256(`${Math.floor(Date.now() / 864e5)}:${ip}`)).slice(0, 32)}`
  const n = await env.DB.prepare('INSERT INTO rate_limits (key, window, count) VALUES (?, ?, 1) ON CONFLICT (key, window) DO UPDATE SET count = count + 1 RETURNING count').bind(key, win).first('count')
  if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM rate_limits WHERE window < ?').bind(win - 2).run()
  if (n > max) fail(429, 'too many requests')
}

const today = () => new Date().toISOString().slice(0, 10)
/** Daily usage counters for the owner's admin screen. Writes only, never request content. */
async function count(env, kind) {
  try { await env.DB.prepare('INSERT INTO usage (day, kind, count) VALUES (?, ?, 1) ON CONFLICT (day, kind) DO UPDATE SET count = count + 1').bind(today(), kind).run() } catch { /* never fail a request over a counter */ }
}

/** Who is calling for this room: 'dm', 'player', or an error. Bearer key = the player or the DM key. */
async function roleIn(env, req, roomId) {
  if (!ID.test(roomId || '')) fail(400, 'bad room')
  const room = await env.DB.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first()
  if (!room) fail(404, 'no such room')
  const key = (req.headers.get('Authorization') || '').replace(/^Bearer /, '')
  if (!KEY.test(key)) fail(401, 'no key')
  const h = await sha256(key)
  if (same(h, room.dm_hash)) return { room, role: 'dm' }
  if (same(h, room.player_hash)) return { room, role: 'player' }
  fail(403, 'wrong key')
}
const ownerHash = async (req) => {
  const o = req.headers.get('X-Owner') || ''
  if (!KEY.test(o)) fail(401, 'no owner key')
  return sha256(o)
}
const roomSettings = (r) => { try { return JSON.parse(r.settings || '{}') } catch { return {} } }
const publicRoom = (r) => ({ id: r.id, name: r.name, settings: roomSettings(r) })

async function route(req, env) {
  const url = new URL(req.url)
  const p = url.pathname
  const m = req.method
  if (p === '/' || p === '/health') return json({ ok: true, service: 'party-sheets-sync' })

  // ── the owner's admin screen. The first password set becomes the admin's (only its hash is kept); then it's locked.
  if (p === '/admin/claim' && m === 'POST') {
    await limit(env, req, 'admin', 10, 3600e3)
    const body = await readJson(req, 512)
    const key = String(body?.key || '')
    if (key.length < 12 || key.length > 200) fail(400, 'password: 12 characters or more')
    const done = await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('admin_hash', ?) ON CONFLICT (key) DO NOTHING RETURNING key").bind(await sha256(`admin:${key}`)).first('key')
    if (!done) fail(409, 'the admin password is already set')
    return json({ ok: true }, 201)
  }
  if (p.startsWith('/admin/')) {
    await limit(env, req, 'admin', 120, 3600e3)
    const stored = await env.DB.prepare("SELECT value FROM settings WHERE key = 'admin_hash'").first('value')
    if (!stored) fail(404, 'no admin yet')
    const key = (req.headers.get('Authorization') || '').replace(/^Bearer /, '')
    if (!key || !same(await sha256(`admin:${key}`), stored)) fail(403, 'wrong admin password')
    if (p === '/admin/stats' && m === 'GET') return json(await adminStats(env))
    const dm = /^\/admin\/rooms\/([A-Za-z0-9_-]+)$/.exec(p)
    if (dm && m === 'DELETE') { await env.DB.prepare('DELETE FROM characters WHERE room_id = ?').bind(dm[1]).run(); await env.DB.prepare('DELETE FROM rooms WHERE id = ?').bind(dm[1]).run(); return json({ ok: true }) }
    fail(404, 'not found')
  }

  // Create a room: returns the two keys once (the links carry them; the server keeps hashes).
  if (p === '/rooms' && m === 'POST') {
    await limit(env, req, 'rooms', LIMITS.roomsPerClientPerHour, 3600e3)
    const body = await readJson(req, 1024)
    const name = String(body?.name || '').trim().slice(0, LIMITS.roomName)
    if (!name) fail(400, 'name required')
    const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM rooms').first('n')
    if (total >= LIMITS.totalRooms) fail(507, 'no more rooms')
    const id = randomKey(9), playerKey = randomKey(), dmKey = randomKey()
    const now = Date.now()
    await env.DB.prepare('INSERT INTO rooms (id, name, player_hash, dm_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, name, await sha256(playerKey), await sha256(dmKey), now, now).run()
    await count(env, 'room_created')
    return json({ room: { id, name }, playerKey, dmKey }, 201)
  }

  const rm = /^\/rooms\/([A-Za-z0-9_-]+)$/.exec(p)
  if (rm && m === 'GET') {
    // the room and its characters: the DM gets full sheets, players a party summary (name, class, level, owner's portrait)
    const { room, role } = await roleIn(env, req, rm[1])
    const rows = (await env.DB.prepare('SELECT id, data, rev, updated_at FROM characters WHERE room_id = ? ORDER BY updated_at DESC').bind(room.id).all()).results
    const characters = rows.map((r) => {
      const data = JSON.parse(r.data)
      return role === 'dm' ? { id: r.id, rev: r.rev, updatedAt: r.updated_at, data } : { id: r.id, rev: r.rev, name: data.name, classId: data.classId, level: data.level, speciesId: data.speciesId, portrait: data.portrait?.kind === 'icon' ? data.portrait : null }
    })
    return json({ room: publicRoom(room), role, characters })
  }
  if (rm && m === 'PATCH') {
    const { room, role } = await roleIn(env, req, rm[1])
    if (role !== 'dm') fail(403, 'DM only')
    const body = await readJson(req, 1024)
    const name = body?.name == null ? room.name : String(body.name).trim().slice(0, LIMITS.roomName)
    if (!name) fail(400, 'name required')
    const settings = { ...roomSettings(room) }
    if (body?.settings && typeof body.settings === 'object') { if ('expansions' in body.settings) settings.expansions = !!body.settings.expansions }
    await env.DB.prepare('UPDATE rooms SET name = ?, settings = ?, updated_at = ? WHERE id = ?').bind(name, JSON.stringify(settings), Date.now(), room.id).run()
    return json({ room: { id: room.id, name, settings } })
  }

  const cm = /^\/rooms\/([A-Za-z0-9_-]+)\/characters\/([A-Za-z0-9_-]+)$/.exec(p)
  if (cm) {
    const { room, role } = await roleIn(env, req, cm[1])
    const id = cm[2]
    if (!ID.test(id)) fail(400, 'bad id')
    const row = await env.DB.prepare('SELECT * FROM characters WHERE id = ?').bind(id).first()
    if (row && row.room_id !== room.id) fail(409, 'character is in another room')

    if (m === 'GET') {
      if (!row) fail(404, 'no such character')
      if (role !== 'dm' && !same(await ownerHash(req), row.owner_hash)) fail(403, 'not yours')
      return json({ id, rev: row.rev, data: JSON.parse(row.data) })
    }

    if (m === 'PUT') {
      // the owner writes: the first write claims it; later writes merge changed fields (top level, and inside state)
      await limit(env, req, 'writes', LIMITS.writesPerClientPerMinute, 60e3)
      const owner = await ownerHash(req)
      const body = await readJson(req, LIMITS.characterBytes + 1024)
      const patch = body?.patch
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) fail(400, 'patch required')
      if (row) {
        if (!same(owner, row.owner_hash)) fail(403, 'not yours')
        const data = mergePatch(JSON.parse(row.data), patch)
        data.id = id
        const text = JSON.stringify(data)
        if (text.length > LIMITS.characterBytes) fail(413, 'character too large')
        const rev = await env.DB.prepare('UPDATE characters SET data = ?, rev = rev + 1, updated_at = ? WHERE id = ? RETURNING rev').bind(text, Date.now(), id).first('rev')
        await count(env, 'player_write')
        return json({ id, rev, data })
      }
      const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM characters WHERE room_id = ?').bind(room.id).first('n')
      if (n >= LIMITS.charactersPerRoom) fail(507, 'room is full')
      const data = { ...patch, id }
      if (typeof data.name !== 'string' || !data.scores) fail(400, 'not a character')
      const text = JSON.stringify(data)
      if (text.length > LIMITS.characterBytes) fail(413, 'character too large')
      await env.DB.prepare('INSERT INTO characters (id, room_id, owner_hash, data, rev, updated_at) VALUES (?, ?, ?, ?, 1, ?)').bind(id, room.id, owner, text, Date.now()).run()
      await count(env, 'character_joined')
      return json({ id, rev: 1, data }, 201)
    }

    if (m === 'PATCH') {
      // DM quick actions: only these state fields
      if (role !== 'dm') fail(403, 'DM only')
      if (!row) fail(404, 'no such character')
      await limit(env, req, 'writes', LIMITS.writesPerClientPerMinute, 60e3)
      const body = await readJson(req, 4096)
      const st = body?.state
      if (!st || typeof st !== 'object') fail(400, 'state required')
      const clean = {}
      for (const k of DM_STATE_KEYS) if (k in st) clean[k] = st[k]
      if (!Object.keys(clean).length) fail(400, 'nothing the DM may change')
      if ('hp' in clean && !(Number.isInteger(clean.hp) && clean.hp >= 0 && clean.hp <= 999)) fail(400, 'bad hp')
      if ('temp' in clean && !(Number.isInteger(clean.temp) && clean.temp >= 0 && clean.temp <= 999)) fail(400, 'bad temp')
      if ('exhaustion' in clean && !(Number.isInteger(clean.exhaustion) && clean.exhaustion >= 0 && clean.exhaustion <= 6)) fail(400, 'bad exhaustion')
      if ('conditions' in clean && !(Array.isArray(clean.conditions) && clean.conditions.length <= 20 && clean.conditions.every((c) => typeof c === 'string' && c.length <= 20))) fail(400, 'bad conditions')
      if ('deathSaves' in clean) { const d = clean.deathSaves; if (!(d && [d.ok, d.fail].every((n) => Number.isInteger(n) && n >= 0 && n <= 3))) fail(400, 'bad death saves'); clean.deathSaves = { ok: d.ok, fail: d.fail } }
      if ('inspiration' in clean) clean.inspiration = !!clean.inspiration
      const data = mergePatch(JSON.parse(row.data), { state: clean })
      const rev = await env.DB.prepare('UPDATE characters SET data = ?, rev = rev + 1, updated_at = ? WHERE id = ? RETURNING rev').bind(JSON.stringify(data), Date.now(), id).first('rev')
      await count(env, 'dm_action')
      return json({ id, rev, data })
    }

    if (m === 'DELETE') {
      // the owner takes the character out of the room (it stays on the phone)
      if (!row) return json({ ok: true })
      if (role !== 'dm' && !same(await ownerHash(req), row.owner_hash)) fail(403, 'not yours')
      await env.DB.prepare('DELETE FROM characters WHERE id = ?').bind(id).run()
      return json({ ok: true })
    }
  }
  fail(404, 'not found')
}

/** Everything the owner's admin screen shows: totals, every group with its characters (a summary, not full sheets),
 *  and the last 30 days of usage. */
async function adminStats(env) {
  const week = Date.now() - 7 * 864e5
  const [rooms, chars, usage, totals] = await Promise.all([
    env.DB.prepare('SELECT id, name, created_at, updated_at FROM rooms ORDER BY updated_at DESC LIMIT 500').all(),
    env.DB.prepare(`SELECT id, room_id, owner_hash, rev, updated_at, json_extract(data, '$.name') AS name, json_extract(data, '$.classId') AS classId,
      json_extract(data, '$.subclassId') AS subclassId, json_extract(data, '$.speciesId') AS speciesId, json_extract(data, '$.level') AS level,
      json_extract(data, '$.state.hp') AS hp, json_extract(data, '$.portrait.kind') AS pk, json_extract(data, '$.portrait.src') AS ps, length(data) AS bytes FROM characters`).all(),
    env.DB.prepare('SELECT day, kind, count FROM usage WHERE day >= ? ORDER BY day').bind(new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)).all(),
    env.DB.prepare('SELECT (SELECT COUNT(*) FROM rooms) AS rooms, (SELECT COUNT(*) FROM characters) AS characters, (SELECT COUNT(DISTINCT owner_hash) FROM characters) AS players, (SELECT COALESCE(SUM(length(data)), 0) FROM characters) AS bytes').first(),
  ])
  const byRoom = new Map()
  const lastActive = new Map()
  for (const c of chars.results) {
    if (!byRoom.has(c.room_id)) byRoom.set(c.room_id, [])
    byRoom.get(c.room_id).push({ id: c.id, name: c.name, classId: c.classId, subclassId: c.subclassId, speciesId: c.speciesId, level: c.level, hp: c.hp, rev: c.rev, updatedAt: c.updated_at, bytes: c.bytes, player: c.owner_hash.slice(0, 6), portrait: c.pk === 'icon' ? c.ps : null })
    lastActive.set(c.room_id, Math.max(lastActive.get(c.room_id) || 0, c.updated_at))
  }
  return {
    totals: { ...totals, activeRooms7d: rooms.results.filter((r) => Math.max(r.updated_at, lastActive.get(r.id) || 0) >= week).length, activeCharacters7d: chars.results.filter((c) => c.updated_at >= week).length },
    limits: LIMITS,
    rooms: rooms.results.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, lastActive: Math.max(r.updated_at, lastActive.get(r.id) || 0), characters: byRoom.get(r.id) || [] })).sort((a, b) => b.lastActive - a.lastActive),
    usage: usage.results,
  }
}

/** Changed top-level fields replace the stored ones; `state` merges one level deeper (so a DM's HP change and the
 *  player's resource change don't overwrite each other). */
export function mergePatch(data, patch) {
  const out = { ...data }
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'id' || k.startsWith('_')) continue
    if (k === 'state' && v && typeof v === 'object' && !Array.isArray(v)) out.state = { ...(data.state || {}), ...v }
    else out[k] = v
  }
  return out
}
