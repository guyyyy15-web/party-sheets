// "For you" on a term card (pure, no DOM): what a game term means for THIS character, with its real numbers.
// Comparisons (armor, weapons) call derive() with the item swapped in, so a card always agrees with the sheet.
import { derive } from './engine.js'
import { ARMOR, WEAPONS, SKILLS, armorById, weaponById, MASTERY } from '../content/basics.js'
import { CONDITIONS, EXHAUSTION } from '../content/conditions.js'

const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)
const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const PROPS = ['light', 'finesse', 'thrown', 'two-handed', 'versatile', 'ammunition', 'loading', 'heavy', 'reach']
const parts = (list) => (list || []).filter((p) => p.value).map((p) => `${signed(p.value)} ${p.label}`).join(', ')

/** Every armor this character could put on, with the AC it would give them: { head, rows, ids }. */
export function armorTable(ch, d = derive(ch)) {
  const trained = new Set(d.cls?.armor || [])
  const rows = [], ids = []
  for (const a of [{ id: null, name: 'No armor', type: 'none' }, ...ARMOR]) {
    const t = derive({ ...ch, equipment: { ...ch.equipment, armor: a.id } })
    const strShort = a.str && d.scores.STR.total < a.str
    rows.push([a.name, String(t.ac.value), a.stealthDis ? 'Disadvantage' : '—', a.str ? `${a.str}${strShort ? ' (−10 ft)' : ' ✓'}` : '—', a.id === null || trained.has(a.type) ? 'Yes' : 'No'])
    ids.push(a.id)
  }
  return { head: ['Armor', `AC${ch.equipment?.shield ? ' (with shield)' : ''}`, 'Stealth', 'STR need', 'Trained'], rows, ids }
}

/** { lines: [string], table? } for one term id. Unknown ids give no lines (the card shows the text only). */
export function explain(id, ch) {
  if (!ch?.classId) return { lines: [] }
  const d = derive(ch)
  const L = []
  const sc = d.spellcasting
  const armor = armorById(id)
  if (armor) {
    const t = derive({ ...ch, equipment: { ...ch.equipment, armor: id } })
    const dexPart = armor.dexMax === 0 ? `your DEX ${signed(d.mod.DEX)} doesn't count` : armor.dexMax ? `DEX counts up to +${armor.dexMax} (yours: ${signed(d.mod.DEX)})` : `plus your DEX ${signed(d.mod.DEX)}`
    L.push(`In it your AC would be ${t.ac.value}: ${armor.base} base, ${dexPart}${ch.equipment?.shield ? ', +2 shield' : ''}.${ch.equipment?.armor === id ? ' You wear it now.' : ` Now: ${d.ac.value}.`}`)
    if (armor.stealthDis) L.push('Disadvantage on Stealth checks while you wear it.')
    if (armor.str) L.push(d.scores.STR.total >= armor.str ? `Needs STR ${armor.str}: you have ${d.scores.STR.total}, no speed loss.` : `Needs STR ${armor.str}: you have ${d.scores.STR.total}, so your speed drops by 10 ft.`)
    L.push((d.cls?.armor || []).includes(armor.type) ? `You're trained in ${armor.type} armor.` : `You're not trained in ${armor.type} armor: disadvantage on STR and DEX rolls, and no spells.`)
    return { lines: L, table: armorTable(ch, d) }
  }
  if (['light-armor', 'medium-armor', 'heavy-armor'].includes(id)) {
    const type = id.split('-')[0]
    L.push((d.cls?.armor || []).includes(type) ? `You're trained in ${type} armor.` : `You're not trained in ${type} armor.`)
    const t = armorTable(ch, d)
    return { lines: L, table: { ...t, rows: t.rows.filter((_, i) => t.ids[i] && armorById(t.ids[i]).type === type), ids: t.ids.filter((x) => x && armorById(x).type === type) } }
  }
  if (id === 'shield') {
    L.push((d.cls?.armor || []).includes('shield') ? `You're trained with shields: +2 AC (now ${d.ac.value}${ch.equipment?.shield ? ', shield on' : ', no shield'}).` : "You're not trained with shields.")
    return { lines: L }
  }
  if (PROPS.includes(id) || id === 'mastery' || MASTERY[id]) {
    const mine = d.attacks.filter((a) => (PROPS.includes(id) ? (a.props || []).some((p) => p.startsWith(id)) : id === 'mastery' ? a.mastery : a.mastery?.name?.toLowerCase() === id))
    if (mine.length) for (const a of mine) L.push(`${a.name}: ${signed(a.toHit)} to hit, ${a.damage} damage${a.mastery && id !== 'finesse' ? `, mastery ${a.mastery.name}` : ''}.`)
    else L.push(PROPS.includes(id) ? 'None of the weapons you carry has it.' : "You don't use this mastery with any weapon you carry.")
    return { lines: L }
  }
  const cond = CONDITIONS.find((c) => c.id === id)
  if (cond) {
    L.push(d.conditions.includes(id) ? `You are ${cond.name.toLowerCase()} now.` : `You are not ${cond.name.toLowerCase()}.`)
    return { lines: L }
  }
  if (ABILITIES.includes(id)) {
    const s = d.scores[id]
    L.push(`${id} ${s.total}: modifier ${signed(d.mod[id])}${parts(s.sources) ? ` (${s.sources.map((p) => `${p.label} ${p.value}`).join(', ')})` : ''}.`)
    L.push(`${id} save ${signed(d.saves[id].value)}${d.saves[id].prof ? ' (proficient)' : ''}.`)
    const sk = d.skills.filter((x) => x.ability === id)
    if (sk.length) L.push(`Skills: ${sk.map((x) => `${x.name} ${signed(x.value)}${x.expertise ? ' (expertise)' : x.prof ? ' (proficient)' : ''}`).join(', ')}.`)
    if (sc?.ability === id) L.push(`Your spellcasting ability: spell save DC ${sc.dc.value}, spell attack ${signed(sc.attack.value)}.`)
    return { lines: L }
  }
  switch (id) {
    case 'ac': L.push(`Your AC is ${d.ac.value}: ${d.ac.sources.map((s) => `${s.label} ${s.value}`).join(', ')}.`); return { lines: L, table: armorTable(ch, d) }
    case 'hp': L.push(`Max HP ${d.hp.value}: ${d.hp.sources.map((s) => `${s.label} ${s.value}`).join(', ')}. Now ${ch.state?.hp ?? d.hp.value}.`); break
    case 'temp-hp': L.push(ch.state?.temp ? `You have ${ch.state.temp} temporary HP.` : 'You have no temporary HP now.'); break
    case 'hit-dice': { const hd = d.resources.find((r) => r.id === 'hit-dice'); L.push(`d${d.hitDie} each, ${hd ? hd.max - hd.used : d.level} of ${d.level} left. Each heals the roll ${signed(d.mod.CON)} (CON), at least 1.`); break }
    case 'initiative': L.push(`Your initiative is ${signed(d.initiative.value)}${parts(d.initiative.sources) ? `: ${parts(d.initiative.sources)}` : ''}.`); break
    case 'speed': L.push(`Your speed is ${d.speed.value} ft.`); break
    case 'passive-perception': L.push(`Yours is ${d.passivePerception}.`); break
    case 'proficiency-bonus': case 'proficiency': L.push(`Yours is ${signed(d.prof)} at level ${d.level}. It goes up at levels 5, 9, 13 and 17.`); break
    case 'expertise': { const ex = d.skills.filter((s) => s.expertise); L.push(ex.length ? `You have expertise in ${ex.map((s) => s.name).join(', ')}: ${signed(2 * d.prof)} instead of ${signed(d.prof)}.` : 'You have no expertise yet.'); break }
    case 'heroic-inspiration': L.push(d.inspiration ? 'You have Heroic Inspiration now.' : "You don't have Heroic Inspiration now."); break
    case 'death-saves': L.push(`Now: ${ch.state?.deathSaves?.ok || 0} successes, ${ch.state?.deathSaves?.fail || 0} failures.`); break
    case 'level': L.push(`You are level ${d.level}.`); break
    case 'exhaustion': L.push(d.exhaustion ? `You have Exhaustion ${d.exhaustion}: −${d.d20Pen} on every d20 test and −${d.exhaustion * EXHAUSTION.speedPerLevel} ft speed (already in your numbers).` : 'You have no Exhaustion.'); break
    case 'saving-throw': L.push(`Your saves: ${ABILITIES.map((a) => `${a} ${signed(d.saves[a].value)}${d.saves[a].prof ? '*' : ''}`).join(', ')} (* proficient).`); break
    case 'attack-roll': L.push(...d.attacks.slice(0, 4).map((a) => `${a.name}: ${signed(a.toHit)} to hit.`)); if (sc) L.push(`Spell attack: ${signed(sc.attack.value)}.`); break
    case 'skills': L.push(`Proficient: ${d.skills.filter((s) => s.prof).map((s) => `${s.name} ${signed(s.value)}`).join(', ') || 'none yet'}.`); break
    case 'ability-modifier': L.push(ABILITIES.map((a) => `${a} ${d.scores[a].total} → ${signed(d.mod[a])}`).join(', ') + '.'); break
    case 'critical-hit': { const c = Math.min(20, ...d.attacks.map((a) => a.crit || 20)); L.push(c < 20 ? `You score a critical hit on ${c}-20.` : 'You score a critical hit on a 20.'); break }
    case 'action': case 'bonus-action': case 'reaction': {
      const k = { action: 'action', 'bonus-action': 'bonus', reaction: 'reaction' }[id]
      const list = d.actions.filter((a) => a.kind === k).map((a) => a.name)
      L.push(list.length ? `Yours: ${list.join(', ')}.` : `You have no special ${id.replace('-', ' ')}s yet.`); break
    }
    case 'unarmed-strike': { const u = d.attacks.find((a) => /unarmed/i.test(a.name)); if (u) L.push(`Yours: ${signed(u.toHit)} to hit, ${u.damage} damage.`); break }
    case 'two-weapon-fighting': { const lights = d.attacks.filter((a) => (a.props || []).includes('light')).map((a) => a.name); L.push(lights.length >= 2 ? `You carry two light weapons: ${lights.join(', ')}.` : 'You need two light weapons for it.'); break }
    case 'resistance': L.push(d.resistances.length ? `You resist ${d.resistances.join(', ')}.` : 'You have no resistances.'); break
    case 'immunity': L.push(d.immunities?.length ? `You are immune to ${d.immunities.join(', ')}.` : 'You have no immunities.'); break
    case 'spell-slot': if (sc) L.push(sc.pact ? `Pact slots: ${sc.pact.count} of level ${sc.pact.level}.` : `Your slots: ${sc.slots.map((s) => `${s.max - s.used}/${s.max} of level ${s.level}`).join(', ') || 'none yet'}.`); else L.push("You don't cast spells."); break
    case 'cantrip': if (sc) L.push(`You know ${sc.cantrips.length} of ${sc.cantripsMax}: ${sc.cantrips.map((s) => s.name).join(', ') || 'none chosen yet'}.`); else L.push("You don't cast spells."); break
    case 'prepared-spells': if (sc) L.push(`${sc.preparedChosen} of ${sc.preparedMax} prepared, plus ${[...sc.always.keys()].length} always prepared.`); else L.push("You don't cast spells."); break
    case 'spell-save-dc': if (sc) L.push(`Yours is ${sc.dc.value}: ${sc.dc.parts.map((p) => `${p.label} ${p.value}`).join(', ')}.`); else L.push("You don't cast spells."); break
    case 'spell-attack': if (sc) L.push(`Yours is ${signed(sc.attack.value)}: ${parts(sc.attack.parts)}.`); else L.push("You don't cast spells."); break
    case 'spellcasting-ability': if (sc) L.push(`Yours is ${sc.ability} (${signed(sc.mod)}).`); else L.push("You don't cast spells."); break
    case 'pact-magic': L.push(sc?.pact ? `You have ${sc.pact.count} slots of level ${sc.pact.level}; they come back on a short rest.` : 'Only Warlocks use Pact Magic.'); break
    case 'concentration': L.push(sc?.concentration ? `You are concentrating on ${sc.concentration.name}. Taking damage: CON save ${signed(d.saves.CON.value)}.` : `Not concentrating now. Your CON save is ${signed(d.saves.CON.value)}.`); break
    case 'ritual': if (sc) { const r = sc.prepared.filter((s) => s.ritual).map((s) => s.name); L.push(r.length ? `Your prepared rituals: ${r.join(', ')}.` : 'None of your prepared spells is a ritual.') } break
    case 'short-rest': { const back = d.resources.filter((r) => r.reset === 'short' || r.short).map((r) => r.name); L.push(back.length ? `Comes back for you: ${back.join(', ')}. You can also spend Hit Dice.` : 'Nothing of yours comes back on a short rest, but you can spend Hit Dice.'); break }
    case 'long-rest': L.push(`Everything comes back: HP to ${d.hp.value}, every resource and slot, all Hit Dice${d.exhaustion ? ', and one level of Exhaustion goes' : ''}.`); break
    case 'subclass': L.push(d.subclass ? `Yours: ${d.subclass.name}.` : `You choose it at level ${d.cls?.subclassLevel || 3}.`); break
    case 'species': if (d.species) L.push(`Yours: ${d.species.name}.`); break
    case 'background': if (d.background) L.push(`Yours: ${d.background.name}.`); break
    case 'feat': case 'origin-feat': { const f = d.features.filter((x) => x.source === 'feat' || x.source === 'background').map((x) => x.name); L.push(f.length ? `Yours: ${f.join(', ')}.` : 'No feats yet.'); break }
    default: break
  }
  return { lines: L }
}

export { WEAPONS, SKILLS, weaponById }
