import test from 'node:test'
import assert from 'node:assert/strict'
import { derive, newCharacter, rest, readyToPlay } from '../src/engine/engine.js'
import { CLASSES } from '../src/content/classes.js'
import { SPECIES } from '../src/content/species.js'

const make = (over) => Object.assign(newCharacter(), { name: 'Test' }, over)

// Katsebushi as the old app has him: Monk 6, Open Hand. AC 16, Atk +6, Save DC 14, Speed 45.
const katsebushi = () => make({
  name: 'Katsebushi', classId: 'monk', level: 6, subclassId: 'open-hand', speciesId: 'human', backgroundId: 'criminal',
  scores: { STR: 12, DEX: 14, CON: 13, INT: 8, WIS: 17, CHA: 10 }, scoreMethod: 'standard',
  choices: { 'class.skills': ['acrobatics', 'insight'], 'background.abilities': { mode: '2-1', plus2: 'DEX', plus1: 'INT' }, 'species.skillful.skill': ['perception'], 'species.versatile.feat': ['skilled'], 'species.versatile.feat>skilled.skills': ['athletics', 'history', 'religion'], 'asi-4.asi': { type: 'feat', feat: 'grappler', ability: 'STR' } },
  equipment: { weapons: ['quarterstaff'] },
})

test('Katsebushi gets the same numbers as the old app', () => {
  const d = derive(katsebushi())
  assert.equal(d.scores.DEX.total, 16)
  assert.equal(d.scores.STR.total, 13)
  assert.equal(d.ac.value, 16)
  assert.match(d.ac.sources[0].label, /Unarmored Defense/)
  assert.equal(d.attacks.find((a) => a.id === 'unarmed').toHit, 6)
  assert.equal(d.attacks.find((a) => a.id === 'unarmed').damage, '1d8+3')
  assert.equal(d.speed.value, 45)
  assert.equal(d.actions.find((a) => a.id === 'stunning-strike').save.dc, 14)
  assert.equal(d.resources.find((r) => r.id === 'focus').max, 6)
  assert.equal(d.resources.find((r) => r.id === 'wholeness').max, 3)
  assert.equal(d.initiative.value, 3 + 3, 'criminal gives Alert: DEX + prof')
  assert.equal(d.attacksPerAction, 2)
  assert.equal(d.attacks.find((a) => a.id === 'quarterstaff').damage, '1d8+3', 'monk weapon uses the martial arts die and DEX')
  assert.equal(d.pending.length, 0, JSON.stringify(d.pending.map((p) => p.key)))
  assert.equal(d.hp.value, 8 + 5 * 5 + 6, 'd8 max, average 5 x5, CON +1 x6')
})

test('armor, shield and fighting style: a fighter in chain mail', () => {
  const d = derive(make({ classId: 'fighter', level: 1, speciesId: 'dwarf', backgroundId: 'soldier', scores: { STR: 15, DEX: 10, CON: 14, INT: 8, WIS: 12, CHA: 13 }, scoreMethod: 'standard',
    choices: { 'background.abilities': { mode: '2-1', plus2: 'STR', plus1: 'CON' }, 'fighting-style.style': ['defense'] }, equipment: { armor: 'chain-mail', shield: true, weapons: ['longsword'] } }))
  assert.equal(d.ac.value, 16 + 2 + 1)
  assert.equal(d.hp.value, 10 + 2 + 1, 'd10 + CON 2 + dwarven toughness')
  const ls = d.attacks.find((a) => a.id === 'longsword')
  assert.deepEqual([ls.toHit, ls.damage, ls.versatile], [5, '1d8+3', '1d10+3'])
  assert.ok(d.senses.some((s) => s.name === 'Darkvision' && s.range === 120))
  assert.ok(d.pending.some((p) => p.key === 'class.skills') && d.pending.some((p) => p.key === 'fighter-mastery.weapons'))
  assert.equal(d.pending.find((p) => p.key === 'fighter-mastery.weapons').count, 3)
})

test('rogue: expertise doubles proficiency, sneak attack scales, slippery mind at 15', () => {
  const ch = make({ classId: 'rogue', level: 15, subclassId: 'thief', speciesId: 'halfling', backgroundId: 'criminal', scores: { STR: 8, DEX: 17, CON: 12, INT: 13, WIS: 10, CHA: 14 }, scoreMethod: 'point-buy',
    choices: { 'class.skills': ['stealth', 'perception', 'deception', 'acrobatics'], 'expertise-1.skills': ['stealth', 'perception'] } })
  const d = derive(ch)
  const stealth = d.skills.find((s) => s.id === 'stealth')
  assert.equal(stealth.value, d.mod.DEX + 2 * d.prof)
  assert.equal(d.actions.find((a) => a.id === 'sneak-attack').roll.expr, '8d6')
  assert.ok(d.saves.WIS.prof && d.saves.CHA.prof && d.saves.DEX.prof)
  assert.equal(d.passivePerception, 10 + d.mod.WIS + 2 * d.prof)
})

test('species choices: a red dragonborn resists fire; wood elves are faster; drow see further', () => {
  const dr = derive(make({ speciesId: 'dragonborn', choices: { 'species.draconic-ancestry.ancestry': ['red'] } }))
  assert.deepEqual(dr.resistances, ['fire'])
  assert.equal(derive(make({ speciesId: 'elf', choices: { 'species.elven-lineage.lineage': ['wood'] } })).speed.value, 35)
  assert.equal(derive(make({ speciesId: 'elf', choices: { 'species.elven-lineage.lineage': ['drow'] } })).senses[0].range, 120)
  assert.equal(derive(make({ speciesId: 'goliath' })).speed.value, 35)
})

test('rests: a short rest gives Focus back, Second Wind regains one, a long rest restores HP', () => {
  const ch = make({ classId: 'fighter', level: 4, speciesId: 'human', scores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 8 } })
  ch.state = { ...ch.state, hp: 5, used: { 'second-wind': 3, 'action-surge': 1 } }
  const s = rest(ch, 'short')
  assert.deepEqual([s.used['second-wind'], s.used['action-surge'], s.hp], [2, 0, 5])
  const l = rest(ch, 'long')
  assert.deepEqual([l.used['second-wind'], l.hp], [0, derive(ch).hp.value])
})

test('every class and species derives at every level without errors, and level 20 caps work', () => {
  for (const c of CLASSES) for (const sp of SPECIES) for (let level = 1; level <= 20; level++) {
    const d = derive(make({ classId: c.id, level, subclassId: c.subclasses[0].id, speciesId: sp.id, backgroundId: 'sage', scores: { STR: 15, DEX: 15, CON: 14, INT: 10, WIS: 15, CHA: 8 } }))
    assert.ok(d.hp.value > 0 && d.ac.value >= 10, `${c.id} ${sp.id} ${level}`)
  }
  const monk20 = derive(make({ classId: 'monk', level: 20, scores: { STR: 10, DEX: 20, CON: 10, INT: 10, WIS: 20, CHA: 10 } }))
  assert.deepEqual([monk20.scores.DEX.total, monk20.scores.WIS.total], [24, 24])
})

test('the wizard cannot finish until every choice is made', () => {
  const ch = make({ classId: 'rogue', speciesId: 'human', backgroundId: 'criminal', scoreMethod: 'standard' })
  const r = readyToPlay(ch)
  assert.ok(!r.ok && r.missing.includes('rogue skills'))
})

test('a subclass picked as a choice (level up) counts like one set directly', () => {
  const d = derive(make({ classId: 'monk', level: 3, choices: { subclass: ['open-hand'] } }))
  assert.equal(d.subclass?.id, 'open-hand')
  assert.ok(!d.pending.some((p) => p.key === 'subclass'))
})
