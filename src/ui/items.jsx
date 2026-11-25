// Items: the editor (the DM's "Give an item" and the player's own "+ Add an item"), the player's list on the Gear
// tab (equip, attune, drink, remove), and the banner for gifts from the DM (Equip / Bag / Decline).
import React, { useState } from 'react'
import { Sheet, GameIcon, Stepper } from './common.jsx'
import { WEAPONS, ARMOR } from '../content/basics.js'
import { ITEM_KINDS, POTIONS, MAX_ATTUNED, cleanItem, itemLine, potionDice } from '../content/items.js'

const ICON = { weapon: (i) => `w.${i.base}`, armor: () => 'a.chain-mail', shield: () => 'a.shield', wondrous: () => 'ui.feat', potion: () => 'ui.spell', gear: () => 'ui.pack' }
const iconOf = (i) => (ICON[i.kind] || ICON.gear)(i)

/** Make (or change) an item. `title` says who it's for. */
export function ItemEditor({ item, title, cta, onSave, onClose, onDelete }) {
  const [it, setIt] = useState(() => cleanItem(item || { kind: 'weapon', base: 'longsword', bonus: 1, name: '' }))
  const set = (patch) => {
    const next = { ...it, ...patch }
    // a potion with no name yet takes the potion's own name
    if (patch.kind === 'potion' && (!it.name.trim() || it.name === 'Item')) next.name = POTIONS.find((p) => p[0] === (next.potion || 'healing'))[1]
    setIt(cleanItem(next))
  }
  const nameOk = it.name.trim() && it.name !== 'Item'
  return (
    <Sheet title={title} onClose={onClose}>
      <label className="field"><span>Name</span><input className="input" value={it.name === 'Item' ? '' : it.name} maxLength={40} placeholder="Flame Tongue, Ring of Protection…" onChange={(e) => set({ name: e.target.value || 'Item' })} autoFocus /></label>
      <div className="chips" role="radiogroup" aria-label="Kind">{ITEM_KINDS.map(([k, l]) => <button key={k} role="radio" aria-checked={it.kind === k} className={`chip ${it.kind === k ? 'on' : ''}`} onClick={() => set({ kind: k })}>{l}</button>)}</div>
      {it.kind === 'weapon' && <label className="field"><span>Weapon type</span><select className="input" value={it.base} onChange={(e) => set({ base: e.target.value })}>{WEAPONS.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.dmg} {w.type})</option>)}</select></label>}
      {it.kind === 'armor' && <label className="field"><span>Armor type</span><select className="input" value={it.base} onChange={(e) => set({ base: e.target.value })}>{ARMOR.map((a) => <option key={a.id} value={a.id}>{a.name} (AC {a.base})</option>)}</select></label>}
      {(it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'shield') && <div className="row"><span className="grow">Magic bonus {it.kind === 'weapon' ? '(to hit and damage)' : '(AC)'}</span><Stepper value={it.bonus} min={0} max={3} label="Magic bonus" onChange={(bonus) => set({ bonus })} /></div>}
      {it.kind === 'wondrous' && (
        <>
          <div className="row"><span className="grow">AC bonus</span><Stepper value={it.ac} min={0} max={5} label="AC bonus" onChange={(ac) => set({ ac })} /></div>
          <div className="row"><span className="grow">Bonus to every save</span><Stepper value={it.save} min={0} max={5} label="Save bonus" onChange={(save) => set({ save })} /></div>
        </>
      )}
      {it.kind === 'potion' && <label className="field"><span>Potion</span><select className="input" value={it.potion} onChange={(e) => set({ potion: e.target.value, name: it.name === 'Item' || POTIONS.some((p) => p[1] === it.name) ? POTIONS.find((p) => p[0] === e.target.value)[1].replace(/ \(.*/, '') : it.name })}>{POTIONS.map(([id, l, dice]) => <option key={id} value={id}>{l}{dice ? ` (${dice})` : ''}</option>)}</select></label>}
      {(it.kind === 'potion' || it.kind === 'gear') && <div className="row"><span className="grow">How many</span><Stepper value={it.qty} min={1} max={99} label="How many" onChange={(qty) => set({ qty })} /></div>}
      {it.kind !== 'potion' && it.kind !== 'gear' && <label className="row toggle"><input type="checkbox" checked={it.attune} onChange={(e) => set({ attune: e.target.checked })} /><span>Needs attunement (works only when attuned; {MAX_ATTUNED} at most)</span></label>}
      <label className="field"><span>What else it does (optional)</span><textarea className="input" value={it.desc} maxLength={300} placeholder="Bonus action: the blade bursts into flame, +2d6 fire…" onChange={(e) => set({ desc: e.target.value })} /></label>
      <p className="muted small">{itemLine(it) || 'A plain item.'}</p>
      <button className="btn primary wide" disabled={!nameOk} onClick={() => onSave(it)}>{cta}</button>
      {onDelete && <button className="btn ghost wide danger-text" onClick={() => { if (confirm(`Throw away ${it.name}?`)) onDelete() }}>Throw it away</button>}
    </Sheet>
  )
}

/** The player's items on the Gear tab. */
export function ItemsSection({ ch, setCh, d, roll, setState, hp }) {
  const [editing, setEditing] = useState(null) // an item, or 'new'
  const items = ch.items || []
  const attuned = items.filter((i) => i.attune && i.attuned).length
  const put = (list) => setCh({ ...ch, items: list })
  const update = (id, patch) => put(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  const drink = async (i) => {
    const dice = potionDice(i)
    const left = items.map((x) => (x.id === i.id ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0)
    if (!dice) { put(left); return }
    const e = await roll({ kind: 'expr', label: `${i.name}: healing`, expr: dice, rule: 'A healing potion: roll its dice, regain that many hit points (up to your maximum).' })
    if (e) setCh({ ...ch, items: left, state: { ...ch.state, hp: Math.min(d.hp.value, hp + e.total) } })
  }
  return (
    <>
      <h2 className="sec">Magic and special items <span className="muted small">{attuned ? `${attuned}/${MAX_ATTUNED} attuned` : ''}</span></h2>
      {!items.length && <p className="muted small">Items from the DM land here, and your own: weapons, armor, rings, potions.</p>}
      <ul className="gear items">
        {items.map((i) => (
          <li key={i.id} className={`item ${i.equipped ? 'on' : ''}`}>
            <GameIcon id={iconOf(i)} size={30} />
            <span className="grow"><b>{i.name}{i.qty > 1 ? ` ×${i.qty}` : ''}</b>{i.from === 'custom' && <span className="tag-pc">custom</span>}<span className="muted small" style={{ display: 'block' }}>{itemLine(i)}</span>
              {i.attune && i.equipped && !i.attuned && <span className="warn-line small">Not attuned: it doesn't work yet.</span>}</span>
            <span className="item-btns">
              {i.kind === 'potion' ? <button className="btn small primary" onClick={() => drink(i)}>Drink</button>
                : i.kind !== 'gear' && <button className={`btn small ${i.equipped ? 'primary' : 'ghost'}`} aria-pressed={i.equipped} onClick={() => update(i.id, { equipped: !i.equipped })}>{i.equipped ? (i.kind === 'weapon' ? 'In hand' : 'Worn') : 'Equip'}</button>}
              {i.attune && <button className={`btn small ${i.attuned ? 'primary' : 'ghost'}`} aria-pressed={i.attuned} disabled={!i.attuned && attuned >= MAX_ATTUNED} onClick={() => update(i.id, { attuned: !i.attuned })}>{i.attuned ? 'Attuned' : 'Attune'}</button>}
              <button className="icon-btn" aria-label={`Change ${i.name}`} onClick={() => setEditing(i)}>✎</button>
            </span>
          </li>
        ))}
      </ul>
      <button className="btn ghost" onClick={() => setEditing('new')}>+ Add an item</button>
      {editing && <ItemEditor item={editing === 'new' ? null : editing} title={editing === 'new' ? 'Add an item' : `Change ${editing.name}`} cta={editing === 'new' ? 'Add it' : 'Save'} onClose={() => setEditing(null)}
        onDelete={editing === 'new' ? null : () => { put(items.filter((x) => x.id !== editing.id)); setEditing(null) }}
        onSave={(it) => { put(editing === 'new' ? [...items, { ...it, from: 'custom' }] : items.map((x) => (x.id === it.id ? { ...it, from: x.from } : x))); setEditing(null) }} />}
    </>
  )
}

/** Gifts from the DM wait in state.gifts until the player takes (equipped or in the bag) or declines them. */
export function GiftBanner({ ch, setCh }) {
  const gifts = ch.state?.gifts || []
  if (!gifts.length) return null
  const g = cleanItem({ ...gifts[0], from: 'dm' })
  const take = (equipped) => setCh({ ...ch, items: [...(ch.items || []), { ...g, equipped: equipped && g.kind !== 'potion' && g.kind !== 'gear' }], state: { ...ch.state, gifts: gifts.slice(1) } })
  return (
    <div className="gift-banner" role="status">
      <GameIcon id={iconOf(g)} size={34} />
      <span className="grow"><b>🎁 From the DM: {g.name}{g.qty > 1 ? ` ×${g.qty}` : ''}</b><span className="muted small" style={{ display: 'block' }}>{itemLine(g)}</span></span>
      <div className="row">
        {g.kind !== 'potion' && g.kind !== 'gear' && <button className="btn small primary" onClick={() => take(true)}>{g.kind === 'weapon' ? 'Hold it' : 'Wear it'}</button>}
        <button className={`btn small ${g.kind === 'potion' || g.kind === 'gear' ? 'primary' : 'ghost'}`} onClick={() => take(false)}>Into my bag</button>
        <button className="btn small ghost" onClick={() => setCh({ ...ch, state: { ...ch.state, gifts: gifts.slice(1) } })}>Decline</button>
      </div>
    </div>
  )
}
