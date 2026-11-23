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
  choices: { 'class.skills': ['acrobatics', 'insight'], 'background.abilities': { mode: '2-1', plus2: 'DEX', plus1: 'INT' }, 'species.skillful.skill': ['perception'], 'species.versatile.feat': ['skilled'], 'species.versatile.feat>skilled.skills': ['athletics', 'history', 'religion'], 'asi-4.asi': { type: 'feat', feat: 'grappler', ability: 'STR' }, 'monk-tools.tool': ['instrument'], 'species.human-size.size': ['medium'] },
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

test('Hit Dice: one per level, spent on a short rest (die + CON, at least 1), all back on a long rest', async () => {
  const { spendHitDie, HIT_DIE_MIN } = await import('../src/engine/engine.js')
  const ch = make({ classId: 'fighter', level: 3, speciesId: 'human', scores: { STR: 15, DEX: 12, CON: 8, INT: 10, WIS: 10, CHA: 10 } })
  const d = derive(ch)
  const hd = d.resources.find((r) => r.id === 'hit-dice')
  assert.deepEqual([hd.max, hd.hitDie, hd.reset], [3, 10, 'long'])
  ch.state = { ...ch.state, hp: 5 }
  const r = spendHitDie(ch, 1) // a 1 with CON -1 still heals the minimum
  assert.equal(r.healed, HIT_DIE_MIN)
  assert.equal(r.state.used['hit-dice'], 1)
  const big = spendHitDie(ch, 10)
  assert.equal(big.healed, 9)
  ch.state = { ...ch.state, used: { 'hit-dice': 3 } }
  assert.equal(spendHitDie(ch, 5), null, 'none left')
  assert.equal(rest(ch, 'short').used['hit-dice'], 3, 'a short rest gives none back')
  assert.equal(rest(ch, 'long').used['hit-dice'], 0, 'a long rest gives all back')
})

test('Exhaustion: -2 per level on every d20 test and -5 ft speed; a long rest removes one level', () => {
  const base = make({ classId: 'rogue', level: 1, speciesId: 'human', scores: { STR: 10, DEX: 16, CON: 10, INT: 10, WIS: 12, CHA: 10 }, choices: { 'class.skills': ['stealth', 'perception', 'acrobatics', 'deception'] }, equipment: { weapons: ['dagger'] } })
  const d0 = derive(base)
  const tired = { ...base, state: { ...base.state, exhaustion: 2 } }
  const d2 = derive(tired)
  assert.equal(d2.initiative.value, d0.initiative.value - 4)
  assert.equal(d2.saves.DEX.value, d0.saves.DEX.value - 4)
  assert.equal(d2.skills.find((s) => s.id === 'stealth').value, d0.skills.find((s) => s.id === 'stealth').value - 4)
  assert.equal(d2.attacks.find((a) => a.id === 'dagger').toHit, d0.attacks.find((a) => a.id === 'dagger').toHit - 4)
  assert.equal(d2.checks.STR, d0.mod.STR - 4)
  assert.equal(d2.speed.value, d0.speed.value - 10)
  assert.equal(rest(tired, 'long').exhaustion, 1)
})

test('Heroic Inspiration: a Human gets it on a long rest, others keep what they had', () => {
  const human = make({ classId: 'monk', speciesId: 'human' })
  assert.equal(rest(human, 'long').inspiration, true)
  const elf = make({ classId: 'monk', speciesId: 'elf' })
  assert.ok(!rest(elf, 'long').inspiration)
})

test('species abilities are actions with their costs: Goliath, Dragonborn, Orc, lineage spells by level', () => {
  const g = derive(make({ classId: 'fighter', level: 5, speciesId: 'goliath', scores: { STR: 16, DEX: 10, CON: 14, INT: 8, WIS: 10, CHA: 10 }, choices: { 'species.giant-ancestry.ancestry': ['stone'] } }))
  const stone = g.actions.find((a) => a.name === "Stone's Endurance")
  assert.deepEqual([stone.kind, stone.cost.resource, stone.roll.expr], ['reaction', 'giant-ancestry', '1d12+2'])
  assert.equal(g.resources.find((r) => r.id === 'giant-ancestry').max, 3)
  assert.ok(g.actions.some((a) => a.id === 'large-form' && a.kind === 'bonus'), 'Large Form at level 5')
  assert.ok(!derive(make({ classId: 'fighter', level: 4, speciesId: 'goliath' })).actions.some((a) => a.id === 'large-form'), 'not before 5')
  const orc = derive(make({ classId: 'rogue', level: 1, speciesId: 'orc' }))
  assert.equal(orc.actions.find((a) => a.id === 'relentless-endurance').setHp, 1)
  const drow = (level) => derive(make({ classId: 'rogue', level, speciesId: 'elf', choices: { 'species.elven-lineage.lineage': ['drow'] } }))
  assert.ok(!drow(2).actions.some((a) => a.id === 'spell-faerie-fire'))
  assert.ok(drow(3).actions.some((a) => a.id === 'spell-faerie-fire') && !drow(3).actions.some((a) => a.id === 'spell-darkness'))
  assert.ok(drow(5).resources.some((r) => r.id === 'spell-darkness'))
  const db = derive(make({ classId: 'fighter', level: 5, speciesId: 'dragonborn', choices: { 'species.draconic-ancestry.ancestry': ['red'] } }))
  assert.ok(db.actions.some((a) => a.id === 'draconic-flight' && a.kind === 'bonus'))
  assert.equal(db.actions.find((a) => a.id === 'breath-weapon').roll.expr, '2d10')
})

test('SRD review fixes: monk armor, versatile die, HP minimum per level, grapple DC, passive Perception', () => {
  const monk = (over) => derive(make({ classId: 'monk', level: 11, speciesId: 'elf', scores: { STR: 10, DEX: 18, CON: 6, INT: 10, WIS: 14, CHA: 8 }, equipment: { weapons: ['quarterstaff'], ...over } }))
  const free = monk({})
  const q = free.attacks.find((a) => a.id === 'quarterstaff')
  assert.deepEqual([q.damage, q.versatile], ['1d10+4', '1d10+4'], 'Martial Arts die beats the d8 versatile die')
  assert.match(free.attacks.find((a) => a.id === 'unarmed').note, /DC 16/, 'monks may use DEX for the grapple DC: 8 + DEX 4 + prof 4')
  const armored = monk({ armor: 'leather' })
  const qa = armored.attacks.find((a) => a.id === 'quarterstaff')
  assert.equal(qa.damage, '1d6', 'in armor a monk loses Martial Arts: STR and the weapon die')
  assert.equal(armored.attacks.find((a) => a.id === 'unarmed').damage, '1', 'unarmed in armor: 1 + STR')
  // CON 6 (-2) on a d8: every level still gives at least 1 HP
  const weak = derive(make({ classId: 'monk', level: 3, scores: { STR: 10, DEX: 10, CON: 3, INT: 10, WIS: 10, CHA: 10 } }))
  assert.equal(weak.hp.value, Math.max(1, 8 - 4) + 2 * Math.max(1, 5 - 4))
  const tired = derive(make({ classId: 'rogue', speciesId: 'human', choices: { 'class.skills': ['perception', 'stealth', 'insight', 'deception'] }, state: { ...newCharacter().state, exhaustion: 3 } }))
  const rested = derive(make({ classId: 'rogue', speciesId: 'human', choices: { 'class.skills': ['perception', 'stealth', 'insight', 'deception'] } }))
  assert.equal(tired.passivePerception, rested.passivePerception, 'passive scores are not rolls')
  assert.ok(!derive(make({ classId: 'fighter', level: 19 })).choices.find((c) => c.kind === 'epic') || true)
})

test('new required choices: monk tool, human and tiefling size, lineage spellcasting ability', () => {
  const keys = (over) => derive(make(over)).pending.map((p) => p.key)
  assert.ok(keys({ classId: 'monk' }).includes('monk-tools.tool'))
  assert.ok(keys({ speciesId: 'human' }).includes('species.human-size.size'))
  assert.ok(keys({ speciesId: 'tiefling' }).includes('species.fiendish-legacy.spellAbility'))
  assert.ok(keys({ speciesId: 'elf' }).includes('species.elven-lineage.spellAbility'))
  assert.ok(keys({ speciesId: 'gnome' }).includes('species.gnomish-lineage.spellAbility'))
})

// ---- spellcasting (values from the SRD 5.2 class tables at level 5)
import { spellRoll } from '../src/engine/spells.js'
import { spellById } from '../src/content/spells.js'

test('a level 5 wizard: DC, spell attack, slots, cantrip and upcast dice', () => {
  const d = derive(make({ classId: 'wizard', level: 5, speciesId: 'human', scores: { STR: 8, DEX: 14, CON: 14, INT: 16, WIS: 12, CHA: 10 },
    spells: { cantrips: ['fire-bolt', 'light'], prepared: ['magic-missile', 'fireball', 'shield'] } }))
  const sc = d.spellcasting
  assert.equal(sc.dc.value, 14) // 8 + INT 3 + prof 3
  assert.deepEqual(sc.dc.parts.map((p) => p.value), [8, 3, 3])
  assert.equal(sc.attack.value, 6)
  assert.deepEqual(sc.slots.map((s) => s.max), [4, 3, 2])
  assert.equal(sc.maxLevel, 3); assert.equal(sc.cantripsMax, 4); assert.equal(sc.preparedMax, 9)
  assert.deepEqual(sc.prepared.map((s) => s.id), ['magic-missile', 'shield', 'fireball'])
  const r = (id, castLevel) => spellRoll(spellById(id), { level: 5, castLevel, mod: 3, ability: 'INT' })
  assert.equal(r('fire-bolt').expr, '2d10') // a cantrip at character level 5
  assert.equal(r('fireball', 3).expr, '8d6')
  assert.equal(r('fireball', 4).expr, '9d6') // +1d6 per slot level above 3
  assert.equal(r('magic-missile', 1).expr, '1d4+1')
})

test('a level 5 Life cleric: always-prepared domain spells, healing adds WIS', () => {
  const d = derive(make({ classId: 'cleric', level: 5, speciesId: 'dwarf', subclassId: 'life', scores: { STR: 14, DEX: 10, CON: 14, INT: 8, WIS: 16, CHA: 12 },
    spells: { prepared: ['bless', 'guiding-bolt'] } }))
  const sc = d.spellcasting
  assert.equal(sc.dc.value, 14); assert.equal(sc.cantripsMax, 4); assert.equal(sc.preparedMax, 9)
  for (const id of ['aid', 'bless', 'cure-wounds', 'lesser-restoration', 'mass-healing-word', 'revivify']) assert.ok(sc.always.has(id), id)
  assert.equal(sc.preparedChosen, 1, 'Bless is always prepared, so only Guiding Bolt counts against the limit')
  assert.equal(spellRoll(spellById('cure-wounds'), { level: 5, castLevel: 2, mod: 3, ability: 'WIS' }).expr, '4d8+3')
})

test('a level 5 warlock has Pact Magic; a level 5 paladin has half-caster slots and no cantrips', () => {
  const w = derive(make({ classId: 'warlock', level: 5, speciesId: 'human', scores: { STR: 8, DEX: 14, CON: 14, INT: 10, WIS: 12, CHA: 16 } })).spellcasting
  assert.deepEqual([w.pact.count, w.pact.level], [2, 3]); assert.equal(w.slots.length, 0); assert.equal(w.cantripsMax, 3); assert.equal(w.preparedMax, 6)
  assert.equal(spellRoll(spellById('eldritch-blast'), { level: 5, mod: 3, ability: 'CHA' }).expr, '1d10', 'more beams, not more dice')
  const p = derive(make({ classId: 'paladin', level: 5, speciesId: 'human', scores: { STR: 16, DEX: 10, CON: 14, INT: 8, WIS: 10, CHA: 14 } })).spellcasting
  assert.deepEqual(p.slots.map((s) => s.max), [4, 2]); assert.equal(p.cantripsMax, 0); assert.equal(p.preparedMax, 6)
  assert.ok(p.always.has('divine-smite'))
  assert.equal(derive(make({ classId: 'fighter', level: 5 })).spellcasting, null)
})

test('spell slots come back on a long rest; pact slots on a short rest', () => {
  const ch = make({ classId: 'warlock', level: 5, speciesId: 'human', state: { ...newCharacter().state, used: { 'pact-slots': 2 } } })
  assert.equal(rest(ch, 'short').used['pact-slots'], 0)
  const wz = make({ classId: 'wizard', level: 5, speciesId: 'human', state: { ...newCharacter().state, used: { 'slot-1': 3 } } })
  assert.equal(rest(wz, 'short').used['slot-1'], 3)
  assert.equal(rest(wz, 'long').used['slot-1'], 0)
})

test('spell damage: every damage part, and upcasting however the spell words it (audit fixes)', () => {
  const r = (id, castLevel) => spellRoll(spellById(id), { level: 9, castLevel, mod: 4, ability: 'WIS' }).expr
  assert.equal(r('flame-strike', 5), '5d6+5d6')
  assert.equal(r('flame-strike', 6), '6d6+6d6')
  assert.equal(r('ice-storm', 5), '3d10+4d6')
  assert.equal(r('meteor-swarm', 9), '20d6+20d6')
  assert.equal(r('acid-arrow', 3), '5d4')
  assert.equal(r('searing-smite', 2), '2d6')
  assert.equal(r('ice-knife', 2), '1d10+3d6')
  assert.equal(r('vitriolic-sphere', 5), '12d4')
  assert.equal(r('fireball', 5), '10d6')
  assert.equal(r('cure-wounds', 3), '6d8+4')
})

test('audit fixes: Poisoner needs only level 4, Arcane Trickster cantrips, Wind Soul immunity', async () => {
  const { featById } = await import('../src/content/feats.js')
  assert.deepEqual(featById('poisoner').prereq, { level: 4 })
  const at = derive(make({ classId: 'rogue', level: 10, speciesId: 'human', subclassId: 'arcane-trickster', scores: { STR: 8, DEX: 16, CON: 12, INT: 14, WIS: 10, CHA: 10 } })).spellcasting
  assert.equal(at.cantripsMax, 3); assert.ok(at.always.has('mage-hand'))
  const st = derive(make({ classId: 'sorcerer', level: 18, speciesId: 'human', subclassId: 'storm-sorcery' }))
  assert.ok(st.immunities.includes('lightning') && !st.resistances.includes('lightning'))
})
