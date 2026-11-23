// What a level changes (pure, no DOM): the summary after levelling up and the preview of the next level both come
// from here, so they can never disagree. Input: two derive() results (before, after). Output: only what changed.
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)

/** chAfter (optional): the character at the new level, to name the Hit Die it took (rolled or average). */
export function levelDiff(b, a, chAfter = null) {
  const out = { level: a.level, from: b.level, lines: [], features: [], actions: [], choices: [] }
  const line = (kind, label, before, after, note) => out.lines.push({ kind, label, before, after, note })

  // hit points: the gain and what it's made of
  if (a.hp.value !== b.hp.value) {
    const gain = a.hp.value - b.hp.value
    // what the gain is made of: this level's Hit Die + CON, a higher CON on every earlier level, and the rest (Toughness…)
    const parts = []
    if (a.level > b.level && a.level > 1) {
      const die = chAfter?.hpRolls?.[a.level] ?? Math.floor(a.hitDie / 2) + 1
      parts.push(`${die} Hit Die`, `${signed(a.mod.CON)} CON`)
      const retro = (a.mod.CON - b.mod.CON) * b.level
      if (retro) parts.push(`${signed(retro)} from CON on earlier levels`)
      const other = gain - Math.max(1, die + a.mod.CON) - retro
      if (other) parts.push(`${signed(other)} other (${a.hp.sources.filter((s) => s.kind !== 'base').map((s) => s.label).join(', ') || 'features'})`)
    }
    line('base', 'Max HP', b.hp.value, a.hp.value, parts.length ? `${signed(gain)}: ${parts.join(', ')}` : signed(gain))
  }
  if (a.prof !== b.prof) {
    const raised = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].filter((x) => a.saves[x].prof).length + a.skills.filter((s) => s.prof).length + a.attacks.length + (a.spellcasting ? 2 : 0)
    line('prof', 'Proficiency bonus', signed(b.prof), signed(a.prof), `+1 to ${raised} numbers: attacks, proficient saves and skills${a.spellcasting ? ', spell DC and attack' : ''}`)
  }
  for (const x of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
    if (a.scores[x].total !== b.scores[x].total) line('ability', x, b.scores[x].total, a.scores[x].total, a.mod[x] !== b.mod[x] ? `modifier ${signed(b.mod[x])} → ${signed(a.mod[x])}` : 'modifier unchanged')
  }
  if (a.ac.value !== b.ac.value) line('base', 'AC', b.ac.value, a.ac.value)
  if (a.speed.value !== b.speed.value) line('base', 'Speed', `${b.speed.value} ft`, `${a.speed.value} ft`)
  if (a.attacksPerAction !== b.attacksPerAction) line('base', 'Attacks per Attack action', b.attacksPerAction, a.attacksPerAction, a.attacksPerAction === 2 ? 'Extra Attack' : null)
  const critB = Math.min(20, ...b.attacks.map((x) => x.crit || 20)), critA = Math.min(20, ...a.attacks.map((x) => x.crit || 20))
  if (critA !== critB) line('base', 'Critical hit on', critB === 20 ? '20' : `${critB}-20`, `${critA}-20`)

  // spellcasting
  const sb = b.spellcasting, sa = a.spellcasting
  if (sa) {
    if (!sb) line('base', 'Spellcasting', '—', `DC ${sa.dc.value}`, 'you can cast spells')
    else {
      if (sa.dc.value !== sb.dc.value) line('base', 'Spell save DC', sb.dc.value, sa.dc.value)
      if (sa.attack.value !== sb.attack.value) line('base', 'Spell attack', signed(sb.attack.value), signed(sa.attack.value))
    }
    for (const s of sa.slots) {
      const old = sb?.slots.find((x) => x.level === s.level)?.max || 0
      if (s.max !== old) line('base', `${ORD[s.level]}-level slots`, old, s.max, old ? null : `first ${ORD[s.level]}-level spells`)
    }
    if (sa.pact && (!sb?.pact || sa.pact.count !== sb.pact.count || sa.pact.level !== sb.pact.level)) line('base', 'Pact slots', sb?.pact ? `${sb.pact.count} × ${ORD[sb.pact.level]}` : '—', `${sa.pact.count} × ${ORD[sa.pact.level]}`)
    if (sa.cantripsMax !== (sb?.cantripsMax || 0)) line('base', 'Cantrips known', sb?.cantripsMax || 0, sa.cantripsMax, 'pick the new one on the Spells tab')
    if (sa.preparedMax !== (sb?.preparedMax || 0)) line('base', 'Prepared spells', sb?.preparedMax || 0, sa.preparedMax, 'prepare more on the Spells tab')
  }

  // resources: new pools and bigger ones (Hit Dice always grow by one: left out)
  for (const r of a.resources) {
    if (r.id === 'hit-dice' || /^slot-\d$/.test(r.id) || r.id === 'pact-slots') continue
    const old = b.resources.find((x) => x.id === r.id)
    if (!old) line('bonus', r.name, '—', r.max, `new, back on a ${r.reset === 'short' ? 'short' : 'long'} rest`)
    else if (old.max !== r.max) line('bonus', r.name, old.max, r.max)
  }
  // rolls that grew (Sneak Attack, Martial Arts, Rage…): same action, a different roll
  for (const x of a.actions) {
    const old = b.actions.find((y) => y.id === x.id)
    if (old?.roll && x.roll && old.roll.expr !== x.roll.expr) line('dice', x.name, old.roll.expr, x.roll.expr)
  }

  // new features, and the actions they bring (to try at once)
  const had = new Set(b.features.map((f) => f.key))
  out.features = a.features.filter((f) => !had.has(f.key)).map((f) => ({ key: f.key, name: f.name, summary: f.summary, source: f.source }))
  const hadA = new Set(b.actions.map((x) => x.id))
  out.actions = a.actions.filter((x) => !hadA.has(x.id) && x.kind !== 'info')
  // choices this level adds (not the ones already open before it)
  const open = new Set(b.pending.map((c) => c.key))
  out.choices = a.pending.filter((c) => !open.has(c.key)).map((c) => c.label)
  return out
}

/** The few things worth a line on the sheet ("Level 5: Extra Attack, 3rd-level slots, +1 proficiency"). */
export function headlines(diff, max = 3) {
  const pick = []
  const has = (label) => diff.lines.find((l) => l.label === label)
  if (has('Attacks per Attack action')) pick.push(has('Attacks per Attack action').after === 2 ? 'Extra Attack' : `${has('Attacks per Attack action').after} attacks`)
  const firstSlot = diff.lines.find((l) => /-level slots$/.test(l.label) && !l.before)
  if (firstSlot) pick.push(firstSlot.label.replace(' slots', ' spells'))
  if (diff.choices.some((c) => /subclass/i.test(c))) pick.push('your subclass')
  if (diff.choices.some((c) => /Ability Score Improvement|Epic Boon/.test(c))) pick.push(diff.choices.find((c) => /Epic Boon/.test(c)) ? 'an Epic Boon' : 'an ASI or feat')
  for (const f of diff.features) if (pick.length < max + 2 && !/Ability Score Improvement|Epic Boon|Subclass/i.test(f.name)) pick.push(f.name)
  if (has('Proficiency bonus')) pick.push(`+1 proficiency`)
  if (!pick.length && has('Max HP')) pick.push(`${signed(has('Max HP').after - has('Max HP').before)} HP`)
  return [...new Set(pick)].slice(0, max)
}
