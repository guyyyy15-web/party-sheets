// The printed sheet shows exactly what derive() says (src/engine/print.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import { derive, newCharacter } from '../src/engine/engine.js'
import { printModel } from '../src/engine/print.js'

const wiz = () => Object.assign(newCharacter(), { name: 'Ember', classId: 'wizard', level: 5, speciesId: 'elf', backgroundId: 'sage', scores: { STR: 8, DEX: 14, CON: 13, INT: 17, WIS: 12, CHA: 10 }, spells: { cantrips: ['fire-bolt', 'light'], prepared: ['magic-missile', 'shield', 'fireball'] }, equipment: { weapons: ['dagger'], gp: 12 } })

test('the printed numbers are the sheet\'s numbers', () => {
  const ch = wiz(), d = derive(ch), p = printModel(ch)
  assert.equal(p.stats.find((s) => s[0] === 'Armor Class')[1], String(d.ac.value))
  assert.equal(p.stats.find((s) => s[0] === 'Hit Points')[1], `${d.hp.value} / ${d.hp.value}`)
  for (const a of p.abilities) { assert.equal(a.score, d.scores[a.id].total); assert.equal(Number(a.save), d.saves[a.id].value) }
  assert.equal(p.skills.length, 18)
  assert.equal(p.attacks.find((a) => a.name === 'Dagger').toHit, `+${d.attacks.find((a) => a.id === 'dagger').toHit}`)
  assert.equal(p.casting.dc, d.spellcasting.dc.value)
})

test('spells by level with their slots; a non-caster has none; current HP is printed', () => {
  const p = printModel(wiz())
  assert.deepEqual(p.spells.map((g) => [g.title, g.slots, g.list.length]), [['Cantrips', 0, 2], ['1st level', 4, 2], ['3rd level', 2, 1]])
  const f = Object.assign(newCharacter(), { name: 'Aria', classId: 'fighter', level: 3, speciesId: 'human' })
  f.state.hp = 5
  const pf = printModel(f)
  assert.equal(pf.casting, null); assert.deepEqual(pf.spells, [])
  assert.match(pf.stats.find((s) => s[0] === 'Hit Points')[1], /^5 \//)
  assert.ok(pf.features.some((x) => x.name === 'Second Wind'))
})
