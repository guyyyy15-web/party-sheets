// The printed character sheet (pure, tests/print.test.mjs): everything the paper page shows, straight from derive(),
// so the PDF and the app can't disagree. Our own layout and words (no official sheet's frames, logo or wording).
import { derive } from './engine.js'
import { ABILITIES, ABILITY_NAMES } from '../content/basics.js'

const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)
const ORD = ['Cantrips', '1st level', '2nd level', '3rd level', '4th level', '5th level', '6th level', '7th level', '8th level', '9th level']

export function printModel(ch) {
  const d = derive(ch)
  const hp = Math.min(ch.state?.hp ?? d.hp.value, d.hp.value)
  const sc = d.spellcasting
  const spells = sc ? [
    ...(sc.cantrips.length ? [{ level: 0, title: ORD[0], list: sc.cantrips }] : []),
    ...[...new Set(sc.prepared.map((s) => s.level))].sort((a, b) => a - b).map((l) => ({ level: l, title: ORD[l], list: sc.prepared.filter((s) => s.level === l) })),
  ].map((g) => ({ ...g, slots: g.level ? (sc.slots.find((x) => x.level === g.level)?.max || 0) : 0, list: g.list.map((s) => ({ name: s.name, time: s.time, range: s.range, conc: !!s.concentration, ritual: !!s.ritual, summary: s.summary })) })) : []
  return {
    name: ch.name || 'Unnamed hero', line: [d.species?.name, d.cls?.name, ch.level, d.subclass?.name].filter(Boolean).join(' · '), background: d.background?.name || '',
    stats: [['Armor Class', String(d.ac.value)], ['Hit Points', `${hp} / ${d.hp.value}`], ['Speed', `${d.speed.value} ft`], ['Initiative', signed(d.initiative.value)], ['Proficiency', signed(d.prof)], ['Passive Perception', String(d.passivePerception)], ['Hit Dice', `${d.level}d${d.hitDie}`]],
    abilities: ABILITIES.map((a) => ({ id: a, name: ABILITY_NAMES[a], score: d.scores[a].total, mod: signed(d.mod[a]), save: signed(d.saves[a].value), saveProf: d.saves[a].prof })),
    skills: d.skills.map((s) => ({ name: s.name, ability: s.ability, value: signed(s.value), prof: s.prof, expertise: s.expertise })),
    attacks: d.attacks.map((a) => ({ name: a.name, toHit: signed(a.toHit), damage: `${a.damage} ${a.type}`, notes: [...(a.props || []), a.range ? `${a.range} ft` : null, a.mastery ? `Mastery: ${a.mastery.name}` : null].filter(Boolean).join(', ') })),
    resources: d.resources.filter((r) => !r.hidden && !/^slot-\d$/.test(r.id) && r.id !== 'pact-slots').map((r) => ({ name: r.name, max: r.max, reset: r.reset === 'short' ? 'short rest' : 'long rest' })),
    defenses: [d.resistances.length ? `Resist: ${d.resistances.join(', ')}` : null, d.immunities.length ? `Immune: ${d.immunities.join(', ')}` : null, d.senses.length ? d.senses.map((s) => `${s.name} ${s.range} ft`).join(', ') : null].filter(Boolean),
    features: d.features.filter((f) => f.summary).map((f) => ({ name: f.name, level: f.level || null, summary: f.summary, source: f.source })),
    gear: [d.armor ? `${d.armor.name}${d.shield ? ' and a shield' : ''}` : d.shield ? 'Shield' : null, ...(ch.equipment?.weapons || []).length ? [`Weapons: ${d.attacks.filter((a) => a.id !== 'unarmed').map((a) => a.name).join(', ')}`] : [], ...(ch.items || []).map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}${i.attuned ? ' (attuned)' : ''}`), ch.equipment?.items || null, ch.equipment?.gp ? `${ch.equipment.gp} GP` : null].filter(Boolean),
    notes: ch.notes || '',
    casting: sc ? { ability: sc.ability, dc: sc.dc.value, attack: signed(sc.attack.value), pact: sc.pact ? `${sc.pact.count} Pact slots of level ${sc.pact.level} (short rest)` : null } : null,
    spells,
  }
}
