// Party Sheets rooms: a Cloudflare Worker + D1. A room is one playing group. Its invite link carries a player key,
// its DM link a DM key; the server keeps only SHA-256 hashes of both. Characters belong to one room; only their
// owner (a device key) writes them, and the DM may apply quick actions (HP, temp HP, conditions, inspiration,
// exhaustion). Characters are stored as plain JSON (the owner chose no encryption). Request bodies are never logged.

import { cleanBuff, applyBuff, removeBuffs, BUFF_LIMITS } from '../../src/engine/buffs.js'

export const LIMITS = {
  roomName: 60,
  characterBytes: 256 * 1024, // a character with a small portrait
  charactersPerRoom: 12,
  charactersPerOwner: 50,
  newCharactersPerClientPerHour: 30,
  vaultBytes: 16 * 1024,
  vaultsPerOwner: 4,
  vaultReadsPerClientPerHour: 30,
  roomsPerClientPerHour: 10,
  writesPerClientPerMinute: 120,
  totalRooms: 5000,
  encounterBytes: 48 * 1024,
  combatants: 60,
}
const ID = /^[A-Za-z0-9_-]{6,40}$/
const KEY = /^[A-Za-z0-9_-]{24,64}$/
const DM_STATE_KEYS = ['hp', 'temp', 'conditions', 'inspiration', 'exhaustion', 'deathSaves', 'gifts']

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

/** Who is calling for this room: 'dm', 'player', 'init' (runs the initiative), or an error. Bearer key = the player or the DM key. */
async function roleIn(env, req, roomId) {
  if (!ID.test(roomId || '')) fail(400, 'bad room')
  const room = await env.DB.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first()
  if (!room) fail(404, 'no such room')
  const key = (req.headers.get('Authorization') || '').replace(/^Bearer /, '')
  if (!KEY.test(key)) fail(401, 'no key')
  const h = await sha256(key)
  if (same(h, room.dm_hash)) return { room, role: 'dm' }
  if (same(h, room.player_hash)) return { room, role: 'player' }
  if (room.init_hash && same(h, room.init_hash)) return { room, role: 'init' }
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
    if (dm && m === 'DELETE') { await env.DB.prepare('UPDATE characters SET room_id = NULL, rev = rev + 1 WHERE room_id = ?').bind(dm[1]).run(); await env.DB.prepare('DELETE FROM encounters WHERE room_id = ?').bind(dm[1]).run(); await env.DB.prepare('DELETE FROM rooms WHERE id = ?').bind(dm[1]).run(); return json({ ok: true }) }
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
      if (role === 'init') return { id: r.id, rev: r.rev, updatedAt: r.updated_at, data: privateless(data) }
      return role === 'dm' ? { id: r.id, rev: r.rev, updatedAt: r.updated_at, data } : { id: r.id, rev: r.rev, name: data.name, classId: data.classId, level: data.level, speciesId: data.speciesId, portrait: data.portrait?.kind === 'icon' ? data.portrait : null }
    })
    return json({ room: publicRoom(room), role, characters })
  }
  if (rm && m === 'DELETE') {
    // the DM deletes the group for everyone: characters stay saved (in no group), the fight goes
    const { room, role } = await roleIn(env, req, rm[1])
    if (role !== 'dm') fail(403, 'DM only')
    await env.DB.prepare('UPDATE characters SET room_id = NULL, rev = rev + 1, updated_at = ? WHERE room_id = ?').bind(Date.now(), room.id).run()
    await env.DB.prepare('DELETE FROM encounters WHERE room_id = ?').bind(room.id).run()
    await env.DB.prepare('DELETE FROM rooms WHERE id = ?').bind(room.id).run()
    await count(env, 'room_deleted')
    return json({ ok: true })
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

  // ── accounts (vaults): encrypted on the phone; the id is derived from a passkey or username + password
  const vm = /^\/vault\/([a-f0-9]{64})$/.exec(p)
  if (vm) {
    const vid = vm[1]
    if (m === 'GET') {
      // signing in: a wrong password or an unknown passkey simply finds nothing
      await limit(env, req, 'vault-read', LIMITS.vaultReadsPerClientPerHour, 3600e3)
      const row = await env.DB.prepare('SELECT data, updated_at FROM vaults WHERE id = ?').bind(vid).first()
      if (!row) fail(404, 'no such account')
      return json({ data: row.data, updatedAt: row.updated_at })
    }
    const owner = await ownerHash(req)
    const row = await env.DB.prepare('SELECT owner_hash FROM vaults WHERE id = ?').bind(vid).first()
    if (row && !same(owner, row.owner_hash)) fail(403, 'not yours')
    if (m === 'PUT') {
      await limit(env, req, 'writes', LIMITS.writesPerClientPerMinute, 60e3)
      const body = await readJson(req, LIMITS.vaultBytes + 512)
      if (typeof body?.data !== 'string' || !body.data || body.data.length > LIMITS.vaultBytes) fail(400, 'bad vault')
      const uname = body.username
      if (uname != null) {
        if (!/^[a-f0-9]{64}$/.test(uname)) fail(400, 'bad username')
        const taken = await env.DB.prepare('SELECT vault_id, owner_hash FROM usernames WHERE hash = ?').bind(uname).first()
        if (taken && taken.vault_id !== vid && !same(taken.owner_hash, owner)) fail(409, 'username taken')
      }
      const now = Date.now()
      await env.DB.batch([
        env.DB.prepare('INSERT INTO vaults (id, owner_hash, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at').bind(vid, owner, body.data, now),
        ...(uname ? [env.DB.prepare('INSERT INTO usernames (hash, vault_id, owner_hash, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (hash) DO UPDATE SET vault_id = excluded.vault_id').bind(uname, vid, owner, now)] : []),
        // a few per player (a passkey, a password, a spare): the oldest beyond that go
        env.DB.prepare('DELETE FROM vaults WHERE owner_hash = ? AND id NOT IN (SELECT id FROM vaults WHERE owner_hash = ? ORDER BY updated_at DESC LIMIT ?)').bind(owner, owner, LIMITS.vaultsPerOwner),
      ])
      if (!row) await count(env, 'account_saved')
      return json({ ok: true }, row ? 200 : 201)
    }
    if (m === 'DELETE') {
      if (row) await env.DB.batch([env.DB.prepare('DELETE FROM vaults WHERE id = ?').bind(vid), env.DB.prepare('DELETE FROM usernames WHERE vault_id = ?').bind(vid)])
      return json({ ok: true })
    }
  }
  const un = /^\/usernames\/([a-f0-9]{64})$/.exec(p)
  if (un && m === 'GET') {
    // signing up: is this name free? (only its hash travels)
    await limit(env, req, 'vault-read', LIMITS.vaultReadsPerClientPerHour * 2, 3600e3)
    const row = await env.DB.prepare('SELECT owner_hash FROM usernames WHERE hash = ?').bind(un[1]).first()
    const mine = row && req.headers.get('X-Owner') && same(await ownerHash(req), row.owner_hash)
    return json({ taken: !!row && !mine })
  }

  // ── my characters: every character is saved on the server, in a group or not. The owner key (X-Owner) is the
  //    only credential; a phone's "cloud key" link carries it to restore the characters on another phone.
  if (p === '/me/characters' && m === 'GET') {
    await limit(env, req, 'reads', 600, 60e3)
    const owner = await ownerHash(req)
    const rows = (await env.DB.prepare('SELECT id, room_id, rev, updated_at, data FROM characters WHERE owner_hash = ? ORDER BY updated_at DESC LIMIT 100').bind(owner).all()).results
    return json({ characters: rows.map((r) => ({ id: r.id, roomId: r.room_id, rev: r.rev, updatedAt: r.updated_at, data: JSON.parse(r.data) })) })
  }
  const me = /^\/me\/characters\/([A-Za-z0-9_-]+)$/.exec(p)
  if (me) {
    const id = me[1]
    if (!ID.test(id)) fail(400, 'bad id')
    const owner = await ownerHash(req)
    const row = await env.DB.prepare('SELECT * FROM characters WHERE id = ?').bind(id).first()
    if (row && !same(owner, row.owner_hash)) fail(403, 'not yours')
    if (m === 'GET') {
      if (!row) fail(404, 'no such character')
      return json({ id, rev: row.rev, roomId: row.room_id, data: JSON.parse(row.data) })
    }
    if (m === 'PUT') {
      await limit(env, req, 'writes', LIMITS.writesPerClientPerMinute, 60e3)
      const body = await readJson(req, LIMITS.characterBytes + 1024)
      const patch = body?.patch
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) fail(400, 'patch required')
      if (row) {
        const data = mergePatch(JSON.parse(row.data), patch)
        data.id = id
        const text = JSON.stringify(data)
        if (text.length > LIMITS.characterBytes) fail(413, 'character too large')
        const rev = await env.DB.prepare('UPDATE characters SET data = ?, rev = rev + 1, updated_at = ? WHERE id = ? RETURNING rev').bind(text, Date.now(), id).first('rev')
        await count(env, 'player_write')
        return json({ id, rev, roomId: row.room_id, data })
      }
      await newCharacterChecks(env, req, owner)
      const data = { ...patch, id }
      if (typeof data.name !== 'string' || !data.scores) fail(400, 'not a character')
      const text = JSON.stringify(data)
      if (text.length > LIMITS.characterBytes) fail(413, 'character too large')
      await env.DB.prepare('INSERT INTO characters (id, room_id, owner_hash, data, rev, updated_at) VALUES (?, NULL, ?, ?, 1, ?)').bind(id, owner, text, Date.now()).run()
      await count(env, 'character_saved')
      return json({ id, rev: 1, roomId: null, data }, 201)
    }
    if (m === 'DELETE') {
      // the owner deleted the character: gone from the server too
      if (row) await env.DB.prepare('DELETE FROM characters WHERE id = ?').bind(id).run()
      return json({ ok: true })
    }
  }

  // ── initiative: the group's Initiative link (made by the DM), and its current fight
  const il = /^\/rooms\/([A-Za-z0-9_-]+)\/init-link$/.exec(p)
  if (il && m === 'POST') {
    const { room, role } = await roleIn(env, req, il[1])
    if (role !== 'dm') fail(403, 'DM only')
    const initKey = randomKey()
    await env.DB.prepare('UPDATE rooms SET init_hash = ?, updated_at = ? WHERE id = ?').bind(await sha256(initKey), Date.now(), room.id).run()
    return json({ initKey }, 201)
  }
  const em = /^\/rooms\/([A-Za-z0-9_-]+)\/encounter(\/initiative|\/claim)?$/.exec(p)
  if (em) {
    const { room, role } = await roleIn(env, req, em[1])
    const runs = role === 'dm' || role === 'init'
    const row = await env.DB.prepare('SELECT data, rev FROM encounters WHERE room_id = ?').bind(room.id).first()
    const cur = row ? JSON.parse(row.data) : null
    if (!em[2] && m === 'GET') return json({ rev: row?.rev || 0, data: runs ? cur : hideEnemies(cur), role })
    if (!em[2] && m === 'PUT') {
      // the initiative runner replaces the fight; `rev` must be the one they last saw (else 409 with the current one)
      if (!runs) fail(403, 'only the initiative runner')
      await limit(env, req, 'writes', LIMITS.writesPerClientPerMinute, 60e3)
      const body = await readJson(req, LIMITS.encounterBytes + 256)
      if ((body?.rev || 0) !== (row?.rev || 0)) return json({ error: 'changed', rev: row?.rev || 0, data: cur }, 409)
      if (body.data == null) { await env.DB.prepare('DELETE FROM encounters WHERE room_id = ?').bind(room.id).run(); return json({ rev: 0, data: null }) }
      const data = cleanEncounter(body.data)
      const rev = await saveEncounter(env, room.id, data, row)
      if (!row) await count(env, 'fight_started')
      return json({ rev, data })
    }
    if (em[2] === '/claim' && m === 'POST') {
      // a player says how much damage they did to whom: applied at once if the runner allows it, else waits for them
      await limit(env, req, 'writes', LIMITS.writesPerClientPerMinute, 60e3)
      if (!cur || !cur.active) fail(404, 'no fight')
      const body = await readJson(req, 512)
      const id = String(body?.characterId || '')
      const amount = Number(body?.amount)
      const target = cur.combatants.find((c) => c.id === body?.target)
      if (!ID.test(id) || !Number.isInteger(amount) || amount < 0 || amount > 999) fail(400, 'bad damage')
      if (!target) fail(404, 'no such target')
      const ch = await env.DB.prepare('SELECT owner_hash, room_id FROM characters WHERE id = ?').bind(id).first()
      if (!ch || ch.room_id !== room.id) fail(404, 'no such character')
      if (!runs && !same(await ownerHash(req), ch.owner_hash)) fail(403, 'not yours')
      const by = cur.combatants.find((c) => c.charId === id)
      const heal = !!body?.heal
      const condition = typeof body?.condition === 'string' && /^[a-z-]{1,20}$/.test(body.condition) ? body.condition : null
      const claim = { id: `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, by: by?.id || null, byName: String(by?.name || 'A player').slice(0, 40), target: target.id, amount, label: String(body?.label || '').slice(0, 40), at: Date.now(), ...(heal ? { heal } : {}), ...(condition ? { condition } : {}) }
      // auto: only damage to an enemy (healing a player or a condition always waits for the runner)
      const applied = !!cur.auto && target.kind === 'npc' && !heal && !condition
      if (applied) target.dmg = (target.dmg || 0) + amount
      else cur.claims = [...(cur.claims || []), claim].slice(-30)
      const rev = await saveEncounter(env, room.id, cur, row)
      await count(env, applied ? 'damage_applied' : 'damage_claimed')
      return json({ rev, applied, data: runs ? cur : hideEnemies(cur) })
    }
    if (em[2] === '/initiative' && m === 'POST') {
      // a player sends their own initiative (rolled in the app or by hand); the runner may send anyone's
      await limit(env, req, 'writes', LIMITS.writesPerClientPerMinute, 60e3)
      if (!cur || !cur.active) fail(404, 'no fight')
      const body = await readJson(req, 512)
      const id = String(body?.characterId || '')
      const total = Number(body?.total)
      if (!ID.test(id) || !Number.isInteger(total) || total < -10 || total > 60) fail(400, 'bad initiative')
      const ch = await env.DB.prepare('SELECT owner_hash, room_id, data FROM characters WHERE id = ?').bind(id).first()
      if (!ch || ch.room_id !== room.id) fail(404, 'no such character')
      if (!runs && !same(await ownerHash(req), ch.owner_hash)) fail(403, 'not yours')
      const c = cur.combatants.find((x) => x.charId === id)
      if (c) c.init = total
      else if (cur.combatants.length < LIMITS.combatants) cur.combatants.push({ id: `pc-${id}`, kind: 'pc', charId: id, name: String(JSON.parse(ch.data).name || 'Hero').slice(0, 40), bonus: 0, init: total })
      const rev = await saveEncounter(env, room.id, cur, row)
      return json({ rev, data: runs ? cur : hideEnemies(cur) })
    }
  }

  // ── spells on a friend: a party member puts a buff (Bless, Shield of Faith, Aid…) on another character's sheet, or
  // takes theirs off when their concentration ends. Only for their own caster (X-Owner), both in this room.
  const bm = /^\/rooms\/([A-Za-z0-9_-]+)\/characters\/([A-Za-z0-9_-]+)\/buffs$/.exec(p)
  if (bm && (m === 'POST' || m === 'DELETE')) {
    const { room, role } = await roleIn(env, req, bm[1])
    await limit(env, req, 'writes', LIMITS.writesPerClientPerMinute, 60e3)
    const url = new URL(req.url)
    const body = m === 'POST' ? await readJson(req, BUFF_LIMITS.bytes + 256) : null
    const from = String(m === 'POST' ? body?.buff?.from || '' : url.searchParams.get('from') || '')
    if (!ID.test(bm[2]) || !ID.test(from)) fail(400, 'bad id')
    const [row, caster] = await Promise.all([
      env.DB.prepare('SELECT data, room_id FROM characters WHERE id = ?').bind(bm[2]).first(),
      env.DB.prepare('SELECT owner_hash, room_id FROM characters WHERE id = ?').bind(from).first(),
    ])
    if (!row || row.room_id !== room.id || !caster || caster.room_id !== room.id) fail(404, 'no such character')
    if (role !== 'dm' && role !== 'init' && !same(await ownerHash(req), caster.owner_hash)) fail(403, 'not your caster')
    const data = JSON.parse(row.data)
    let st
    if (m === 'POST') {
      const buff = cleanBuff({ ...body.buff, at: Date.now() })
      if (!buff || JSON.stringify(buff).length > BUFF_LIMITS.bytes) fail(400, 'bad buff')
      st = applyBuff(data.state, buff)
    } else {
      const spell = url.searchParams.get('spell')
      if (spell != null && !/^[a-z0-9-]{1,40}$/.test(spell)) fail(400, 'bad spell')
      st = { buffs: removeBuffs(data.state?.buffs, { from, spell, conc: url.searchParams.get('conc') === '1' }) }
      if (JSON.stringify(st.buffs) === JSON.stringify(data.state?.buffs || [])) return json({ id: bm[2], changed: false })
    }
    const next = mergePatch(data, { state: st })
    const text = JSON.stringify(next)
    if (text.length > LIMITS.characterBytes) fail(413, 'character too large')
    const rev = await env.DB.prepare('UPDATE characters SET data = ?, rev = rev + 1, updated_at = ? WHERE id = ? RETURNING rev').bind(text, Date.now(), bm[2]).first('rev')
    await count(env, m === 'POST' ? 'buff_added' : 'buff_removed')
    return json({ id: bm[2], rev, changed: true, buffs: next.state.buffs })
  }

  const cm = /^\/rooms\/([A-Za-z0-9_-]+)\/characters\/([A-Za-z0-9_-]+)$/.exec(p)
  if (cm) {
    const { room, role } = await roleIn(env, req, cm[1])
    const id = cm[2]
    if (!ID.test(id)) fail(400, 'bad id')
    const row = await env.DB.prepare('SELECT * FROM characters WHERE id = ?').bind(id).first()
    if (row && row.room_id && row.room_id !== room.id) fail(409, 'character is in another room')
    const inRoom = row && row.room_id === room.id

    if (m === 'GET') {
      if (!inRoom) fail(404, 'no such character')
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
      if (!inRoom) {
        const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM characters WHERE room_id = ?').bind(room.id).first('n')
        if (n >= LIMITS.charactersPerRoom) fail(507, 'room is full')
      }
      if (row) {
        // an update, or a saved character joining this room
        if (!same(owner, row.owner_hash)) fail(403, 'not yours')
        const data = mergePatch(JSON.parse(row.data), patch)
        data.id = id
        const text = JSON.stringify(data)
        if (text.length > LIMITS.characterBytes) fail(413, 'character too large')
        const rev = await env.DB.prepare('UPDATE characters SET data = ?, room_id = ?, rev = rev + 1, updated_at = ? WHERE id = ? RETURNING rev').bind(text, room.id, Date.now(), id).first('rev')
        await count(env, inRoom ? 'player_write' : 'character_joined')
        return json({ id, rev, data }, inRoom ? 200 : 201)
      }
      await newCharacterChecks(env, req, owner)
      const data = { ...patch, id }
      if (typeof data.name !== 'string' || !data.scores) fail(400, 'not a character')
      const text = JSON.stringify(data)
      if (text.length > LIMITS.characterBytes) fail(413, 'character too large')
      await env.DB.prepare('INSERT INTO characters (id, room_id, owner_hash, data, rev, updated_at) VALUES (?, ?, ?, ?, 1, ?)').bind(id, room.id, owner, text, Date.now()).run()
      await count(env, 'character_joined')
      return json({ id, rev: 1, data }, 201)
    }

    if (m === 'PATCH') {
      // DM quick actions (also the initiative runner's): only these state fields
      if (role !== 'dm' && role !== 'init') fail(403, 'DM only')
      if (!inRoom) fail(404, 'no such character')
      await limit(env, req, 'writes', LIMITS.writesPerClientPerMinute, 60e3)
      const body = await readJson(req, 12288)
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
      if ('gifts' in clean && !(Array.isArray(clean.gifts) && clean.gifts.length <= 10 && clean.gifts.every((g) => g && typeof g === 'object' && !Array.isArray(g)) && JSON.stringify(clean.gifts).length <= 8192)) fail(400, 'bad gifts')
      const data = mergePatch(JSON.parse(row.data), { state: clean })
      const rev = await env.DB.prepare('UPDATE characters SET data = ?, rev = rev + 1, updated_at = ? WHERE id = ? RETURNING rev').bind(JSON.stringify(data), Date.now(), id).first('rev')
      await count(env, 'dm_action')
      return json({ id, rev, data })
    }

    if (m === 'DELETE') {
      // out of the room: the character stays saved (on the phone and on the server), just in no group
      if (!inRoom) return json({ ok: true })
      if (role !== 'dm' && !same(await ownerHash(req), row.owner_hash)) fail(403, 'not yours')
      await env.DB.prepare('UPDATE characters SET room_id = NULL, rev = rev + 1, updated_at = ? WHERE id = ?').bind(Date.now(), id).run()
      return json({ ok: true })
    }
  }
  fail(404, 'not found')
}

/** What the initiative runner sees of a sheet: everything for the numbers, not gold, items or notes. */
function privateless(data) {
  const { notes, ...rest } = data
  return { ...rest, equipment: rest.equipment ? { ...rest.equipment, gp: undefined, items: undefined } : rest.equipment }
}
/** Players see enemies without their AC; the damage count is the table's (everyone counts it anyway). */
function hideEnemies(enc) {
  if (!enc) return enc
  return { ...enc, combatants: enc.combatants.map((c) => (c.kind !== 'npc' ? c : { id: c.id, kind: 'npc', name: c.name, group: c.group, init: c.init, bonus: c.bonus, dmg: c.dmg || 0, dead: !!c.dead, conditions: c.conditions || [] })), claims: undefined }
}
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null)
/** Only the known fields, in range: the encounter is shown to every player of the group. */
function cleanEncounter(e) {
  if (!e || typeof e !== 'object' || !Array.isArray(e.combatants)) fail(400, 'bad encounter')
  if (e.combatants.length > LIMITS.combatants) fail(413, 'too many in the fight')
  const str = (s, n) => String(s ?? '').slice(0, n)
  const combatants = e.combatants.map((c) => {
    if (!c || !/^(pc|npc)-[A-Za-z0-9_-]{1,40}$/.test(c.id || '')) fail(400, 'bad combatant')
    const base = { id: c.id, kind: c.kind === 'pc' ? 'pc' : 'npc', name: str(c.name, 40), init: int(c.init, -10, 60), bonus: int(c.bonus, -10, 30) ?? 0 }
    if (base.kind === 'pc') return { ...base, charId: str(c.charId, 40) }
    return { ...base, group: str(c.group, 30), dmg: int(c.dmg, 0, 99999) ?? 0, ac: int(c.ac, 0, 50), dead: !!c.dead,
      conditions: Array.isArray(c.conditions) ? c.conditions.filter((x) => typeof x === 'string').slice(0, 20).map((x) => x.slice(0, 20)) : [] }
  })
  const ids = new Set(combatants.map((c) => c.id))
  const claims = (Array.isArray(e.claims) ? e.claims : []).slice(-30).filter((c) => c && ids.has(c.target)).map((c) => ({ id: str(c.id, 24), by: c.by && ids.has(c.by) ? c.by : null, byName: str(c.byName, 40), target: c.target, amount: int(c.amount, 0, 999) ?? 0, label: str(c.label, 40), at: int(c.at, 0, 9e15) ?? 0, ...(c.heal ? { heal: true } : {}), ...(typeof c.condition === 'string' && /^[a-z-]{1,20}$/.test(c.condition) ? { condition: c.condition } : {}) }))
  return { active: e.active !== false, round: int(e.round, 1, 9999) ?? 1, turn: ids.has(e.turn) ? e.turn : null, seq: int(e.seq, 0, 1e6) ?? 0, auto: !!e.auto, claims, combatants }
}
async function saveEncounter(env, roomId, data, row) {
  const text = JSON.stringify(data)
  if (text.length > LIMITS.encounterBytes) fail(413, 'fight too large')
  const now = Date.now()
  if (!row) { await env.DB.prepare('INSERT INTO encounters (room_id, data, rev, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT (room_id) DO UPDATE SET data = excluded.data, rev = encounters.rev + 1, updated_at = excluded.updated_at').bind(roomId, text, now).run(); return (await env.DB.prepare('SELECT rev FROM encounters WHERE room_id = ?').bind(roomId).first('rev')) }
  return env.DB.prepare('UPDATE encounters SET data = ?, rev = rev + 1, updated_at = ? WHERE room_id = ? RETURNING rev').bind(text, now, roomId).first('rev')
}

/** A brand-new character: limits per owner and per client. */
async function newCharacterChecks(env, req, owner) {
  await limit(env, req, 'new-character', LIMITS.newCharactersPerClientPerHour, 3600e3)
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM characters WHERE owner_hash = ?').bind(owner).first('n')
  if (n >= LIMITS.charactersPerOwner) fail(507, 'too many characters')
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
    env.DB.prepare('SELECT (SELECT COUNT(DISTINCT owner_hash) FROM vaults) AS accounts, (SELECT COUNT(*) FROM rooms) AS rooms, (SELECT COUNT(*) FROM characters) AS characters, (SELECT COUNT(DISTINCT owner_hash) FROM characters) AS players, (SELECT COALESCE(SUM(length(data)), 0) FROM characters) AS bytes').first(),
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
    solo: (byRoom.get(null) || []).sort((a, b) => b.updatedAt - a.updatedAt),
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
