// A group's fight (initiative), pure: no DOM, no network. The encounter is one JSON object the server stores per
// room; the initiative manager (the Initiative link or the DM) changes it, players send their own initiative roll.
//   { active, round, turn: combatant id | null, seq, combatants: [Combatant] }
//   Combatant: { id, kind: 'pc' | 'npc', name, init: number | null, bonus, group?, charId?, dmg?,
//                conditions?: [condition id], dead?: bool, icon?, color?, note? }  (no AC: Guy, 2026-11-25)
//   An enemy's look (icon, color, note) is set by the runner and seen by everyone, to tell enemies apart.
//   claims: [{ id, by, byName, target, amount, label, at }] = damage players reported, waiting for the runner
//   auto: true = players' damage to enemies is applied at once (no waiting)
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
// An enemy's look: an emoji, a color from this list, a short note everyone sees ("red cloak", "the boss").
export const ENEMY_ICONS = ['👹', '💀', '🐺', '🐉', '🕷️', '🐍', '🧟', '👻', '🦇', '🧙', '🗡️', '🏹', '🛡️', '👑', '🐗', '🦂']
export const ENEMY_COLORS = ['red', 'orange', 'gold', 'green', 'teal', 'blue', 'violet', 'gray']
export function cleanLook({ icon, color, note } = {}) {
  return { icon: ENEMY_ICONS.includes(icon) ? icon : null, color: ENEMY_COLORS.includes(color) ? color : null, note: String(note || '').trim().slice(0, 40) || null }
}
/** Change an enemy's look; `group: true` changes every enemy of its kind. */
export function setLook(enc, id, look, { group = false } = {}) {
  const c = enc.combatants.find((x) => x.id === id)
  if (!c || c.kind !== 'npc') return enc
  const l = cleanLook(look)
  for (const x of enc.combatants) if (x.id === id || (group && x.kind === 'npc' && x.group === c.group)) Object.assign(x, l)
  return enc
}

/**
 * monster: an SRD creature id (src/content/monsters.js): its picture, attacks and HP for the runner. hp: each one's
 * hit points (the runner sees them, players never do); hpEach: a function giving one creature's HP (rolled) instead.
 */
export function addGroup(enc, { name, count = 1, bonus = 0, each = false, roll = d20, icon = null, color = null, note = null, monster = null, hp = null, hpEach = null }) {
  const base = String(name || 'Enemy').trim().slice(0, 30) || 'Enemy'
  const n = Math.max(1, Math.min(20, num(count, 1)))
  const already = enc.combatants.filter((c) => c.group === base).length
  const groupInit = roll() + num(bonus)
  for (let i = 0; i < n && enc.combatants.length < MAX_COMBATANTS; i++) {
    enc.seq = (enc.seq || 0) + 1
    const label = n === 1 && already === 0 ? base : `${base} ${already + i + 1}`
    enc.combatants.push({ id: `npc-${enc.seq}`, kind: 'npc', group: base, name: label, bonus: num(bonus), init: each ? roll() + num(bonus) : groupInit, dmg: 0, conditions: [], ...cleanLook({ icon, color, note }), ...(monster ? { monster } : {}), ...(hpEach || hp ? { hp: num(hpEach ? hpEach() : hp) } : {}) })
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
export function hurt(enc, id, amount, by = null) {
  const c = enc.combatants.find((x) => x.id === id)
  if (!c || c.kind !== 'npc') return enc
  c.dmg = Math.max(0, (c.dmg || 0) + num(amount))
  if (by !== false) log(enc, { t: num(amount) >= 0 ? 'dmg' : 'heal', by, target: id, amount: Math.abs(num(amount)) })
  return enc
}
export function setDead(enc, id, dead) {
  const c = enc.combatants.find((x) => x.id === id)
  if (c) { c.dead = !!dead; if (dead) log(enc, { t: 'fell', by: lastHitter(enc, id), target: id }) }
  return enc
}

// ── what happened, for the recap: [{ t: 'dmg'|'heal'|'fell'|'hit-pc', by (combatant id or null), target, amount, crit, label, round, at }]
export const LOG_MAX = 300
export function log(enc, e) {
  enc.log = [...(enc.log || []), { ...e, round: enc.round || 1, at: Date.now() }].slice(-LOG_MAX)
  return enc
}
const lastHitter = (enc, id) => [...(enc.log || [])].reverse().find((e) => e.t === 'dmg' && e.target === id && e.by)?.by || null
/** A monster hits a player (the runner applies it on the player's sheet; the log keeps who took what). */
export const logHitPc = (enc, by, target, amount, crit = false) => log(enc, { t: 'hit-pc', by, target, amount: num(amount), crit: !!crit })
/** The fight is over: it stays (inactive) with its log until the next one, so everyone can see the recap. */
export function endFight(enc) { enc.active = false; enc.endedAt = Date.now(); enc.turn = null; enc.claims = []; return enc }

/**
 * The recap of a fight (pure): rounds, and per hero the damage dealt, biggest hit, crits, enemies felled, healing given
 * and damage taken; plus the highlights. names: { combatant id → name } comes from the combatants.
 */
export function recap(enc) {
  const by = new Map(enc.combatants.map((c) => [c.id, c]))
  const heroes = new Map(enc.combatants.filter((c) => c.kind === 'pc').map((c) => [c.id, { id: c.id, charId: c.charId, name: c.name, dealt: 0, biggest: 0, biggestOn: null, crits: 0, felled: 0, healed: 0, taken: 0 }]))
  for (const e of enc.log || []) {
    const h = heroes.get(e.by)
    if (e.t === 'dmg' && h) { h.dealt += e.amount; if (e.amount > h.biggest) { h.biggest = e.amount; h.biggestOn = by.get(e.target)?.name || null } if (e.crit) h.crits++ }
    if (e.t === 'heal' && h) h.healed += e.amount
    if (e.t === 'fell' && h) h.felled++
    if (e.t === 'hit-pc' && heroes.get(e.target)) heroes.get(e.target).taken += e.amount
  }
  const list = [...heroes.values()]
  const top = (k) => list.filter((h) => h[k] > 0).sort((a, b) => b[k] - a[k])[0] || null
  const enemies = enc.combatants.filter((c) => c.kind === 'npc')
  return {
    rounds: enc.round || 1, heroes: list.sort((a, b) => b.dealt - a.dealt),
    enemies: enemies.length, fallen: enemies.filter((c) => c.dead).length, totalDealt: list.reduce((t, h) => t + h.dealt, 0),
    mvp: top('dealt'), biggest: top('biggest'), healer: top('healed'), tank: top('taken'), crits: list.reduce((t, h) => t + h.crits, 0),
  }
}
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

/** The runner approves a player's damage (maybe a different amount, e.g. resistance): it's added to the target. */
export function applyClaim(enc, claimId, amount) {
  const cl = (enc.claims || []).find((c) => c.id === claimId)
  if (!cl) return enc
  const t = enc.combatants.find((c) => c.id === cl.target)
  if (t?.kind === 'npc') {
    if (cl.condition) t.conditions = [...new Set([...(t.conditions || []), cl.condition])].slice(0, 20)
    else t.dmg = Math.max(0, (t.dmg || 0) + (cl.heal ? -1 : 1) * num(amount ?? cl.amount))
  }
  if (!cl.condition) log(enc, { t: cl.heal ? 'heal' : 'dmg', by: cl.by, target: cl.target, amount: num(amount ?? cl.amount), crit: !!cl.crit, label: cl.label })
  enc.claims = enc.claims.filter((c) => c.id !== claimId)
  return enc
}
export function dropClaim(enc, claimId) { enc.claims = (enc.claims || []).filter((c) => c.id !== claimId); return enc }
export function setAuto(enc, on) { enc.auto = !!on; return enc }
/** Who a player can attack: enemies still standing first, then everyone else but them. */
export function targetsFor(enc, meId) {
  const list = order(enc).filter((c) => c.id !== meId && !c.dead)
  return [...list.filter((c) => c.kind === 'npc'), ...list.filter((c) => c.kind !== 'npc')]
}

/** What the players' screens get: enemies with their damage count and look; nothing the runner keeps to itself. */
export function forPlayers(enc) {
  if (!enc) return enc
  return { ...enc, claims: undefined, combatants: enc.combatants.map((c) => (c.kind === 'npc' ? { id: c.id, kind: 'npc', name: c.name, group: c.group, init: c.init, bonus: c.bonus, dmg: c.dmg || 0, dead: !!c.dead, conditions: c.conditions || [], icon: c.icon || null, color: c.color || null, note: c.note || null, monster: c.monster || null } : c)) }
}
/** Where a combatant is in the order (1-based), and how many turns until theirs. */
export function placeOf(enc, id) {
  const list = order(enc).filter(takesTurn)
  const i = list.findIndex((c) => c.id === id)
  if (i === -1) return null
  const t = list.findIndex((c) => c.id === enc.turn)
  return { place: i + 1, of: list.length, now: i === t, inTurns: t === -1 ? null : (i - t + list.length) % list.length }
}
