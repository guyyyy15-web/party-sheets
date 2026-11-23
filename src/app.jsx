import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { newCharacter, derive } from './engine/engine.js'
import { allCharacters, saveCharacter, deleteCharacter, getSetting, setSetting, backupText, backupName, parseBackupFile, backupRooms, shareFile } from './ui/store.js'
import { parseLink } from './sync-core.js'
import { joinRoom, listRooms, roomById, restoreRooms, shareCharacter, unshareCharacter, syncCharacter } from './ui/sync.js'
import { RoomsSection } from './ui/rooms.jsx'
import { DmView } from './ui/dm.jsx'
import { DiceTray, performRoll, throwDefault, load3d, RollCard } from './ui/dice.jsx'
import { Wizard, Portrait } from './ui/wizard.jsx'
import { CharacterSheet } from './ui/sheet.jsx'
import { Sheet } from './ui/common.jsx'

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true

function App() {
  const [chars, setChars] = useState(null)
  const [view, setView] = useState({ name: 'home' })
  const [tray, setTray] = useState(false)
  const [pool, setPool] = useState({ 20: 1 })
  const [poolMod, setPoolMod] = useState(0)
  const [log, setLog] = useState([])
  const [mode, setMode] = useState('normal')
  const [throwOn, setThrowOnState] = useState(() => getSetting('throwOnScreen', throwDefault()))
  const [settings, setSettingsState] = useState(() => getSetting('table', { allowRoll: true }))
  const [toast, setToast] = useState(null)
  const [shown, setShown] = useState(null) // the last instant roll, with its math, until closed or the next roll
  const busy = useRef(false)
  const [joined, setJoined] = useState(null) // a group just joined through its invite link
  const charsRef = useRef(null)
  charsRef.current = chars
  const timers = useRef({})

  useEffect(() => { allCharacters().then(setChars); navigator.storage?.persist?.().catch(() => {}) }, [])

  // an invite or DM link: check it, remember the group, and clear the key from the address bar
  useEffect(() => {
    const open = async () => {
      const link = parseLink(location.hash)
      if (!link) return
      history.replaceState(null, '', location.pathname + location.search)
      try {
        const r = await joinRoom(link)
        if (link.kind === 'dm') setView({ name: 'dm', roomId: r.id })
        else { setJoined(r.id); setView({ name: 'home' }) }
      } catch (e) { say(e.status === 0 ? 'No connection: open the link again when online.' : e.status === 404 ? 'That group no longer exists.' : 'That link doesn\'t work. Ask for a new one.') }
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])

  // shared characters: send changes a moment after they happen, and pick up the DM's changes every 10 s
  const runSync = useCallback(async (id) => {
    const next = await syncCharacter(id, () => charsRef.current?.find((c) => c.id === id))
    if (next) { setChars((list) => list.map((c) => (c.id === id ? next : c))); saveCharacter(next) }
  }, [])
  const schedule = useCallback((id) => { clearTimeout(timers.current[id]); timers.current[id] = setTimeout(() => runSync(id), 800) }, [runSync])
  useEffect(() => {
    const all = () => { if (!document.hidden) for (const c of charsRef.current || []) if (c.roomId && !c.draft) runSync(c.id) }
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
    if (next.roomId && !next.draft) schedule(next.id)
  }, [schedule])
  const bring = async (c, r) => {
    try { const next = await shareCharacter(c, r); setChars((l) => l.map((x) => (x.id === c.id ? next : x))); saveCharacter(next); say(`${c.name} joined ${r.name}.`) }
    catch (e) { say(e.status === 0 ? 'No connection. Try again when online.' : e.status === 507 ? 'That group is full (12 characters).' : e.message) }
  }
  const leave = async (c) => {
    try { const next = await unshareCharacter(c); setChars((l) => l.map((x) => (x.id === c.id ? next : x))); saveCharacter(next) }
    catch (e) { say(e.message) }
  }
  const remove = async (c) => {
    if (c.roomId) await unshareCharacter(c).catch(() => {})
    await deleteCharacter(c.id); setChars((l) => l.filter((x) => x.id !== c.id))
  }
  const roll = async (req) => {
    if (busy.current) return null
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
      say(`Imported ${list.length} character${list.length > 1 ? 's' : ''}.`)
    } catch (e) { say(e.message) }
  }

  if (!chars) return <div className="boot">Loading…</div>

  let screen
  if (view.name === 'wizard' && current) {
    screen = <Wizard ch={current} setCh={update} settings={settings} throwOn={throwOn}
      onCancel={async () => { if (!current.name && !current.classId) { await deleteCharacter(current.id); setChars((l) => l.filter((c) => c.id !== current.id)) } setView({ name: 'home' }) }}
      onDone={() => { const d = derive(current); update({ ...current, draft: false, wizardStep: 0, state: { ...current.state, hp: d.hp.value } }); setView({ name: 'sheet', id: current.id }) }} />
  } else if (view.name === 'sheet' && current) {
    const room = current.roomId && roomById(current.roomId)
    screen = <CharacterSheet ch={current} setCh={update} roll={roll} mode={mode} setMode={setMode} onBack={() => setView({ name: 'home' })}
      group={current.roomId ? { name: room?.name || 'Group', onLeave: () => leave(current) } : null}
      onDelete={async () => { await remove(current); setView({ name: 'home' }) }} />
  } else if (view.name === 'dm' && roomById(view.roomId)) {
    screen = <DmView room={roomById(view.roomId)} onBack={() => setView({ name: 'home' })} />
  } else {
    screen = <Home chars={chars} onOpen={(c) => setView({ name: c.draft ? 'wizard' : 'sheet', id: c.id })} onNew={start} onBring={bring} onDm={(r) => setView({ name: 'dm', roomId: r.id })} joined={joined} onExport={exportAll} onImport={importFile} settings={settings} setSettings={setSettings} />
  }

  return (
    <>
      {screen}
      {view.name !== 'wizard' && !tray && <button className="fab" onClick={() => { setTray(true); if (throwOn) load3d().catch(() => {}) }} aria-label="Dice">🎲</button>}
      {tray && <DiceTray pool={pool} setPool={setPool} mod={poolMod} setMod={setPoolMod} throwOn={throwOn} setThrowOn={setThrowOn} last={log[0]}
        onClose={() => setTray(false)} onThrow={() => { setTray(false); roll({ kind: 'pool', pool, mod: poolMod }) }} />}
      {shown && <RollCard e={shown} onClose={() => setShown(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}

function Home({ chars, onOpen, onNew, onBring, onDm, joined, onExport, onImport, settings, setSettings }) {
  const file = useRef(null)
  const [table, setTable] = useState(false)
  const [installHidden, setInstallHidden] = useState(() => getSetting('installHidden', false))
  const last = getSetting('lastBackupAt', null)
  const real = chars.filter((c) => !c.draft || c.name)
  const known = new Set(listRooms().map((r) => r.id))
  const solo = real.filter((c) => !c.roomId || !known.has(c.roomId))
  const card = (c) => {
    const d = derive(c)
    return (
      <li key={c.id}><button className={`char-card theme-${c.theme || { fighter: 'red', rogue: 'violet', monk: 'gold' }[c.classId] || 'gold'}`} onClick={() => onOpen(c)}>
        <Portrait ch={c} size={52} />
        <span className="grow"><b>{c.name || 'Unnamed hero'}</b><span className="muted small">{c.draft ? 'Draft, tap to continue' : `${d.species?.name || ''} ${d.cls?.name || ''} ${c.level}`}</span></span>
        {!c.draft && <span className="mini"><span>AC {d.ac.value}</span><span>HP {c.state.hp ?? d.hp.value}/{d.hp.value}</span></span>}
      </button></li>
    )
  }
  return (
    <main className="home">
      <header className="home-top">
        <div className="brand"><span className="logo" aria-hidden>🎲</span><div><h1>Party Sheets</h1><p className="muted small">Character sheets for our table</p></div></div>
        <button className="icon-btn" onClick={() => setTable(true)} aria-label="Table settings">⚙</button>
      </header>
      {isIOS() && !standalone() && !installHidden && (
        <div className="panel info">
          <button className="icon-btn corner" aria-label="Hide" onClick={() => { setSetting('installHidden', true); setInstallHidden(true) }}>✕</button>
          <b>Add it to your Home Screen</b>
          <p className="small">Share ⎋ → "Add to Home Screen". It opens like an app, works with no signal, and keeps your characters safe from Safari's clean-ups.</p>
        </div>
      )}
      {real.length === 0 ? (
        <div className="empty">
          <div className="empty-art" aria-hidden>🐉</div>
          <h2>No heroes yet</h2>
          <p className="muted">Build one in a few minutes: class, species, background, and dice for your scores.</p>
        </div>
      ) : solo.length > 0 && (
        <ul className="char-list">{solo.map(card)}</ul>
      )}
      <button className="btn primary wide big-btn" onClick={() => onNew()}>+ New character</button>
      <RoomsSection chars={real} renderChar={card} onDm={onDm} onNewInRoom={(r) => onNew(r)} onBring={onBring} joined={joined} />
      <section className="backup">
        <p className="muted small">Characters live on this phone (and in their group, if they have one). {last ? `Last backup ${Math.round((Date.now() - last) / 86400e3)} days ago.` : 'No backup yet.'}</p>
        <div className="row">
          <button className="btn ghost grow" onClick={onExport} disabled={!real.length}>⬆ Export all</button>
          <button className="btn ghost grow" onClick={() => file.current?.click()}>⬇ Import</button>
        </div>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onImport(f) }} aria-label="Backup file" />
      </section>
      <p className="muted small legal">Uses rules from the System Reference Document 5.2 by Wizards of the Coast LLC, available under CC-BY-4.0. Not affiliated with Wizards of the Coast.</p>
      {table && (
        <Sheet title="Table settings" onClose={() => setTable(false)}>
          <label className="row toggle"><input type="checkbox" checked={settings.allowRoll !== false} onChange={(e) => setSettings({ ...settings, allowRoll: e.target.checked })} /><span>Allow rolling ability scores (4d6) in the wizard</span></label>
          <p className="muted small">The DM decides. Standard array and point buy are always there.</p>
          <label className="row toggle"><input type="checkbox" checked={settings.showMath !== false} onChange={(e) => setSettings({ ...settings, showMath: e.target.checked })} /><span>Show the math on every roll (to learn to play with real dice)</span></label>
        </Sheet>
      )}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
