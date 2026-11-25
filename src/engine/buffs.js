// Spells (and features like Rage) that change another character's numbers while they last. Pure, no DOM.
// A buff lives on the target: state.buffs = [{ id, spell, name, from, fromName, conc, effects, note, until, after, at }].
// `from` is the caster's character id; when the caster's concentration ends, every buff with conc from them goes.
// Effects (all numbers resolved when cast, so a target's sheet never needs the caster's sheet):
//   { on: 'ac', value }            +AC                         { on: 'acMin', value }   AC can't be lower (Barkskin)
//   { on: 'acBase', value }        base AC value + DEX, unarmored (Mage Armor)
//   { on: 'speed', value }         +speed   { on: 'speed', mult: 2 } doubled   { on: 'speed', zero: true } speed 0
//   { on: 'hpMax', value }         +max HP (Aid)                { on: 'tempHp', value }  temp HP each turn (Heroism)
//   { on: 'attack'|'save', dice: '1d4' | '-1d4', ability? }   a die added to (or taken from) those d20 rolls
//   { on: 'save'|'check', ability, adv: true }                  advantage on those rolls
//   { on: 'damage', dice?, value?, str? }                       weapon / unarmed damage (str: only STR attacks)
//   { on: 'resist', types: [...] }                              resistance to these damage types
import { SPELLS } from '../content/spells.js'

export const BUFF_LIMITS = { perCharacter: 12, bytes: 4096, effects: 8 }
export const EFFECT_ONS = ['ac', 'acMin', 'acBase', 'speed', 'hpMax', 'tempHp', 'attack', 'save', 'check', 'damage', 'resist']
const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const DMG = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder']

/** How many creatures this casting can affect (the spell's count + one per slot level above, where the spell says so). */
export function buffTargets(spell, slot = spell.level) {
  const b = spell.buff
  if (!b) return 0
  if (b.self) return 1
  return b.targets + (b.perSlot || 0) * Math.max(0, slot - spell.level)
}

const str = (v, n) => String(v ?? '').slice(0, n)
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null)
/** One effect, cleaned (shared with the server's validation through the same rules). */
export function cleanEffect(e) {
  if (!e || typeof e !== 'object' || !EFFECT_ONS.includes(e.on)) return null
  const out = { on: e.on }
  if (e.value != null) { const v = int(e.value, -30, 60); if (v == null) return null; out.value = v }
  if (e.dice != null) { if (!/^-?[1-4]d(4|6|8|10|12)$/.test(String(e.dice))) return null; out.dice = String(e.dice) }
  if (e.ability != null) { if (!ABIL.includes(e.ability)) return null; out.ability = e.ability }
  if (e.mult != null) { if (e.mult !== 2) return null; out.mult = 2 }
  if (e.zero) out.zero = true
  if (e.adv) out.adv = true
  if (e.str) out.str = true
  if (e.types != null) { if (!Array.isArray(e.types) || !e.types.length || !e.types.every((t) => DMG.includes(t))) return null; out.types = [...new Set(e.types)] }
  return out
}
/** A buff as stored, cleaned: anything unknown is dropped; null when it isn't a buff. */
export function cleanBuff(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null
  if (!/^[a-z0-9-]{1,40}$/.test(b.spell || '') || !/^[A-Za-z0-9_-]{1,40}$/.test(b.from || '')) return null
  const effects = (Array.isArray(b.effects) ? b.effects : []).slice(0, BUFF_LIMITS.effects).map(cleanEffect)
  if (effects.some((e) => !e)) return null
  const after = b.after ? cleanBuff({ ...b.after, spell: `${b.spell}-after`.slice(0, 40), from: b.from, after: null }) : null
  return {
    id: /^[A-Za-z0-9_-]{1,40}$/.test(b.id || '') ? b.id : `b${Date.now().toString(36)}`, spell: b.spell, name: str(b.name, 40) || b.spell,
    from: b.from, fromName: str(b.fromName, 40), conc: !!b.conc, effects, ...(b.note ? { note: str(b.note, 200) } : {}),
    ...(b.until === 'turn' || b.until === 'turn-end' ? { until: b.until } : {}), ...(after ? { after } : {}), ...(int(b.slot, 0, 9) != null ? { slot: b.slot } : {}),
    at: int(b.at, 0, 9e15) ?? 0,
  }
}

/**
 * The buff a casting puts on each target. caster: { id, name, mod } (mod = spellcasting modifier, for Heroism).
 * slot: the slot level used. Returns null for spells that change no numbers.
 */
export function makeBuff(spell, { slot = spell.level, caster, now = Date.now() } = {}) {
  const b = spell.buff
  if (!b) return null
  const above = Math.max(0, slot - spell.level)
  const effects = (b.effects || []).map((e) => {
    const v = e.value === 'mod' ? Math.max(0, caster?.mod || 0) : e.value
    return cleanEffect({ ...e, ...(v != null ? { value: v + (e.perSlot || 0) * above } : {}), perSlot: undefined })
  })
  return cleanBuff({
    id: `b${now.toString(36)}${Math.floor(Math.random() * 1e4)}`, spell: spell.id, name: b.name || spell.name, from: caster.id, fromName: caster.name,
    conc: !!spell.concentration, effects, note: b.note, until: b.until, slot, at: now,
    after: b.after ? { ...b.after, effects: b.after.effects || [] } : null,
  })
}

/** A target's buffs after this one: the same spell from the same caster replaces the old one (spells don't stack). */
export function addBuff(list, buff) {
  return [...(list || []).filter((x) => !(x.spell === buff.spell && x.from === buff.from) && !(x.spell === buff.spell && SPELLS.some((s) => s.id === buff.spell))), buff].slice(-BUFF_LIMITS.perCharacter)
}
/** Take off a caster's buffs (only concentration ones with conc: true). Haste leaves its lethargy behind. */
export function removeBuffs(list, { from, spell, conc = false, id } = {}) {
  const out = []
  for (const x of list || []) {
    const hit = id ? x.id === id : x.from === from && (!spell || x.spell === spell) && (!conc || x.conc)
    if (!hit) out.push(x)
    else if (x.after) out.push({ ...x.after, id: `${x.id}a`, from: x.from, fromName: x.fromName, conc: false, at: x.at })
  }
  return out
}
/** A new turn: buffs that last "until your next turn" go; "until the end of your next turn" become "this turn". */
export function turnBuffs(list) {
  return (list || []).filter((x) => x.until !== 'turn').map((x) => (x.until === 'turn-end' ? { ...x, until: 'turn' } : x))
}
/** The label on the sheet: "Bless (from Mira)". */
export const buffLabel = (b, selfId) => (b.from === selfId || !b.fromName ? b.name : `${b.name} (from ${b.fromName})`)

const hpMaxOf = (b) => (b?.effects || []).filter((e) => e.on === 'hpMax').reduce((t, e) => t + (e.value || 0), 0)
/** A target's state after a buff lands: the list, and current HP up by any new max HP (Aid). */
export function applyBuff(state, buff) {
  const old = (state?.buffs || []).find((x) => x.spell === buff.spell)
  const gain = Math.max(0, hpMaxOf(buff) - hpMaxOf(old))
  return { buffs: addBuff(state?.buffs, buff), ...(gain && Number.isInteger(state?.hp) ? { hp: Math.min(999, state.hp + gain) } : {}) }
}
