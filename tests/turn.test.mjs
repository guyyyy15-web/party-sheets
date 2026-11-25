// One turn's economy: action, bonus action, reaction, one spell slot a turn (2024), what was spent.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newTurn, timeKind, conflicts, used } from '../src/ui/turnstate.js'

test('casting times map to the part of the turn they take', () => {
  assert.equal(timeKind('Action'), 'action'); assert.equal(timeKind('Bonus Action'), 'bonus'); assert.equal(timeKind('Reaction'), 'reaction')
  assert.equal(timeKind('1 minute'), null); assert.equal(timeKind('Action or 8 hours'), 'action')
})

test('a turn: one action, one bonus action, one reaction, one spell slot; spent resources add up', () => {
  let t = newTurn()
  assert.deepEqual(conflicts(t, { kind: 'action', slot: true }), [])
  t = used(t, { kind: 'action', slot: true, spend: { 'slot-1': 1 } })
  assert.deepEqual(conflicts(t, { kind: 'action' }), ['your action'])
  assert.deepEqual(conflicts(t, { kind: 'bonus', slot: true }), ['a spell slot (one per turn)'], 'a bonus-action spell with a slot after a slot spell: not allowed (2024)')
  assert.deepEqual(conflicts(t, { kind: 'bonus' }), [], 'a bonus-action cantrip is fine')
  t = used(t, { kind: 'bonus', spend: { 'focus-points': 1 } }); t = used(t, { spend: { 'focus-points': 1 } })
  assert.deepEqual(t.spent, { 'slot-1': 1, 'focus-points': 2 })
  assert.deepEqual(conflicts(t, { kind: 'reaction' }), [], 'the reaction is still free')
})
