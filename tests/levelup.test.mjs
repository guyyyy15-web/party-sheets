// What a level changes (levelDiff): the summary after levelling and the next-level preview.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { derive, newCharacter } from '../src/engine/engine.js'
import { levelDiff, headlines } from '../src/engine/levelup.js'

const mk = (o) => ({ ...newCharacter(), speciesId: 'dwarf', backgroundId: 'soldier', scores: { STR: 16, DEX: 14, CON: 14, INT: 16, WIS: 14, CHA: 10 }, choices: { 'background.abilities': { mode: '2-1', plus2: 'STR', plus1: 'CON' } }, ...o })
const up = (o, from) => { const ch = mk({ ...o, level: from }); const nx = { ...ch, level: from + 1 }; return levelDiff(derive(ch), derive(nx), nx) }
const line = (d, label) => d.lines.find((l) => l.label === label)

test('fighter 4→5: Extra Attack, proficiency, HP explained', () => {
  const d = up({ classId: 'fighter' }, 4)
  assert.deepEqual([line(d, 'Attacks per Attack action').before, line(d, 'Attacks per Attack action').after], [1, 2])
  assert.deepEqual([line(d, 'Proficiency bonus').before, line(d, 'Proficiency bonus').after], ['+2', '+3'])
  assert.equal(line(d, 'Max HP').note, '+9: 6 Hit Die, +2 CON, +1 other (Dwarven Toughness)')
  assert.deepEqual(headlines(d), ['Extra Attack', 'Tactical Shift', '+1 proficiency'])
})

test('wizard 4→5: first 3rd-level slots, DC and spell attack', () => {
  const d = up({ classId: 'wizard' }, 4)
  assert.deepEqual([line(d, '3rd-level slots').before, line(d, '3rd-level slots').after], [0, 2])
  assert.deepEqual([line(d, 'Spell save DC').before, line(d, 'Spell save DC').after], [13, 14])
  assert.equal(headlines(d)[0], '3rd-level spells')
})

test('cleric 1→2: Channel Divinity appears, with how it comes back', () => {
  const d = up({ classId: 'cleric' }, 1)
  assert.deepEqual([line(d, 'Channel Divinity').before, line(d, 'Channel Divinity').after], ['—', 2])
  assert.match(line(d, 'Channel Divinity').note, /long rest/)
  assert.ok(d.features.some((f) => f.name === 'Channel Divinity'))
})

test('barbarian 19→20: Primal Champion, and CON raises every earlier level', () => {
  const d = up({ classId: 'barbarian' }, 19)
  assert.deepEqual([line(d, 'STR').before, line(d, 'STR').after], [18, 22])
  assert.equal(line(d, 'Max HP').note, '+50: 7 Hit Die, +4 CON, +38 from CON on earlier levels, +1 other (Dwarven Toughness)')
})

test('rogue 2→3: Sneak Attack grows', () => {
  const d = up({ classId: 'rogue' }, 2)
  assert.deepEqual([line(d, 'Sneak Attack').before, line(d, 'Sneak Attack').after], ['1d6', '2d6'])
})

test('every class, every level: the HP note adds up to the gain, and the preview names something', () => {
  for (const classId of ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard']) {
    for (let lv = 1; lv < 20; lv++) {
      const d = up({ classId }, lv)
      const hp = line(d, 'Max HP')
      assert.ok(hp, `${classId} ${lv}: HP line`)
      const nums = hp.note.split(':')[1].match(/[+-]?\d+/g).map(Number)
      assert.equal(nums.reduce((a, b) => a + b, 0), hp.after - hp.before, `${classId} ${lv}→${lv + 1}: HP parts add up (${hp.note})`)
      assert.ok(headlines(d).length >= 1, `${classId} ${lv}: a headline`)
      assert.ok(d.lines.every((l) => l.before !== l.after), `${classId} ${lv}: only changes`)
    }
  }
})

test('a rolled Hit Die shows its roll, not the average', () => {
  const ch = mk({ classId: 'fighter', level: 2 })
  const nx = { ...ch, level: 3, hpRolls: { 3: 9 } }
  assert.match(line(levelDiff(derive(ch), derive(nx), nx), 'Max HP').note, /^\+12: 9 Hit Die, \+2 CON, \+1 other/)
})
