// Spellcasting for the derived sheet (pure, no DOM): spell save DC and spell attack with their parts, slots, which
// spells are prepared (chosen + always prepared), and the dice of each spell at a given slot level.
import { maxSpellLevel, SLOTS_FULL, SLOTS_HALF, PACT_SLOTS } from '../content/casters.js'
import { SPELLS, spellById } from '../content/spells.js'

const call = (v, c) => (typeof v === 'function' ? v(c) : v)

/** Damage dice of a cantrip grow at character levels 5, 11 and 17. */
export const cantripDice = (level) => (level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1)

/** `+1d6 per slot level above 3` → { n: 1, sides: 6 }; anything else (extra targets, darts) → null. */
export function upcastDice(text) {
  const m = /^\+(\d+)d(\d+) per slot level above \d/.exec(text || '')
  return m ? { n: +m[1], sides: +m[2] } : null
}

/**
 * The roll for a spell's damage or healing: { expr, parts, why, type, heal } or null.
 * Every damage part counts (Flame Strike is fire + radiant). A part's `up` is the dice it gains per slot level
 * above the spell's level; without one, the main part reads the `higher` text ("+1d6 per slot level above 3").
 * castLevel = the slot it's cast with (ignored for cantrips); mod = the spellcasting modifier.
 */
export function spellRoll(spell, { level, castLevel, mod, ability }) {
  const eff = spell.damage || spell.heal
  if (!eff?.dice) return null
  const groups = [{ dice: eff.dice, type: eff.type, up: eff.up }, ...(spell.heal ? [] : eff.plus || [])]
  const above = spell.level > 0 ? Math.max(0, (castLevel || spell.level) - spell.level) : 0
  const why = []
  const dice = []
  let flat = 0
  groups.forEach((g, gi) => {
    const m = /^(\d+)d(\d+)(?:\+(\d+))?$/.exec(String(g.dice).replace(/\s/g, ''))
    if (!m) return
    let n = +m[1]
    const sides = +m[2]
    flat += +(m[3] || 0)
    if (spell.level === 0 && spell.cantripScaling && !spell.beams && gi === 0) {
      const k = cantripDice(level)
      if (k > 1) why.push(`Cantrip at character level ${level}: ${k}× the dice (more at levels 5, 11 and 17).`)
      n *= k
    }
    const upM = g.up ? /^(\d+)d(\d+)$/.exec(g.up) : null
    const up = upM ? { n: +upM[1], sides: +upM[2] } : gi === 0 ? upcastDice(eff.higher) : null
    const add = []
    if (up && above) { if (up.sides === sides) n += up.n * above; else add.push(`${up.n * above}d${up.sides}`) }
    dice.push(`${n}d${sides}`, ...add)
  })
  if (!dice.length) return null
  if (above && groups.some((g, gi) => g.up || (gi === 0 && upcastDice(eff.higher)))) why.push(`Cast with a level ${castLevel} slot, ${above} level${above > 1 ? 's' : ''} above: ${eff.higher || 'more dice'}.`)
  const parts = []
  if (flat) parts.push({ label: 'Spell bonus', value: flat, kind: 'bonus' })
  if (eff.mod) parts.push({ label: `${ability} modifier (spellcasting)`, value: mod, kind: 'ability' })
  const bonus = parts.reduce((t, p) => t + p.value, 0)
  const types = spell.heal ? 'healing' : [...new Set(groups.map((g) => g.type).filter(Boolean))].join(' + ')
  if (groups.length > 1 && !spell.heal) why.push(`Two kinds of damage, rolled together: ${groups.map((g) => `${g.dice} ${g.type}${g.note ? ` (${g.note})` : ''}`).join(' and ')}.`)
  return { expr: `${dice.join('+')}${bonus ? (bonus > 0 ? `+${bonus}` : bonus) : ''}`, parts, why: why.join(' ') || null, type: types, heal: !!spell.heal }
}

/**
 * Everything the sheet needs about this character's spellcasting, or null for a class without it.
 * features: the collected features (with .key); ctx: the engine's context; penSource: Exhaustion parts.
 */
export function spellcastingOf({ ch, cls, features, ctx, level, mod, prof, d20Pen, penSource }) {
  const sub = cls?.subclasses?.find((s) => s.id === ch.subclassId)
  const sc = cls?.spellcasting || (sub?.spellcasting && level >= (cls.subclassLevel || 3) ? sub.spellcasting : null)
  if (!sc) return null
  const ab = sc.ability, m = mod[ab], i = Math.min(20, Math.max(1, level)) - 1
  const abilityPart = { label: `${ab} modifier (${cls.spellcasting ? cls.name : sub.name} spellcasting)`, value: m, kind: 'ability' }
  const profPart = { label: 'Proficiency bonus', value: prof, kind: 'prof' }
  const dc = { value: 8 + m + prof, parts: [{ label: 'Base', value: 8, kind: 'base' }, abilityPart, profPart] }
  const attack = { value: m + prof - d20Pen, parts: [abilityPart, profPart, ...penSource] }

  const table = sc.table ? sc.table.map((row) => [...row, ...Array(9 - row.length).fill(0)]) : null // a subclass's own slot table, by class level
  const maxLevel = table ? table[i].reduce((m, n, k) => (n > 0 ? k + 1 : m), 0) : maxSpellLevel(sc.slots, level)
  const used = (id) => ch.state?.used?.[id] || 0
  const slots = sc.slots === 'pact' ? [] : (table || (sc.slots === 'half' ? SLOTS_HALF : SLOTS_FULL))[i].map((max, k) => ({ level: k + 1, max, used: Math.min(max, used(`slot-${k + 1}`)), id: `slot-${k + 1}` })).filter((s) => s.max > 0)
  const pact = sc.slots === 'pact' ? { count: PACT_SLOTS[i][0], level: PACT_SLOTS[i][1], used: Math.min(PACT_SLOTS[i][0], used('pact-slots')), id: 'pact-slots' } : null

  // always prepared: from features, from a chosen option (a druid's land), and spells picked in feature choices
  const always = new Map() // id → where from
  const addAlways = (map, from) => { for (const [lvl, ids] of Object.entries(map || {})) if (level >= +lvl) for (const id of ids) if (spellById(id) && !always.has(id)) always.set(id, from) }
  for (const f of features) {
    addAlways(f.alwaysPrepared, f.name)
    for (const choice of f.choices || []) {
      const picked = ch.choices?.[`${f.key}.${choice.key}`] || []
      if (!picked.length) continue
      if (choice.kind === 'pick') { for (const id of picked) if (spellById(id) && !always.has(id)) always.set(id, f.name); continue }
      if (choice.kind && choice.kind !== 'pick') continue
      const options = call(choice.options, ctx) || []
      for (const id of picked) addAlways(options.find((o) => o.id === id)?.alwaysPrepared, f.name)
    }
  }

  // which lists new spells may come from (a Bard's Magical Secrets adds three lists at level 10)
  const lists = [sc.list, ...(features.some((f) => f.id === 'magical-secrets') ? ['cleric', 'druid', 'wizard'] : [])]
  const onList = (s) => s.classes.some((c) => lists.includes(c))
  const cantripOptions = SPELLS.filter((s) => s.level === 0 && onList(s))
  const spellOptions = SPELLS.filter((s) => s.level > 0 && s.level <= maxLevel && onList(s))

  const chosenC = (ch.spells?.cantrips || []).filter((id) => spellById(id)?.level === 0)
  const chosenP = (ch.spells?.prepared || []).filter((id) => { const s = spellById(id); return s && s.level > 0 && s.level <= maxLevel && !always.has(id) })
  const cantrips = [...new Set([...chosenC, ...[...always.keys()].filter((id) => spellById(id).level === 0)])].map(spellById)
  const prepared = [...new Set([...[...always.keys()].filter((id) => spellById(id).level > 0), ...chosenP])].map(spellById).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
  const conc = ch.state?.concentration ? spellById(ch.state.concentration) : null

  return {
    ability: ab, mod: m, dc, attack, maxLevel, slots, pact, lists, ritual: !!sc.ritual, focus: sc.focus, spellbook: !!sc.spellbook,
    cantripsMax: sc.cantrips[i] || 0, preparedMax: sc.prepared[i] || 0,
    cantripsChosen: chosenC.length, preparedChosen: chosenP.length,
    cantrips, prepared, always, cantripOptions, spellOptions, concentration: conc,
  }
}
