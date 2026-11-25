// The character's avatar on screen (src/engine/avatar.js draws it) and "Your look", where the player picks it.
import React, { useState } from 'react'
import { avatarUri, avatarLook, newSeed } from '../engine/avatar.js'
import { HAIR, EYES, MOUTHS, HAIR_COLORS, SKIN_COLORS } from '../content/avatars.js'
import { Sheet } from './common.jsx'

// one image per look, built once (the face library takes a few milliseconds per avatar)
const cache = new Map()
const keyOf = (ch) => JSON.stringify([ch.id, ch.classId, ch.speciesId, ch.avatar || null])
export function avatarSrc(ch) {
  const k = keyOf(ch)
  if (!cache.has(k)) { if (cache.size > 200) cache.clear(); cache.set(k, avatarUri(ch)) }
  return cache.get(k)
}

/** The avatar as an image (decorative: the name beside it says who it is). */
export function AvatarImg({ ch, size = 48, className = '' }) {
  return <img className={`avatar-img ${className}`} src={avatarSrc(ch)} width={size} height={size} alt="" draggable={false} />
}

const step = (list, cur, d) => list.at((list.indexOf(cur) + d + list.length) % list.length)

/** "Your look": a new face with the dice, or each part by hand; the class mark (hat, hood…) can be turned off. */
export function LookSheet({ ch, setCh, onClose }) {
  const [a, setA] = useState(() => ({ ...avatarLook(ch), ...(ch.avatar || {}) }))
  const preview = { ...ch, avatar: a }
  const set = (patch) => setA({ ...a, ...patch })
  const Cycle = ({ label, list, k }) => (
    <div className="row look-row">
      <button className="icon-btn boxed" aria-label={`${label}: previous`} onClick={() => set({ [k]: step(list, a[k], -1) })}>‹</button>
      <span className="grow look-label">{label} <span className="muted small">{list.indexOf(a[k]) + 1}/{list.length}</span></span>
      <button className="icon-btn boxed" aria-label={`${label}: next`} onClick={() => set({ [k]: step(list, a[k], 1) })}>›</button>
    </div>
  )
  const Swatches = ({ label, list, k }) => (
    <div className="look-swatches" role="group" aria-label={label}>
      <span className="field-label">{label}</span>
      <div className="row">{list.map((c) => <button key={c} className={`look-swatch ${a[k] === c ? 'on' : ''}`} style={{ background: `#${c}` }} aria-pressed={a[k] === c} aria-label={`${label} ${c}`} onClick={() => set({ [k]: c })} />)}</div>
    </div>
  )
  return (
    <Sheet title="Your look" onClose={onClose}>
      <div className="look-preview"><AvatarImg ch={preview} size={168} /></div>
      <button className="btn ghost wide" onClick={() => setA({ ...avatarLook({ ...ch, avatar: { seed: newSeed() } }), layer: a.layer })}>🎲 A new face</button>
      <Cycle label="Hair" list={HAIR} k="hair" />
      <Swatches label="Hair color" list={HAIR_COLORS} k="hairColor" />
      <Swatches label="Skin" list={SKIN_COLORS} k="skin" />
      <Cycle label="Eyes" list={EYES} k="eyes" />
      <Cycle label="Mouth" list={MOUTHS} k="mouth" />
      <label className="row toggle"><input type="checkbox" checked={!!a.glasses} onChange={(e) => set({ glasses: e.target.checked })} /><span>Glasses</span></label>
      <label className="row toggle"><input type="checkbox" checked={a.layer !== false} onChange={(e) => set({ layer: e.target.checked })} /><span>Class look (hat, hood, horns…)</span></label>
      <button className="btn primary wide" onClick={() => { const { seed, ...rest } = a; setCh({ ...ch, avatar: { seed: seed || avatarLook(ch).seed, ...rest }, portrait: null }); onClose() }}>Keep this look</button>
    </Sheet>
  )
}
