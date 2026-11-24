// Recommendations (pure, no DOM): the player's build path (the answer to "How do you want to play?") steers every
// choice. Each recommendation carries a short reason made from this character's real numbers. With no path (older
// characters), the class's first path is used. At most 3 recommended options per choice.
import { BUILDS, buildById } from '../content/builds.js'
import { classById } from '../content/classes.js'
import { SKILLS, weaponById } from '../content/basics.js'
import { featById } from '../content/feats.js'
import { spellById } from '../content/spells.js'

const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)
const mod = (s) => Math.floor((s - 10) / 2)
const first = (text) => String(text || '').split(/(?<=\.)\s/)[0].replace(/\.$/, '')

export const pathsFor = (classId) => BUILDS[classId] || []
/** The player's own path, or null. */
export function pathOf(ch) {
  const p = ch?.build && buildById(ch.build)
  return p && pathsFor(ch.classId).includes(p) ? p : null
}
/** The path recommendations follow: the player's, else the class's first one (marked as a default). */
export function effectivePath(ch) {
  return pathOf(ch) || (pathsFor(ch?.classId)[0] ? { ...pathsFor(ch.classId)[0], isDefault: true } : null)
}

/** Abilities in the order to invest in them (for "Suggest" in the wizard and for ASIs). */
export function abilityOrder(ch) {
  const p = effectivePath(ch)
  const cls = classById(ch?.classId)
  return [...(p?.invest || cls?.primary || []), 'CON', ...ABILITIES].filter((a, i, l) => ABILITIES.includes(a) && l.indexOf(a) === i)
}

const WHAT = { STR: 'melee hits and damage', DEX: 'AC, ranged and finesse hits, initiative', CON: 'hit points and concentration', INT: 'Wizard spells and knowledge skills', WIS: 'Cleric, Druid and Ranger spells, Perception', CHA: 'Bard, Sorcerer, Warlock and Paladin spells, social skills' }

/** The ASI (or Epic Boon) to take: { value, reason }. scores = the totals before this ASI. */
export function recommendAsi(ch, d, { epic = false, scores, takenFeats = [] } = {}) {
  const p = effectivePath(ch)
  const order = abilityOrder(ch)
  const okFeat = (id) => { const f = featById(id); return f && !takenFeats.includes(id) && (!f.prereq?.level || ch.level >= f.prereq.level) && (epic ? f.category === 'epic' : f.category !== 'epic' && f.category !== 'fighting-style') }
  const featAbility = (f) => { const opts = f.ability === 'any' ? ABILITIES : f.ability || []; return order.find((a) => opts.includes(a) && scores[a] < (epic ? 30 : 20)) || null }
  if (epic) {
    const id = (p?.feats || []).find(okFeat) || ['boon-combat-prowess', 'boon-fate', 'boon-fortitude'].find(okFeat)
    const f = featById(id)
    const a = f && featAbility(f)
    return f ? { value: { type: 'feat', feat: f.id, ...(a ? { ability: a } : {}) }, reason: `${f.name}${a ? ` and +1 ${a}` : ''}: ${first(f.summary)}` } : null
  }
  for (const a of order.slice(0, 2)) {
    if (scores[a] <= 18) {
      const m1 = mod(scores[a]), m2 = mod(scores[a] + 2)
      return { value: { type: 'plus2', ability: a }, reason: `${a} ${scores[a]} → ${scores[a] + 2} (modifier ${signed(m1)} → ${signed(m2)}): ${WHAT[a]}` }
    }
  }
  const id = (p?.feats || []).find(okFeat)
  const f = featById(id)
  if (f) { const a = featAbility(f); return { value: { type: 'feat', feat: f.id, ...(a ? { ability: a } : {}) }, reason: `Your main abilities are high: ${f.name}. ${first(f.summary)}` } }
  const a = order.find((x) => scores[x] <= 18)
  return a ? { value: { type: 'plus2', ability: a }, reason: `${a} ${scores[a]} → ${scores[a] + 2}: ${WHAT[a]}` } : null
}

const STYLE_WHY = {
  archery: 'You shoot: +2 to hit with ranged weapons', defense: 'You wear armor: +1 AC', 'great-weapon-fighting': 'Two-handed weapon: low damage dice become 3s',
  dueling: 'One weapon in hand: +2 damage', 'two-weapon-fighting': 'Two light weapons: your bonus attack adds its modifier', protection: 'Shield up: protect an ally next to you',
}

/**
 * Recommended options for one open choice (as derive().choices lists it): { optionId: reason }, at most 3,
 * best first.
 */
export function recommend(ch, d, c) {
  const p = effectivePath(ch)
  if (!p || !c?.options?.length) return {}
  const ids = new Set(c.options.filter((o) => !o.disabled).map((o) => o.id))
  const out = []
  const add = (id, why) => { if (ids.has(id) && !out.some((x) => x[0] === id) && out.length < 3) out.push([id, why]) }
  const equipped = ch.equipment?.weapons || []
  const fits = p.isDefault ? 'A good start' : 'Fits how you play'
  switch (c.kind) {
    case 'subclass': {
      if (p.subclass) add(p.subclass, p.subclassWhy || fits)
      // the path's pick isn't offered (an expansion the group hasn't allowed): the first core one, simple to play
      const core = c.options.find((o) => !o.disabled && !o.expansion)
      if (!out.length && core) add(core.id, 'Simple to play, and in the core rules')
      break
    }
    case 'feat': // a fighting style, or a feat picked inside a feature
      for (const s of p.style || []) add(s, STYLE_WHY[s] || fits)
      for (const w of equipped.map(weaponById).filter(Boolean)) {
        if (w.cat.endsWith('ranged')) add('archery', STYLE_WHY.archery)
        if (w.props.includes('two-handed')) add('great-weapon-fighting', STYLE_WHY['great-weapon-fighting'])
      }
      if (ch.equipment?.armor) add('defense', STYLE_WHY.defense)
      for (const f of p.feats || []) add(f, `${featById(f)?.name || f}: ${first(featById(f)?.summary)}`)
      break
    case 'weapon': // Weapon Mastery
      for (const w of equipped) add(w, 'You carry it')
      for (const w of p.weapons || []) add(w, fits)
      break
    case 'skill':
    case 'expertise': {
      for (const s of p.skills || []) {
        const sk = SKILLS.find((x) => x.id === s)
        add(s, sk ? `${p.isDefault ? 'Useful' : 'Your style'}: uses ${sk.ability} ${signed(d.mod[sk.ability])}` : fits)
      }
      const byMod = [...SKILLS].filter((s) => ids.has(s.id)).sort((a, b) => d.mod[b.ability] - d.mod[a.ability])
      for (const s of byMod) add(s.id, `Uses your ${s.ability} ${signed(d.mod[s.ability])}`)
      break
    }
    default: // a spell picked inside a feature (Magical Secrets, Mystic Arcanum…), or anything else in the path
      for (const s of p.spells || []) add(s, spellWhy(spellById(s), p))
  }
  return Object.fromEntries(out)
}

function spellWhy(s, p) {
  if (!s) return 'Fits how you play'
  if (s.damage) return `${s.level ? '' : 'Cantrip: '}${s.damage.dice} ${s.damage.type}${s.save ? `, ${s.save} save` : s.attack ? ', spell attack' : ''}`
  if (s.heal) return `Heals ${s.heal.dice}${s.heal.mod ? ' + your modifier' : ''}`
  return first(s.summary).slice(0, 70)
}

/** Spells to prepare (or cantrips to learn) for this path: { spellId: reason }, only from the allowed options. */
export function recommendSpells(ch, d, { cantrips = false } = {}) {
  const sc = d.spellcasting
  const p = effectivePath(ch)
  if (!sc || !p) return {}
  const allowed = new Set((cantrips ? sc.cantripOptions : sc.spellOptions).map((s) => s.id))
  const out = {}
  for (const id of p.spells || []) {
    const s = spellById(id)
    if (s && allowed.has(id) && !sc.always.has(id) && Object.keys(out).length < 5) out[id] = spellWhy(s, p)
  }
  return out
}
