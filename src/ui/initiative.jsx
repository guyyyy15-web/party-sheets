// The Initiative screen of a group (the Initiative link, or the DM's): start a fight with the party, players' rolls
// arrive by themselves, enemies are added by kind and count, every number can be typed by hand (real dice), then
// turns and rounds, HP and conditions for everyone. Refreshes every few seconds; the fight logic is encounter-core.js.
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { derive } from '../engine/engine.js'
import { CONDITIONS } from '../content/conditions.js'
import { Sheet, signed, Stepper } from './common.jsx'
import { HpSheet, ConditionsSheet } from './sheet.jsx'
import { fetchRoom, fetchEncounter, putEncounter, runnerPatch, sendInitiative, sendClaim, roomById as roomOf } from './sync.js'
import { newEncounter, addPc, addGroup, order, setInit, rollMissing, next, prev, hurt, setDead, toggleCondition, remove, clone, d20, placeOf, applyClaim, dropClaim, setAuto, targetsFor } from '../encounter-core.js'

const POLL_MS = 3000
const condName = (id) => CONDITIONS.find((c) => c.id === id)?.name || id

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
        <div className="grow"><h1>Initiative</h1><p className="muted small">{room.name} · updates every few seconds</p></div>
        {data && <button className="btn ghost small" onClick={() => { if (confirm('End this fight? The order and the enemies are cleared.')) change(() => null) }}>End fight</button>}
      </header>
      {err && <p className="warn-line" role="status">{err}</p>}
      {!enc ? <p className="muted">Loading…</p> : !data ? (
        <div className="empty">
          <div className="empty-art" aria-hidden>⚔️</div>
          <h2>No fight right now</h2>
          <p className="muted">{party?.length ? `Start one: the party (${party.map((c) => c.data.name).join(', ')}) joins, each player rolls initiative on their own sheet and it shows up here.` : 'No characters in this group yet. Send the players the invite link first.'}</p>
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
                <li key={c.id} className={`init-row ${c.kind} ${data.turn === c.id ? 'now' : ''} ${down ? 'down' : ''}`}>
                  <button className={`init-num ${c.init == null ? 'empty' : ''}`} onClick={() => setEditInit(c.id)} aria-label={`${c.name}: initiative ${c.init ?? 'not rolled'}. Change it`}>{c.init ?? '?'}</button>
                  <button className="init-main" onClick={() => (p ? setPcHp(c.charId) : setOpen(c.id))}>
                    <span className="init-name"><b>{c.name}</b>{c.kind === 'pc' ? <span className="tag-pc">player</span> : null}{down && <span className="tag-down">{p ? 'down' : 'fell'}</span>}</span>
                    <span className="init-sub muted small">
                      {(p ? p.ac : c.ac) != null && <>AC {p ? p.ac : c.ac} · </>}
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
      {sel && <EnemySheet c={sel} onClose={() => setOpen(null)} change={(fn) => change((e) => fn(e))} />}
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

/** Enemies of one kind: a name, how many, their initiative bonus, HP and AC. */
function AddEnemies({ onAdd, onClose }) {
  const [g, setG] = useState({ name: '', count: 1, bonus: 0, ac: '', each: false })
  const set = (patch) => setG({ ...g, ...patch })
  return (
    <Sheet title="Add enemies" onClose={onClose}>
      <label className="field"><span>Kind</span><input className="input" value={g.name} maxLength={30} placeholder="Soldier, Goblin, Officer…" onChange={(e) => set({ name: e.target.value })} autoFocus /></label>
      <div className="row"><span className="grow">How many</span><Stepper value={g.count} min={1} max={20} label="How many" onChange={(count) => set({ count })} /></div>
      <div className="row"><span className="grow">Initiative bonus</span><Stepper value={g.bonus} min={-5} max={15} label="Initiative bonus" onChange={(bonus) => set({ bonus })} /></div>
      <label className="field"><span>AC (if you know it)</span><input className="input" inputMode="numeric" value={g.ac} placeholder="optional" onChange={(e) => set({ ac: e.target.value.replace(/\D/g, '').slice(0, 2) })} /></label>
      {g.count > 1 && <label className="row toggle"><input type="checkbox" checked={g.each} onChange={(e) => set({ each: e.target.checked })} /><span>Roll initiative for each one (otherwise one roll for the group)</span></label>}
      <button className="btn primary wide" disabled={!g.name.trim()} onClick={() => onAdd({ ...g, name: g.name.trim(), ac: g.ac === '' ? null : +g.ac })}>Add {g.count > 1 ? `${g.count} × ` : ''}{g.name.trim() || 'enemies'}</button>
      <p className="muted small">They join the order at once, mid-fight too. Tap their number to change it. Each one counts the damage it takes, from 0; the DM says when it falls.</p>
    </Sheet>
  )
}

/** One enemy: the damage it took (up with damage, down with healing), conditions, dead (the DM says), remove. */
function EnemySheet({ c, change, onClose }) {
  const [n, setN] = useState('')
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
      <div className="chips">{CONDITIONS.filter((x) => x.id !== 'exhaustion').map((x) => <button key={x.id} className={`chip ${(c.conditions || []).includes(x.id) ? 'on' : ''}`} aria-pressed={(c.conditions || []).includes(x.id)} onClick={() => change((e) => toggleCondition(e, c.id, x.id))}>{x.name}</button>)}</div>
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
  return { enc: enc?.active ? enc : null, me, send, claim, targets, loaded }
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
      {show && (
        <Sheet title={`Round ${enc.round}: the order`} onClose={() => setShow(false)}>
          <ol className="init-list compact">
            {list.map((c) => (
              <li key={c.id} className={`init-row ${c.kind} ${enc.turn === c.id ? 'now' : ''} ${c.dead ? 'down' : ''}`}>
                <span className="init-num">{c.init ?? '?'}</span>
                <span className="init-main"><span className="init-name"><b>{c.name}</b>{c.id === me.id && <span className="tag-pc">you</span>}{c.dead && <span className="tag-down">fell</span>}{c.kind === 'npc' && !c.dead && c.dmg > 0 && <span className="tag-pc">{c.dmg} damage</span>}</span>
                  {c.conditions?.length > 0 && <span className="muted small">{c.conditions.map(condName).join(', ')}</span>}</span>
              </li>
            ))}
          </ol>
        </Sheet>
      )}
    </>
  )
}
