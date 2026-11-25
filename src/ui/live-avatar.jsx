// The living avatar (release 2): the character's face in a ring that is its HP (green → gold → red → grey at 0),
// with what is on them right now (concentration, Rage, spells, conditions), and short effects when something
// happens (hit, healed, down, your turn, a critical, concentration broken, a new level). Each effect plays once,
// says what happened in words too, and stays still under Reduce motion.
import React, { useEffect, useRef, useState } from 'react'
import { avatarState, avatarEvents } from '../engine/avatar-state.js'
import { feel } from './fx.js'
import { AvatarImg } from './avatar.jsx'
import { CLASS_COLORS } from '../content/avatars.js'

const TONE_WORD = { ok: '', bloodied: 'Bloodied', critical: 'Badly hurt', down: 'Down' }

/** live: this phone's own sheet (plays sounds, listens for criticals); elsewhere the avatar only shows. */
export function LiveAvatar({ ch, d, size = 84, myTurn = false, live = false }) {
  const s = avatarState(d, ch, { myTurn })
  const [fx, setFx] = useState([])
  const prev = useRef(null)
  const add = (list) => {
    const stamped = list.map((e) => ({ ...e, id: `${Date.now()}${Math.random()}` }))
    setFx((f) => [...f, ...stamped].slice(-4))
    for (const e of stamped) setTimeout(() => setFx((f) => f.filter((x) => x.id !== e.id)), 1400)
  }
  const snap = { hp: s.hp, conc: s.conc, level: ch.level, myTurn: s.myTurn }
  useEffect(() => {
    const ev = avatarEvents(prev.current, snap)
    prev.current = snap
    if (!ev.length) return
    if (live) for (const e of ev) feel(e.kind)
    add(ev)
  }, [s.hp, s.conc?.id, ch.level, s.myTurn])
  useEffect(() => {
    if (!live) return
    const on = (e) => add([e.detail])
    window.addEventListener('tt-fx', on)
    return () => window.removeEventListener('tt-fx', on)
  }, [live])
  const r = 47, circ = 2 * Math.PI * r
  const photo = ch.portrait?.kind === 'photo' || ch.portrait?.kind === 'icon'
  const label = [`${ch.name}: HP ${s.hp} of ${s.max}`, TONE_WORD[s.tone], s.conc && `concentrating on ${s.conc.name}`, s.raging && 'raging', s.myTurn && 'their turn'].filter(Boolean).join(', ')
  return (
    <span className={`live-avatar tone-${s.tone} ${s.myTurn ? 'my-turn' : ''} ${s.raging ? 'raging' : ''} ${s.conc ? 'concentrating' : ''} ${fx.map((f) => `fx-${f.kind}`).join(' ')}`}
      style={{ '--size': `${size}px`, '--cls': CLASS_COLORS[ch.classId] || 'var(--accent)' }} role="img" aria-label={label}>
      <svg className="la-ring" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={r} className="la-track" />
        <circle cx="50" cy="50" r={r} className="la-hp" strokeDasharray={`${circ * s.pct} ${circ}`} transform="rotate(-90 50 50)" />
      </svg>
      <span className="la-face">{photo ? (ch.portrait.kind === 'photo' ? <img src={ch.portrait.src} alt="" /> : <span className="la-emoji">{ch.portrait.src}</span>) : <AvatarImg ch={ch} size={size} />}</span>
      {s.conc && <span className="la-badge la-conc" aria-hidden>◎</span>}
      {s.raging && <span className="la-badge la-rage" aria-hidden>🔥</span>}
      {s.buffs.length > 0 && <span className="la-badge la-buffs" aria-hidden>✦{s.buffs.length > 1 ? s.buffs.length : ''}</span>}
      {s.conditions.length > 0 && <span className="la-badge la-cond" aria-hidden>!</span>}
      {s.deathSaves && size >= 60 && <span className="la-saves" aria-hidden>{[0, 1, 2].map((i) => <i key={`o${i}`} className={i < s.deathSaves.ok ? 'ok' : ''} />)}{[0, 1, 2].map((i) => <i key={`f${i}`} className={`f ${i < s.deathSaves.fail ? 'bad' : ''}`} />)}</span>}
      {fx.map((f) => <span key={f.id} className={`la-float ${f.kind}`} aria-hidden>{f.text}</span>)}
    </span>
  )
}
export { TONE_WORD }
