// The Initiative screen of a group (the Initiative link, or the DM's): start a fight with the party, players' rolls
// arrive by themselves, enemies are added by kind and count, every number can be typed by hand (real dice), then
// turns and rounds, HP and conditions for everyone. Refreshes every few seconds; the fight logic is encounter-core.js.
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { derive } from '../engine/engine.js'
import { CONDITIONS } from '../content/conditions.js'
import { Sheet, signed, Stepper } from './common.jsx'
import { HpSheet, ConditionsSheet, effectText } from './sheet.jsx'
import { ABILITIES } from '../content/basics.js'
import { spellById } from '../content/spells.js'
import { buffLabel } from '../engine/buffs.js'
import { Portrait } from './wizard.jsx'
import { LiveAvatar } from './live-avatar.jsx'
import { fetchRoom, fetchEncounter, putEncounter, runnerPatch, sendInitiative, sendClaim, roomById as roomOf } from './sync.js'
import { setLook, ENEMY_ICONS, ENEMY_COLORS } from '../encounter-core.js'
import { newEncounter, addPc, addGroup, order, setInit, rollMissing, next, prev, hurt, setDead, toggleCondition, remove, clone, d20, placeOf, applyClaim, dropClaim, setAuto, targetsFor } from '../encounter-core.js'

const POLL_MS = 3000
// spells on an enemy (Bane, Reduce) arrive as conditions of their own
const SPELL_CONDS = { bane: 'Bane (−1d4 attacks and saves)', reduced: 'Reduced (−1d4 weapon damage)' }
const condName = (id) => CONDITIONS.find((c) => c.id === id)?.name || SPELL_CONDS[id] || id

/** A player character as the fight needs it, from its sheet. */
function pcView(c) {
  const ch = { ...c.data, state: c.data.state || {} }
  const d = derive(ch)
  return { ch, d, hp: ch.state.hp ?? d.hp.value, max: d.hp.value, ac: d.ac.value, bonus: d.initiative.value, conditions: d.conditions, deathSaves: ch.state.deathSaves || { ok: 0, fail: 0 }, temp: ch.state.temp || 0 }
}

export function InitiativeView({ room, onBack }) {
  const [enc, setEnc] = useState(null) // { rev, data }
  const [party, setParty] = useState(null)
  const [err, setErr] = useState(null)
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState(null) // combatant id
  const [editInit, setEditInit] = useState(null)
  const [pcHp, setPcHp] = useState(null)
  const [pcCond, setPcCond] = useState(null)
  const busy = useRef(0)
  const encRef = useRef(null)
  encRef.current = enc

  const load = useCallback(async () => {
    if (busy.current) return
    try {
      const [e, r] = await Promise.all([fetchEncounter(room), fetchRoom(room, 'run')])
      if (!busy.current) { setEnc({ rev: e.rev, data: e.data }); setParty(r.characters) }
      setErr(null)
    } catch (e) { setErr(e.status === 0 ? 'Offline. Showing the last known fight.' : e.status === 403 ? 'This link no longer runs the initiative. Ask the DM for the new one.' : e.message) }
  }, [room])
  useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) load() }, POLL_MS); return () => clearInterval(t) }, [load])

  /** Change the fight: shown at once, then saved; if someone changed it meanwhile, the same change on theirs. */
  const change = async (fn) => {
    const cur = encRef.current || { rev: 0, data: null }
    const nextData = fn(cur.data ? clone(cur.data) : null)
    setEnc({ rev: cur.rev, data: nextData })
    busy.current++
    try {
      try { const j = await putEncounter(room, nextData, cur.rev); setEnc({ rev: j.rev, data: j.data }) }
      catch (e) {
        if (e.status !== 409) throw e
        const again = fn(e.body.data ? clone(e.body.data) : null)
        const j = await putEncounter(room, again, e.body.rev)
        setEnc({ rev: j.rev, data: j.data })
      }
      setErr(null)
    } catch (e) { setErr(e.status === 0 ? 'Offline: that change was not saved.' : e.message) }
    finally { busy.current-- }
  }
  const pcAct = async (charId, state) => {
    setParty((l) => l.map((x) => (x.id === charId ? { ...x, data: { ...x.data, state: { ...x.data.state, ...state } } } : x)))
    busy.current++
    try { await runnerPatch(room, charId, state) } catch (e) { setErr(e.status === 0 ? 'Offline: that change was not saved.' : e.message) } finally { busy.current-- }
  }

  const pcs = new Map((party || []).map((c) => [c.id, pcView(c)]))
  const data = enc?.data
  const list = data ? order(data) : []
  const missing = list.filter((c) => c.init == null)
  const notIn = (party || []).filter((c) => !data?.combatants.some((x) => x.charId === c.id))
  const start = () => change(() => newEncounter((party || []).map((c) => ({ charId: c.id, name: c.data.name, bonus: pcs.get(c.id).bonus }))))
  const current = data && list.find((c) => c.id === data.turn)
  const sel = open && data?.combatants.find((c) => c.id === open)
  const pcSel = (id) => { const c = (party || []).find((x) => x.id === id); return c && { c, ...pcs.get(id) } }

  return (
    <main className="init-page">
      <header className="char-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">‹</button>
        <div className="grow"><h1>The Fight</h1><p className="muted small">{room.name} · updates every few seconds</p></div>
        {data && <button className="btn ghost small" onClick={() => { if (confirm('End this fight? The order and the enemies are cleared.')) change(() => null) }}>End fight</button>}
      </header>
      {err && <p className="warn-line" role="status">{err}</p>}
      {!enc ? <p className="muted">Loading…</p> : !data ? (
        <div className="empty">
          <div className="empty-art" aria-hidden>⚔️</div>
          <h2>No fight right now</h2>
          <p className="muted">{party?.length ? `Start one: the party (${party.map((c) => c.data.name).join(', ')}) joins, each player rolls initiative on their own sheet and it shows up here.` : 'No characters in this table yet. Send the players the invite link first.'}</p>
          <button className="btn primary big-btn" onClick={start} disabled={!party}>⚔ Start a fight</button>
        </div>
      ) : (
        <>
          <div className="init-bar">
            <span className="grow"><b>Round {data.round}</b>{current ? <> · <span className="muted">turn:</span> <b>{current.name}</b></> : <span className="muted"> · not started</span>}</span>
            <button className="btn ghost small" onClick={() => setAdding(true)}>+ Enemies</button>
          </div>
          {(data.claims || []).length > 0 && (
            <div className="claims" role="region" aria-label="Damage to confirm">
              <h3 className="sec">Damage to confirm</h3>
              {data.claims.map((cl) => <Claim key={cl.id} cl={cl} target={data.combatants.find((c) => c.id === cl.target)} change={change} onPc={(t, v) => {
                const p = pcs.get(t.charId)
                if (p && cl.heal) pcAct(t.charId, { hp: Math.min(p.max, p.hp + v) })
                else if (p && cl.condition) pcAct(t.charId, { conditions: [...new Set([...p.ch.state.conditions || [], cl.condition])] })
                else if (p) pcAct(t.charId, { hp: Math.max(0, p.hp - v) })
                change((e) => dropClaim(e, cl.id))
              }} />)}
            </div>
          )}
          <label className="row toggle small"><input type="checkbox" checked={!!data.auto} onChange={(e) => change((x) => setAuto(x, e.target.checked))} /><span>Apply players' damage to enemies without asking</span></label>
          {missing.length > 0 && (
            <div className="banner init-missing">
              <span className="grow">Waiting for initiative: {missing.map((c) => c.name).join(', ')}</span>
              <button className="btn small primary" onClick={() => change((e) => rollMissing(e))}>Roll for them</button>
            </div>
          )}
          {notIn.length > 0 && <p className="muted small">Not in this fight: {notIn.map((c) => <button key={c.id} className="linkish" onClick={() => change((e) => addPc(e, { charId: c.id, name: c.data.name, bonus: pcs.get(c.id).bonus }))}>+ {c.data.name}</button>)}</p>}

          <ol className="init-list">
            {list.map((c) => {
              const p = c.kind === 'pc' && pcs.get(c.charId)
              const pct = p ? Math.max(0, Math.min(100, (p.hp / p.max) * 100)) : null
              const conds = p ? p.conditions.map(condName) : (c.conditions || []).map(condName)
              const down = p ? p.hp === 0 : c.dead
              return (
                <li key={c.id} className={`init-row ${c.kind} ${c.color ? `ec-${c.color}` : ''} ${data.turn === c.id ? 'now' : ''} ${down ? 'down' : ''}`}>
                  <button className={`init-num ${c.init == null ? 'empty' : ''}`} onClick={() => setEditInit(c.id)} aria-label={`${c.name}: initiative ${c.init ?? 'not rolled'}. Change it`}>{c.init ?? '?'}</button>
                  {p && <LiveAvatar ch={p.ch} d={p.d} size={44} myTurn={data.turn === c.id} />}
                  <button className="init-main" onClick={() => (p ? setPcHp(c.charId) : setOpen(c.id))}>
                    <span className="init-name">{c.icon && <span className="e-icon" aria-hidden>{c.icon}</span>}<b>{c.name}</b>{c.kind === 'pc' ? <span className="tag-pc">player</span> : null}{down && <span className="tag-down">{p ? 'down' : 'fell'}</span>}</span>
                    {c.note && <span className="e-note small">{c.note}</span>}
                    <span className="init-sub muted small">
                      {p && <>AC {p.ac} · </>}
                      {p ? <>HP {p.hp}/{p.max}{p.temp ? ` +${p.temp}` : ''}</> : <>Damage taken <b className="mono">{c.dmg || 0}</b></>}
                      {p && p.hp === 0 && <> · saves {p.deathSaves.ok || 0}✓ {p.deathSaves.fail || 0}✗</>}
                      {conds.length > 0 && <> · {conds.join(', ')}</>}
                    </span>
                    {pct != null && <span className={`hp-bar ${pct <= 25 ? 'low' : pct <= 50 ? 'mid' : ''}`}><span style={{ width: `${pct}%` }} /></span>}
                  </button>
                  {p && <button className="btn ghost small" onClick={() => setPcCond(c.charId)} aria-label={`${c.name}: conditions`}>Cond.</button>}
                </li>
              )
            })}
          </ol>
          <div className="init-foot">
            <button className="btn ghost" onClick={() => change((e) => prev(e))} disabled={!data.turn} aria-label="Previous turn">‹</button>
            <button className="btn primary grow big-btn" onClick={() => change((e) => next(e))}>{data.turn ? 'Next turn ›' : '▶ Start round 1'}</button>
          </div>
        </>
      )}

      {adding && <AddEnemies onClose={() => setAdding(false)} onAdd={(g) => { change((e) => addGroup(e, g)); setAdding(false) }} />}
      {editInit && data && <InitNumber c={data.combatants.find((x) => x.id === editInit)} onClose={() => setEditInit(null)} onRemove={() => { change((e) => remove(e, editInit)); setEditInit(null) }}
        onSet={(v) => { const c = data.combatants.find((x) => x.id === editInit); if (c?.kind === 'pc') sendInitiative(room, c.charId, v).then((j) => setEnc({ rev: j.rev, data: j.data })).catch(() => change((e) => setInit(e, editInit, v))); else change((e) => setInit(e, editInit, v)); setEditInit(null) }} />}
      {sel && <EnemySheet key={sel.id} c={sel} kin={data.combatants.filter((x) => x.kind === 'npc' && x.group === sel.group).length} onClose={() => setOpen(null)} change={(fn) => change((e) => fn(e))} />}
      {pcHp && pcSel(pcHp) && <HpSheet d={pcSel(pcHp).d} ch={pcSel(pcHp).ch} hp={pcSel(pcHp).hp} setState={(s) => pcAct(pcHp, s)} onClose={() => setPcHp(null)} />}
      {pcCond && pcSel(pcCond) && <ConditionsSheet d={pcSel(pcCond).d} ch={pcSel(pcCond).ch} setState={(s) => pcAct(pcCond, s)} onClose={() => setPcCond(null)} />}
    </main>
  )
}

/** One player's damage waiting for the runner: apply it, change the amount first, or drop it. */
function Claim({ cl, target, change, onPc }) {
  const [n, setN] = useState(String(cl.amount))
  const v = parseInt(n, 10)
  return (
    <div className="claim">
 <span className="grow"><b>{cl.byName}</b> → <b>{target?.name || '?'}</b>{cl.label ? <span className="muted small"> · {cl.label}</span> : null}<span className="muted small" style={{ display: 'block' }}>{cl.condition ? `${CONDITIONS.find((x) => x.id === cl.condition)?.name || cl.condition} (if the save fails)` : cl.heal ? 'healing' : 'damage'}</span></span>
      {!cl.condition && <input className="input claim-n" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, '').slice(0, 3))} aria-label={`Damage from ${cl.byName} to ${target?.name}`} />}
      <button className="btn small primary" disabled={!cl.condition && !Number.isInteger(v)} onClick={() => (target?.kind === 'pc' ? onPc(target, v) : change((e) => applyClaim(e, cl.id, v)))} aria-label={`Apply ${v} damage to ${target?.name}`}>✓</button>
      <button className="btn small ghost" onClick={() => change((e) => dropClaim(e, cl.id))} aria-label={`Drop the damage from ${cl.byName}`}>✕</button>
    </div>
  )
}

/** Type the number (a player rolled real dice), or roll d20 + their bonus here. */
function InitNumber({ c, onSet, onClose, onRemove }) {
  const [v, setV] = useState(c?.init != null ? String(c.init) : '')
  if (!c) return null
  const n = parseInt(v, 10)
  return (
    <Sheet title={`${c.name}: initiative`} onClose={onClose}>
      <p className="muted small">Rolled real dice? Type the total. Or roll d20 {signed(c.bonus || 0)} here.</p>
      <input className="input big" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d-]/g, '').slice(0, 3))} placeholder="Total" aria-label="Initiative total" autoFocus />
      <div className="row">
        <button className="btn primary grow" disabled={!Number.isInteger(n)} onClick={() => onSet(n)}>Set {Number.isInteger(n) ? n : ''}</button>
        <button className="btn ghost grow" onClick={() => onSet(d20() + (c.bonus || 0))}>🎲 Roll d20 {signed(c.bonus || 0)}</button>
      </div>
      {onRemove && <button className="btn ghost wide danger-text" onClick={() => { if (confirm(`Take ${c.name} out of this fight?`)) onRemove() }}>Remove {c.name} from this fight</button>}
    </Sheet>
  )
}

/** An enemy's look: an icon, a color, a short note everyone sees (to tell them apart: "red cloak", "the boss"). */
function LookPicker({ look, set }) {
  return (
    <div className="look-pick">
      <span className="field-label">Icon</span>
      <div className="e-icons" role="group" aria-label="Icon">
        <button className={`e-icon-btn ${!look.icon ? 'on' : ''}`} aria-pressed={!look.icon} onClick={() => set({ icon: null })} aria-label="No icon">–</button>
        {ENEMY_ICONS.map((i) => <button key={i} className={`e-icon-btn ${look.icon === i ? 'on' : ''}`} aria-pressed={look.icon === i} aria-label={`Icon ${i}`} onClick={() => set({ icon: i })}>{i}</button>)}
      </div>
      <span className="field-label">Color</span>
      <div className="e-colors" role="group" aria-label="Color">
        <button className={`e-color none ${!look.color ? 'on' : ''}`} aria-pressed={!look.color} onClick={() => set({ color: null })} aria-label="No color">–</button>
        {ENEMY_COLORS.map((c) => <button key={c} className={`e-color ec-${c} ${look.color === c ? 'on' : ''}`} aria-pressed={look.color === c} aria-label={`Color ${c}`} onClick={() => set({ color: c })} />)}
      </div>
      <label className="field"><span>Note (everyone sees it)</span><input className="input" value={look.note || ''} maxLength={40} placeholder="red cloak, the boss, on the roof…" onChange={(e) => set({ note: e.target.value })} /></label>
    </div>
  )
}

/** Enemies of one kind: a name, how many, their initiative bonus, and their look. */
function AddEnemies({ onAdd, onClose }) {
  const [g, setG] = useState({ name: '', count: 1, bonus: 0, each: false, icon: null, color: null, note: '' })
  const set = (patch) => setG({ ...g, ...patch })
  return (
    <Sheet title="Add enemies" onClose={onClose}>
      <label className="field"><span>Kind</span><input className="input" value={g.name} maxLength={30} placeholder="Soldier, Goblin, Officer…" onChange={(e) => set({ name: e.target.value })} autoFocus /></label>
      <div className="row"><span className="grow">How many</span><Stepper value={g.count} min={1} max={20} label="How many" onChange={(count) => set({ count })} /></div>
      <div className="row"><span className="grow">Initiative bonus</span><Stepper value={g.bonus} min={-5} max={15} label="Initiative bonus" onChange={(bonus) => set({ bonus })} /></div>
      {g.count > 1 && <label className="row toggle"><input type="checkbox" checked={g.each} onChange={(e) => set({ each: e.target.checked })} /><span>Roll initiative for each one (otherwise one roll for the group)</span></label>}
      <LookPicker look={g} set={set} />
      <button className="btn primary wide" disabled={!g.name.trim()} onClick={() => onAdd({ ...g, name: g.name.trim() })}>Add {g.count > 1 ? `${g.count} × ` : ''}{g.name.trim() || 'enemies'}</button>
      <p className="muted small">They join the order at once, mid-fight too. Tap their number to change it. Each one counts the damage it takes, from 0; the DM says when it falls.</p>
    </Sheet>
  )
}

/** One enemy: the damage it took (up with damage, down with healing), conditions, dead (the DM says), remove. */
function EnemySheet({ c, change, onClose, kin = 1 }) {
  const [n, setN] = useState('')
  const [look, setL] = useState({ icon: c.icon || null, color: c.color || null, note: c.note || '' })
  const changed = (look.icon || null) !== (c.icon || null) || (look.color || null) !== (c.color || null) || (look.note || '').trim() !== (c.note || '')
  const v = parseInt(n, 10) || 0
  return (
    <Sheet title={c.name} onClose={onClose}>
      <p className="dmg-total" role="status">Damage taken: <b className="mono">{c.dmg || 0}</b></p>
      <input className="input big" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Amount" aria-label="Amount" autoFocus />
      <div className="row">
        <button className="btn danger grow" disabled={!v} onClick={() => { change((e) => hurt(e, c.id, v)); setN('') }}>+ Damage</button>
        <button className="btn ok grow" disabled={!v} onClick={() => { change((e) => hurt(e, c.id, -v)); setN('') }}>− Healed</button>
      </div>
      <button className={`btn wide ${c.dead ? 'ghost' : 'danger'}`} onClick={() => change((x) => setDead(x, c.id, !c.dead))}>{c.dead ? 'Not dead after all' : '☠ The DM says it fell'}</button>
      <p className="muted small">A fallen enemy is skipped in the order.</p>
      <h3 className="sec">Conditions</h3>
      <div className="chips">{CONDITIONS.filter((x) => x.id !== 'exhaustion').map((x) => <button key={x.id} className={`chip ${(c.conditions || []).includes(x.id) ? 'on' : ''}`} aria-pressed={(c.conditions || []).includes(x.id)} onClick={() => change((e) => toggleCondition(e, c.id, x.id))}>{x.name}</button>)}
        {(c.conditions || []).filter((id) => !CONDITIONS.some((x) => x.id === id)).map((id) => <button key={id} className="chip on" aria-pressed="true" onClick={() => change((e) => toggleCondition(e, c.id, id))}>{condName(id)} ✕</button>)}</div>
      <h3 className="sec">Look</h3>
      <LookPicker look={look} set={(p) => setL({ ...look, ...p })} />
      <div className="row">
        <button className="btn primary grow" disabled={!changed} onClick={() => change((e) => setLook(e, c.id, look))}>Save for {c.name}</button>
        {kin > 1 && <button className="btn ghost grow" onClick={() => change((e) => setLook(e, c.id, look, { group: true }))}>Save for all {kin} {c.group}</button>}
      </div>
      <button className="btn ghost wide danger-text" onClick={() => { change((e) => remove(e, c.id)); onClose() }}>Remove from the fight</button>
    </Sheet>
  )
}

// ── the player's side: their sheet shows the fight while there is one

/** The group's fight as this character's player sees it (enemies without numbers), refreshed every few seconds. */
export function useFight(ch) {
  const room = ch?.roomId ? roomOf(ch.roomId) : null
  const [enc, setEnc] = useState(null)
  const [loaded, setLoaded] = useState(!room)
  useEffect(() => {
    if (!room) return
    let live = true
    const load = () => { if (!document.hidden) fetchEncounter(room, room.playerKey || room.dmKey || room.initKey).then((j) => { if (live) { setEnc(j.data); setLoaded(true) } }).catch(() => live && setLoaded(true)) }
    load()
    const t = setInterval(load, 5000)
    return () => { live = false; clearInterval(t) }
  }, [room?.id])
  const me = enc?.combatants?.find((c) => c.charId === ch?.id) || null
  const send = async (total) => {
    if (!room || !enc?.active) return false
    try { const j = await sendInitiative(room.playerKey ? { ...room, initKey: null, dmKey: null } : room, ch.id, total); setEnc(j.data); return true } catch { return false }
  }
  /** Report damage done to someone in the fight: { applied } or null when it couldn't be sent. */
  const claim = async (target, amount, label, extra) => {
    if (!room || !enc?.active) return null
    try { const j = await sendClaim(room, ch.id, target, amount, label, extra); setEnc(j.data); return { applied: j.applied } } catch { return null }
  }
  const targets = enc?.active && me ? targetsFor(enc, me.id) : []
  return { enc: enc?.active ? enc : null, me, send, claim, targets, loaded, room }
}

export function FightBanner({ fight, onRoll, bonus }) {
  const [typing, setTyping] = useState(false)
  const [v, setV] = useState('')
  const [show, setShow] = useState(false)
  const { enc, me } = fight
  if (!enc) return null
  const list = order(enc)
  const now = list.find((c) => c.id === enc.turn)
  const where = me && placeOf(enc, me.id)
  if (!me || me.init == null) {
    const n = parseInt(v, 10)
    return (
      <div className="fight-banner roll" role="status">
        <b>⚔ A fight! Roll initiative</b>
        {!typing ? (
          <div className="row">
            <button className="btn primary grow" onClick={onRoll}>🎲 Roll {signed(bonus)}</button>
            <button className="btn ghost grow" onClick={() => setTyping(true)}>I rolled real dice</button>
          </div>
        ) : (
          <div className="row">
            <input className="input grow" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d-]/g, '').slice(0, 3))} placeholder="Your total" aria-label="Your initiative total" autoFocus />
            <button className="btn primary" disabled={!Number.isInteger(n)} onClick={async () => { await fight.send(n); setTyping(false); setV('') }}>Send</button>
          </div>
        )}
      </div>
    )
  }
  return (
    <>
      <button className={`fight-banner ${where?.now ? 'mine' : ''}`} onClick={() => setShow(true)}>
        <span className="grow"><b>⚔ Round {enc.round}</b> · {where?.now ? <b>Your turn!</b> : now ? <>now: <b>{now.name}</b>{where?.inTurns === 1 ? ' · you are next' : where?.inTurns ? ` · you in ${where.inTurns} turns` : ''}</> : 'waiting to start'}</span>
        <span className="muted small">Initiative {me.init} ›</span>
      </button>
      {show && <PartyOrder enc={enc} me={me} room={fight.room} onClose={() => setShow(false)} />}
    </>
  )
}

/** A party member's sheet, as the table sees it in a fight: HP, conditions, the spell they concentrate on (and on
 *  whom), spells on them. Shared by the order and the read-only sheet. */
function partyInfo(data, names) {
  const ch = { ...data, state: data.state || {} }
  const d = derive(ch)
  const hp = Math.min(ch.state.hp ?? d.hp.value, d.hp.value)
  const conc = ch.state.concentration
  const on = conc ? [...new Set([...(d.buffs.some((b) => b.from === ch.id && b.conc) ? [ch.name] : []), ...(ch.state.concTargets || []).map((id) => names[id] || 'someone')])] : []
  return {
    ch, d, hp, max: d.hp.value, temp: ch.state.temp || 0, pct: Math.max(0, Math.min(100, (hp / d.hp.value) * 100)),
    conds: [...d.conditions.map(condName), d.exhaustion ? `Exhaustion ${d.exhaustion}` : null].filter(Boolean),
    conc: conc ? { name: spellById(conc)?.name || conc, on } : null,
    buffs: d.buffs.filter((b) => !(b.from === ch.id && b.conc)).map((b) => buffLabel(b, ch.id)),
  }
}
const tone = (i) => (i.hp === 0 ? 'down' : i.pct <= 25 ? 'low' : i.pct <= 50 ? 'mid' : '')

/**
 * A player's view of the fight: the order, each enemy's damage and conditions, and for the party their HP,
 * conditions, concentration (on whom) and spells on them, so you can choose whom to attack and when. Tap a party
 * member for their sheet. Party sheets come from the room (?sheets=1) every 5 s while this is open.
 */
function PartyOrder({ enc, me, room, onClose }) {
  const [party, setParty] = useState({})
  const [peek, setPeek] = useState(null)
  useEffect(() => {
    if (!room) return
    let live = true
    const load = () => { if (!document.hidden) fetchRoom(room, false, { sheets: true }).then((j) => { if (live) setParty(Object.fromEntries((j.characters || []).filter((c) => c.data).map((c) => [c.id, c.data]))) }).catch(() => {}) }
    load()
    const t = setInterval(load, 5000)
    return () => { live = false; clearInterval(t) }
  }, [room?.id])
  const names = Object.fromEntries(Object.entries(party).map(([id, x]) => [id, x.name]))
  const list = order(enc)
  if (peek && party[peek]) return <PartySheet info={partyInfo(party[peek], names)} onBack={() => setPeek(null)} onClose={onClose} />
  return (
    <Sheet title={`Round ${enc.round}: the order`} onClose={onClose}>
      <ol className="init-list compact party-order">
        {list.map((c) => {
          const i = c.kind === 'pc' && party[c.charId] ? partyInfo(party[c.charId], names) : null
          const head = (
            <>
              <span className="init-name">{c.icon && <span className="e-icon" aria-hidden>{c.icon}</span>}<b>{c.name}</b>{c.id === me.id && <span className="tag-pc">you</span>}{c.dead && <span className="tag-down">fell</span>}
                {c.kind === 'npc' && !c.dead && <span className={`tag-pc ${c.dmg ? 'hurt' : ''}`}>{c.dmg ? `${c.dmg} damage` : 'unhurt'}</span>}
                {i && <span className={`tag-pc hp ${tone(i)}`}>{i.hp === 0 ? 'Down' : `HP ${i.hp}/${i.max}`}{i.temp ? ` +${i.temp}` : ''}</span>}</span>
              {c.note && <span className="e-note small">{c.note}</span>}
              {(i ? i.conds : (c.conditions || []).map(condName)).length > 0 && <span className="small cond-line">{(i ? i.conds : c.conditions.map(condName)).join(', ')}</span>}
              {i?.conc && <span className="small conc-line">◎ {i.conc.name}{i.conc.on.length ? ` → ${i.conc.on.join(', ')}` : ''}</span>}
              {i?.buffs.length > 0 && <span className="small buff-line">✦ {i.buffs.join(' · ')}</span>}
              {i && <span className={`hp-bar ${tone(i)}`}><span style={{ width: `${i.pct}%` }} /></span>}
            </>
          )
          return (
            <li key={c.id} className={`init-row ${c.kind} ${c.color ? `ec-${c.color}` : ''} ${enc.turn === c.id ? 'now' : ''} ${c.dead ? 'down' : ''}`}>
              <span className="init-num">{c.init ?? '?'}</span>
              {i && <LiveAvatar ch={i.ch} d={i.d} size={44} myTurn={enc.turn === c.id} />}
              {i ? <button className="init-main" onClick={() => setPeek(c.charId)} aria-label={`${c.name}: HP ${i.hp} of ${i.max}. Open the sheet`}>{head}</button> : <span className="init-main">{head}</span>}
            </li>
          )
        })}
      </ol>
      {room && !Object.keys(party).length && <p className="muted small">Loading the party…</p>}
      <p className="muted small">Tap a hero for their sheet. Enemies show the damage they took.</p>
    </Sheet>
  )
}

/** A party member's sheet, read only. */
function PartySheet({ info, onBack, onClose }) {
  const { ch, d, hp, max, temp } = info
  return (
    <Sheet title={ch.name} onClose={onClose}>
      <button className="linkish" onClick={onBack}>‹ The order</button>
      <div className="dm-head"><Portrait ch={ch} size={48} /><span className="grow"><b>{ch.name}</b><span className="muted small">{d.species?.name} {d.cls?.name} {ch.level}{d.subclass ? ` · ${d.subclass.name}` : ''}</span></span></div>
      <div className={`dm-hp ${tone(info)}`} role="group" aria-label={`Hit points ${hp} of ${max}`}>
        <span className="lbl">HP</span><b className="mono">{hp}<small>/{max}</small></b>{temp > 0 && <span className="temp">+{temp} temp</span>}
        {hp === 0 && <span className="temp">Down · saves {ch.state.deathSaves?.ok || 0}✓ {ch.state.deathSaves?.fail || 0}✗</span>}
        <span className="hp-bar"><span style={{ width: `${info.pct}%` }} /></span>
      </div>
      <dl className="dm-stats">
        <div><dt>AC</dt><dd>{d.ac.value}</dd></div>
        <div><dt>Init</dt><dd>{signed(d.initiative.value)}</dd></div>
        <div><dt>Speed</dt><dd>{d.speed.value}</dd></div>
        <div><dt>Passive Perc.</dt><dd>{d.passivePerception}</dd></div>
      </dl>
      <div className="dm-saves" aria-label="Saving throws">{ABILITIES.map((a) => <span key={a} className={d.saves[a].prof ? 'prof' : ''}><small>{a}</small><b>{signed(d.saves[a].value)}</b></span>)}</div>
      <h3 className="sec">Right now</h3>
      <ul className="peek-list">
        <li><b>Conditions:</b> {info.conds.length ? info.conds.join(', ') : 'none'}</li>
        <li><b>Concentrating:</b> {info.conc ? `${info.conc.name}${info.conc.on.length ? ` on ${info.conc.on.join(', ')}` : ''}` : 'no'}</li>
        {d.buffs.map((b) => <li key={b.id}>✦ <b>{buffLabel(b, ch.id)}</b>: {b.effects.map(effectText).filter(Boolean).join(', ') || b.note}</li>)}
        {d.resistances.length > 0 && <li><b>Resists:</b> {d.resistances.join(', ')}</li>}
        {ch.state.inspiration && <li>★ Heroic Inspiration</li>}
      </ul>
      <h3 className="sec">Attacks</h3>
      <ul className="peek-list">{d.attacks.map((a) => <li key={a.id}><b>{a.name}</b> {signed(a.toHit)} to hit · {a.damage} {a.type}</li>)}</ul>
      {d.spellcasting && <p className="muted small">Spell save DC {d.spellcasting.dc.value} · spell attack {signed(d.spellcasting.attack.value)}</p>}
    </Sheet>
  )
}
