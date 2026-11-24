// The fight (initiative): order, turns, rounds, enemies by kind, manual numbers, what players see.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newEncounter, addPc, addGroup, order, setInit, rollMissing, next, prev, hurt, remove, forPlayers, placeOf, toggleCondition, setDead } from '../src/encounter-core.js'

const seq = (...v) => { let i = 0; return () => v[i++ % v.length] }

test('a fight: party, two kinds of enemies, sorted, manual numbers, turns and rounds', () => {
  const e = newEncounter([{ charId: 'a', name: 'Ana', bonus: 3 }, { charId: 'b', name: 'Bo', bonus: 1 }])
  addGroup(e, { name: 'Soldier', count: 3, bonus: 1, ac: 14, roll: seq(10) })
  addGroup(e, { name: 'Officer', count: 2, bonus: 2, ac: 16, roll: seq(15) })
  assert.deepEqual(e.combatants.filter((c) => c.kind === 'npc').map((c) => `${c.name}:${c.init}`), ['Soldier 1:11', 'Soldier 2:11', 'Soldier 3:11', 'Officer 1:17', 'Officer 2:17'])
  setInit(e, 'pc-a', 20) // typed by hand: the player rolled real dice
  rollMissing(e, seq(7)) // Bo: 7 + 1
  assert.deepEqual(order(e).map((c) => c.name), ['Ana', 'Officer 1', 'Officer 2', 'Soldier 1', 'Soldier 2', 'Soldier 3', 'Bo'])
  next(e); assert.equal(e.turn, 'pc-a'); assert.equal(e.round, 1)
  for (let i = 0; i < 6; i++) next(e)
  assert.equal(e.turn, 'pc-b')
  next(e); assert.equal(e.turn, 'pc-a'); assert.equal(e.round, 2)
  prev(e); assert.equal(e.turn, 'pc-b'); assert.equal(e.round, 1)
})

test('enemies: damage counts up from 0, healing down; the DM says when one falls (then skipped); join mid-fight', () => {
  const e = newEncounter([{ charId: 'a', name: 'Ana', bonus: 0, init: 5 }])
  addGroup(e, { name: 'Goblin', count: 2, roll: seq(14) })
  next(e); assert.equal(e.turn, 'npc-1')
  hurt(e, 'npc-2', 10); hurt(e, 'npc-2', 4); hurt(e, 'npc-2', -3)
  const g2 = e.combatants.find((c) => c.id === 'npc-2')
  assert.equal(g2.dmg, 11); assert.ok(!g2.dead, 'damage alone never kills: the DM decides')
  hurt(e, 'npc-1', -5); assert.equal(e.combatants.find((c) => c.id === 'npc-1').dmg, 0, 'never below 0')
  setDead(e, 'npc-2', true)
  next(e); assert.equal(e.turn, 'pc-a', 'the fallen goblin is skipped')
  addGroup(e, { name: 'Goblin', count: 1, roll: seq(1) })
  assert.equal(e.combatants.at(-1).name, 'Goblin 3')
  addPc(e, { charId: 'c', name: 'Cy', init: 12 }); addPc(e, { charId: 'c', name: 'Cy' })
  assert.equal(e.combatants.filter((c) => c.charId === 'c').length, 1, 'a player joins once')
  toggleCondition(e, 'npc-1', 'prone'); assert.deepEqual(e.combatants.find((c) => c.id === 'npc-1').conditions, ['prone'])
  remove(e, 'pc-a'); assert.ok(!e.combatants.some((c) => c.id === 'pc-a'))
})

test('players see the damage count but not the AC, and their own place in the order', () => {
  const e = newEncounter([{ charId: 'a', name: 'Ana', init: 9 }])
  addGroup(e, { name: 'Ogre', ac: 11, roll: seq(19) })
  hurt(e, 'npc-1', 35)
  const p = forPlayers(e).combatants.find((c) => c.kind === 'npc')
  assert.equal(p.ac, undefined); assert.equal(p.dmg, 35)
  next(e)
  assert.deepEqual(placeOf(e, 'pc-a'), { place: 2, of: 2, now: false, inTurns: 1 })
})
