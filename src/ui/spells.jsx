// The Spells tab: spell save DC and spell attack (with their math), slots, concentration, cantrips and prepared
// spells, casting with a chosen slot, and a picker for the spells you prepare.
import React, { useState, useMemo } from 'react'
import { spellRoll } from '../engine/spells.js'
import { Sheet, Num, Breakdown, signed, GameIcon } from './common.jsx'

const LEVEL = (n) => (n === 0 ? 'Cantrip' : `Level ${n}`)
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

export const SPELL_RULES = {
  spellAttack: 'Spell attack: d20 + your spellcasting ability modifier + proficiency bonus. It hits if the total is at least the target\'s AC.',
  spellSave: 'Spell save DC = 8 + your spellcasting ability modifier + proficiency bonus. The target rolls a save against it.',
  concentration: 'Concentration: one spell at a time. Casting another concentration spell ends the first. When you take damage, make a CON save (DC 10 or half the damage, whichever is higher, up to 30) or the spell ends.',
  slots: 'Casting a spell of level 1 or higher uses a slot of that level or higher. A higher slot can make it stronger. Slots come back on a long rest.',
  pact: 'Pact Magic: all your slots are the same level and come back on a short or long rest.',
  ritual: 'Ritual: cast it in 10 minutes longer without using a slot (it must be prepared).',
}

export function SpellsTab({ d, ch, setCh, setState, roll, mode, show }) {
  const sc = d.spellcasting
  const [picker, setPicker] = useState(false)
  const [casting, setCasting] = useState(null)
  const [open, setOpen] = useState(null)
  const used = (id) => ch.state.used?.[id] || 0
  const setUsed = (id, n) => setState({ used: { ...ch.state.used, [id]: Math.max(0, n) } })
  const byLevel = useMemo(() => {
    const m = new Map()
    for (const s of sc.prepared) { if (!m.has(s.level)) m.set(s.level, []); m.get(s.level).push(s) }
    return [...m.entries()]
  }, [sc])
  const short = sc.cantripsChosen < sc.cantripsMax || sc.preparedChosen < sc.preparedMax

  const attack = (s) => roll({ kind: 'd20', label: `${s ? s.name : 'Spell'}: spell attack`, bonus: sc.attack.value, mode, attack: true, parts: sc.attack.parts, rule: SPELL_RULES.spellAttack })
  const effect = (s, castLevel) => {
    const r = spellRoll(s, { level: ch.level, castLevel, mod: sc.mod, ability: sc.ability })
    if (!r) return null
    return roll({ kind: 'expr', label: `${s.name}: ${r.heal ? 'healing' : `${r.type} damage`}`, expr: r.expr, parts: r.parts, rule: r.why || (r.heal ? 'Healing: roll the dice and add any bonus.' : 'Damage: roll the spell\'s dice and add any bonus.') })
  }
  const cast = (s, slotLevel, slotId) => {
    const patch = {}
    if (slotId) patch.used = { ...ch.state.used, [slotId]: used(slotId) + 1 }
    if (s.concentration) patch.concentration = s.id
    if (Object.keys(patch).length) setState(patch)
  }

  return (
    <section className="spells">
      <div className="sc-head">
        <button className="stat-card" onClick={() => show('Spell save DC', { value: sc.dc.value, sources: sc.dc.parts })} aria-label={`Spell save DC ${sc.dc.value}: how it's made`}>
          <span className="lbl">Spell save DC</span><b className="mono">{sc.dc.value}</b><Breakdown parts={sc.dc.parts} />
        </button>
        <button className="stat-card" onClick={() => attack(null)} aria-label={`Roll a spell attack, ${signed(sc.attack.value)}`}>
          <span className="lbl">Spell attack 🎲</span><b><Num kind="base" value={sc.attack.value} /></b><Breakdown parts={sc.attack.parts} />
        </button>
        <div className="stat-card"><span className="lbl">Ability</span><b className="mono">{sc.ability}</b><span className="muted small">{sc.focus}</span></div>
      </div>

      {sc.concentration && (
        <div className="conc" role="status">
          <span className="grow"><b>Concentrating:</b> {sc.concentration.name}<span className="muted small">Damage → CON save (DC 10 or half the damage)</span></span>
          <button className="btn ghost small" onClick={() => setState({ concentration: null })}>End</button>
        </div>
      )}

      {(sc.slots.length > 0 || sc.pact) && (
        <div className="slots" aria-label="Spell slots">
          {sc.slots.map((s) => <SlotRow key={s.id} name={`${ORD[s.level]} level`} max={s.max} used={used(s.id)} onSet={(n) => setUsed(s.id, n)} />)}
          {sc.pact && <SlotRow name={`Pact slots (${ORD[sc.pact.level]} level, short rest)`} max={sc.pact.count} used={used('pact-slots')} onSet={(n) => setUsed('pact-slots', n)} />}
        </div>
      )}

      {short && <button className="banner" onClick={() => setPicker(true)}>✦ Choose your spells: {sc.cantripsMax ? `${sc.cantripsChosen}/${sc.cantripsMax} cantrips, ` : ''}{sc.preparedChosen}/{sc.preparedMax} prepared ›</button>}

      {sc.cantrips.length > 0 && <h2 className="sp-level">Cantrips <span className="muted small">at will</span></h2>}
      <ul className="spell-list">{sc.cantrips.map((s) => <SpellRow key={s.id} s={s} sc={sc} level={ch.level} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} attack={attack} effect={effect} onCast={() => cast(s)} />)}</ul>
      {byLevel.map(([lvl, list]) => (
        <React.Fragment key={lvl}>
          <h2 className="sp-level">{LEVEL(lvl)}</h2>
          <ul className="spell-list">{list.map((s) => <SpellRow key={s.id} s={s} sc={sc} level={ch.level} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} attack={attack} effect={effect} onCast={() => setCasting(s)} />)}</ul>
        </React.Fragment>
      ))}
      <button className="btn ghost wide" onClick={() => setPicker(true)}>✎ Choose spells</button>
      {casting && <CastSheet s={casting} sc={sc} used={used} onClose={() => setCasting(null)} cast={cast} attack={attack} effect={effect} />}
      {picker && <SpellPicker sc={sc} ch={ch} setCh={setCh} onClose={() => setPicker(false)} />}
    </section>
  )
}

function SlotRow({ name, max, used, onSet }) {
  const left = max - Math.min(max, used)
  return (
    <div className="res">
      <span className="res-name">{name}<small>{left} of {max} left</small></span>
      <span className="pips">{Array.from({ length: max }).map((_, i) => (
        <button key={i} className={`pip ${i < left ? 'full' : ''}`} aria-label={`${name}: slot ${i + 1}, ${i < left ? 'available' : 'used'}`} onClick={() => onSet(i < left ? max - i : max - i - 1)} />
      ))}</span>
    </div>
  )
}

function Tags({ s, sc, always }) {
  return (
    <span className="sp-tags">
      <span>{s.time}</span><span>{s.range}</span>
      {s.concentration && <span className="tag-c" title="Concentration">C</span>}
      {s.ritual && sc.ritual && <span className="tag-r" title="Ritual">R</span>}
      {s.save && <span className="tag-save">{s.save} save {sc.dc.value}</span>}
      {always && <span className="tag-always" title={`Always prepared: ${always}`}>always</span>}
    </span>
  )
}

function SpellRow({ s, sc, level, open, onToggle, attack, effect, onCast }) {
  const r = spellRoll(s, { level, castLevel: s.level, mod: sc.mod, ability: sc.ability })
  return (
    <li className={`spell ${open ? 'open' : ''}`}>
      <button className="spell-name" onClick={onToggle} aria-expanded={open}>
        <GameIcon id={`school.${s.school.toLowerCase()}`} size={30} className="sp-icon" />
        <span><b>{s.name}</b><Tags s={s} sc={sc} always={sc.always.get(s.id)} /></span>
      </button>
      {open && (
        <div className="spell-body">
          <p>{s.summary}</p>
          <p className="muted small">{s.school} · {s.components} · {s.duration}</p>
          {(s.damage?.higher || s.heal?.higher || s.higher) && <p className="muted small">Higher slots: {s.damage?.higher || s.heal?.higher || s.higher}</p>}
        </div>
      )}
      <div className="spell-actions">
        {s.level > 0 && <button className="btn small primary" onClick={onCast}>Cast</button>}
        {s.level === 0 && s.concentration && <button className="btn small ghost" onClick={onCast}>Concentrate</button>}
        {s.level === 0 && s.attack && <button className="btn small ghost" onClick={() => attack(s)}>Attack {signed(sc.attack.value)}</button>}
        {s.level === 0 && r && <button className="btn small ghost" onClick={() => effect(s)}>{r.heal ? 'Heal' : 'Damage'} {r.expr}</button>}
      </div>
    </li>
  )
}

/** Pick a slot (or a ritual), then roll what the spell needs. */
function CastSheet({ s, sc, used, onClose, cast, attack, effect }) {
  const [done, setDone] = useState(null) // the slot level it was cast with
  const options = [
    ...sc.slots.filter((x) => x.level >= s.level).map((x) => ({ key: x.id, level: x.level, id: x.id, left: x.max - Math.min(x.max, used(x.id)), label: `${ORD[x.level]}-level slot` })),
    ...(sc.pact && sc.pact.level >= s.level ? [{ key: 'pact', level: sc.pact.level, id: 'pact-slots', left: sc.pact.count - Math.min(sc.pact.count, used('pact-slots')), label: `Pact slot (${ORD[sc.pact.level]} level)` }] : []),
  ]
  const r = done && spellRoll(s, { level: 0, castLevel: done, mod: sc.mod, ability: sc.ability })
  return (
    <Sheet title={`Cast ${s.name}`} onClose={onClose}>
      {!done ? (
        <>
          <div className="cast-options">
            {options.map((o) => (
              <button key={o.key} className="btn wide ghost" disabled={o.left <= 0} onClick={() => { cast(s, o.level, o.id); setDone(o.level) }}>
                {o.label} <span className="muted">· {o.left} left{o.level > s.level && (s.damage?.higher || s.heal?.higher || s.higher) ? ' · stronger' : ''}</span>
              </button>
            ))}
            {s.ritual && sc.ritual && <button className="btn wide ghost" onClick={() => { cast(s, s.level, null); setDone(s.level) }}>As a ritual (10 minutes longer, no slot)</button>}
          </div>
          {!options.some((o) => o.left > 0) && !s.ritual && <p className="warn-line">No slots left for this spell. They come back on a {sc.pact ? 'short or ' : ''}long rest.</p>}
        </>
      ) : (
        <>
          <p className="ok-line" role="status">Cast at {ORD[done]} level.{s.concentration ? ' You are concentrating on it.' : ''}</p>
          <p>{s.summary}</p>
          {s.save && <p className="panel small">Targets make a <b>{s.save} save</b> against your <b>DC {sc.dc.value}</b>. {SPELL_RULES.spellSave}</p>}
          <div className="row">
            {s.attack && <button className="btn primary grow" onClick={() => attack(s)}>Spell attack {signed(sc.attack.value)}</button>}
            {r && <button className="btn primary grow" onClick={() => effect(s, done)}>{r.heal ? 'Heal' : 'Damage'} {r.expr}</button>}
          </div>
          <button className="btn ghost wide" onClick={onClose}>Done</button>
        </>
      )}
    </Sheet>
  )
}

/** Choose cantrips and prepared spells, with counters and a search. */
function SpellPicker({ sc, ch, setCh, onClose }) {
  const [tab, setTab] = useState(sc.cantripsMax ? 0 : 1)
  const [q, setQ] = useState('')
  const cur = { cantrips: ch.spells?.cantrips || [], prepared: ch.spells?.prepared || [] }
  const levels = [...(sc.cantripsMax ? [0] : []), ...Array.from({ length: sc.maxLevel }, (_, i) => i + 1)]
  const list = (tab === 0 ? sc.cantripOptions : sc.spellOptions.filter((s) => s.level === tab)).filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()))
  const key = tab === 0 ? 'cantrips' : 'prepared'
  const count = tab === 0 ? sc.cantripsChosen : sc.preparedChosen
  const max = tab === 0 ? sc.cantripsMax : sc.preparedMax
  const toggle = (id) => {
    const on = cur[key].includes(id)
    if (!on && count >= max) return
    setCh({ ...ch, spells: { ...cur, [key]: on ? cur[key].filter((x) => x !== id) : [...cur[key], id] } })
  }
  return (
    <Sheet title="Choose spells" onClose={onClose}>
      <p className="counter" role="status">
        {sc.cantripsMax > 0 && <span className={sc.cantripsChosen >= sc.cantripsMax ? 'full' : ''}>Cantrips {sc.cantripsChosen}/{sc.cantripsMax}</span>}
        <span className={sc.preparedChosen >= sc.preparedMax ? 'full' : ''}>Prepared {sc.preparedChosen}/{sc.preparedMax}</span>
      </p>
      
      <div className="seg sp-tabs" role="tablist">{levels.map((l) => <button key={l} role="tab" aria-selected={tab === l} onClick={() => setTab(l)}>{l === 0 ? 'Cantrips' : ORD[l]}</button>)}</div>
      <input className="input" type="search" placeholder="Search spells" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search spells" />
      <ul className="pick-list">
        {list.map((s) => {
          const always = sc.always.get(s.id)
          const on = !!always || cur[key].includes(s.id)
          return (
            <li key={s.id}>
              <label className={`pick ${on ? 'on' : ''} ${!on && count >= max ? 'off' : ''}`}>
                <input type="checkbox" checked={on} disabled={!!always || (!on && count >= max)} onChange={() => toggle(s.id)} />
                <GameIcon id={`school.${s.school.toLowerCase()}`} size={28} className="sp-icon" />
                <span><b>{s.name}</b><Tags s={s} sc={sc} always={always} /><span className="muted small">{s.summary}</span></span>
              </label>
            </li>
          )
        })}
      </ul>
      <button className="btn primary wide" onClick={onClose}>Done</button>
    </Sheet>
  )
}
