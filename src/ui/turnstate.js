// One turn's economy (pure): Action, Bonus action, Reaction, the one spell slot a turn allows (2024 rules), movement,
// and what was spent. Kept in state.turn; a new turn starts when the fight reaches you, on "Start my turn", or by hand.
export const newTurn = () => ({ action: false, bonus: false, reaction: false, slot: false, moved: 0, spent: {} })
/** A spell's casting time → which part of the turn it takes (null: longer than a turn, or free). */
export const timeKind = (t = '') => (/^bonus/i.test(t) ? 'bonus' : /^reaction/i.test(t) ? 'reaction' : /^action/i.test(t) ? 'action' : null)
const NAME = { action: 'your action', bonus: 'your bonus action', reaction: 'your reaction' }
/** What this would use that is already used this turn. */
export function conflicts(turn, { kind, slot } = {}) {
  const t = { ...newTurn(), ...turn }
  return [...(kind && t[kind] ? [NAME[kind]] : []), ...(slot && t.slot ? ['a spell slot (one per turn)'] : [])]
}
/** The turn after using these. */
export function used(turn, { kind, slot, spend } = {}) {
  const t = { ...newTurn(), ...turn, spent: { ...(turn?.spent || {}) } }
  if (kind) t[kind] = true
  if (slot) t.slot = true
  for (const [id, n] of Object.entries(spend || {})) t.spent[id] = (t.spent[id] || 0) + n
  return t
}
/** Ask before doing something already used this turn (the DM may allow it: Action Surge, a second reaction…). */
export const allowed = (turn, need) => { const c = conflicts(turn, need); return !c.length || confirm(`You already used ${c.join(' and ')} this turn. Do it anyway?`) }
