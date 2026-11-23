// The rules engine: a character is only its choices and its current state; everything on the sheet is derived here.
// Pure (no DOM), tested in tests/engine.test.mjs.
import { spellcastingOf } from './spells.js'
import { ABILITIES, SKILLS, armorById, weaponById, isRanged, MASTERY } from '../content/basics.js'
import { classById } from '../content/classes.js'
import { speciesById } from '../content/species.js'
import { backgroundById } from '../content/backgrounds.js'
import { featById, FEATS } from '../content/feats.js'
import { EXHAUSTION } from '../content/conditions.js'

// Short rest healing per Hit Die spent: the die + CON, at least this much. Long rest: all spent Hit Dice come back.
export const HIT_DIE_MIN = 1
export const LONG_REST_HIT_DICE = 'all'

export const abilityMod = (score) => Math.floor((score - 10) / 2)
export const profBonus = (level) => 2 + Math.floor((level - 1) / 4)
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)
const call = (v, c) => (typeof v === 'function' ? v(c) : v)

/** A new, empty character (the wizard fills it in). */
export function newCharacter() {
  return {
    v: 1, id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: '', portrait: null, theme: null,
    classId: null, level: 1, subclassId: null, speciesId: null, backgroundId: null,
    scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }, scoreMethod: null,
    choices: {}, hpRolls: {}, equipment: { pack: null, armor: null, shield: false, weapons: [], gp: 0, items: '' },
    state: { hp: null, temp: 0, used: {}, conditions: [], deathSaves: { ok: 0, fail: 0 }, inspiration: false },
    pinned: [], notes: '', overrides: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}

/**
 * Every feature this character has, in order (class, subclass, species, background, feats), each with the key under
 * which its choices are stored. A feat chosen inside a choice becomes a feature of its own.
 */
function collectFeatures(ch) {
  const out = []
  const cls = classById(ch.classId)
  const add = (f, source, keyBase) => {
    if (f.level && f.level > (source === 'species' ? ch.level : ch.level)) return
    const key = keyBase || f.id
    out.push({ ...f, source, key })
    // feats picked in this feature's choices
    for (const choice of f.choices || []) {
      if (choice.kind !== 'feat') continue
      for (const id of ch.choices[`${key}.${choice.key}`] || []) {
        const feat = featById(id)
        if (feat) add(feat, 'feat', `${key}.${choice.key}>${id}`)
      }
    }
  }
  if (cls) {
    for (const f of cls.features) if (f.level <= ch.level) add(f, 'class')
    const sub = cls.subclasses.find((s) => s.id === ch.subclassId)
    if (sub && ch.level >= cls.subclassLevel) for (const f of sub.features) if (f.level <= ch.level) add(f, 'subclass')
  }
  const sp = speciesById(ch.speciesId)
  if (sp) for (const f of sp.features) add(f, 'species', `species.${f.id}`)
  const bg = backgroundById(ch.backgroundId)
  if (bg) {
    const feat = featById(bg.feat)
    if (feat) add(feat, 'background', `background>${feat.id}`)
  }
  // feats taken instead of an ASI
  if (cls) for (const f of cls.features) {
    if (!f.asi || f.level > ch.level) continue
    const pick = ch.choices[`${f.id}.asi`]
    if (pick?.type === 'feat' && featById(pick.feat)) add(featById(pick.feat), 'feat', `${f.id}.asi>${pick.feat}`)
  }
  return out
}

/** Ability scores with where each point came from. */
function computeScores(ch, features) {
  const out = {}
  for (const a of ABILITIES) out[a] = { base: ch.scores[a] || 10, total: ch.scores[a] || 10, sources: [{ label: 'Base', value: ch.scores[a] || 10, kind: 'base' }] }
  const plus = (a, n, label, max = 20) => {
    if (!out[a]) return
    const room = Math.max(0, max - out[a].total)
    const v = Math.min(n, room)
    if (v) { out[a].total += v; out[a].sources.push({ label, value: v, kind: 'bonus' }) }
  }
  const bg = backgroundById(ch.backgroundId)
  const bgPick = ch.choices['background.abilities']
  if (bg && bgPick) {
    if (bgPick.mode === '2-1') { plus(bgPick.plus2, 2, `${bg.name} background`); plus(bgPick.plus1, 1, `${bg.name} background`) } else for (const a of bg.abilities) plus(a, 1, `${bg.name} background`)
  }
  const cls = classById(ch.classId)
  for (const f of cls?.features || []) {
    if (!f.asi || f.level > ch.level) continue
    const pick = ch.choices[`${f.id}.asi`]
    if (!pick) continue
    const label = `Level ${f.level} ${pick.type === 'feat' ? featById(pick.feat)?.name || 'feat' : 'ASI'}`
    if (pick.type === 'plus2') plus(pick.ability, 2, label)
    else if (pick.type === 'plus1') for (const a of pick.abilities || []) plus(a, 1, label)
    else if (pick.type === 'feat' && pick.ability) plus(pick.ability, 1, label, featById(pick.feat)?.category === 'epic' ? 30 : 20)
  }
  for (const f of features) for (const e of f.effects || []) if (e.type === 'score') plus(e.ability, e.value, f.name, e.max || 20)
  for (const a of ABILITIES) out[a].mod = abilityMod(out[a].total)
  return out
}

/**
 * Choices the character still has to make, in the order the wizard and level-up show them:
 * { key, label, count, kind, options:[{id,name,summary}], picked, featureName, source }.
 */
function openChoices(ch, features, ctx) {
  const list = []
  const cls = classById(ch.classId)
  const bg = backgroundById(ch.backgroundId)
  if (cls && ch.level >= cls.subclassLevel && !cls.subclasses.some((s) => s.id === ch.subclassId)) {
    list.push({ key: 'subclass', label: `${cls.name} subclass`, count: 1, kind: 'subclass', options: cls.subclasses.map((s) => ({ id: s.id, name: s.name, summary: s.summary, source: s.source, expansion: !!s.expansion })), picked: [], source: 'class', level: cls.subclassLevel })
  }
  if (cls) {
    const picked = ch.choices['class.skills'] || []
    list.push({ key: 'class.skills', label: `${cls.name} skills`, count: cls.skills.count, kind: 'skill', options: cls.skills.from.map((id) => ({ id, name: SKILLS.find((s) => s.id === id).name, taken: ctx.skillSources(id).filter((s) => s !== `${cls.name}`).length > 0 })), picked, source: 'class', level: 1 })
  }
  if (bg) list.push({ key: 'background.abilities', label: `${bg.name}: ability scores`, count: 1, kind: 'bg-abilities', options: bg.abilities.map((a) => ({ id: a, name: a })), picked: ch.choices['background.abilities'] ? [1] : [], source: 'background', level: 1 })
  for (const f of features) {
    for (const choice of f.choices || []) {
      const key = `${f.key}.${choice.key}`
      if (f.source === 'background' && f.id === 'magic-initiate' && bg?.featChoice?.[choice.key]) continue // fixed by the background
      const count = call(choice.count, ctx)
      list.push({ key, label: choice.label, featureName: f.name, count, kind: choice.kind || 'pick', options: call(choice.options, ctx), picked: ch.choices[key] || [], source: f.source, level: f.level || 1 })
    }
    if (f.asi && f.source === 'class') {
      const key = `${f.id}.asi`
      list.push({ key, label: f.asi === 'epic' ? 'Epic Boon' : 'Ability Score Improvement', featureName: f.name, count: 1, kind: f.asi === 'epic' ? 'epic' : 'asi', options: [], picked: ch.choices[key] ? [1] : [], source: 'class', level: f.level })
    }
  }
  return list.map((c) => ({ ...c, done: c.kind === 'asi' || c.kind === 'epic' || c.kind === 'bg-abilities' ? c.picked.length > 0 : c.picked.length >= c.count }))
}

/** The derived sheet. Every number carries its sources, so the sheet can say where it came from. */
export function derive(input) {
  // the subclass can be picked like any other choice (level up) or set directly (old saves)
  const ch = { ...input, subclassId: input.choices?.subclass?.[0] || input.subclassId || null }
  const cls = classById(ch.classId)
  const sp = speciesById(ch.speciesId)
  const bg = backgroundById(ch.backgroundId)
  const level = ch.level || 1
  const features = collectFeatures(ch)
  const scores = computeScores(ch, features)
  const mod = Object.fromEntries(ABILITIES.map((a) => [a, scores[a].mod]))
  const prof = profBonus(level)
  const armor = armorById(ch.equipment?.armor)
  const shield = !!ch.equipment?.shield
  const exhaustion = Math.max(0, Math.min(EXHAUSTION.max, ch.state?.exhaustion || 0))
  const d20Pen = exhaustion * EXHAUSTION.d20PerLevel // every d20 test: attacks, saves, checks, initiative
  const penSource = d20Pen ? [{ label: `Exhaustion level ${exhaustion}`, value: -d20Pen, kind: 'penalty' }] : []

  // proficiencies
  const skillProf = new Map() // id → [sources]
  const addSkill = (id, label) => { if (!skillProf.has(id)) skillProf.set(id, []); skillProf.get(id).push(label) }
  for (const id of ch.choices['class.skills'] || []) addSkill(id, cls?.name || 'Class')
  for (const id of bg?.skills || []) addSkill(id, `${bg.name} background`)
  const expertise = new Set()
  const saveProf = new Set(cls?.saves || [])

  const ctx = {
    ch, level, total: level, prof, mod, score: Object.fromEntries(ABILITIES.map((a) => [a, scores[a].total])), armor, shield,
    pick: (featureId, key) => (ch.choices[`${featureId}.${key}`] || ch.choices[`species.${featureId}.${key}`] || [])[0],
    skillSources: (id) => skillProf.get(id) || [],
    proficientSkills: () => [...skillProf.keys()].map((id) => ({ id, name: SKILLS.find((s) => s.id === id)?.name || id })),
    skillOptions: () => SKILLS.map((s) => ({ id: s.id, name: s.name })),
    has: (featId) => features.some((f) => f.id === featId),
  }

  // option effects (a chosen option can carry effects, e.g. a dragon's resistance)
  const effects = []
  for (const f of features) {
    for (const e of f.effects || []) effects.push({ ...e, from: f.name })
    for (const choice of f.choices || []) {
      const picked = ch.choices[`${f.key}.${choice.key}`] || []
      if (choice.kind === 'skill') for (const id of picked) addSkill(id, f.name)
      if (choice.kind === 'expertise') for (const id of picked) expertise.add(id)
      if (choice.kind === 'feat' || choice.kind === 'weapon' || choice.kind === 'skill' || choice.kind === 'expertise') continue
      const options = call(choice.options, ctx) || []
      for (const id of picked) for (const e of options.find((o) => o.id === id)?.effects || []) effects.push({ ...e, from: f.name })
    }
  }
  const active = effects.filter((e) => !e.when || e.when(ctx))
  for (const e of active) if (e.type === 'prof') for (const a of e.saves || []) saveProf.add(a)

  // AC: the best base formula, then bonuses
  const acBases = [{ label: armor ? `${armor.name} (${armor.base}${armor.dexMax === 0 ? '' : ` + DEX${armor.dexMax ? ` max ${armor.dexMax}` : ''}`})` : 'No armor (10 + DEX)', value: armor ? armor.base + (armor.dexMax === null ? mod.DEX : Math.min(armor.dexMax, mod.DEX)) : 10 + mod.DEX }]
  for (const e of active) if (e.type === 'ac') acBases.push({ label: e.label, value: e.value(ctx) })
  const acBase = acBases.reduce((a, b) => (b.value > a.value ? b : a))
  const ac = { value: acBase.value, sources: [{ ...acBase, kind: 'base' }] }
  if (shield) { ac.value += 2; ac.sources.push({ label: 'Shield', value: 2, kind: 'bonus' }) }
  const bonus = (target) => active.filter((e) => e.type === 'bonus' && e.target === target).map((e) => ({ label: e.label || e.from, value: e.value(ctx), kind: 'bonus' }))
  for (const b of bonus('ac')) { ac.value += b.value; ac.sources.push(b) }
  if (ch.overrides?.ac != null) ac.override = ch.overrides.ac

  // speed
  let baseSpeed = sp?.speed || 30
  for (const e of active) if (e.type === 'speed') baseSpeed = Math.max(baseSpeed, e.value)
  const speed = { value: baseSpeed, sources: [{ label: `${sp?.name || 'Base'} speed`, value: baseSpeed, kind: 'base' }] }
  for (const b of bonus('speed')) { speed.value += b.value; speed.sources.push(b) }
  if (armor?.str && ctx.score.STR < armor.str) { speed.value -= 10; speed.sources.push({ label: `${armor.name} needs STR ${armor.str}`, value: -10, kind: 'penalty' }) }
  if (exhaustion) { const v = -EXHAUSTION.speedPerLevel * exhaustion; speed.value = Math.max(0, speed.value + v); speed.sources.push({ label: `Exhaustion level ${exhaustion}`, value: v, kind: 'penalty' }) }

  // HP: max die at level 1, then the rolled or average value per level, + CON each level
  const hitDie = cls?.hitDie || 8
  const hp = { value: 0, sources: [] }
  if (cls) {
    // each level: the die (max at level 1, then rolled or average) + CON, at least 1 per level
    hp.sources.push({ label: `Level 1: d${hitDie} max ${signed(mod.CON)} CON`, value: Math.max(1, hitDie + mod.CON), kind: 'base' })
    let rest = 0
    for (let l = 2; l <= level; l++) rest += Math.max(1, (ch.hpRolls?.[l] ?? Math.floor(hitDie / 2) + 1) + mod.CON)
    if (level > 1) hp.sources.push({ label: `Levels 2-${level}: d${hitDie} ${signed(mod.CON)} CON each`, value: rest, kind: 'base' })
    for (const b of bonus('hpMax')) hp.sources.push(b)
    for (const e of active) if (e.type === 'hp') hp.sources.push({ label: e.label || e.from, value: e.value(ctx), kind: 'bonus' })
    hp.value = Math.max(1, hp.sources.reduce((t, s) => t + s.value, 0))
  }

  const initiative = { value: mod.DEX, sources: [{ label: `DEX modifier (score ${scores.DEX.total})`, value: mod.DEX, kind: 'ability' }, ...bonus('initiative'), ...penSource] }
  initiative.value = initiative.sources.reduce((t, s) => t + s.value, 0)

  // "where each number comes from", in words a player can redo at the table
  const abilityPart = (a) => ({ label: `${a} modifier (score ${scores[a].total})`, value: mod[a], kind: 'ability' })
  const profPart = (why) => ({ label: `Proficiency bonus (${why})`, value: prof, kind: 'prof' })
  const saves = Object.fromEntries(ABILITIES.map((a) => [a, { prof: saveProf.has(a), value: mod[a] + (saveProf.has(a) ? prof : 0) - d20Pen,
    parts: [abilityPart(a), ...(saveProf.has(a) ? [profPart(`proficient in ${a} saves`)] : []), ...penSource] }]))
  const checks = Object.fromEntries(ABILITIES.map((a) => [a, mod[a] - d20Pen]))
  const checkParts = Object.fromEntries(ABILITIES.map((a) => [a, [abilityPart(a), ...penSource]]))
  const skills = SKILLS.map((s) => {
    const p = skillProf.has(s.id), ex = expertise.has(s.id) && p
    const parts = [abilityPart(s.ability), ...(ex ? [{ label: `Expertise: proficiency bonus x2 (${s.name})`, value: 2 * prof, kind: 'expertise' }] : p ? [profPart(`proficient in ${s.name}`)] : []), ...penSource]
    return { ...s, prof: p, expertise: ex, value: mod[s.ability] + (ex ? 2 * prof : p ? prof : 0) - d20Pen, sources: skillProf.get(s.id) || [], parts }
  })
  // passive scores aren't rolls, so Exhaustion (which reduces d20 rolls) leaves them alone
  const passivePerception = 10 + skills.find((s) => s.id === 'perception').value + d20Pen

  // resources (with what is used right now)
  const resources = []
  for (const e of active) if (e.type === 'resource' && !resources.some((r) => r.id === e.id)) {
    const max = e.max(ctx)
    if (max > 0) resources.push({ id: e.id, name: e.name, max, reset: e.reset, short: e.short, used: Math.min(max, ch.state?.used?.[e.id] || 0) })
  }

  if (cls) {
    const hitDie = cls.hitDie
    resources.push({ id: 'hit-dice', name: `Hit Dice (d${hitDie})`, max: level, reset: 'long', hitDie, used: Math.min(level, ch.state?.used?.['hit-dice'] || 0), hitDice: true })
  }

  // attacks: weapons + unarmed strike
  const monkWeapons = active.some((e) => e.type === 'monk-weapons')
  const maDie = cls?.scales?.martialArts?.(level)
  const masteries = new Set(features.flatMap((f) => (f.choices || []).filter((c) => c.kind === 'weapon').flatMap((c) => ch.choices[`${f.key}.${c.key}`] || [])))
  const crit = Math.min(20, ...active.filter((e) => e.type === 'crit').map((e) => e.value(ctx)), 20)
  const proficientWith = (wp) => {
    const kinds = cls?.weapons || []
    if (kinds.includes(wp.cat.split('-')[0])) return true
    if (kinds.includes('martial-light') && wp.props.includes('light')) return true
    if (kinds.includes('martial-finesse-light') && (wp.props.includes('finesse') || wp.props.includes('light'))) return true
    return false
  }
  const attacks = []
  const dieSize = (d) => Number(String(d).split('d')[1] || 1)
  for (const id of ch.equipment?.weapons || []) {
    const wp = weaponById(id)
    if (!wp) continue
    const isMonkWeapon = monkWeapons && (wp.cat === 'simple-melee' || (wp.cat === 'martial-melee' && wp.props.includes('light')))
    const useDex = isRanged(wp) || wp.props.includes('finesse') || isMonkWeapon
    const ability = useDex && (isRanged(wp) || mod.DEX >= mod.STR) ? 'DEX' : 'STR'
    let die = wp.dmg
    if (isMonkWeapon && maDie && dieSize(maDie) > dieSize(wp.dmg) && !wp.dmg.startsWith('2')) die = `1${maDie}`
    const why = isMonkWeapon && ability === 'DEX' ? 'Martial Arts lets a monk use DEX' : ability === 'DEX' ? (isRanged(wp) ? 'ranged weapons use DEX' : 'Finesse: the better of STR and DEX') : 'melee weapons use STR'
    const toHitParts = [{ label: `${ability} modifier (score ${scores[ability].total}; ${why})`, value: mod[ability], kind: 'ability' }]
    if (proficientWith(wp)) toHitParts.push(profPart(`proficient with ${wp.name}s`))
    if (isRanged(wp)) toHitParts.push(...bonus('attack.ranged'))
    toHitParts.push(...penSource)
    const toHit = toHitParts.reduce((t, s) => t + s.value, 0)
    let vDie = wp.versatile
    if (vDie && isMonkWeapon && maDie && dieSize(maDie) > dieSize(vDie)) vDie = `1${maDie}`
    const damageParts = mod[ability] ? [{ label: `${ability} modifier (the same one as the attack)`, value: mod[ability], kind: 'ability' }] : []
    attacks.push({ id: wp.id, name: wp.name, toHit, toHitSources: toHitParts, damageParts, damageDie: die, dieWhy: die !== wp.dmg ? `your Martial Arts die (${die.slice(1)}) instead of the ${wp.name}'s ${wp.dmg}` : `the ${wp.name}'s damage die`, damage: `${die}${mod[ability] ? signed(mod[ability]) : ''}`, type: wp.type, props: wp.props, range: wp.range, versatile: vDie && `${vDie}${signed(mod[ability])}`, mastery: masteries.has(wp.id) ? { name: wp.mastery, text: MASTERY[wp.mastery] } : null, crit })
  }
  const unarmedAbility = monkWeapons && mod.DEX > mod.STR ? 'DEX' : 'STR'
  attacks.push({
    id: 'unarmed', name: 'Unarmed Strike', toHit: mod[unarmedAbility] + prof - d20Pen, toHitSources: [{ label: `${unarmedAbility} modifier (score ${scores[unarmedAbility].total}${unarmedAbility === 'DEX' ? '; Martial Arts lets a monk use DEX' : ''})`, value: mod[unarmedAbility], kind: 'ability' }, profPart('everyone is proficient with Unarmed Strikes'), ...penSource],
    damageParts: monkWeapons && maDie ? [{ label: `${unarmedAbility} modifier`, value: mod[unarmedAbility], kind: 'ability' }] : [{ label: 'Unarmed Strike: 1', value: 1, kind: 'base' }, { label: `STR modifier (score ${scores.STR.total})`, value: mod.STR, kind: 'ability' }],
    damageDie: monkWeapons && maDie ? `1${maDie}` : null, dieWhy: monkWeapons && maDie ? `your Martial Arts die (${maDie})` : null,
    damage: monkWeapons && maDie ? `1${maDie}${signed(mod[unarmedAbility])}` : `${Math.max(0, 1 + mod.STR)}`, type: 'bludgeoning', props: [], crit,
    note: `Or Grapple / Shove (DC ${8 + (monkWeapons ? Math.max(mod.STR, mod.DEX) : mod.STR) + prof})`,
  })
  const spellcasting = spellcastingOf({ ch, cls, features, ctx, level, mod, prof, d20Pen, penSource })
  const attacksPerAction = Math.max(1, ...active.filter((e) => e.type === 'attacks').map((e) => e.value(ctx)))

  // actions for "My Turn"
  const actions = [{ id: 'attack', name: 'Attack', kind: 'action', summary: `${attacksPerAction} attack${attacksPerAction > 1 ? 's' : ''} with a weapon or Unarmed Strike.` }]
  for (const e of active) if (e.type === 'action' && !actions.some((a) => a.id === e.id)) {
    actions.push({ id: e.id, name: e.name, kind: e.kind, summary: call(e.summary, ctx), cost: e.cost, roll: e.roll && { label: e.roll.label, expr: e.roll.expr(ctx), parts: e.roll.parts ? e.roll.parts(ctx) : null, why: e.roll.why || null }, save: e.save && { ability: e.save.ability, dc: e.save.dc(ctx) }, heal: !!e.heal, min: e.min, refill: e.refill, setHp: e.setHp, attack: e.attack, count: e.count && e.count(ctx), from: e.from })
  }
  for (const e of active) if (e.type === 'note' && e.save) actions.push({ id: `note-${e.from}`, name: e.from, kind: 'info', summary: e.save.label, save: { dc: e.save.dc(ctx) } })

  const senses = active.filter((e) => e.type === 'sense').map((e) => ({ name: e.name, range: e.range }))
  const immunities = [...new Set(active.filter((e) => e.type === 'immune').map((e) => e.damage))]
  const resistances = [...new Set(active.filter((e) => e.type === 'resist').map((e) => e.damage))].filter((x) => !immunities.includes(x))
  const choices = openChoices(ch, features, ctx)

  return {
    name: ch.name, level, cls, species: sp, background: bg, subclass: cls?.subclasses.find((s) => s.id === ch.subclassId) || null,
    scores, mod, prof, ac, speed, hp, hitDie, initiative, saves, checks, checkParts, skills, passivePerception, spellcasting, resources, attacks, attacksPerAction, actions,
    exhaustion, d20Pen, inspiration: !!ch.state?.inspiration, conditions: ch.state?.conditions || [],
    senses, resistances, immunities, features: features.map((f) => ({ id: f.id, key: f.key, name: f.name, summary: f.summary, level: f.level, source: f.source })),
    choices, pending: choices.filter((c) => !c.done), armor, shield, crit,
  }
}

/** What a short or long rest gives back (as the new state). */
export function rest(ch, kind) {
  const d = derive(ch)
  const used = { ...(ch.state.used || {}) }
  for (const r of d.resources) {
    if (kind === 'long' || r.reset === 'short') used[r.id] = 0
    else if (r.short && kind === 'short') used[r.id] = Math.max(0, (used[r.id] || 0) - r.short)
  }
  const state = { ...ch.state, used }
  if (kind === 'long') {
    // 8 hours: every concentration spell has ended (a short rest leaves it to the player: Find the Path lasts a day)
    Object.assign(state, { concentration: null, hp: d.hp.value, temp: 0, deathSaves: { ok: 0, fail: 0 }, exhaustion: Math.max(0, (ch.state.exhaustion || 0) - 1) })
    if (LONG_REST_HIT_DICE !== 'all') used['hit-dice'] = Math.max(0, (ch.state.used?.['hit-dice'] || 0) - Math.max(1, Math.floor(d.level / 2)))
    if (d.features.some((f) => f.id === 'resourceful')) state.inspiration = true // Human: Heroic Inspiration on every long rest
  } else used['hit-dice'] = ch.state.used?.['hit-dice'] || 0 // a short rest gives no Hit Dice back
  return state
}

/** Spend one Hit Die on a short rest: `roll` is the die's face. Returns { state, healed } or null when none are left. */
export function spendHitDie(ch, roll) {
  const d = derive(ch)
  const hd = d.resources.find((r) => r.id === 'hit-dice')
  if (!hd || hd.used >= hd.max) return null
  const healed = Math.max(HIT_DIE_MIN, roll + d.mod.CON)
  const hp = Math.min(d.hp.value, (ch.state.hp ?? d.hp.value) + healed)
  return { healed, state: { ...ch.state, hp, used: { ...ch.state.used, 'hit-dice': hd.used + 1 } } }
}

/** Things the wizard needs to check before "Finish". */
export function readyToPlay(ch) {
  const d = derive(ch)
  const missing = []
  if (!ch.name?.trim()) missing.push('a name')
  if (!d.cls) missing.push('a class')
  if (!d.species) missing.push('a species')
  if (!d.background) missing.push('a background')
  if (!ch.scoreMethod) missing.push('ability scores')
  for (const c of d.pending) missing.push(c.label.toLowerCase())
  return { ok: !missing.length, missing }
}

export { FEATS, featById }
