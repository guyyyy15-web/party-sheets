// The living avatar's state and its one-time effects (src/engine/avatar-state.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import { derive, newCharacter } from '../src/engine/engine.js'
import { avatarState, avatarEvents, hpTone } from '../src/engine/avatar-state.js'
import { makeBuff } from '../src/engine/buffs.js'
import { spellById } from '../src/content/spells.js'

const hero = (state = {}) => { const ch = Object.assign(newCharacter(), { id: 'cme', name: 'Aria', classId: 'fighter', level: 5, speciesId: 'human', scores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 10 } }); ch.state = { ...ch.state, ...state }; return ch }

test('HP tone: ok above half, bloodied at half, badly hurt at a quarter, down at 0', () => {
  assert.deepEqual([hpTone(40, 40), hpTone(20, 40), hpTone(10, 40), hpTone(0, 40)], ['ok', 'bloodied', 'critical', 'down'])
  assert.equal(hpTone(21, 40), 'ok')
})

test('the state: HP, concentration by name, Rage, spells on you (not your own concentration), conditions, death saves', () => {
  const ch = hero({ hp: 0, concentration: 'bless', conditions: ['poisoned'], deathSaves: { ok: 1, fail: 2 },
    buffs: [makeBuff(spellById('bless'), { caster: { id: 'cme', name: 'Aria' } }), makeBuff(spellById('shield-of-faith'), { caster: { id: 'cmira', name: 'Mira' } })] })
  const s = avatarState(derive(ch), ch, { myTurn: true })
  assert.equal(s.tone, 'down'); assert.deepEqual(s.deathSaves, { ok: 1, fail: 2 })
  assert.equal(s.conc.name, 'Bless')
  assert.deepEqual(s.buffs.map((b) => [b.name, b.from]), [['Shield of Faith', 'Mira']])
  assert.deepEqual(s.conditions, ['Poisoned']); assert.equal(s.myTurn, true); assert.equal(s.raging, false)
})

test('events: hurt, healed, down, back up, concentration broken, a new level, your turn; nothing on the first look', () => {
  const a = { hp: 30, conc: { name: 'Bless' }, level: 4, myTurn: false }
  assert.deepEqual(avatarEvents(null, a), [])
  assert.deepEqual(avatarEvents(a, { ...a, hp: 23 }), [{ kind: 'hurt', text: '−7' }])
  assert.deepEqual(avatarEvents(a, { ...a, hp: 35 }), [{ kind: 'heal', text: '+5' }])
  assert.deepEqual(avatarEvents(a, { ...a, hp: 0, conc: null }).map((e) => e.kind), ['down', 'conc-broke'])
  assert.deepEqual(avatarEvents({ ...a, hp: 0 }, { ...a, hp: 1 }), [{ kind: 'up', text: '+1' }])
  assert.deepEqual(avatarEvents(a, { ...a, level: 5, myTurn: true }).map((e) => e.kind), ['level', 'turn'])
})
