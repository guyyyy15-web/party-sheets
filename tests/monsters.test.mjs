// SRD 5.2 creatures (src/content/monsters.js, built by scripts/monsters.mjs): a sample typed from the SRD 5.2.1 PDF.
import test from 'node:test'
import assert from 'node:assert/strict'
import { MONSTERS, monsterById } from '../src/content/monsters.js'
import { ICONS } from '../src/content/icons-data.js'

test('331 creatures, each with numbers and a picture that the app carries', () => {
  assert.equal(MONSTERS.length, 331)
  for (const m of MONSTERS) {
    assert.ok(m.ac >= 5 && m.hp >= 1 && Number.isInteger(m.init), m.id)
    assert.ok(ICONS[m.icon], `${m.id} picture ${m.icon}`)
    for (const a of m.attacks) assert.match(a.dice, /^(\d+d\d+([+-]\d+)?|\d+)$/, `${m.id} ${a.name}`)
  }
})

test('numbers as in the SRD 5.2.1 PDF', () => {
  const at = (id, name) => monsterById(id).attacks.find((a) => a.name === name)
  const g = monsterById('goblin-warrior')
  assert.deepEqual([g.ac, g.hp, g.hpDice, g.init, g.cr], [15, 10, '3d6', 2, '1/4'])
  assert.deepEqual([at('goblin-warrior', 'Scimitar').toHit, at('goblin-warrior', 'Scimitar').dice], [4, '1d6+2'])
  const o = monsterById('ogre')
  assert.deepEqual([o.ac, o.hp, o.hpDice, o.init], [11, 68, '8d10+24', -1])
  assert.deepEqual([at('ogre', 'Greatclub').toHit, at('ogre', 'Greatclub').dice], [6, '2d8+4'])
  const d = monsterById('adult-red-dragon')
  assert.deepEqual([d.ac, d.hp, d.init, d.multi], [19, 256, 12, 3])
  assert.deepEqual([at('adult-red-dragon', 'Rend').toHit, at('adult-red-dragon', 'Rend').dice, at('adult-red-dragon', 'Rend').extra], [14, '1d10+8', '2d4 fire'])
  assert.deepEqual(d.saves.find((s) => s.name === 'Fire Breath'), { name: 'Fire Breath', ability: 'DEX', dc: 21, dice: '17d6', type: 'fire', recharge: 5 })
  // where the structured copy was wrong, the PDF wins
  assert.deepEqual([at('axe-beak', 'Beak').dice, at('axe-beak', 'Beak').type], ['1d8+2', 'slashing'])
  assert.equal(at('baboon', 'Bite').dice, '1d4-1')
  assert.equal(monsterById('half-dragon').saves[0].dc, 14)
  assert.equal(monsterById('lich').init, 17)
})
