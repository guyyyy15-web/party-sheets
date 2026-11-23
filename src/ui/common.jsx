// Small shared pieces: bottom sheet, option cards, number with sources, steppers.
import React from 'react'
import { ICONS } from '../content/icons-data.js'
import { ABILITIES } from '../content/basics.js'
import { FEATS } from '../content/feats.js'

export const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)

/** Kinds of numbers, each with one color everywhere (and a word, so color is never the only cue). */
export const KINDS = {
  dice: { name: 'Die roll', short: 'die' },
  ability: { name: 'Ability modifier', short: 'mod' },
  prof: { name: 'Proficiency bonus', short: 'prof' },
  expertise: { name: 'Expertise (proficiency x2)', short: 'exp' },
  bonus: { name: 'Feat, species, gear or class bonus', short: 'bonus' },
  level: { name: 'Class level', short: 'lvl' },
  base: { name: 'Base value', short: 'base' },
  penalty: { name: 'Penalty', short: 'pen' },
}

/** A number in the color of its kind. */
export function Num({ kind = 'base', value, sign = true, className = '' }) {
  return <span className={`num k-${kind} ${className}`}>{sign && typeof value === 'number' ? signed(value) : value}</span>
}

/** How a total is made, as small colored chips: +3 DEX · +2 prof. */
export function Breakdown({ parts, label = 'Made of' }) {
  const list = (parts || []).filter((p) => p.value !== 0)
  if (!list.length) return null
  return (
    <span className="bd" aria-label={`${label}: ${list.map((p) => `${signed(p.value)} ${KINDS[p.kind || 'base']?.short || ''}`).join(', ')}`}>
      {list.map((p, i) => <span key={i} className={`bd-chip k-${p.kind || 'base'}`} title={p.label}>{signed(p.value)}<small>{short(p)}</small></span>)}
    </span>
  )
}
const short = (p) => (p.kind === 'ability' ? (p.label.match(/^(STR|DEX|CON|INT|WIS|CHA)/)?.[1] || 'mod')
  : (p.kind === 'bonus' || p.kind === 'level') && p.label && p.label.length <= 14 ? p.label // e.g. "Alert", "Shield", "Fighter level"
  : KINDS[p.kind || 'base']?.short || '')

/** The color key, shown once on the sheet and in the roll card. */
export function Legend({ kinds = ['dice', 'ability', 'prof', 'expertise', 'bonus', 'level', 'penalty'] }) {
  return (
    <details className="legend">
      <summary>Color key</summary>
      <ul>{kinds.map((k) => <li key={k}><span className={`swatch-dot k-${k}`} aria-hidden />{KINDS[k].name}</li>)}</ul>
    </details>
  )
}

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
        {sources.map((s, i) => <li key={i}><span><span className={`swatch-dot k-${s.kind || 'base'}`} aria-hidden />{s.label}</span><Num kind={s.kind || 'base'} value={s.value} sign={!(i === 0 && (s.kind === 'base' || !s.kind))} className="mono" /></li>)}
        <li className="total"><span>Total</span><span className="mono">{total}</span></li>
      </ul>
    </Sheet>
  )
}

/** Pick up to `count` of `options` (cards). */
/** A small tag for content from the Player's Handbook: players can check it against their book. */
const SHORT = { "Xanathar's Guide to Everything": 'XGtE', "Tasha's Cauldron of Everything": 'TCoE', "Sword Coast Adventurer's Guide": 'SCAG', "Fizban's Treasury of Dragons": 'FTD', "Van Richten's Guide to Ravenloft": 'VRGR', "Explorer's Guide to Wildemount": 'EGtW', "Player's Handbook 2014": 'PHB14', "Dungeon Master's Guide 2014": 'DMG14', 'Heroes of Faerûn': 'HoF' }
export const SourceTag = ({ source }) => <span className={`src-tag ${/PHB 2024/.test(source) ? '' : 'ext'}`} title={`${source}: written in our own words. Check the numbers in your book.`}>{/PHB 2024/.test(source) ? 'PHB' : SHORT[source] || source.split(/[\s:]/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join('').slice(0, 6)}</span>

/** An icon from game-icons.net (CC BY 3.0), drawn in the current text color. Decorative: the text next to it says it. */
export function GameIcon({ id, size = 28, className = '' }) {
  const body = ICONS[id]
  if (!body) return null
  return <svg className={`gi ${className}`} viewBox="0 0 512 512" width={size} height={size} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: body }} />
}

export function OptionCards({ options, picked, count, onChange, columns = 1 }) {
  const toggle = (id) => {
    if (picked.includes(id)) return onChange(picked.filter((x) => x !== id))
    if (count === 1) return onChange([id])
    if (picked.length < count) onChange([...picked, id])
  }
  return (
    <div className={`cards cols-${columns}`}>
      {options.map((o) => (
        <button key={o.id} className={`card opt ${o.icon ? 'has-icon' : ''} ${picked.includes(o.id) ? 'on' : ''}`} aria-pressed={picked.includes(o.id)} onClick={() => toggle(o.id)} disabled={o.disabled}>
          {o.icon && <GameIcon id={o.icon} size={34} className="opt-icon" />}
          <span className="opt-name">{o.name}{o.source && <SourceTag source={o.source} />}{picked.includes(o.id) && <span className="tick">✓</span>}</span>
          {o.summary && <span className="opt-sum">{o.summary}</span>}
        </button>
      ))}
    </div>
  )
}

/** An ASI (or Epic Boon) at a level: +2 / +1 +1 / a feat. value: {type, ability, abilities, feat}. */
export function AsiPicker({ value, onChange, scores, epic, level, takenFeats, caster, armor = [] }) {
  const v = value || { type: epic ? 'feat' : 'plus2' }
  const feats = FEATS.filter((f) => (epic ? f.category === 'epic' : ['general', 'origin', 'fighting-style'].includes(f.category) && !(f.category === 'fighting-style')))
    .filter((f) => !f.prereq?.spellcasting || caster)
    .filter((f) => !f.prereq?.armor || armor.includes(f.prereq.armor))
    .filter((f) => !takenFeats.includes(f.id) || f.repeatable || f.id === v.feat)
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

/** Each class's default color (a character can pick its own). */
export const CLASS_THEME = { barbarian: 'red', bard: 'rose', cleric: 'gold', druid: 'jade', fighter: 'red', monk: 'gold', paladin: 'blue', ranger: 'jade', rogue: 'violet', sorcerer: 'rose', warlock: 'violet', wizard: 'blue' }
export const themeOf = (ch) => ch.theme || CLASS_THEME[ch.classId] || 'gold'
