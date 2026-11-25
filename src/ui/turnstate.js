// One turn's economy (pure): Action, Bonus action, Reaction, the one spell slot a turn allows (2024 rules), movement,
// and what was spent. Kept in state.turn; a new turn starts when the fight reaches you, on "Start my turn", or by hand.
export const newTurn = () => ({ action: false, bonus: false, reaction: false, slot: false, moved: 0, spent: {}, once: {} })
/** Concentration after damage: CON save DC 10 or half the damage (round down), whichever is higher, at most 30. */
export const concentrationDC = (damage) => Math.min(30, Math.max(10, Math.floor(damage / 2)))
/** A spell's casting time → which part of the turn it takes (null: longer than a turn, or free). */
export const timeKind = (t = '') => (/^bonus/i.test(t) ? 'bonus' : /^reaction/i.test(t) ? 'reaction' : /^action/i.test(t) ? 'action' : null)
const NAME = { action: 'your action', bonus: 'your bonus action', reaction: 'your reaction' }
/** What this would use that is already used this turn. */
export function conflicts(turn, { kind, slot, once } = {}) {
  const t = { ...newTurn(), ...turn }
  return [...(kind && t[kind] ? [NAME[kind]] : []), ...(slot && t.slot ? ['a spell slot (one per turn)'] : []), ...(once && t.once?.[once.id] ? [`${once.name} (once per turn)`] : [])]
}
/** The turn after using these. */
export function used(turn, { kind, slot, spend, once } = {}) {
  const t = { ...newTurn(), ...turn, spent: { ...(turn?.spent || {}) }, once: { ...(turn?.once || {}), ...(once ? { [once.id]: true } : {}) } }
  if (kind) t[kind] = true
  if (slot) t.slot = true
  for (const [id, n] of Object.entries(spend || {})) t.spent[id] = (t.spent[id] || 0) + n
  return t
}
/** Ask before doing something already used this turn (the DM may allow it: Action Surge, a second reaction…). */
export const allowed = (turn, need) => { const c = conflicts(turn, need); return !c.length || confirm(`You already used ${c.join(' and ')} this turn. Do it anyway?`) }
/** A new turn: the turn's parts back, buffs that last "until your next turn" end, and Heroism's temp HP. */
export function turnStartPatch(state, d) {
  const buffs = (state?.buffs || []).filter((x) => x.until !== 'turn').map((x) => (x.until === 'turn-end' ? { ...x, until: 'turn' } : x))
  const temp = d?.turnTemp && d.turnTemp.value > (state?.temp || 0) ? d.turnTemp.value : state?.temp || 0
  return { turn: newTurn(), ...(state?.buffs ? { buffs } : {}), ...(temp !== (state?.temp || 0) ? { temp } : {}) }
}
/**
 * Concentration ends (a new concentration spell, a failed CON save, 0 HP, Rage, a long rest, "End"): the caster's
 * own concentration buffs go at once; the ones on other characters are queued in concEnds and taken off by the sheet
 * (retried until the server answers).
 */
export function endConcentration(state, selfId) {
  const mine = (state?.buffs || [])
  const keep = []
  for (const x of mine) {
    if (!(x.from === selfId && x.conc)) keep.push(x)
    else if (x.after) keep.push({ ...x.after, id: `${x.id}a`, from: x.from, fromName: x.fromName, conc: false, at: x.at })
  }
  return { concentration: null, buffs: keep, concTargets: [], concEnds: [...new Set([...(state?.concEnds || []), ...(state?.concTargets || [])])] }
}
