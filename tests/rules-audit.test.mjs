// The rules audit (2026-11-25): spells on other characters (buffs), what fires after a hit, when you are hit, after a
// casting, and resistances. Every number checked against the SRD 5.2.1 / the 2024 PHB.
import test from 'node:test'
import assert from 'node:assert/strict'
import { derive, newCharacter, rest } from '../src/engine/engine.js'
import { makeBuff, applyBuff, removeBuffs, buffTargets, cleanBuff } from '../src/engine/buffs.js'
import { hitRiders, smiteExpr, hurtOptions, finalDamage, spellDamageParts, castTriggers } from '../src/engine/riders.js'
import { turnStartPatch, endConcentration, newTurn, used as usedTurn } from '../src/ui/turnstate.js'
import { spellById } from '../src/content/spells.js'
import { rollD20With } from '../src/dice.js'

const make = (over) => Object.assign(newCharacter(), { name: 'Test', speciesId: 'human' }, over)
const mira = { id: 'cmira', name: 'Mira', mod: 3 }
const cast = (id, slot) => makeBuff(spellById(id), { slot: slot ?? spellById(id).level, caster: mira })
const fighter = (over = {}) => make({ name: 'Aria', classId: 'fighter', level: 5, scores: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 10, CHA: 10 }, equipment: { armor: 'chain-mail', weapons: ['longsword', 'shortbow'] }, ...over })
const withBuffs = (ch, ...buffs) => ({ ...ch, state: { ...ch.state, buffs } })
const fixed = (...faces) => { const q = [...faces]; return () => (q.shift() - 1) / 20 + 0.001 } // only for d20s

// ── buffs: numbers and sources

test('Shield of Faith (from Mira): +2 AC, with its source', () => {
  const base = derive(fighter()).ac.value
  const d = derive(withBuffs(fighter(), cast('shield-of-faith')))
  assert.equal(d.ac.value, base + 2)
  assert.deepEqual(d.ac.sources.at(-1), { label: 'Shield of Faith (from Mira)', value: 2, kind: 'bonus' })
})

test('Bless: +1d4 on attack rolls and saving throws, rolled with the d20', () => {
  const d = derive(withBuffs(fighter(), cast('bless')))
  for (const a of d.attacks) assert.deepEqual(a.toHitDice, [{ dice: '1d4', label: 'Bless (from Mira)' }])
  for (const ab of ['STR', 'DEX', 'WIS']) assert.deepEqual(d.saves[ab].dice, [{ dice: '1d4', label: 'Bless (from Mira)' }])
  assert.equal(d.attacks[0].toHit, derive(fighter()).attacks[0].toHit, 'the fixed number stays the same: the die is rolled')
  // a d20 of 12 and a d4 of 3 with +5: 20
  const r = rollD20With(5, 'normal', d.attacks[0].toHitDice, Math.random, [12, 3])
  assert.deepEqual([r.kept, r.extra[0].total, r.total], [12, 3, 20])
  // Bane takes it off
  const b = rollD20With(5, 'normal', [{ dice: '-1d4', label: 'Bane' }], Math.random, [12, 3])
  assert.equal(b.total, 14)
  // advantage: two d20s first, then the d4
  const adv = rollD20With(0, 'adv', [{ dice: '1d4', label: 'Bless' }], Math.random, [4, 15, 2])
  assert.deepEqual([adv.kept, adv.total], [15, 17])
  assert.equal(buffTargets(spellById('bless'), 1), 3); assert.equal(buffTargets(spellById('bless'), 3), 5)
})

test('Haste: +2 AC, speed doubled, advantage on DEX saves; lethargy when it ends', () => {
  const plain = derive(fighter({ equipment: { armor: 'leather', weapons: [] } }))
  const ch = withBuffs(fighter({ equipment: { armor: 'leather', weapons: [] } }), cast('haste'))
  const d = derive(ch)
  assert.equal(d.ac.value, plain.ac.value + 2)
  assert.equal(d.speed.value, plain.speed.value * 2)
  assert.deepEqual(d.saves.DEX.adv, ['Haste (from Mira)'])
  assert.deepEqual(d.saves.STR.adv, [])
  // the caster's concentration ends: Haste goes, lethargy stays until the end of the target's next turn
  const after = removeBuffs(ch.state.buffs, { from: 'cmira', conc: true })
  assert.equal(after.length, 1); assert.equal(after[0].name, 'Haste: lethargy')
  assert.equal(derive(withBuffs(ch, ...after)).speed.value, 0)
  const t1 = turnStartPatch({ buffs: after }, d).buffs; assert.equal(t1.length, 1, 'still there during that turn')
  assert.equal(turnStartPatch({ buffs: t1 }, d).buffs.length, 0, 'gone at the next one')
})

test('Aid: +5 max HP per target (+5 per slot above 2) and current HP up too; Barkskin AC floor 17; Mage Armor 13 + DEX', () => {
  const ch = fighter()
  const base = derive(ch).hp.value
  assert.equal(derive(withBuffs(ch, cast('aid'))).hp.value, base + 5)
  assert.equal(derive(withBuffs(ch, cast('aid', 4))).hp.value, base + 15)
  assert.equal(applyBuff({ hp: 20 }, cast('aid', 3)).hp, 30)
  assert.equal(applyBuff({ hp: null }, cast('aid', 3)).hp, undefined, 'full HP (null) stays full')
  const wiz = make({ classId: 'wizard', level: 1, scores: { STR: 8, DEX: 14, CON: 12, INT: 16, WIS: 10, CHA: 10 } })
  assert.equal(derive(wiz).ac.value, 12)
  assert.equal(derive(withBuffs(wiz, cast('barkskin'))).ac.value, 17)
  assert.equal(derive(withBuffs(wiz, cast('mage-armor'))).ac.value, 15)
  assert.equal(derive(withBuffs(fighter({ equipment: { armor: 'plate' } }), cast('barkskin'))).ac.value, 18, 'already above 17: no change')
})

test('Heroism: temp HP = the caster\'s modifier at the start of each turn; Shield lasts until your next turn', () => {
  const d = derive(withBuffs(fighter(), cast('heroism')))
  assert.equal(d.turnTemp.value, 3)
  assert.equal(turnStartPatch({ temp: 0, buffs: [cast('heroism')] }, d).temp, 3)
  assert.equal(turnStartPatch({ temp: 5, buffs: [cast('heroism')] }, d).temp, undefined, 'temp HP don\'t stack: 5 stays')
  const sh = makeBuff(spellById('shield'), { caster: { id: 'cme', name: 'Me' } })
  const wiz = make({ id: 'cme', classId: 'wizard', level: 1, scores: { STR: 8, DEX: 14, CON: 12, INT: 16, WIS: 10, CHA: 10 } })
  assert.equal(derive(withBuffs(wiz, sh)).ac.value, 17)
  assert.equal(turnStartPatch({ buffs: [sh] }, derive(wiz)).buffs.length, 0)
})

test('the same spell doesn\'t stack; long rest ends every buff; concentration ending queues the others', () => {
  const twice = applyBuff(applyBuff({}, cast('bless')), cast('bless'))
  assert.equal(twice.buffs.length, 1)
  const st = { concentration: 'bless', concTargets: ['caria', 'cbrom'], buffs: [makeBuff(spellById('bless'), { caster: { id: 'cme', name: 'Me' } }), cast('aid')] }
  const e = endConcentration(st, 'cme')
  assert.deepEqual(e.buffs.map((b) => b.spell), ['aid'])
  assert.deepEqual(e.concEnds, ['caria', 'cbrom']); assert.deepEqual(e.concTargets, [])
  const r = rest({ ...fighter(), state: { ...fighter().state, ...st, hp: 1 } }, 'long')
  assert.deepEqual(r.buffs, []); assert.deepEqual(r.concEnds, ['caria', 'cbrom'])
  assert.equal(cleanBuff({ ...cast('bless'), effects: [{ on: 'attack', dice: '50d6' }] }), null)
  assert.equal(cleanBuff({ ...cast('bless'), effects: [{ on: 'level', value: 20 }] }), null)
})

test('Rage: resist B/P/S, +rage damage on STR attacks only, advantage on STR checks and saves', () => {
  const barb = make({ classId: 'barbarian', level: 9, scores: { STR: 18, DEX: 14, CON: 16, INT: 8, WIS: 10, CHA: 10 }, equipment: { weapons: ['greataxe', 'shortbow'] } })
  const rage = derive(barb).actions.find((a) => a.id === 'rage')
  assert.ok(rage.buff && rage.endsConcentration)
  const d = derive(withBuffs(barb, cleanBuff({ ...rage.buff, id: 'r1', spell: 'rage', from: barb.id, fromName: 'Me' })))
  assert.deepEqual(d.resistances.sort(), ['bludgeoning', 'piercing', 'slashing'])
  assert.equal(d.attacks.find((a) => a.id === 'greataxe').damage, '1d12+7', 'STR +4, rage +3 at level 9')
  assert.equal(d.attacks.find((a) => a.id === 'shortbow').damage, '1d6+2', 'a DEX attack gets no rage damage')
  assert.ok(d.saves.STR.adv.length && d.checkAdv.STR.length)
  assert.ok(!derive(make({ ...barb, equipment: { armor: 'plate' } })).actions.some((a) => a.id === 'rage'), 'no Rage in heavy armor')
})

test('Enlarge: +1d4 weapon damage, in the expression and the math', () => {
  const d = derive(withBuffs(fighter(), cast('enlarge-reduce')))
  const ls = d.attacks.find((a) => a.id === 'longsword')
  assert.equal(ls.damage, '1d8+1d4+3')
  assert.deepEqual(ls.dieWhys, ["the Longsword's damage die", 'Enlarge (from Mira)'])
})

// ── after a hit

const opt = (d, id) => { const a = d.attacks.find((x) => x.id === id); return { kind: 'attack', weapon: a.id === 'unarmed' ? null : a.icon || a.id, unarmed: a.id === 'unarmed', ability: a.ability, name: a.name } }

test('Sneak Attack: only with a Finesse or ranged weapon, once per turn', () => {
  const rogue = make({ classId: 'rogue', level: 5, scores: { STR: 10, DEX: 16, CON: 12, INT: 10, WIS: 12, CHA: 10 }, equipment: { weapons: ['rapier', 'club', 'shortbow'] } })
  const d = derive(rogue)
  const sa = (id, st = rogue.state) => hitRiders(d, st, opt(d, id)).find((r) => r.id === 'sneak-attack')
  assert.equal(sa('rapier').expr, '3d6'); assert.ok(sa('shortbow'))
  assert.equal(sa('club'), undefined, 'a club is neither finesse nor ranged')
  assert.equal(sa('unarmed'), undefined)
  assert.ok(sa('rapier', { ...rogue.state, turn: usedTurn(newTurn(), { once: { id: 'sneak-attack', name: 'Sneak Attack' } }) }).locked)
})

test('Divine Smite: after a melee hit, a slot (or the free use): 2d8, +1d8 per slot above 1, +1d8 vs Fiends/Undead', () => {
  const pal = make({ classId: 'paladin', level: 5, scores: { STR: 16, DEX: 10, CON: 14, INT: 8, WIS: 10, CHA: 16 }, equipment: { weapons: ['longsword', 'longbow'] } })
  const d = derive(pal)
  const ds = hitRiders(d, pal.state, opt(d, 'longsword')).find((r) => r.id === 'spell:divine-smite')
  assert.ok(ds && ds.kind === 'bonus')
  assert.deepEqual(ds.slots.map((s) => [s.id, s.level]), [['paladins-smite', 1], ['slot-1', 1], ['slot-2', 2]])
  assert.equal(smiteExpr(ds.spell, 1), '2d8'); assert.equal(smiteExpr(ds.spell, 2), '3d8'); assert.equal(smiteExpr(ds.spell, 2, { vs: true }), '3d8+1d8')
  assert.equal(hitRiders(d, pal.state, opt(d, 'longbow')).find((r) => r.id === 'spell:divine-smite'), undefined, 'not with a ranged weapon')
  assert.equal(d.actions.find((a) => a.id === 'divine-smite').cost.resource, 'paladins-smite', 'the free cast is spent')
})

test('Hunter\'s Mark and Hex add their die to every hit while you concentrate on them', () => {
  const ranger = make({ classId: 'ranger', level: 3, scores: { STR: 10, DEX: 16, CON: 12, INT: 10, WIS: 14, CHA: 8 }, equipment: { weapons: ['longbow'] } })
  const d = derive(ranger)
  assert.equal(hitRiders(d, ranger.state, opt(d, 'longbow')).find((r) => r.id === 'hunters-mark'), undefined)
  const hm = hitRiders(d, { ...ranger.state, concentration: 'hunters-mark' }, opt(d, 'longbow')).find((r) => r.id === 'hunters-mark')
  assert.deepEqual([hm.expr, hm.type, hm.perTurn], ['1d6', 'force', false])
  assert.equal(d.actions.find((a) => a.id === 'hunters-mark').concentration, 'hunters-mark', 'the free cast is a concentration spell too')
})

test('Great Weapon Master: +PB on a Heavy weapon hit only; Colossus Slayer once a turn; Savage Attacker once a turn', () => {
  const ch = fighter({ level: 4, choices: { 'asi-4.asi': { type: 'feat', feat: 'great-weapon-master', ability: 'STR' } }, equipment: { weapons: ['greatsword', 'longsword'] } })
  const d = derive(ch)
  assert.equal(hitRiders(d, ch.state, opt(d, 'greatsword')).find((r) => r.id === 'gwm-damage').expr, '2')
  assert.equal(hitRiders(d, ch.state, opt(d, 'longsword')).find((r) => r.id === 'gwm-damage'), undefined)
  const hunter = make({ classId: 'ranger', level: 3, subclassId: 'hunter', choices: { 'hunters-prey.option': ['colossus-slayer'] }, equipment: { weapons: ['longbow'] } })
  const dh = derive(hunter)
  const cs = hitRiders(dh, hunter.state, opt(dh, 'longbow')).find((r) => r.id === 'colossus-slayer')
  assert.equal(cs.expr, '1d8'); assert.ok(cs.perTurn)
  const soldier = make({ classId: 'fighter', backgroundId: 'soldier', equipment: { weapons: ['longsword'] } })
  assert.ok(derive(soldier).actions.find((a) => a.id === 'savage-attacker').perTurn)
})

// ── when you are hit

test('When hit: Shield (+5 AC with a slot), Uncanny Dodge (half), Deflect Attacks (B/P/S only until Deflect Energy)', () => {
  const wiz = make({ classId: 'wizard', level: 3, scores: { STR: 8, DEX: 14, CON: 12, INT: 16, WIS: 10, CHA: 10 }, spells: { cantrips: [], prepared: ['shield'] } })
  const sh = hurtOptions(derive(wiz), wiz.state).find((o) => o.id === 'spell:shield')
  assert.deepEqual([sh.effect, sh.value, sh.canPay, sh.slot.id], ['ac', 5, true, 'slot-1'])
  const spent = { ...wiz.state, used: { 'slot-1': 4, 'slot-2': 2 } }
  assert.equal(hurtOptions(derive(wiz), spent).find((o) => o.id === 'spell:shield').canPay, false)
  const rogue = make({ classId: 'rogue', level: 5 })
  assert.equal(hurtOptions(derive(rogue), rogue.state).find((o) => o.id === 'uncanny-dodge').effect, 'halve')
  const monk = make({ classId: 'monk', level: 3 })
  assert.deepEqual(hurtOptions(derive(monk), monk.state).find((o) => o.id === 'deflect').types, ['bludgeoning', 'piercing', 'slashing'])
  const monk13 = make({ classId: 'monk', level: 13 })
  assert.equal(hurtOptions(derive(monk13), monk13.state).find((o) => o.id === 'deflect').types, null, 'Deflect Energy: any type')
})

test('Damage taken: reductions, then halving, then resistance (round down), then vulnerability; immunity is 0', () => {
  assert.equal(finalDamage(15, { type: 'fire', resistances: ['fire'] }).total, 7)
  assert.equal(finalDamage(15, { type: 'cold', resistances: ['fire'] }).total, 15)
  assert.equal(finalDamage(15, { type: 'fire', immunities: ['fire'] }).total, 0)
  assert.equal(finalDamage(15, { type: 'fire', vulnerabilities: ['fire'] }).total, 30)
  assert.equal(finalDamage(21, { type: 'slashing', resistances: ['slashing'], halve: true }).total, 5, '21 → 10 (Uncanny Dodge) → 5 (Rage)')
  assert.equal(finalDamage(20, { type: 'slashing', reduce: [{ label: 'Deflect Attacks', value: 12 }], resistances: ['slashing'] }).total, 4)
  assert.equal(finalDamage(9, { type: null, resistances: ['fire'] }).total, 9, 'unknown type: no change')
  // Heavy Armor Master: B/P/S from an attack, by PB, in heavy armor
  const ham = fighter({ level: 4, equipment: { armor: 'plate' }, choices: { 'asi-4.asi': { type: 'feat', feat: 'heavy-armor-master', ability: 'STR' } } })
  const d = derive(ham)
  assert.deepEqual(d.reductions.map((r) => [r.id, r.value]), [['heavy-armor-master', 2]])
  assert.equal(finalDamage(10, { type: 'piercing', reductions: d.reductions }).total, 8)
  assert.equal(finalDamage(10, { type: 'fire', reductions: d.reductions }).total, 10)
  assert.equal(finalDamage(10, { type: 'piercing', reductions: d.reductions, attack: false }).total, 10)
  assert.deepEqual(derive({ ...ham, equipment: { armor: 'leather' } }).reductions, [])
})

test('Species and feature resistances reach the damage prompt (a red dragonborn resists fire)', () => {
  const d = derive(make({ speciesId: 'dragonborn', choices: { 'species.draconic-ancestry.ancestry': ['red'] } }))
  assert.ok(d.resistances.includes('fire'))
  assert.equal(finalDamage(11, { type: 'fire', resistances: d.resistances }).total, 5)
})

// ── spell damage modifiers and after a casting

test('Spell damage modifiers: Agonizing Blast, Empowered Evocation, Potent Spellcasting', () => {
  const lock = make({ classId: 'warlock', level: 2, scores: { STR: 8, DEX: 14, CON: 12, INT: 10, WIS: 10, CHA: 16 }, choices: { 'eldritch-invocations.invocations': ['agonizing-blast'] }, spells: { cantrips: ['eldritch-blast'], prepared: [] } })
  const dl = derive(lock)
  const inv = Object.keys(lock.choices)[0]
  if (dl.spellDamage.length) assert.deepEqual(spellDamageParts(dl, spellById('eldritch-blast')), [{ label: 'Agonizing Blast', value: 3, kind: 'bonus' }])
  else assert.fail(`Agonizing Blast not found under ${inv}: ${JSON.stringify(dl.choices.map((c) => c.key))}`)
  const evo = make({ classId: 'wizard', level: 10, subclassId: 'evoker', scores: { STR: 8, DEX: 14, CON: 12, INT: 18, WIS: 10, CHA: 10 } })
  const de = derive(evo)
  assert.deepEqual(spellDamageParts(de, spellById('fireball')), [{ label: 'Empowered Evocation', value: 4, kind: 'bonus' }])
  assert.deepEqual(spellDamageParts(de, spellById('chill-touch')), [], 'Necromancy: no')
  const cleric = make({ classId: 'cleric', level: 7, scores: { STR: 10, DEX: 10, CON: 14, INT: 10, WIS: 18, CHA: 10 }, choices: { 'blessed-strikes.option': ['potent-spellcasting'] }, spells: { cantrips: ['sacred-flame'], prepared: [] } })
  assert.deepEqual(spellDamageParts(derive(cleric), spellById('sacred-flame')), [{ label: 'Potent Spellcasting', value: 4, kind: 'bonus' }])
})

test('After a casting: Wild Magic Surge after a Sorcerer slot spell (once a turn); Beguiling Magic only Enchantment/Illusion with a slot', () => {
  const sorc = make({ classId: 'sorcerer', level: 3, subclassId: 'wild-magic' })
  const d = derive(sorc)
  assert.ok(castTriggers(d, spellById('burning-hands'), { slot: true }).some((a) => a.id === 'wild-magic-check'))
  assert.ok(!castTriggers(d, spellById('burning-hands'), { slot: false }).some((a) => a.id === 'wild-magic-check'))
  assert.ok(!castTriggers(d, spellById('burning-hands'), { slot: true, turn: { once: { 'wild-magic-check': true } } }).some((a) => a.id === 'wild-magic-check'))
  const bard = make({ classId: 'bard', level: 3, subclassId: 'glamour' })
  const db = derive(bard)
  assert.ok(castTriggers(db, spellById('charm-person'), { slot: true }).some((a) => a.id === 'beguiling-magic'))
  assert.ok(!castTriggers(db, spellById('cure-wounds'), { slot: true }).some((a) => a.id === 'beguiling-magic'))
})

test('Advantage from features: Danger Sense (DEX saves), Feral Instinct (initiative)', () => {
  const d = derive(make({ classId: 'barbarian', level: 7 }))
  assert.deepEqual(d.saves.DEX.adv, ['Danger Sense'])
  assert.deepEqual(d.initiative.adv, ['Feral Instinct'])
})
