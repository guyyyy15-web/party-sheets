import test from 'node:test'
import assert from 'node:assert/strict'
import { CASTER_CLASSES, BARBARIAN, BARD, CLERIC, DRUID, PALADIN, RANGER, SORCERER, WARLOCK, WIZARD, SLOTS_FULL, SLOTS_HALF, PACT_SLOTS, maxSpellLevel } from '../src/content/casters.js'
import { SPELLS, spellById, spellsFor } from '../src/content/spells.js'
import { SKILLS } from '../src/content/basics.js'

const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']
const LISTS = ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard']
const DICE = /^(\d+d\d+(\+\d+)?|\d+)$/

/** A context like the engine's, for calling feature functions. */
const ctx = (level, mods = {}) => {
  const mod = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0, ...mods }
  return { level, total: level, prof: 2 + Math.floor((level - 1) / 4), mod, armor: null, shield: false,
    proficientSkills: () => [{ id: 'arcana', name: 'Arcana' }], skillOptions: () => SKILLS.map((s) => ({ id: s.id, name: s.name })), pick: () => null, skillSources: () => [], has: () => false }
}
const feature = (cls, id) => [...cls.features, ...cls.subclasses.flatMap((s) => s.features)].find((f) => f.id === id)
const effect = (cls, featureId, type, id) => feature(cls, featureId).effects.find((e) => e.type === type && (!id || e.id === id))
const activeResource = (cls, featureId, id, c) => feature(cls, featureId).effects.find((e) => e.type === 'resource' && e.id === id && (!e.when || e.when(c)))

test('spells: well formed, unique, sorted', () => {
  assert.equal(SPELLS.length, 339)
  const ids = new Set()
  for (const s of SPELLS) {
    assert.match(s.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, s.name)
    assert.ok(!ids.has(s.id), `duplicate ${s.id}`); ids.add(s.id)
    assert.ok(Number.isInteger(s.level) && s.level >= 0 && s.level <= 9, s.name)
    assert.ok(SCHOOLS.includes(s.school), `${s.name} school`)
    for (const k of ['time', 'range', 'components', 'duration', 'summary']) assert.ok(typeof s[k] === 'string' && s[k].length, `${s.name} ${k}`)
    assert.match(s.components, /^(V|S|M)/, s.name)
    assert.equal(s.concentration, s.duration.startsWith('Concentration'), s.name)
    assert.equal(typeof s.ritual, 'boolean')
    assert.ok(s.classes.length && s.classes.every((c) => LISTS.includes(c)), `${s.name} classes`)
    assert.ok(s.summary.length <= 230, `${s.name} summary is ${s.summary.length} chars`)
    if (s.save) assert.ok(ABILITIES.includes(s.save), s.name)
    if (s.attack) assert.ok(['melee', 'ranged'].includes(s.attack), s.name)
    if (s.damage) { assert.match(s.damage.dice, DICE, s.name); assert.ok(s.damage.type, s.name) }
    if (s.heal) assert.match(s.heal.dice, DICE, s.name)
    if (s.cantripScaling) assert.equal(s.level, 0, s.name)
  }
  const sorted = [...SPELLS].sort((a, b) => a.level - b.level || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  assert.deepEqual(SPELLS.map((s) => s.id), sorted.map((s) => s.id))
  const perLevel = SPELLS.reduce((m, s) => ({ ...m, [s.level]: (m[s.level] || 0) + 1 }), {})
  assert.deepEqual(perLevel, { 0: 27, 1: 57, 2: 57, 3: 42, 4: 34, 5: 38, 6: 31, 7: 20, 8: 17, 9: 16 })
})

test('spells: values checked against the SRD 5.2', () => {
  const fb = spellById('fireball')
  assert.deepEqual([fb.level, fb.school, fb.save, fb.damage.dice, fb.damage.type, fb.range], [3, 'Evocation', 'DEX', '8d6', 'fire', '150 feet'])
  assert.equal(fb.damage.higher, '+1d6 per slot level above 3')
  const cw = spellById('cure-wounds')
  assert.deepEqual([cw.level, cw.heal.dice, cw.heal.mod, cw.heal.higher], [1, '2d8', true, '+2d8 per slot level above 1'])
  assert.deepEqual(spellById('healing-word').heal, { dice: '2d4', mod: true, higher: '+2d4 per slot level above 1' })
  assert.equal(spellById('healing-word').time, 'Bonus Action')
  const eb = spellById('eldritch-blast')
  assert.deepEqual([eb.level, eb.attack, eb.damage.dice, eb.damage.type, eb.cantripScaling, eb.classes], [0, 'ranged', '1d10', 'force', true, ['warlock']])
  assert.deepEqual([spellById('fire-bolt').damage.dice, spellById('fire-bolt').damage.type], ['1d10', 'fire'])
  assert.deepEqual([spellById('sacred-flame').save, spellById('sacred-flame').damage.dice], ['DEX', '1d8'])
  assert.equal(spellById('magic-missile').damage.dice, '1d4+1')
  assert.equal(spellById('disintegrate').damage.dice, '10d6+40')
  assert.equal(spellById('heal').heal.dice, '70')
  assert.equal(spellById('shield').time, 'Reaction')
  assert.ok(spellById('detect-magic').ritual && spellById('detect-magic').concentration)
  assert.ok(spellById('find-familiar').ritual && !spellById('find-familiar').concentration)
  assert.deepEqual([spellById('spirit-guardians').save, spellById('spirit-guardians').damage.dice], ['WIS', '3d8'])
  assert.deepEqual(spellById('flame-strike').damage.plus, [{ dice: '5d6', type: 'radiant', up: '1d6' }])
  assert.deepEqual([spellById('hunters-mark').damage.dice, spellById('hunters-mark').classes], ['1d6', ['ranger']])
  assert.equal(spellById('divine-smite').damage.dice, '2d8')
  assert.equal(spellById('wish').level, 9)
  assert.equal(spellById('nope'), null)
})

test('spellsFor filters by class list and level', () => {
  assert.deepEqual(spellsFor('warlock', 0).map((s) => s.id), ['chill-touch', 'eldritch-blast', 'mage-hand', 'minor-illusion', 'poison-spray', 'prestidigitation', 'true-strike'])
  assert.ok(spellsFor('wizard', 1).every((s) => s.level <= 1 && s.classes.includes('wizard')))
  assert.ok(spellsFor('paladin').every((s) => s.level >= 1 && s.level <= 5))
  assert.ok(spellsFor('ranger').some((s) => s.id === 'hunters-mark'))
})

test('slot tables match the SRD', () => {
  assert.equal(SLOTS_FULL.length, 20); assert.equal(SLOTS_HALF.length, 20); assert.equal(PACT_SLOTS.length, 20)
  assert.deepEqual(SLOTS_FULL[0], [2, 0, 0, 0, 0, 0, 0, 0, 0])
  assert.deepEqual(SLOTS_FULL[4].slice(0, 3), [4, 3, 2])
  assert.deepEqual(SLOTS_FULL[19], [4, 3, 3, 3, 3, 2, 2, 1, 1])
  assert.deepEqual(SLOTS_FULL[16], [4, 3, 3, 3, 2, 1, 1, 1, 1])
  assert.deepEqual(SLOTS_HALF[4], [4, 2, 0, 0, 0])
  assert.deepEqual(SLOTS_HALF[19], [4, 3, 3, 3, 2])
  assert.deepEqual(PACT_SLOTS[10], [3, 5], 'warlock 11: three level 5 slots')
  assert.deepEqual(PACT_SLOTS[0], [1, 1])
  assert.deepEqual(PACT_SLOTS[16], [4, 5])
  assert.deepEqual([maxSpellLevel('full', 5), maxSpellLevel('full', 17), maxSpellLevel('half', 9), maxSpellLevel('pact', 7)], [3, 9, 3, 4])
})

test('classes are well formed', () => {
  assert.equal(CASTER_CLASSES.length, 9)
  const skillIds = SKILLS.map((s) => s.id)
  const subclassIds = { barbarian: 'berserker', bard: 'lore', cleric: 'life', druid: 'land', paladin: 'devotion', ranger: 'hunter', sorcerer: 'draconic', warlock: 'fiend', wizard: 'evoker' }
  for (const cls of CASTER_CLASSES) {
    for (const k of ['id', 'name', 'blurb', 'difficulty']) assert.ok(cls[k], `${cls.id} ${k}`)
    assert.ok([6, 8, 10, 12].includes(cls.hitDie))
    assert.equal(cls.saves.length, 2); assert.ok(cls.saves.every((a) => ABILITIES.includes(a)))
    assert.ok(cls.skills.from.every((id) => skillIds.includes(id)) && cls.skills.count >= 2, cls.id)
    assert.ok(cls.packs.length === 2 && cls.packs.every((p) => Number.isInteger(p.gp)), cls.id)
    assert.equal(cls.subclassLevel, 3)
    assert.deepEqual(cls.subclasses.map((s) => s.id), [subclassIds[cls.id]])
    const all = [...cls.features, ...cls.subclasses[0].features]
    const ids = all.map((f) => f.id)
    assert.equal(new Set(ids).size, ids.length, `${cls.id} duplicate feature ids`)
    for (const f of all) {
      assert.ok(f.level >= 1 && f.level <= 20 && f.name && f.summary, `${cls.id} ${f.id}`)
      for (const [, list] of Object.entries(f.alwaysPrepared || {})) for (const id of list) assert.ok(spellById(id), `${f.id}: unknown spell ${id}`)
      for (const ch of f.choices || []) for (const o of ch.options(ctx(20)) || []) for (const [, list] of Object.entries(o.alwaysPrepared || {})) for (const id of list) assert.ok(spellById(id), id)
    }
    assert.deepEqual(cls.features.filter((f) => f.asi === true).map((f) => f.level), [4, 8, 12, 16], cls.id)
    assert.ok(cls.features.some((f) => f.asi === 'epic' && f.level === 19), cls.id)
    // every function in every feature runs at every level without throwing
    for (let lvl = 1; lvl <= 20; lvl++) {
      const c = ctx(lvl, { STR: 3, DEX: 2, CON: 2, INT: 1, WIS: 3, CHA: 4 })
      for (const f of all.filter((x) => x.level <= lvl)) {
        for (const e of f.effects || []) {
          if (e.type === 'resource') assert.ok(Number.isInteger(e.max(c)) && e.max(c) >= 0, `${f.id} max`)
          if (e.value && typeof e.value === 'function') assert.ok(Number.isFinite(e.value(c)), `${f.id} value`)
          if (e.roll) assert.match(e.roll.expr(c), /^\d+d\d+([+-]\d+)?$/, `${f.id} roll`)
          if (e.save?.dc) assert.ok(Number.isFinite(e.save.dc(c)))
          if (typeof e.summary === 'function') assert.ok(e.summary(c))
        }
        for (const ch of f.choices || []) { const n = typeof ch.count === 'function' ? ch.count(c) : ch.count; assert.ok(n >= 1, `${f.id} count`); assert.ok(Array.isArray(ch.options(c))) }
      }
    }
  }
  for (const cls of CASTER_CLASSES.filter((x) => x !== BARBARIAN)) {
    const sc = cls.spellcasting
    assert.ok(['INT', 'WIS', 'CHA'].includes(sc.ability) && sc.kind === 'prepared' && sc.list === cls.id, cls.id)
    assert.equal(sc.cantrips.length, 20); assert.equal(sc.prepared.length, 20)
    assert.ok(['full', 'half', 'pact'].includes(sc.slots))
  }
  assert.equal(BARBARIAN.spellcasting, undefined)
})

test('class values checked against the SRD', () => {
  // Barbarian: rages 2/3/4/5/6 at 1/3/6/12/17, rage damage +2/+3/+4 at 1/9/16, Unarmored Defense 10 + DEX + CON
  const rage = effect(BARBARIAN, 'rage', 'resource')
  assert.deepEqual([1, 2, 3, 5, 6, 11, 12, 16, 17, 20].map((l) => rage.max(ctx(l))), [2, 2, 3, 3, 4, 4, 5, 5, 6, 6])
  assert.deepEqual([1, 8, 9, 15, 16].map(BARBARIAN.scales.rageDamage), [2, 2, 3, 3, 4])
  assert.equal(effect(BARBARIAN, 'barbarian-unarmored-defense', 'ac').value(ctx(1, { DEX: 2, CON: 3 })), 15)
  const bMastery = feature(BARBARIAN, 'barbarian-mastery').choices[0]
  assert.deepEqual([1, 4, 10].map((l) => bMastery.count(ctx(l))), [2, 3, 4])
  assert.equal(effect(BARBARIAN, 'barbarian-extra-attack', 'attacks').value(), 2)
  // Bard: inspiration die d6/d8/d10/d12 at 1/5/10/15, uses = CHA (min 1), long rest until 5 then short
  assert.deepEqual([1, 4, 5, 9, 10, 14, 15, 20].map(BARD.scales.bardicDie), ['d6', 'd6', 'd8', 'd8', 'd10', 'd10', 'd12', 'd12'])
  assert.equal(activeResource(BARD, 'bardic-inspiration', 'bardic-inspiration', ctx(1, { CHA: 3 })).max(ctx(1, { CHA: 3 })), 3)
  assert.equal(activeResource(BARD, 'bardic-inspiration', 'bardic-inspiration', ctx(1, { CHA: -1 })).max(ctx(1, { CHA: -1 })), 1)
  assert.equal(activeResource(BARD, 'bardic-inspiration', 'bardic-inspiration', ctx(4)).reset, 'long')
  assert.equal(activeResource(BARD, 'bardic-inspiration', 'bardic-inspiration', ctx(5)).reset, 'short')
  assert.deepEqual(BARD.spellcasting.prepared.slice(0, 5), [4, 5, 6, 7, 9])
  assert.deepEqual([BARD.spellcasting.cantrips[0], BARD.spellcasting.cantrips[3], BARD.spellcasting.cantrips[9]], [2, 3, 4])
  // Cleric: Channel Divinity 2/3/4 at 2/6/18, Divine Spark dice
  const cd = effect(CLERIC, 'cleric-channel-divinity', 'resource')
  assert.deepEqual([2, 5, 6, 17, 18].map((l) => cd.max(ctx(l))), [2, 2, 3, 3, 4])
  assert.equal(effect(CLERIC, 'cleric-channel-divinity', 'action', 'divine-spark').roll.expr(ctx(13, { WIS: 4 })), '3d8+4')
  assert.deepEqual(CLERIC.spellcasting.cantrips.slice(0, 10), [3, 3, 3, 4, 4, 4, 4, 4, 4, 5])
  // Druid: Wild Shape 2/3/4 at 2/6/17
  const ws = effect(DRUID, 'wild-shape', 'resource')
  assert.deepEqual([2, 5, 6, 16, 17].map((l) => ws.max(ctx(l))), [2, 2, 3, 3, 4])
  // Paladin: Lay on Hands = 5 x level, Channel Divinity 2 then 3 at 11
  assert.deepEqual([1, 7, 20].map((l) => effect(PALADIN, 'lay-on-hands', 'resource').max(ctx(l))), [5, 35, 100])
  assert.deepEqual([3, 10, 11].map((l) => effect(PALADIN, 'paladin-channel-divinity', 'resource').max(ctx(l))), [2, 2, 3])
  assert.equal(effect(PALADIN, 'paladins-smite', 'action').roll.expr(ctx(2)), '2d8')
  assert.deepEqual(PALADIN.spellcasting.prepared, [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15])
  // Ranger: free Hunter's Mark 2/3/4/5/6 at 1/5/9/13/17, d10 at 20
  const fe = effect(RANGER, 'favored-enemy', 'resource')
  assert.deepEqual([1, 4, 5, 9, 13, 17].map((l) => fe.max(ctx(l))), [2, 2, 3, 4, 5, 6])
  assert.deepEqual([1, 20].map((l) => effect(RANGER, 'favored-enemy', 'action').roll.expr(ctx(l))), ['1d6', '1d10'])
  // Sorcerer: Sorcery Points = sorcerer level from 2; metamagic 2/4/6; 4 cantrips at 1
  assert.deepEqual([2, 7, 20].map((l) => effect(SORCERER, 'font-of-magic', 'resource').max(ctx(l))), [2, 7, 20])
  assert.equal(feature(SORCERER, 'font-of-magic').level, 2)
  assert.deepEqual([2, 10, 17].map((l) => feature(SORCERER, 'metamagic').choices[0].count(ctx(l))), [2, 4, 6])
  assert.equal(SORCERER.spellcasting.cantrips[0], 4)
  assert.equal(effect(SORCERER, 'draconic-resilience', 'ac').value(ctx(3, { DEX: 2, CHA: 3 })), 15)
  // Warlock: pact slots short rest, invocations 1/3/5/.../10
  assert.equal(effect(WARLOCK, 'pact-magic', 'resource').reset, 'short')
  assert.equal(effect(WARLOCK, 'pact-magic', 'resource').max(ctx(11)), 3)
  assert.deepEqual([1, 2, 5, 7, 9, 12, 15, 18].map((l) => feature(WARLOCK, 'eldritch-invocations').choices[0].count(ctx(l))), [1, 3, 5, 6, 7, 8, 9, 10])
  assert.deepEqual(WARLOCK.spellcasting.pactSlots[10], [3, 5])
  // Wizard: Arcane Recovery = half the level, rounded up; prepared 25 at 20
  assert.match(effect(WIZARD, 'arcane-recovery', 'action').summary(ctx(5)), /up to 3 levels/)
  assert.equal(effect(WIZARD, 'arcane-recovery', 'resource').reset, 'long')
  assert.equal(WIZARD.spellcasting.prepared[19], 25)
  // Spell save DC: 8 + ability + proficiency
  assert.equal(effect(WIZARD, 'wizard-spellcasting', 'note').save.dc(ctx(5, { INT: 4 })), 15)
  // slot resources on a full caster at 5: 4/3/2
  const slots = feature(WIZARD, 'wizard-spellcasting').effects.filter((e) => e.type === 'resource').map((e) => e.max(ctx(5)))
  assert.deepEqual(slots, [4, 3, 2, 0, 0, 0, 0, 0, 0])
})
