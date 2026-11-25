// One turn's economy: action, bonus action, reaction, one spell slot a turn (2024), what was spent.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newTurn, timeKind, conflicts, used, concentrationDC } from '../src/ui/turnstate.js'
import { derive, newCharacter } from '../src/engine/engine.js'

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

test('Concentration DC: 10, or half the damage if higher, at most 30', () => {
  assert.equal(concentrationDC(1), 10); assert.equal(concentrationDC(21), 10); assert.equal(concentrationDC(22), 11); assert.equal(concentrationDC(45), 22); assert.equal(concentrationDC(200), 30)
})

test('once-per-turn features are marked and lock after one use (Sneak Attack yes, Second Wind no)', () => {
  const rogue = derive({ ...newCharacter(), classId: 'rogue', speciesId: 'human', backgroundId: 'criminal', level: 5, scores: { STR: 10, DEX: 16, CON: 14, INT: 10, WIS: 12, CHA: 10 } })
  assert.equal(rogue.actions.find((a) => a.id === 'sneak-attack').perTurn, true)
  const fighter = derive({ ...newCharacter(), classId: 'fighter', speciesId: 'human', backgroundId: 'soldier', level: 2, scores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 8 } })
  assert.equal(fighter.actions.find((a) => a.id === 'second-wind').perTurn, false)
  const once = { id: 'sneak-attack', name: 'Sneak Attack' }
  let t = used(newTurn(), { once })
  assert.deepEqual(conflicts(t, { once }), ['Sneak Attack (once per turn)'])
  assert.deepEqual(conflicts(newTurn(), { once }), [], 'a new turn frees it again')
})
