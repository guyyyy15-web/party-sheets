// The Spells tab: spell save DC and spell attack (with their math), slots, concentration, cantrips and prepared
// spells, casting with a chosen slot, and a picker for the spells you prepare.
import React, { useState, useMemo } from 'react'
import { spellRoll } from '../engine/spells.js'
import { recommendSpells } from '../engine/advice.js'
import { Sheet, Num, Breakdown, signed, GameIcon } from './common.jsx'
import { allowed, used as usedTurn, timeKind } from './turnstate.js'
import { TurnBar } from './sheet.jsx'
import { CONDITIONS } from '../content/conditions.js'

const isSlot = (id) => !!id && (/^slot-\d$/.test(id) || id === 'pact-slots')
/** Cast: takes its part of the turn (and the turn's one slot); false when the player stops it. */
export function castPatch(ch, used, s, slotId, { ritual = false } = {}) {
  const kind = ritual ? null : timeKind(s.time), slot = isSlot(slotId)
  if (!allowed(ch.state.turn, { kind, slot })) return null
  const patch = { turn: usedTurn(ch.state.turn, { kind, slot, spend: slotId ? { [slotId]: 1 } : null }) }
  if (slotId) patch.used = { ...ch.state.used, [slotId]: used(slotId) + 1 }
  if (s.concentration) patch.concentration = s.id
  return patch
}

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

export function SpellsTab({ d, ch, setCh, setState, roll, mode, show, openPicker, onPickerClosed, fight, hp }) {
  const sc = d.spellcasting
  const [picker, setPicker] = useState(!!openPicker)
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
  const cast = (s, slotLevel, slotId, opts) => { const p = castPatch(ch, used, s, slotId, opts); if (p) setState(p); return !!p }

  return (
    <section className="spells">
      <TurnBar d={d} ch={ch} setState={setState} />
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
      {casting && <CastSheet s={casting} sc={sc} used={used} onClose={() => setCasting(null)} cast={cast} attack={attack} effect={effect} d={d} ch={ch} setState={setState} fight={fight} hp={hp} />}
      {picker && <SpellPicker sc={sc} d={d} ch={ch} setCh={setCh} onClose={() => { setPicker(false); onPickerClosed?.() }} />}
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
function CastSheet({ s, sc, used, onClose, cast, attack, effect, free, d, ch, setState, fight, hp }) {
  const [done, setDone] = useState(null) // the slot level it was cast with
  const [withSlot, setWithSlot] = useState(false)
  const [rolled, setRolled] = useState(null) // the one damage/healing roll of this casting
  const options = [
    ...(free ? [{ key: 'free', level: s.level, id: free.id, left: free.left, label: `Free cast (${free.from}, once per long rest)` }] : []),
    ...(sc.slots || []).filter((x) => x.level >= s.level).map((x) => ({ key: x.id, level: x.level, id: x.id, left: x.max - Math.min(x.max, used(x.id)), label: `${ORD[x.level]}-level slot` })),
    ...(sc.pact && sc.pact.level >= s.level ? [{ key: 'pact', level: sc.pact.level, id: 'pact-slots', left: sc.pact.count - Math.min(sc.pact.count, used('pact-slots')), label: `Pact slot (${ORD[sc.pact.level]} level)` }] : []),
  ]
  const r = done && spellRoll(s, { level: 0, castLevel: done, mod: sc.mod, ability: sc.ability })
  return (
    <Sheet title={`Cast ${s.name}`} onClose={onClose}>
      {!done ? (
        <>
          <div className="cast-options">
            {options.map((o) => (
              <button key={o.key} className="btn wide ghost" disabled={o.left <= 0} onClick={() => { if (cast(s, o.level, o.id)) { setDone(o.level); setWithSlot(isSlot(o.id)) } }}>
                {o.label} <span className="muted">· {o.left} left{o.level > s.level && (s.damage?.higher || s.heal?.higher || s.higher) ? ' · stronger' : ''}</span>
              </button>
            ))}
            {s.ritual && sc.ritual && <button className="btn wide ghost" onClick={() => { if (cast(s, s.level, null, { ritual: true })) setDone(s.level) }}>As a ritual (10 minutes longer, no slot)</button>}
          </div>
          {!options.some((o) => o.left > 0) && !(s.ritual && sc.ritual) && <p className="warn-line">{options.length ? `Nothing left to cast it with. It comes back on a ${sc.pact ? 'short or ' : ''}long rest.` : 'You need a spell slot for this one.'}</p>}
        </>
      ) : (
        <>
          <p className="ok-line" role="status">Cast at {ORD[done]} level.{s.concentration ? ' You are concentrating on it.' : ''}</p>
          <p>{s.summary}</p>
          {s.save && <p className="panel small">Targets make a <b>{s.save} save</b> against your <b>DC {sc.dc.value}</b>. {SPELL_RULES.spellSave}</p>}
          <div className="row">
            {s.attack && <button className="btn primary grow" onClick={() => attack(s)}>Spell attack {signed(sc.attack.value)}</button>}
            {r && !rolled && <button className="btn primary grow" onClick={async () => { const e = await effect(s, done); if (e) setRolled({ total: e.total, heal: r.heal }) }}>{r.heal ? 'Heal' : 'Damage'} {r.expr}</button>}
          </div>
          {rolled && d && <Deliver s={s} rolled={rolled} d={d} ch={ch} setState={setState} fight={fight} hp={hp} />}
          {d && withSlot && <AfterCast s={s} d={d} ch={ch} setState={setState} used={used} fight={fight} />}
          <button className="btn ghost wide" onClick={onClose}>Done</button>
        </>
      )}
    </Sheet>
  )
}

/** Choose cantrips and prepared spells, with counters and a search. */
function SpellPicker({ sc, d, ch, setCh, onClose }) {
  const [tab, setTab] = useState(sc.cantripsMax ? 0 : 1)
  const [q, setQ] = useState('')
  const cur = { cantrips: ch.spells?.cantrips || [], prepared: ch.spells?.prepared || [] }
  const levels = [...(sc.cantripsMax ? [0] : []), ...Array.from({ length: sc.maxLevel }, (_, i) => i + 1)]
  const recs = React.useMemo(() => ({ ...recommendSpells(ch, d, { cantrips: true }), ...recommendSpells(ch, d) }), [ch, d])
  const list = (tab === 0 ? sc.cantripOptions : sc.spellOptions.filter((s) => s.level === tab)).filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (recs[b.id] ? 1 : 0) - (recs[a.id] ? 1 : 0))
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
                <span><b>{s.name}</b>{recs[s.id] && <span className="rec-line"><span className="rec-tag">Recommended</span>{recs[s.id]}</span>}<Tags s={s} sc={sc} always={always} /><span className="muted small">{s.summary}</span></span>
              </label>
            </li>
          )
        })}
      </ul>
      <button className="btn primary wide" onClick={onClose}>Done</button>
    </Sheet>
  )
}

/**
 * Spells from feats (Magic Initiate, Fey Touched…): each with its feat's own ability, DC and attack, and its free
 * cast once per long rest. Shown on the Spells tab under the class's spells, or alone for a character without
 * Spellcasting.
 */
export function FeatSpells({ d, ch, setState, roll, mode, fight, hp }) {
  const [open, setOpen] = useState(null)
  const [casting, setCasting] = useState(null)
  const used = (id) => ch.state.used?.[id] || 0
  const sc0 = d.spellcasting
  const res = (id) => d.resources.find((r) => r.id === id)
  const scOf = (fs) => ({ mod: fs.mod, ability: fs.ability, dc: fs.dc, attack: fs.attack, ritual: fs.ritual || !!sc0?.ritual, always: new Map([[fs.spell.id, fs.from]]), slots: sc0?.slots || [], pact: sc0?.pact || null })
  const attack = (fs) => (s) => roll({ kind: 'd20', label: `${s.name}: spell attack`, bonus: fs.attack.value, mode, attack: true, parts: fs.attack.parts, rule: SPELL_RULES.spellAttack })
  const effect = (fs) => (s, castLevel) => {
    const r = spellRoll(s, { level: ch.level, castLevel, mod: fs.mod, ability: fs.ability })
    return r && roll({ kind: 'expr', label: `${s.name}: ${r.heal ? 'healing' : `${r.type} damage`}`, expr: r.expr, parts: r.parts, rule: r.why || (r.heal ? 'Healing: roll the dice and add any bonus.' : 'Damage: roll the spell\'s dice and add any bonus.') })
  }
  const cast = (s, _lvl, slotId, opts) => { const p = castPatch(ch, used, s, slotId, opts); if (p) setState(p); return !!p }

  return (
    <section className="spells feat-spells">
      <h2 className="sp-level">From feats <span className="muted small">their own ability and DC</span></h2>
      <ul className="spell-list">
        {d.featSpells.map((fs) => {
          const r = fs.free && res(fs.free)
          return (
            <React.Fragment key={fs.id}>
              <SpellRow s={fs.spell} sc={scOf(fs)} level={ch.level} open={open === fs.id} onToggle={() => setOpen(open === fs.id ? null : fs.id)} attack={attack(fs)} effect={effect(fs)} onCast={() => setCasting(fs)} />
              <li className="muted small fs-note">{fs.from}: {fs.ability} · DC {fs.dc.value} · attack {signed(fs.attack.value)}{r ? ` · free cast ${r.max - Math.min(r.max, used(fs.free))} of ${r.max} left` : ''}</li>
            </React.Fragment>
          )
        })}
      </ul>
      {casting && <CastSheet s={casting.spell} sc={scOf(casting)} used={used} onClose={() => setCasting(null)} cast={cast} attack={attack(casting)} effect={effect(casting)} d={d} ch={ch} setState={setState} fight={fight} hp={hp}
        free={casting.free && res(casting.free) ? { id: casting.free, from: casting.from, left: res(casting.free).max - Math.min(res(casting.free).max, used(casting.free)) } : null} />}
    </section>
  )
}

/** After the one damage/healing roll of a casting: who gets it. Healing yourself applies at once; anyone else in the
 *  fight goes to the initiative runner to confirm. */
function Deliver({ s, rolled, d, ch, setState, fight, hp }) {
  const [sent, setSent] = useState({})
  const targets = (fight?.targets || []).filter((c) => (rolled.heal ? c.kind === 'pc' : c.kind === 'npc'))
  const send = async (c) => { const r = await fight.claim(c.id, rolled.total, s.name, rolled.heal ? { heal: true } : null); setSent({ ...sent, [c.id]: r ? (r.applied ? 'applied' : 'sent') : 'failed' }) }
  return (
    <div className="deliver">
      <p className="guide-result" role="status"><span className="mono big">{rolled.total}</span> {rolled.heal ? 'healing' : 'damage'}. {rolled.heal ? 'Who is healed?' : targets.length ? 'Who takes it? (an area spell: tap each one hit)' : 'Tell the DM.'}</p>
      <div className="guide-options">
        {rolled.heal && <button className="guide-opt" disabled={!!sent.me} onClick={() => { setState({ hp: Math.min(d.hp.value, hp + rolled.total) }); setSent({ ...sent, me: 'applied' }) }}><span><b>Me</b><small>{sent.me ? `✓ healed to ${Math.min(d.hp.value, hp + rolled.total)}` : `${hp} / ${d.hp.value} HP`}</small></span></button>}
        {targets.map((c) => (
          <button key={c.id} className="guide-opt" disabled={!!sent[c.id]} onClick={() => send(c)}>
            <span><b>{c.name}</b><small>{sent[c.id] === 'applied' ? '✓ applied' : sent[c.id] === 'sent' ? '✓ sent: the DM confirms it' : sent[c.id] === 'failed' ? "Couldn't send: tell the DM" : c.kind === 'npc' ? `${c.dmg || 0} damage taken` : 'in your party'}</small></span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Features that fire right after a casting (Glamour's Beguiling Magic after an Enchantment or Illusion slot spell). */
function AfterCast({ s, d, ch, setState, used, fight }) {
  const [done, setDone] = useState(null)
  const list = d.actions.filter((a) => a.onCast && (!a.onCast.schools || a.onCast.schools.includes(s.school)))
  if (!list.length) return null
  const left = (id) => { const r = d.resources.find((x) => x.id === id); return r ? r.max - Math.min(r.max, used(id)) : 0 }
  return list.map((a) => {
    const pay = left(a.cost?.resource) > 0 ? a.cost : a.alt && left(a.alt.resource) > 0 ? a.alt : null
    const payName = pay && d.resources.find((x) => x.id === pay.resource)?.name
    const use = (target, condition) => {
      setState({ used: { ...ch.state.used, [pay.resource]: used(pay.resource) + pay.amount } })
      if (target) fight.claim(target, 0, a.name, { condition })
      setDone(target ? `${condition} sent for the DM to confirm` : 'used')
    }
    return (
      <div key={a.id} className="after-cast panel">
        <b>✨ {a.name}</b><p className="muted small">{a.summary}{a.save ? ` ${a.save.ability} save DC ${a.save.dc}.` : ''}</p>
        {done ? <p className="ok-line">✓ {done}.</p> : !pay ? <p className="warn-line">Nothing left to pay for it.</p> : (
          <>
            <p className="small">Costs 1 {payName} ({left(pay.resource)} left).</p>
            {fight?.targets?.some((c) => c.kind === 'npc') && a.onCast.conditions ? (
              <div className="guide-options">{fight.targets.filter((c) => c.kind === 'npc').map((c) => (
                <div key={c.id} className="row"><span className="grow"><b>{c.name}</b></span>
                  {a.onCast.conditions.map((k) => <button key={k} className="btn small ghost" onClick={() => use(c.id, k)}>{CONDITIONS.find((x) => x.id === k)?.name || k}</button>)}
                </div>))}</div>
            ) : <button className="btn primary wide" onClick={() => use(null)}>Use {a.name}</button>}
          </>
        )}
      </div>
    )
  })
}
