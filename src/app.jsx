import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { newCharacter, derive } from './engine/engine.js'
import { allCharacters, saveCharacter, deleteCharacter, getSetting, setSetting, backupText, backupName, parseBackupFile, backupRooms, shareFile } from './ui/store.js'
import { parseLink } from './sync-core.js'
import { joinRoom, listRooms, roomById, restoreRooms, shareCharacter, unshareCharacter, syncCharacter, fetchRoom, deleteRemote, markPending, restoreFrom, restoreLink, syncStatus, onSyncStatus } from './ui/sync.js'
import { RoomsSection } from './ui/rooms.jsx'
import { DmView } from './ui/dm.jsx'
import { InitiativeView } from './ui/initiative.jsx'
import { AdminView } from './ui/admin.jsx'
import { GlossaryView } from './ui/glossary.jsx'
import { Landing, shareApp } from './ui/landing.jsx'
import { signedIn } from './ui/account.js'
import { AccountSheet, AccountChip, SaveAccountNudge } from './ui/account.jsx'
import { refreshAccount, signOutLocal } from './ui/account.js'
import { ownerKey } from './ui/sync.js'
import { DiceTray, performRoll, throwDefault, load3d, RollCard, RULES } from './ui/dice.jsx'
import { Wizard, Portrait } from './ui/wizard.jsx'
import { CharacterSheet } from './ui/sheet.jsx'
import { Sheet, themeOf, GameIcon } from './ui/common.jsx'


function App() {
  const [chars, setChars] = useState(null)
  const [view, setView] = useState(() => (location.hash === '#/admin' ? { name: 'admin' } : !location.hash && !getSetting('seenLanding', false) && !signedIn() ? { name: 'landing' } : { name: 'home' }))
  const [tray, setTray] = useState(false)
  const [pool, setPool] = useState({ 20: 1 })
  const [poolMod, setPoolMod] = useState(0)
  const [log, setLog] = useState([])
  const [mode, setMode] = useState('normal')
  const [edgeAsk, setEdgeAsk] = useState(null)
  const [throwOn, setThrowOnState] = useState(() => getSetting('throwOnScreen', throwDefault()))
  const [settings, setSettingsState] = useState(() => getSetting('table', { allowRoll: true }))
  const [toast, setToast] = useState(null)
  const [shown, setShown] = useState(null) // the last instant roll, with its math, until closed or the next roll
  const busy = useRef(false)
  const [joined, setJoined] = useState(null) // a group just joined through its invite link
  const charsRef = useRef(null)
  const prevOwnerRef = useRef(null)
  charsRef.current = chars
  const timers = useRef({})

  useEffect(() => { allCharacters().then(setChars); navigator.storage?.persist?.().catch(() => {}) }, [])
  // the account keeps the player's groups: re-save it when they change
  useEffect(() => { const f = () => refreshAccount(); window.addEventListener('ps-rooms', f); return () => window.removeEventListener('ps-rooms', f) }, [])
  const [acct, setAcct] = useState(false)

  // an invite or DM link: check it, remember the group, and clear the key from the address bar
  useEffect(() => {
    const open = async () => {
      if (location.hash === '#/admin') { setView({ name: 'admin' }); return }
      const link = parseLink(location.hash)
      if (!link) return
      history.replaceState(null, '', location.pathname + location.search)
      if (link.kind === 'restore') {
        try {
          const list = await restoreFrom(link.key)
          for (const c of list) await saveCharacter(c)
          setChars(await allCharacters())
          setView({ name: 'home' })
          say(list.length ? `Restored ${list.length} character${list.length > 1 ? 's' : ''} from the server.` : 'Nothing saved under that cloud key yet.')
        } catch (e) { say(e.status === 0 ? 'No connection: open the link again when online.' : 'That cloud key link doesn\'t work.') }
        return
      }
      try {
        const r = await joinRoom(link)
        if (link.kind === 'dm') setView({ name: 'dm', roomId: r.id })
        else if (link.kind === 'init') setView({ name: 'init', roomId: r.id })
        else { setJoined(r.id); setView({ name: 'home' }) }
      } catch (e) { say(e.status === 0 ? 'No connection: open the link again when online.' : e.status === 404 ? 'That group no longer exists.' : 'That link doesn\'t work. Ask for a new one.') }
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])

  // every character is saved on the server: changes go up a moment after they happen; a character in a group also
  // picks up the DM's changes every 10 s (the others once a minute, in case it was changed on another phone)
  const runSync = useCallback(async (id) => {
    const next = await syncCharacter(id, () => charsRef.current?.find((c) => c.id === id))
    if (next) { setChars((list) => list.map((c) => (c.id === id ? next : c))); saveCharacter(next) }
  }, [])
  const schedule = useCallback((id) => { clearTimeout(timers.current[id]); timers.current[id] = setTimeout(() => runSync(id), 800) }, [runSync])
  useEffect(() => {
    let tick = 0
    const all = () => {
      if (document.hidden) return
      for (const c of charsRef.current || []) if (c.roomId || tick % 6 === 0) runSync(c.id)
      // the groups' names and settings (the DM may allow expansions), every 30 s
      if (tick % 3 === 0) for (const r of listRooms()) fetchRoom(r, false).catch(() => {})
      tick++
    }
    const t = setInterval(all, 10000)
    window.addEventListener('online', all); document.addEventListener('visibilitychange', all)
    all()
    return () => { clearInterval(t); window.removeEventListener('online', all); document.removeEventListener('visibilitychange', all) }
  }, [runSync, chars === null])
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 3500) }
  const setThrowOn = (v) => { setThrowOnState(v); setSetting('throwOnScreen', v); if (v) load3d().catch(() => {}) }
  const setSettings = (v) => { setSettingsState(v); setSetting('table', v) }

  const current = chars?.find((c) => c.id === view.id)
  const update = useCallback((next) => {
    setChars((list) => list.map((c) => (c.id === next.id ? next : c)))
    saveCharacter(next)
    markPending(next.id)
    schedule(next.id)
  }, [schedule])
  const saveNow = useCallback((id) => { clearTimeout(timers.current[id]); return runSync(id) }, [runSync])
  const bring = async (c, r) => {
    try { const next = await shareCharacter(c, r); setChars((l) => l.map((x) => (x.id === c.id ? next : x))); saveCharacter(next); say(`${c.name} joined ${r.name}.`) }
    catch (e) { say(e.status === 0 ? 'No connection. Try again when online.' : e.status === 507 ? 'That group is full (12 characters).' : e.message) }
  }
  const leave = async (c) => {
    try { const next = await unshareCharacter(c); setChars((l) => l.map((x) => (x.id === c.id ? next : x))); saveCharacter(next) }
    catch (e) { say(e.message) }
  }
  /** A group is gone (deleted by its DM, or removed from this phone): its characters here are in no group now. */
  const groupGone = async (r) => {
    const list = (charsRef.current || []).filter((c) => c.roomId === r.id).map((c) => ({ ...c, roomId: null }))
    for (const c of list) await saveCharacter(c)
    setChars((l) => l.map((c) => list.find((x) => x.id === c.id) || c))
    say(`"${r.name}" is gone from this phone. Your characters are still here and saved.`)
  }
  const remove = async (c) => {
    clearTimeout(timers.current[c.id])
    await deleteRemote(c)
    await deleteCharacter(c.id); setChars((l) => l.filter((x) => x.id !== c.id))
  }
  // signed in on this phone: its characters come back from the server, and we go straight to the latest one
  const onSignedIn = async (body, prevOwner) => {
    // characters made on this phone before signing in keep working under their own key
    for (const c of charsRef.current || []) if (!c.ownerKey && prevOwner && prevOwner !== body.owner) { const n = { ...c, ownerKey: prevOwner }; await saveCharacter(n) }
    let list = []
    try { list = await restoreFrom(body.owner) } catch (e) { say(e.status === 0 ? 'Signed in. Your characters load when you\'re online.' : e.message) }
    for (const c of list) await saveCharacter(c)
    const all = await allCharacters()
    setChars(all)
    setAcct(false)
    const latest = list.filter((c) => !c.draft).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0]
    say(`Welcome back${body.username ? `, ${body.username}` : ''}!${list.length ? ` ${list.length} character${list.length > 1 ? 's' : ''} loaded.` : ''}`)
    setView(latest ? { name: 'sheet', id: latest.id } : { name: 'home' })
  }
  const onSignOut = async () => {
    for (const c of chars || []) await deleteCharacter(c.id)
    signOutLocal()
    setChars([]); setAcct(false); setView({ name: 'home' })
    say('Signed out on this phone. Your characters are saved in your account.')
  }
  // Advantage is tracked on the character (state.edge: + advantage, − disadvantage). While it isn't 0, a d20 roll
  // first asks whether it applies to this roll; the roll's own `mode` is never decided by a global switch.
  const askEdge = (edge, label) => new Promise((resolve) => setEdgeAsk({ edge, label, resolve: (m) => { setEdgeAsk(null); resolve(m) } }))
  const roll = async (req0) => {
    if (busy.current || edgeAsk) return null
    let req = req0
    if (req.kind === 'd20') {
      const edge = (view.name === 'sheet' && current?.state?.edge) || 0
      // advantage from a feature or a spell on this roll (Danger Sense, Haste, Enlarge): it counts unless a
      // disadvantage that applies cancels it (then one d20)
      const own = req.adv?.length ? req.adv : null
      let m = edge && !(own && edge > 0) ? await askEdge(edge, req.label) : 'normal'
      if (!m) return null
      if (own) m = m === 'dis' ? 'normal' : 'adv'
      req = { ...req, mode: m, ...(own ? { rule: [req.rule && (RULES[req.rule] || req.rule), `Advantage from ${own.join(', ')}.`].filter(Boolean).join(' ') } : {}) }
    }
    busy.current = true
    try {
      const showMath = settings.showMath !== false
      const e = await performRoll({ ...req, showMath }, throwOn)
      setLog((l) => [e, ...l].slice(0, 20))
      if (!throwOn) setShown(showMath ? e : { ...e, steps: null, rules: null })
      return e
    } finally { busy.current = false }
  }

  const start = async (room) => {
    const ch = { ...newCharacter(), draft: true, ...(room?.id ? { roomId: room.id } : {}) }
    await saveCharacter(ch)
    setChars((l) => [ch, ...(l || [])])
    setView({ name: 'wizard', id: ch.id })
    schedule(ch.id)
  }
  const exportAll = async () => {
    const r = await shareFile(backupText((chars || []).filter((c) => !c.draft), listRooms()), backupName())
    if (r !== 'cancelled') { setSetting('lastBackupAt', Date.now()); say('Backup saved. Keep the file somewhere safe.') }
  }
  const importFile = async (file) => {
    try {
      const text = await file.text()
      const list = parseBackupFile(text)
      restoreRooms(backupRooms(text))
      for (const c of list) await saveCharacter(c)
      setChars(await allCharacters())
      for (const c of list) schedule(c.id)
      say(`Imported ${list.length} character${list.length > 1 ? 's' : ''}.`)
    } catch (e) { say(e.message) }
  }

  if (!chars) return <div className="boot">Loading…</div>
  // someone who already has characters skips the landing page (unless they opened it from settings)
  const landing = view.name === 'landing' && (view.again || !chars.some((c) => !c.draft))

  let screen
  if (view.name === 'wizard' && current) {
    screen = <Wizard ch={current} setCh={update} settings={settings} throwOn={throwOn}
      onCancel={async () => { if (!current.name && !current.classId) await remove(current); setView({ name: 'home' }) }}
      onDelete={async () => { await remove(current); setView({ name: 'home' }); say('Character deleted.') }}
      onDone={() => { const d = derive(current); update({ ...current, draft: false, wizardStep: 0, state: { ...current.state, hp: d.hp.value } }); setView({ name: 'sheet', id: current.id }) }} />
  } else if (view.name === 'sheet' && current) {
    const room = current.roomId && roomById(current.roomId)
    screen = <CharacterSheet ch={current} setCh={update} roll={roll} mode={mode} setMode={setMode} onBack={() => setView({ name: 'home' })}
      group={current.roomId ? { name: room?.name || 'Group', onLeave: () => leave(current) } : null}
      onSaveNow={() => saveNow(current.id)}
      onGlossary={() => setView({ name: 'glossary', id: current.id, back: 'sheet' })}
      onDelete={async () => { await remove(current); setView({ name: 'home' }) }} />
  } else if (view.name === 'glossary') {
    screen = <GlossaryView ch={current && !current.draft ? current : null} onBack={() => setView(view.back === 'sheet' && current ? { name: 'sheet', id: current.id } : { name: 'home' })} />
  } else if (landing) {
    const leave = () => { setSetting('seenLanding', true); setView({ name: 'home' }) }
    screen = <Landing onStart={() => { setSetting('seenLanding', true); start() }} onSignIn={() => { leave(); prevOwnerRef.current = ownerKey(); setAcct(true) }} onClose={view.again ? leave : null} />
  } else if (view.name === 'admin') {
    screen = <AdminView onBack={() => { history.replaceState(null, '', location.pathname); setView({ name: 'home' }) }} />
  } else if (view.name === 'dm' && roomById(view.roomId)) {
    screen = <DmView room={roomById(view.roomId)} onBack={() => setView({ name: 'home' })} onInit={() => setView({ name: 'init', roomId: view.roomId, from: 'dm' })} onGone={groupGone} />
  } else if (view.name === 'init' && roomById(view.roomId)) {
    screen = <InitiativeView room={roomById(view.roomId)} onBack={() => setView(view.from === 'dm' ? { name: 'dm', roomId: view.roomId } : { name: 'home' })} />
  } else {
    screen = <Home chars={chars} onOpen={(c) => setView({ name: c.draft ? 'wizard' : 'sheet', id: c.id })} onAccount={() => { prevOwnerRef.current = ownerKey(); setAcct(true) }} onGlossary={() => setView({ name: 'glossary' })} onAbout={() => setView({ name: 'landing', again: true })} onNew={start} onSaveAll={() => Promise.all((chars || []).map((c) => saveNow(c.id)))} onBring={bring} onDm={(r) => setView({ name: 'dm', roomId: r.id })} onInit={(r) => setView({ name: 'init', roomId: r.id })} onGone={groupGone} joined={joined} onExport={exportAll} onImport={importFile} settings={settings} setSettings={setSettings} />
  }

  return (
    <>
      {screen}
      {view.name !== 'wizard' && view.name !== 'init' && !landing && !tray && <button className="fab" onClick={() => { setTray(true); if (throwOn) load3d().catch(() => {}) }} aria-label="Dice"><GameIcon id="ui.d20" size={30} /></button>}
      {tray && <DiceTray pool={pool} setPool={setPool} mod={poolMod} setMod={setPoolMod} throwOn={throwOn} setThrowOn={setThrowOn} last={log[0]}
        onClose={() => setTray(false)} onThrow={() => { setTray(false); roll({ kind: 'pool', pool, mod: poolMod }) }} />}
      {shown && <RollCard e={shown} onClose={() => setShown(null)} />}
      {edgeAsk && (
        <Sheet title={edgeAsk.edge > 0 ? 'You have advantage' : 'You have disadvantage'} onClose={() => edgeAsk.resolve(null)}>
          <p className="guide-line"><b>{edgeAsk.label}</b>: does your {edgeAsk.edge > 0 ? 'advantage' : 'disadvantage'} apply to this roll?</p>
          <div className="guide-options">
            <button className="btn primary wide big-btn" onClick={() => edgeAsk.resolve(edgeAsk.edge > 0 ? 'adv' : 'dis')}>Yes: roll two d20, keep the {edgeAsk.edge > 0 ? 'higher' : 'lower'}</button>
            <button className="btn ghost wide big-btn" onClick={() => edgeAsk.resolve('normal')}>No: roll one d20</button>
          </div>
        </Sheet>
      )}
      {acct && <AccountSheet onClose={() => setAcct(false)} hasCharacters={(chars || []).some((c) => !c.draft)} onSignedIn={(b) => onSignedIn(b, prevOwnerRef.current)} onSignOut={onSignOut} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}

function Home({ chars, onOpen, onAccount, onGlossary, onAbout, onNew, onSaveAll, onBring, onDm, onInit, onGone, joined, onExport, onImport, settings, setSettings }) {
  const file = useRef(null)
  const [table, setTable] = useState(false)
  const last = getSetting('lastBackupAt', null)
  const real = chars.filter((c) => !c.draft || c.name)
  const known = new Set(listRooms().map((r) => r.id))
  const solo = real.filter((c) => !c.roomId || !known.has(c.roomId))
  const card = (c) => {
    const d = derive(c)
    return (
      <li key={c.id}><button className={`char-card theme-${themeOf(c)}`} onClick={() => onOpen(c)}>
        <Portrait ch={c} size={52} />
        <span className="grow"><b>{c.name || 'Unnamed hero'}</b><span className="muted small">{c.draft ? 'Draft, tap to continue' : `${d.species?.name || ''} ${d.cls?.name || ''} ${c.level}`}</span></span>
        {!c.draft && <span className="mini"><span>AC {d.ac.value}</span><span>HP {c.state.hp ?? d.hp.value}/{d.hp.value}</span></span>}
      </button></li>
    )
  }
  return (
    <main className="home">
      <header className="home-top">
        <div className="brand"><span className="logo" aria-hidden><GameIcon id="ui.d20" size={34} /></span><h1>Tavern Table</h1></div>
        <span className="top-actions"><AccountChip onOpen={onAccount} /><button className="icon-btn" onClick={() => setTable(true)} aria-label="Table settings">⚙</button></span>
      </header>
      {real.length === 0 ? (
        <div className="empty">
          <div className="empty-art" aria-hidden>🐉</div>
          <h2>No heroes yet</h2>
          <p className="muted">Played before? <button className="linkish" onClick={onAccount}>Sign in</button></p>
        </div>
      ) : solo.length > 0 && (
        <ul className="char-list">{solo.map(card)}</ul>
      )}
      <UnsavedBanner chars={chars} onSaveAll={onSaveAll} />
      {real.some((c) => !c.draft) && <SaveAccountNudge onOpen={onAccount} />}
      <button className="btn primary wide big-btn" onClick={() => onNew()}>+ New character</button>
      <RoomsSection chars={real} renderChar={card} onDm={onDm} onInit={onInit} onGone={onGone} onNewInRoom={(r) => onNew(r)} onBring={onBring} joined={joined} />
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onImport(f) }} aria-label="Backup file" />
      {table && (
        <Sheet title="Table settings" onClose={() => setTable(false)}>
          <label className="row toggle"><input type="checkbox" checked={settings.allowRoll !== false} onChange={(e) => setSettings({ ...settings, allowRoll: e.target.checked })} /><span>Allow rolling ability scores (4d6) in the wizard</span></label>
          <label className="row toggle"><input type="checkbox" checked={settings.showMath !== false} onChange={(e) => setSettings({ ...settings, showMath: e.target.checked })} /><span>Show the math on every roll</span></label>
          <label className="row toggle"><input type="checkbox" checked={!!settings.expansions} onChange={(e) => setSettings({ ...settings, expansions: e.target.checked })} /><span>Expansion subclasses (characters not in a group)</span></label>
          <div className="panel">
            <b>Your cloud key</b>
            <p className="muted small">Opens your characters on another phone. Keep it private.</p>
            <CloudKey />
          </div>
          <button className="btn ghost wide" onClick={() => { setTable(false); onGlossary() }}>📖 Rules glossary</button>
          <ShareAppButton />
          <button className="btn ghost wide" onClick={() => { setTable(false); onAbout() }}>About Tavern Table</button>
          <div className="panel">
            <b>Backup file</b>
            <p className="muted small">{last ? `Last one ${Math.round((Date.now() - last) / 86400e3)} days ago.` : 'None yet.'}</p>
            <div className="row">
              <button className="btn ghost grow" onClick={onExport} disabled={!real.length}>⬆ Export all</button>
              <button className="btn ghost grow" onClick={() => file.current?.click()}>⬇ Import</button>
            </div>
          </div>
          <button className="btn ghost wide" onClick={() => { setTable(false); location.hash = '#/admin' }}>Owner: admin screen</button>
          <p className="muted small legal">Rules: System Reference Document 5.2 by Wizards of the Coast LLC, CC-BY-4.0; not affiliated with Wizards of the Coast. Icons: Lorc, Delapouite and contributors, <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a>, CC BY 3.0.</p>
        </Sheet>
      )}
    </main>
  )
}

/** "2 characters not saved yet" with Save now, when something didn't reach the server. */
function UnsavedBanner({ chars, onSaveAll }) {
  const [, bump] = useState(0)
  useEffect(() => onSyncStatus(() => bump((n) => n + 1)), [])
  const stuck = chars.filter((c) => ['offline', 'error', 'pending'].includes(syncStatus(c.id)?.state) && Date.now() - syncStatus(c.id).at > 3000)
  if (!stuck.length) return null
  const offline = stuck.some((c) => syncStatus(c.id).state === 'offline')
  return (
    <div className="panel warn unsaved" role="status">
      <b>{stuck.length} character{stuck.length > 1 ? 's' : ''} not saved on the server yet</b>
      <p className="small">{offline ? 'No connection. Changes are kept on this phone and go up as soon as you\'re back online.' : syncStatus(stuck[0].id).msg || 'Tap to try again.'}</p>
      <button className="btn primary" onClick={onSaveAll}>Save now</button>
    </div>
  )
}

function ShareAppButton() {
  const [r, setR] = useState(null)
  return (
    <>
      <button className="btn ghost wide" onClick={async () => setR(await shareApp())}>{r === 'copied' ? '✓ Link copied' : '↗ Share Tavern Table'}</button>
      {r === 'manual' && <input className="input mono" readOnly value={location.href.split('#')[0]} aria-label="Tavern Table link" onFocus={(e) => e.target.select()} />}
    </>
  )
}

function CloudKey() {
  const [shown, setShown] = useState(false)
  const [done, setDone] = useState(null)
  const url = restoreLink()
  const share = async () => {
    try { if (navigator.share) { await navigator.share({ title: 'Tavern Table cloud key', url }); setDone('shared'); return } } catch (e) { if (e?.name === 'AbortError') return }
    try { await navigator.clipboard.writeText(url); setDone('copied') } catch { setShown(true) }
  }
  return (
    <>
      {shown && <input className="input mono" readOnly value={url} aria-label="Cloud key link" onFocus={(e) => e.target.select()} />}
      <div className="row">
        <button className="btn ghost grow" onClick={() => setShown(!shown)}>{shown ? 'Hide' : 'Show the link'}</button>
        <button className="btn ghost grow" onClick={share}>{done === 'copied' ? '✓ Copied' : 'Share / copy'}</button>
      </div>
    </>
  )
}

createRoot(document.getElementById('root')).render(<App />)
