// API tests against a local Worker (wrangler dev + local D1). Never the production server.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, execSync } from 'node:child_process'
import { rmSync } from 'node:fs'

const PORT = 8799
const API = `http://127.0.0.1:${PORT}`
let dev

before(async () => {
  rmSync('.wrangler/state-test', { recursive: true, force: true })
  execSync('npx wrangler d1 migrations apply party-sheets --local --persist-to .wrangler/state-test', { stdio: 'ignore' })
  dev = spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', '.wrangler/state-test', '--var', 'ALLOW_LOCALHOST:1'], { stdio: 'ignore', detached: true })
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`${API}/health`)).ok) return } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('wrangler dev did not start')
})
after(() => { try { process.kill(-dev.pid) } catch {} })

const key = () => Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url')
const call = async (path, { method = 'GET', auth, owner, body, origin } = {}) => {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) headers.Authorization = `Bearer ${auth}`
  if (owner) headers['X-Owner'] = owner
  if (origin) headers.Origin = origin
  const r = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, body: await r.json().catch(() => null), headers: r.headers }
}
const hero = (name = 'Aria') => ({ v: 1, name, classId: 'fighter', speciesId: 'human', level: 3, scores: { str: 15 }, state: { hp: 28, temp: 0, conditions: [], resources: { 'second-wind': 1 } } })

test('a room: create, join as a player and as the DM, share characters, DM quick actions', async () => {
  const c = await call('/rooms', { method: 'POST', body: { name: 'Thursday group' } })
  assert.equal(c.status, 201)
  const { room, playerKey, dmKey } = c.body
  assert.equal(room.name, 'Thursday group')

  assert.equal((await call(`/rooms/${room.id}`)).status, 401)
  assert.equal((await call(`/rooms/${room.id}`, { auth: key() })).status, 403)
  assert.equal((await call(`/rooms/${room.id}`, { auth: playerKey })).body.role, 'player')
  assert.equal((await call(`/rooms/${room.id}`, { auth: dmKey })).body.role, 'dm')

  const me = key(), other = key()
  const put = await call(`/rooms/${room.id}/characters/char_aria1`, { method: 'PUT', auth: playerKey, owner: me, body: { patch: hero() } })
  assert.equal(put.status, 201); assert.equal(put.body.rev, 1)
  // someone else with the same invite cannot overwrite it
  assert.equal((await call(`/rooms/${room.id}/characters/char_aria1`, { method: 'PUT', auth: playerKey, owner: other, body: { patch: { name: 'Mine now' } } })).status, 403)
  assert.equal((await call(`/rooms/${room.id}/characters/char_aria1`, { auth: playerKey, owner: other })).status, 403)

  // players see a summary, the DM sees full sheets
  const pv = await call(`/rooms/${room.id}`, { auth: playerKey })
  assert.equal(pv.body.characters[0].name, 'Aria'); assert.equal(pv.body.characters[0].data, undefined)
  const dv = await call(`/rooms/${room.id}`, { auth: dmKey })
  assert.equal(dv.body.characters[0].data.state.hp, 28)

  // DM marks damage + a condition; the player's later resource change does not undo it (state merges by field)
  const dm = await call(`/rooms/${room.id}/characters/char_aria1`, { method: 'PATCH', auth: dmKey, body: { state: { hp: 20, conditions: ['poisoned'], level: 20 } } })
  assert.equal(dm.status, 200); assert.equal(dm.body.data.state.hp, 20); assert.equal(dm.body.data.level, 3); assert.equal(dm.body.rev, 2)
  const p2 = await call(`/rooms/${room.id}/characters/char_aria1`, { method: 'PUT', auth: playerKey, owner: me, body: { patch: { state: { resources: { 'second-wind': 0 } } } } })
  assert.deepEqual(p2.body.data.state, { hp: 20, temp: 0, conditions: ['poisoned'], resources: { 'second-wind': 0 } })
  assert.equal(p2.body.rev, 3)

  // DM cannot change choices, players cannot use DM actions
  assert.equal((await call(`/rooms/${room.id}/characters/char_aria1`, { method: 'PATCH', auth: dmKey, body: { state: { level: 5 } } })).status, 400)
  assert.equal((await call(`/rooms/${room.id}/characters/char_aria1`, { method: 'PATCH', auth: playerKey, body: { state: { hp: 1 } } })).status, 403)
  assert.equal((await call(`/rooms/${room.id}/characters/char_aria1`, { method: 'PATCH', auth: dmKey, body: { state: { hp: -4 } } })).status, 400)

  // a character belongs to one room
  const r2 = (await call('/rooms', { method: 'POST', body: { name: 'Sunday group' } })).body
  assert.equal((await call(`/rooms/${r2.room.id}/characters/char_aria1`, { method: 'PUT', auth: r2.playerKey, owner: me, body: { patch: hero() } })).status, 409)
  // the other room's keys don't open this one
  assert.equal((await call(`/rooms/${room.id}`, { auth: r2.dmKey })).status, 403)

  // group settings: only the DM changes them; everyone reads them
  assert.equal((await call(`/rooms/${room.id}`, { method: 'PATCH', auth: playerKey, body: { settings: { expansions: true } } })).status, 403)
  assert.deepEqual((await call(`/rooms/${room.id}`, { method: 'PATCH', auth: dmKey, body: { settings: { expansions: true, junk: 1 } } })).body.room.settings, { expansions: true })
  assert.equal((await call(`/rooms/${room.id}`, { auth: playerKey })).body.room.settings.expansions, true)
  assert.equal((await call(`/rooms/${room.id}`, { auth: dmKey })).body.room.name, 'Thursday group')

  // the owner leaves the room
  assert.equal((await call(`/rooms/${room.id}/characters/char_aria1`, { method: 'DELETE', auth: playerKey, owner: me })).status, 200)
  assert.equal((await call(`/rooms/${room.id}`, { auth: dmKey })).body.characters.length, 0)
})

test('limits and CORS', async () => {
  const { room, playerKey } = (await call('/rooms', { method: 'POST', body: { name: 'Big' } })).body
  const me = key()
  const big = { ...hero(), notes: 'x'.repeat(300 * 1024) }
  assert.equal((await call(`/rooms/${room.id}/characters/char_big01`, { method: 'PUT', auth: playerKey, owner: me, body: { patch: big } })).status, 413)
  assert.equal((await call(`/rooms/${room.id}/characters/char_bad01`, { method: 'PUT', auth: playerKey, owner: me, body: { patch: { hello: 1 } } })).status, 400)
  assert.equal((await call('/rooms', { method: 'POST', body: { name: '' } })).status, 400)

  const ok = await call('/health', { origin: 'http://localhost:8080' })
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:8080')
  const bad = await call('/health', { origin: 'https://evil.example' })
  assert.equal(bad.headers.get('access-control-allow-origin'), null)
})

test('12 characters per room', async () => {
  const { room, playerKey } = (await call('/rooms', { method: 'POST', body: { name: 'Crowded' } })).body
  for (let i = 0; i < 12; i++) assert.equal((await call(`/rooms/${room.id}/characters/char_c${i}xxxx`, { method: 'PUT', auth: playerKey, owner: key(), body: { patch: hero(`H${i}`) } })).status, 201)
  assert.equal((await call(`/rooms/${room.id}/characters/char_c99xxx`, { method: 'PUT', auth: playerKey, owner: key(), body: { patch: hero() } })).status, 507)
})

test('admin: the first password claims it, then stats for the owner only', async () => {
  assert.equal((await call('/admin/stats', { auth: 'nope-nope-nope' })).status, 404)
  assert.equal((await call('/admin/claim', { method: 'POST', body: { key: 'short' } })).status, 400)
  assert.equal((await call('/admin/claim', { method: 'POST', body: { key: 'my-admin-password-123' } })).status, 201)
  assert.equal((await call('/admin/claim', { method: 'POST', body: { key: 'someone-else-later-999' } })).status, 409)
  assert.equal((await call('/admin/stats', { auth: 'someone-else-later-999' })).status, 403)
  const s = await call('/admin/stats', { auth: 'my-admin-password-123' })
  assert.equal(s.status, 200)
  assert.ok(s.body.totals.rooms >= 3 && s.body.totals.characters >= 1)
  const room = s.body.rooms.find((r) => r.name === 'Crowded')
  assert.equal(room.characters.length, 12); assert.equal(room.characters[0].classId, 'fighter'); assert.equal(room.characters[0].data, undefined)
  assert.ok(s.body.usage.some((u) => u.kind === 'room_created' && u.count >= 3))
  assert.ok(s.body.usage.some((u) => u.kind === 'dm_action'))
  assert.equal((await call(`/admin/rooms/${room.id}`, { method: 'DELETE', auth: 'my-admin-password-123' })).status, 200)
  assert.ok(!(await call('/admin/stats', { auth: 'my-admin-password-123' })).body.rooms.some((r) => r.name === 'Crowded'))
})

test('every character is saved on the server: outside a group, joining one, leaving, restoring with the owner key', async () => {
  const me = key(), thief = key()
  assert.equal((await call('/me/characters/char_solo1', { method: 'PUT', body: { patch: hero('Solo') } })).status, 401)
  const put = await call('/me/characters/char_solo1', { method: 'PUT', owner: me, body: { patch: hero('Solo') } })
  assert.equal(put.status, 201); assert.equal(put.body.roomId, null)
  const up = await call('/me/characters/char_solo1', { method: 'PUT', owner: me, body: { patch: { notes: 'saved', state: { hp: 9 } } } })
  assert.equal(up.body.rev, 2); assert.equal(up.body.data.state.hp, 9); assert.equal(up.body.data.state.temp, 0)
  assert.equal((await call('/me/characters/char_solo1', { method: 'PUT', owner: thief, body: { patch: { name: 'Mine' } } })).status, 403)
  assert.equal((await call('/me/characters/char_solo1', { owner: thief })).status, 403)

  // it joins a group (same owner), the DM changes it, the owner reads it back from /me
  const { room, playerKey, dmKey } = (await call('/rooms', { method: 'POST', body: { name: 'Solo joins' } })).body
  assert.equal((await call(`/rooms/${room.id}/characters/char_solo1`, { method: 'PUT', auth: playerKey, owner: me, body: { patch: { level: 3 } } })).status, 201)
  assert.equal((await call(`/rooms/${room.id}`, { auth: dmKey })).body.characters.length, 1)
  await call(`/rooms/${room.id}/characters/char_solo1`, { method: 'PATCH', auth: dmKey, body: { state: { hp: 4 } } })
  const mine = await call('/me/characters', { owner: me })
  assert.equal(mine.body.characters.length, 1); assert.equal(mine.body.characters[0].roomId, room.id); assert.equal(mine.body.characters[0].data.state.hp, 4)

  // leaving the group keeps it on the server
  await call(`/rooms/${room.id}/characters/char_solo1`, { method: 'DELETE', auth: playerKey, owner: me })
  assert.equal((await call(`/rooms/${room.id}`, { auth: dmKey })).body.characters.length, 0)
  assert.equal((await call('/me/characters/char_solo1', { owner: me })).body.roomId, null)

  // deleting it removes it from the server
  assert.equal((await call('/me/characters/char_solo1', { method: 'DELETE', owner: me })).status, 200)
  assert.equal((await call('/me/characters', { owner: me })).body.characters.length, 0)
})
