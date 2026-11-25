// What can happen around a hit (pure, tested in tests/rules-audit.test.mjs):
//  - hitRiders: what you may add right after you hit (Sneak Attack, Divine Smite, Hunter's Mark…), with its cost
//    and its once-per-turn lock;
//  - hurtOptions + finalDamage: when you are hit (Shield, Uncanny Dodge, Deflect Attacks, Parry…), then
//    resistance / vulnerability / immunity by damage type;
//  - spellDamageParts: modifiers added to a spell's damage roll (Potent Spellcasting, Empowered Evocation…);
//  - castTriggers: features offered right after a casting.
import { spellRoll } from './spells.js'
import { spellById } from '../content/spells.js'
import { weaponById, isRanged } from '../content/basics.js'
import { ON_CAST } from '../content/triggers.js'

export const DAMAGE_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder']
const PHYSICAL = ['bludgeoning', 'piercing', 'slashing']

/** The facts about an attack that riders care about. `t` is a turn option (src/ui/turn.jsx turnOptions). */
export function attackFacts(t) {
  const wp = t.weapon ? weaponById(t.weapon) : null
  const props = wp?.props || t.props || []
  const ranged = wp ? isRanged(wp) : !!t.ranged
  return {
    spell: !!t.spell, unarmed: !!t.unarmed, weapon: !!wp, melee: (!!wp && !ranged) || !!t.unarmed, ranged: !!wp && ranged,
    finesse: props.includes('finesse'), heavy: props.includes('heavy'), str: t.ability === 'STR', attack: t.kind === 'attack',
  }
}
const fits = (needs, f, unarmedToo) => {
  if (!f.attack) return false
  switch (needs) {
    case 'any': return true
    case 'weapon': return f.weapon || (unarmedToo && f.unarmed)
    case 'melee': return f.melee
    case 'unarmed': return f.unarmed
    case 'finesse-ranged': return f.weapon && (f.finesse || f.ranged)
    case 'heavy': return f.weapon && f.heavy
    case 'str': return (f.weapon || f.unarmed) && f.str
    default: return false
  }
}
const hasBuff = (state, spell) => (state?.buffs || []).some((b) => b.spell === spell)

/**
 * Everything you may add right after hitting with `t`: [{ id, name, source, kind, cost, perTurn, locked, expr, why,
 * type, ask, spell, slots }]. Spells cast on a hit (smites) list the slots that can pay for them.
 */
export function hitRiders(d, state, t) {
  const f = attackFacts(t)
  const once = state?.turn?.once || {}
  const left = (id) => { const r = d.resources.find((x) => x.id === id); return r ? r.max - Math.min(r.max, state?.used?.[id] || 0) : 0 }
  const out = []
  for (const a of d.actions) {
    const h = a.onHit
    if (!h || !fits(h.needs, f, h.unarmed)) continue
    if (h.buff && !hasBuff(state, h.buff)) continue
    if (a.id === 'divine-smite') continue // offered below as the spell (slot or the free use)
    const expr = a.roll?.expr ?? (h.value != null ? String(h.value) : null)
    out.push({ id: a.id, name: a.name, kind: a.kind === 'bonus' ? 'bonus' : 'free', cost: a.cost || null, canPay: !a.cost || left(a.cost.resource) >= a.cost.amount,
      perTurn: !!(h.perTurn || a.perTurn), locked: !!((h.perTurn || a.perTurn) && once[a.id]), expr, parts: a.roll?.parts || null, why: a.roll?.why || null,
      type: h.type || null, ask: h.ask || null, save: a.save || null, summary: a.summary })
  }
  // concentration spells that add damage to each of your hits
  const conc = state?.concentration
  if ((conc === 'hunters-mark' || conc === 'hex') && f.attack) {
    const foe = conc === 'hunters-mark' && d.features.some((x) => x.id === 'foe-slayer')
    out.push({ id: conc, name: conc === 'hex' ? 'Hex' : 'Hunter’s Mark', kind: 'free', cost: null, canPay: true, perTurn: false, locked: false,
      expr: foe ? '1d10' : '1d6', type: conc === 'hex' ? 'necrotic' : 'force', why: `${conc === 'hex' ? 'Hex' : 'Hunter’s Mark'}: ${foe ? '1d10' : '1d6'} on every hit on the marked target.`, ask: 'Is this the marked target?' })
  }
  // spells you cast right after a hit (Divine Smite, Searing Smite…): a bonus action, and the turn's one slot
  const sc = d.spellcasting
  if (sc) {
    for (const s of sc.prepared.filter((x) => x.afterHit && fits(x.afterHit.needs, f, true))) {
      const slots = [
        ...(s.id === 'divine-smite' && left('paladins-smite') > 0 ? [{ id: 'paladins-smite', level: 1, free: true, left: left('paladins-smite') }] : []),
        ...sc.slots.filter((x) => x.level >= s.level).map((x) => ({ id: x.id, level: x.level, left: x.max - Math.min(x.max, state?.used?.[x.id] || 0) })),
        ...(sc.pact && sc.pact.level >= s.level ? [{ id: 'pact-slots', level: sc.pact.level, left: sc.pact.count - Math.min(sc.pact.count, state?.used?.['pact-slots'] || 0) }] : []),
      ].filter((x) => x.left > 0)
      out.push({ id: `spell:${s.id}`, name: s.name, kind: 'bonus', spell: s, slots, canPay: slots.length > 0, perTurn: false, locked: false, type: s.damage?.type || null, summary: s.summary, vs: s.afterHit.vs || null, noDamageNow: !!s.afterHit.noDamageNow })
    }
  }
  return out
}
/** A smite's damage at a slot level (with the extra die against its creature types). */
export function smiteExpr(s, level, { vs = false } = {}) {
  const r = spellRoll(s, { level: 0, castLevel: level, mod: 0, ability: '' })
  if (!r) return null
  return vs && s.afterHit?.vs ? `${r.expr}+${s.afterHit.vs.dice}` : r.expr
}

/** What you can do when an attack hits you: [{ id, name, effect, value, roll, cost, canPay, types, melee }]. */
export function hurtOptions(d, state) {
  const left = (id) => { const r = d.resources.find((x) => x.id === id); return r ? r.max - Math.min(r.max, state?.used?.[id] || 0) : 0 }
  const out = d.actions.filter((a) => a.onHurt).map((a) => ({ id: a.id, name: a.name, effect: a.onHurt.effect, value: a.onHurt.value, melee: !!a.onHurt.melee, types: a.onHurt.types,
    roll: a.roll || null, cost: a.cost || null, canPay: !a.cost || left(a.cost.resource) >= a.cost.amount, summary: a.summary }))
  // the Shield spell, if you have it ready
  const sc = d.spellcasting
  const shield = sc && [...sc.prepared, ...(d.featSpells || []).map((x) => x.spell)].find((s) => s.id === 'shield')
  if (shield) {
    const slot = [...sc.slots.filter((x) => x.max - Math.min(x.max, state?.used?.[x.id] || 0) > 0), ...(sc.pact && sc.pact.count - Math.min(sc.pact.count, state?.used?.['pact-slots'] || 0) > 0 ? [{ id: 'pact-slots', level: sc.pact.level }] : [])][0]
    out.unshift({ id: 'spell:shield', name: 'Shield', effect: 'ac', value: 5, spell: spellById('shield'), slot: slot || null, canPay: !!slot, summary: '+5 AC until your next turn, including against this attack.' })
  }
  return out
}

/**
 * The damage you actually take. Order (2024 rules): reductions first (Deflect, Parry, Heavy Armor Master, halving
 * by Uncanny Dodge), then resistance (half, round down), then vulnerability (double). Immunity: none.
 * { amount, type, resist, vuln, immune, halve, reduce, attack } → { total, steps: [text] }
 */
export function finalDamage(amount, { type = null, resistances = [], vulnerabilities = [], immunities = [], halve = false, reduce = [], reductions = [], attack = true } = {}) {
  let n = Math.max(0, Math.floor(amount))
  const steps = []
  if (type && immunities.includes(type)) return { total: 0, steps: [`Immune to ${type}: no damage`] }
  for (const r of reduce) if (r.value > 0) { const before = n; n = Math.max(0, n - r.value); steps.push(`${r.label}: ${before} − ${r.value} = ${n}`) }
  for (const r of reductions) if ((!r.attack || attack) && type && r.types.includes(type) && r.value > 0) { const before = n; n = Math.max(0, n - r.value); steps.push(`${r.label}: ${before} − ${r.value} = ${n}`) }
  if (halve) { const before = n; n = Math.floor(n / 2); steps.push(`Halved: ${before} → ${n}`) }
  if (type && resistances.includes(type)) { const before = n; n = Math.floor(n / 2); steps.push(`Resistant to ${type}: ${before} → ${n}`) }
  if (type && vulnerabilities.includes(type)) { const before = n; n *= 2; steps.push(`Vulnerable to ${type}: ${before} → ${n}`) }
  return { total: n, steps }
}
export const isPhysical = (type) => PHYSICAL.includes(type)

/** Modifiers added to a spell's damage roll, as roll parts. `classId` is the caster's class. */
export function spellDamageParts(d, s) {
  const mine = (cls) => d.cls?.id === cls && (d.spellcasting?.cantrips || []).some((c) => c.id === s.id)
  return (d.spellDamage || []).filter((x) => (s.damage?.dice) && (
    (x.cantripOf && s.level === 0 && s.classes.includes(x.cantripOf) && mine(x.cantripOf))
    || (x.school && s.school === x.school && (!x.classOf || s.classes.includes(x.classOf)))
    || (x.ids && x.ids.includes(s.id))
    || (x.damageType && String(s.damage.type).split('/').includes(x.damageType))
  )).map((x) => ({ label: x.label, value: x.value, kind: 'bonus' }))
}

/** Features offered right after casting `s` (with a slot or not). */
export function castTriggers(d, s, { slot = false, turn } = {}) {
  return d.actions.filter((a) => {
    const t = a.onCast
    if (!t) return false
    if (t.slot && !slot) return false
    if (t.schools && !t.schools.includes(s.school)) return false
    if (t.classes && !t.classes.some((c) => s.classes.includes(c))) return false
    if (t.damage && !s.damage) return false
    if (t.spells && !t.spells.includes(s.id)) return false
    if (t.perTurn && turn?.once?.[a.id]) return false
    return true
  })
}
export { ON_CAST }
