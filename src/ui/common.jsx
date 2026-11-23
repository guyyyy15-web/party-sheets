// Small shared pieces: bottom sheet, option cards, number with sources, steppers.
import React from 'react'
import { ABILITIES } from '../content/basics.js'
import { FEATS } from '../content/feats.js'

export const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)

export function Sheet({ title, onClose, children }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close">✕</button></div>
        {children}
      </div>
    </div>
  )
}

/** Where a number comes from: a list of { label, value }. */
export function SourcesSheet({ title, total, sources, onClose }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <ul className="sources">
        {sources.map((s, i) => <li key={i}><span>{s.label}</span><span className="mono">{i === 0 && !String(s.label).startsWith('+') ? s.value : signed(s.value)}</span></li>)}
        <li className="total"><span>Total</span><span className="mono">{total}</span></li>
      </ul>
    </Sheet>
  )
}

/** Pick up to `count` of `options` (cards). */
export function OptionCards({ options, picked, count, onChange, columns = 1 }) {
  const toggle = (id) => {
    if (picked.includes(id)) return onChange(picked.filter((x) => x !== id))
    if (count === 1) return onChange([id])
    if (picked.length < count) onChange([...picked, id])
  }
  return (
    <div className={`cards cols-${columns}`}>
      {options.map((o) => (
        <button key={o.id} className={`card opt ${picked.includes(o.id) ? 'on' : ''}`} aria-pressed={picked.includes(o.id)} onClick={() => toggle(o.id)} disabled={o.disabled}>
          <span className="opt-name">{o.name}{picked.includes(o.id) && <span className="tick">✓</span>}</span>
          {o.summary && <span className="opt-sum">{o.summary}</span>}
        </button>
      ))}
    </div>
  )
}

/** An ASI (or Epic Boon) at a level: +2 / +1 +1 / a feat. value: {type, ability, abilities, feat}. */
export function AsiPicker({ value, onChange, scores, epic, level, takenFeats }) {
  const v = value || { type: epic ? 'feat' : 'plus2' }
  const feats = FEATS.filter((f) => (epic ? f.category === 'epic' : ['general', 'origin', 'fighting-style'].includes(f.category) && !(f.category === 'fighting-style')))
    .filter((f) => !takenFeats.includes(f.id) || f.id === v.feat)
    .filter((f) => !f.prereq?.spellcasting) // no spellcasting classes before phase 2
    .filter((f) => !f.prereq || ((!f.prereq.level || level >= f.prereq.level) && (!f.prereq.scores || Object.entries(f.prereq.scores)[f.prereq.any ? 'some' : 'every'](([a, n]) => scores[a] >= n))))
  const feat = FEATS.find((f) => f.id === v.feat)
  const featAbilities = feat?.ability === 'any' ? ABILITIES : feat?.ability || []
  const cap = epic ? 30 : 20
  const set = (patch) => onChange({ ...v, ...patch })
  return (
    <div className="asi">
      {!epic && (
        <div className="seg">
          {[['plus2', '+2 to one'], ['plus1', '+1 to two'], ['feat', 'A feat']].map(([t, l]) => (
            <button key={t} aria-pressed={v.type === t} onClick={() => onChange({ type: t })}>{l}</button>
          ))}
        </div>
      )}
      {v.type === 'plus2' && <div className="abil-grid">{ABILITIES.map((a) => <button key={a} className={`chip ${v.ability === a ? 'on' : ''}`} disabled={scores[a] >= cap} onClick={() => set({ ability: a })}>{a} {scores[a]}→{Math.min(cap, scores[a] + 2)}</button>)}</div>}
      {v.type === 'plus1' && <div className="abil-grid">{ABILITIES.map((a) => {
        const on = (v.abilities || []).includes(a)
        return <button key={a} className={`chip ${on ? 'on' : ''}`} disabled={scores[a] >= cap && !on} onClick={() => set({ abilities: on ? v.abilities.filter((x) => x !== a) : [...(v.abilities || []), a].slice(-2) })}>{a} {scores[a]}{on ? `→${scores[a] + 1}` : ''}</button>
      })}</div>}
      {v.type === 'feat' && (
        <>
          <OptionCards options={feats.map((f) => ({ id: f.id, name: f.name, summary: f.summary }))} picked={v.feat ? [v.feat] : []} count={1} onChange={(ids) => onChange({ type: 'feat', feat: ids[0] })} />
          {featAbilities.length > 0 && <><p className="muted small">+1 to:</p><div className="abil-grid">{featAbilities.map((a) => <button key={a} className={`chip ${v.ability === a ? 'on' : ''}`} onClick={() => set({ ability: a })}>{a}</button>)}</div></>}
        </>
      )}
    </div>
  )
}
export const asiDone = (v) => !!v && ((v.type === 'plus2' && v.ability) || (v.type === 'plus1' && v.abilities?.length === 2) || (v.type === 'feat' && v.feat && (!FEATS.find((f) => f.id === v.feat)?.ability || v.ability)))

export function Stepper({ value, onChange, min = -Infinity, max = Infinity, label }) {
  return (
    <span className="stepper">
      <button className="icon-btn boxed" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label} down`}>−</button>
      <span className="mono">{value}</span>
      <button className="icon-btn boxed" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label} up`}>+</button>
    </span>
  )
}
