// The DM's screen for one group: every character in the room, live (refreshes every 5 s), with quick actions —
// damage/heal/temp HP, conditions and Exhaustion, Inspiration. The DM can't change choices or level.
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { derive } from '../engine/engine.js'
import { CONDITIONS } from '../content/conditions.js'
import { ABILITIES } from '../content/basics.js'
import { signed, Num, themeOf } from './common.jsx'
import { Portrait } from './wizard.jsx'
import { HpSheet, ConditionsSheet } from './sheet.jsx'
import { fetchRoom, dmPatch, updateRoom, roomById } from './sync.js'
import { Sheet } from './common.jsx'
import { ShareLinks } from './rooms.jsx'
import { ItemEditor } from './items.jsx'
import { cleanItem } from '../content/items.js'

const POLL_MS = 5000
const ago = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago` }

export function DmView({ room, onBack, onInit, onGone }) {
  const [list, setList] = useState(null)
  const [err, setErr] = useState(null)
  const [hpFor, setHpFor] = useState(null)
  const [condFor, setCondFor] = useState(null)
  const [share, setShare] = useState(false)
  const [settings, setSettings] = useState(false)
  const [giftFor, setGiftFor] = useState(null)
  const [, tick] = useState(0)
  const pending = useRef(0)

  const load = useCallback(async () => {
    if (pending.current) return // don't overwrite a quick action on its way
    try { const j = await fetchRoom(room, true); if (!pending.current) setList(j.characters); setErr(null) } catch (e) { setErr(e.status === 0 ? 'Offline. Showing the last known sheets.' : e.message) }
  }, [room])
  useEffect(() => {
    load()
    const t = setInterval(() => { if (!document.hidden) load(); tick((n) => n + 1) }, POLL_MS)
    return () => clearInterval(t)
  }, [load])

  const act = async (c, state) => {
    if ('deathSaves' in state) state = { ...state, deathSaves: { ok: state.deathSaves?.ok || 0, fail: state.deathSaves?.fail || 0 } }
    setList((l) => l.map((x) => (x.id === c.id ? { ...x, data: { ...x.data, state: { ...x.data.state, ...state } } } : x)))
    pending.current++
    try { const j = await dmPatch(room, c.id, state); setList((l) => l.map((x) => (x.id === c.id ? { ...x, rev: j.rev, data: j.data, updatedAt: Date.now() } : x))) }
    catch (e) { setErr(e.status === 0 ? 'Offline: that change was not saved.' : e.message) }
    finally { pending.current-- }
  }

  const open = (id, setter) => { const c = list.find((x) => x.id === id); return c && { c, ch: { ...c.data, state: c.data.state || {} } } }
  const hpC = hpFor && open(hpFor), condC = condFor && open(condFor)

  return (
    <main className="dm-page">
      <header className="char-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">‹</button>
        <div className="grow"><h1>{room.name}</h1><p className="muted small">The DM's table · updates every few seconds</p></div>
        <button className="btn primary small" onClick={onInit}>⚔ The Fight</button>
        <button className="btn ghost small" onClick={() => setSettings(true)}>Settings</button>
        <button className="btn ghost small" onClick={() => setShare(true)}>Invite</button>
      </header>
      {err && <p className="warn-line" role="status">{err}</p>}
      {!list ? <p className="muted">Loading the party…</p> : list.length === 0 ? (
        <div className="empty"><div className="empty-art" aria-hidden>🗺️</div><h2>No characters yet</h2><p className="muted">Send the players the invite link. Their characters show up here as soon as they join.</p>
          <button className="btn primary" onClick={() => setShare(true)}>Share the invite</button></div>
      ) : (
        <ul className="dm-grid">
          {list.map((c) => <DmCard key={c.id} c={c} onHp={() => setHpFor(c.id)} onCond={() => setCondFor(c.id)} onGift={() => setGiftFor(c.id)} act={act} />)}
        </ul>
      )}
      {hpC && <HpSheet d={derive(hpC.ch)} ch={hpC.ch} hp={hpC.ch.state.hp ?? derive(hpC.ch).hp.value} setState={(s) => act(hpC.c, s)} onClose={() => setHpFor(null)} />}
      {condC && <ConditionsSheet d={derive(condC.ch)} ch={condC.ch} setState={(s) => act(condC.c, s)} onClose={() => setCondFor(null)} />}
      {giftFor && (() => { const c = list.find((x) => x.id === giftFor); return c && <ItemEditor title={`Give ${c.data.name} an item`} cta={`🎁 Give it to ${c.data.name}`} onClose={() => setGiftFor(null)}
        onSave={(it) => { act(c, { gifts: [...(c.data.state?.gifts || []), cleanItem({ ...it, from: 'dm', equipped: false, attuned: false })].slice(-10) }); setGiftFor(null) }} /> })()}
      {share && <ShareLinks room={room} onClose={() => setShare(false)} onGone={(r) => { onGone?.(r); onBack() }} />}
      {settings && <GroupSettings room={room} onClose={() => setSettings(false)} onError={setErr} />}
    </main>
  )
}

function DmCard({ c, onHp, onCond, onGift, act }) {
  const ch = c.data
  const d = derive(ch)
  const hp = ch.state?.hp ?? d.hp.value
  const pct = Math.max(0, Math.min(100, (hp / d.hp.value) * 100))
  const tone = hp === 0 ? 'down' : pct <= 25 ? 'low' : pct <= 50 ? 'mid' : ''
  const conds = [...d.conditions.map((id) => CONDITIONS.find((x) => x.id === id)?.name).filter(Boolean), d.exhaustion ? `Exhaustion ${d.exhaustion}` : null].filter(Boolean)
  const theme = themeOf(ch)
  return (
    <li className={`dm-card theme-${theme}`}>
      <div className="dm-head">
        <Portrait ch={ch} size={48} />
        <span className="grow"><b>{ch.name}</b><span className="muted small">{d.species?.name} {d.cls?.name} {ch.level}{d.subclass ? ` · ${d.subclass.name}` : ''}</span></span>
        <span className="muted small" title="Last change">{ago(c.updatedAt)}</span>
      </div>
      <button className={`dm-hp ${tone}`} onClick={onHp} aria-label={`Hit points ${hp} of ${d.hp.value}${ch.state?.temp ? `, ${ch.state.temp} temporary` : ''}. Damage or heal`}>
        <span className="lbl">HP</span><b className="mono">{hp}<small>/{d.hp.value}</small></b>{ch.state?.temp > 0 && <span className="temp">+{ch.state.temp} temp</span>}
        {hp === 0 && <span className="temp">Down · saves {ch.state?.deathSaves?.ok || 0}✓ {ch.state?.deathSaves?.fail || 0}✗</span>}
        <span className="hp-bar"><span style={{ width: `${pct}%` }} /></span>
      </button>
      <dl className="dm-stats">
        <div><dt>AC</dt><dd>{d.ac.value}</dd></div>
        <div><dt>Init</dt><dd>{signed(d.initiative.value)}</dd></div>
        <div><dt>Speed</dt><dd>{d.speed.value}</dd></div>
        <div><dt>Passive Perc.</dt><dd>{d.passivePerception}</dd></div>
      </dl>
      <div className="dm-saves" aria-label="Saving throws">
        {ABILITIES.map((a) => <span key={a} className={d.saves[a].prof ? 'prof' : ''}><small>{a}</small><Num kind={d.saves[a].prof ? 'prof' : 'ability'} value={d.saves[a].value} /></span>)}
      </div>
      <div className="row dm-actions">
        <button className={`insp ${d.inspiration ? 'on' : ''}`} aria-pressed={d.inspiration} onClick={() => act(c, { inspiration: !d.inspiration })}><span aria-hidden>{d.inspiration ? '★' : '☆'}</span> Inspiration</button>
        <button className={`cond-btn ${conds.length ? 'on' : ''}`} onClick={onCond}>{conds.length ? conds.join(', ') : 'No conditions'}</button>
      </div>
      <div className="row dm-items">
        <span className="muted small grow">{(ch.items || []).length ? `Items: ${ch.items.map((i) => i.name).join(', ')}` : 'No magic items'}{ch.state?.gifts?.length ? ` · ${ch.state.gifts.length} waiting` : ''}</span>
        <button className="btn small ghost" onClick={onGift}>🎁 Give an item</button>
      </div>
    </li>
  )
}

/** The DM's group settings: its name, and whether expansion subclasses are allowed. */
function GroupSettings({ room, onClose, onError }) {
  const [r, setR] = useState(() => roomById(room.id) || room)
  const [name, setName] = useState(r.name)
  const [busy, setBusy] = useState(false)
  const save = async (body) => { setBusy(true); try { setR(await updateRoom(r, body)) } catch (e) { onError(e.status === 0 ? 'Offline: settings not saved.' : e.message) } finally { setBusy(false) } }
  return (
    <Sheet title="Group settings" onClose={onClose}>
      <label className="field"><span>Table name</span><input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== r.name && save({ name: name.trim() })} /></label>
      <label className="row toggle"><input type="checkbox" checked={!!r.settings?.expansions} disabled={busy} onChange={(e) => save({ settings: { expansions: e.target.checked } })} />
        <span>Allow subclasses from the expansion books (Xanathar's, Tasha's and more), beyond the Player's Handbook</span></label>
      
    </Sheet>
  )
}
