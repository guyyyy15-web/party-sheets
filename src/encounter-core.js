// A group's fight (initiative), pure: no DOM, no network. The encounter is one JSON object the server stores per
// room; the initiative manager (the Initiative link or the DM) changes it, players send their own initiative roll.
//   { active, round, turn: combatant id | null, seq, combatants: [Combatant] }
//   Combatant: { id, kind: 'pc' | 'npc', name, init: number | null, bonus, group?, charId?, dmg?, ac?,
//                conditions?: [condition id], dead?: bool }
// Enemies have no HP here (the table doesn't know it): `dmg` counts the damage they took, from 0 up (healing takes
// it down), and the DM says when one falls (`dead`).
// A player's HP, conditions and death saves live on their character (the sheet), not here.

export const MAX_COMBATANTS = 60

const num = (v, d = 0) => (Number.isFinite(+v) ? Math.round(+v) : d)
export const d20 = () => 1 + Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * 20)

/** A new fight with the party in it (no initiative yet). pcs: [{ charId, name, bonus }]. */
export function newEncounter(pcs = []) {
  const enc = { active: true, round: 1, turn: null, seq: 0, combatants: [] }
  for (const p of pcs) addPc(enc, p)
  return enc
}

/** A player character joins (or is already in: then nothing changes). */
export function addPc(enc, { charId, name, bonus = 0, init = null }) {
  if (enc.combatants.some((c) => c.charId === charId)) return enc
  if (enc.combatants.length >= MAX_COMBATANTS) return enc
  enc.combatants.push({ id: `pc-${charId}`, kind: 'pc', charId, name: String(name || 'Hero').slice(0, 40), bonus: num(bonus), init: init == null ? null : num(init) })
  return enc
}

/**
 * Enemies of one kind: `count` of them, "Soldier 1", "Soldier 2"… (a single one keeps its plain name). Numbering
 * continues if that kind is already in the fight. One initiative roll for the whole group unless `each`.
 */
export function addGroup(enc, { name, count = 1, bonus = 0, ac = null, each = false, roll = d20 }) {
  const base = String(name || 'Enemy').trim().slice(0, 30) || 'Enemy'
  const n = Math.max(1, Math.min(20, num(count, 1)))
  const already = enc.combatants.filter((c) => c.group === base).length
  const groupInit = roll() + num(bonus)
  for (let i = 0; i < n && enc.combatants.length < MAX_COMBATANTS; i++) {
    enc.seq = (enc.seq || 0) + 1
    const label = n === 1 && already === 0 ? base : `${base} ${already + i + 1}`
    enc.combatants.push({ id: `npc-${enc.seq}`, kind: 'npc', group: base, name: label, bonus: num(bonus), init: each ? roll() + num(bonus) : groupInit, dmg: 0, ac: ac == null || ac === '' ? null : num(ac), conditions: [] })
  }
  return enc
}

/** Initiative order: highest first; ties by the higher bonus, then players first, then by name. No number yet → last. */
export function order(enc) {
  return [...(enc?.combatants || [])].sort((a, b) => (b.init ?? -999) - (a.init ?? -999) || (b.bonus || 0) - (a.bonus || 0) || (a.kind === 'pc' ? -1 : 0) - (b.kind === 'pc' ? -1 : 0) || a.name.localeCompare(b.name, undefined, { numeric: true }))
}

export function setInit(enc, id, value) {
  const c = enc.combatants.find((x) => x.id === id)
  if (c) c.init = value === '' || value == null ? null : num(value)
  return enc
}
/** Roll for everyone still without a number: d20 + their bonus. Returns the encounter. */
export function rollMissing(enc, roll = d20) {
  for (const c of enc.combatants) if (c.init == null) c.init = roll() + (c.bonus || 0)
  return enc
}

/** A dead enemy is skipped; players always get their turn (unconscious ones roll death saves). */
const takesTurn = (c) => !(c.kind === 'npc' && c.dead)

/** The next turn. The first call starts round 1 at the top; passing the last one starts the next round. */
export function next(enc) {
  const list = order(enc).filter(takesTurn)
  if (!list.length) return enc
  const i = list.findIndex((c) => c.id === enc.turn)
  if (enc.turn == null || i === -1) { enc.turn = list[0].id; return enc }
  if (i === list.length - 1) { enc.round = (enc.round || 1) + 1; enc.turn = list[0].id } else enc.turn = list[i + 1].id
  return enc
}
export function prev(enc) {
  const list = order(enc).filter(takesTurn)
  const i = list.findIndex((c) => c.id === enc.turn)
  if (i > 0) enc.turn = list[i - 1].id
  else if (i === 0 && enc.round > 1) { enc.round -= 1; enc.turn = list[list.length - 1].id }
  return enc
}

/** Damage (positive) or healing (negative) on an enemy: the damage it took goes up or down (never below 0). */
export function hurt(enc, id, amount) {
  const c = enc.combatants.find((x) => x.id === id)
  if (!c || c.kind !== 'npc') return enc
  c.dmg = Math.max(0, (c.dmg || 0) + num(amount))
  return enc
}
export function setDead(enc, id, dead) { const c = enc.combatants.find((x) => x.id === id); if (c) c.dead = !!dead; return enc }
export function toggleCondition(enc, id, cond) {
  const c = enc.combatants.find((x) => x.id === id)
  if (!c || c.kind !== 'npc') return enc
  const has = (c.conditions || []).includes(cond)
  c.conditions = has ? c.conditions.filter((x) => x !== cond) : [...(c.conditions || []), cond].slice(0, 20)
  return enc
}
export function remove(enc, id) {
  if (enc.turn === id) next(enc)
  if (enc.turn === id) enc.turn = null
  enc.combatants = enc.combatants.filter((c) => c.id !== id)
  return enc
}
/** A copy to change: every change works on a fresh object, so React sees it and a retry can re-apply it. */
export const clone = (enc) => JSON.parse(JSON.stringify(enc))

/** What the players' screens get: enemies without their AC (the damage count is the table's, everyone sees it). */
export function forPlayers(enc) {
  if (!enc) return enc
  return { ...enc, combatants: enc.combatants.map((c) => (c.kind === 'npc' ? { id: c.id, kind: 'npc', name: c.name, group: c.group, init: c.init, bonus: c.bonus, dmg: c.dmg || 0, dead: !!c.dead, conditions: c.conditions || [] } : c)) }
}
/** Where a combatant is in the order (1-based), and how many turns until theirs. */
export function placeOf(enc, id) {
  const list = order(enc).filter(takesTurn)
  const i = list.findIndex((c) => c.id === id)
  if (i === -1) return null
  const t = list.findIndex((c) => c.id === enc.turn)
  return { place: i + 1, of: list.length, now: i === t, inTurns: t === -1 ? null : (i - t + list.length) % list.length }
}
