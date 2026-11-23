import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diff, mergePatch, rebase, shareable, parseLink, isEmpty } from '../src/sync-core.js'

const base = { id: 'c1', roomId: 'r1', name: 'Aria', level: 3, notes: '', state: { hp: 20, temp: 0, used: { a: 1 }, conditions: [] }, updatedAt: 'x' }

test('diff sends only what changed, state by key, never local fields', () => {
  assert.ok(isEmpty(diff({ ...base, updatedAt: 'y' }, base)))
  assert.deepEqual(diff({ ...base, notes: 'hi', state: { ...base.state, used: { a: 2 } } }, base), { notes: 'hi', state: { used: { a: 2 } } })
})

test('a DM change and a player change to different fields both survive', () => {
  const server = mergePatch(base, { state: { hp: 12, conditions: ['poisoned'] } }) // the DM
  const local = { ...base, state: { ...base.state, used: { a: 0 } } } // the player, meanwhile
  const { merged, pending } = rebase(local, base, server)
  assert.deepEqual(merged.state, { hp: 12, temp: 0, used: { a: 0 }, conditions: ['poisoned'] })
  assert.deepEqual(pending, { state: { used: { a: 0 } } })
  assert.equal(merged.roomId, 'r1')
})

test('shareable drops local-only fields', () => {
  const s = shareable({ ...base, draft: false, _x: 1 })
  assert.equal(s.roomId, undefined); assert.equal(s.id, undefined); assert.equal(s._x, undefined); assert.equal(s.name, 'Aria')
})

test('links', () => {
  assert.deepEqual(parseLink('#/join/abcdefgh.' + 'k'.repeat(32)), { kind: 'join', roomId: 'abcdefgh', key: 'k'.repeat(32) })
  assert.equal(parseLink('#/dm/abc.short'), null)
  assert.equal(parseLink('#/other'), null)
})
