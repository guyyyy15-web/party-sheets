// Magic and special items: made by the DM (given to a player) or by the player. A character keeps them in `items`;
// what is equipped (and attuned, when it needs it) counts in derive(). Potions are drunk from the Gear tab.
import { WEAPONS, ARMOR } from './basics.js'

export const ITEM_KINDS = [
  ['weapon', 'Weapon'], ['armor', 'Armor'], ['shield', 'Shield'], ['wondrous', 'Ring, cloak, amulet…'], ['potion', 'Potion'], ['gear', 'Other'],
]
/** Healing potions (SRD 5.2): the dice they heal. */
export const POTIONS = [
  ['healing', 'Potion of Healing', '2d4+2'], ['greater', 'Greater Healing', '4d4+4'], ['superior', 'Superior Healing', '8d4+8'], ['supreme', 'Supreme Healing', '10d4+20'], ['other', 'Another potion (write what it does)', null],
]
export const potionDice = (i) => POTIONS.find((p) => p[0] === i.potion)?.[2] || null
export const MAX_ATTUNED = 3

const n = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)))
/** An item as the app keeps it: known fields only, in range (the DM's gifts arrive through the server too). */
export function cleanItem(i) {
  const kind = ITEM_KINDS.some(([k]) => k === i?.kind) ? i.kind : 'gear'
  return {
    id: String(i?.id || `it${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`).slice(0, 24),
    name: String(i?.name || 'Item').slice(0, 40), kind,
    base: kind === 'weapon' ? (WEAPONS.some((w) => w.id === i.base) ? i.base : 'longsword') : kind === 'armor' ? (ARMOR.some((a) => a.id === i.base) ? i.base : 'chain-mail') : null,
    bonus: n(i?.bonus, 0, 3), ac: n(i?.ac, 0, 5), save: n(i?.save, 0, 5),
    attune: !!i?.attune, attuned: !!i?.attuned, equipped: !!i?.equipped,
    qty: kind === 'potion' || kind === 'gear' ? n(i?.qty || 1, 1, 99) : 1,
    potion: kind === 'potion' ? (POTIONS.some((p) => p[0] === i.potion) ? i.potion : 'healing') : null,
    desc: String(i?.desc || '').slice(0, 300), from: i?.from === 'dm' ? 'dm' : 'custom',
  }
}
/** One line saying what it does. */
export function itemLine(i) {
  const w = i.kind === 'weapon' && WEAPONS.find((x) => x.id === i.base)
  const a = i.kind === 'armor' && ARMOR.find((x) => x.id === i.base)
  const bits = [
    w && `${w.name}, ${w.dmg} ${w.type}`, a && `${a.name}, AC ${a.base}`, i.kind === 'shield' && '+2 AC',
    i.bonus && (i.kind === 'weapon' ? `+${i.bonus} to hit and damage` : i.kind === 'armor' || i.kind === 'shield' ? `+${i.bonus} AC` : null),
    i.ac && `+${i.ac} AC`, i.save && `+${i.save} to every save`, i.kind === 'potion' && (potionDice(i) ? `heals ${potionDice(i)}` : null),
    i.attune && 'needs attunement',
  ].filter(Boolean)
  return [bits.join(' · '), i.desc].filter(Boolean).join('. ')
}
