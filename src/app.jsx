import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { newCharacter, derive } from './engine/engine.js'
import { allCharacters, saveCharacter, deleteCharacter, getSetting, setSetting, backupText, backupName, parseBackupFile, shareFile } from './ui/store.js'
import { DiceTray, performRoll, throwDefault, load3d } from './ui/dice.jsx'
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
  const [shown, setShown] = useState(null) // the last instant roll, on screen for 5 s
  const shownTimer = useRef(0)
  const busy = useRef(false)

  useEffect(() => { allCharacters().then(setChars); navigator.storage?.persist?.().catch(() => {}) }, [])
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 3500) }
  const setThrowOn = (v) => { setThrowOnState(v); setSetting('throwOnScreen', v); if (v) load3d().catch(() => {}) }
  const setSettings = (v) => { setSettingsState(v); setSetting('table', v) }

  const current = chars?.find((c) => c.id === view.id)
  const update = useCallback((next) => {
    setChars((list) => list.map((c) => (c.id === next.id ? next : c)))
    saveCharacter(next)
  }, [])
  const roll = async (req) => {
    if (busy.current) return null
    busy.current = true
    try {
      const e = await performRoll(req, throwOn)
      setLog((l) => [e, ...l].slice(0, 20))
      if (!throwOn) { setShown(e); clearTimeout(shownTimer.current); shownTimer.current = setTimeout(() => setShown(null), 5000) }
      return e
    } finally { busy.current = false }
  }

  const start = async () => {
    const ch = { ...newCharacter(), draft: true }
    await saveCharacter(ch)
    setChars((l) => [ch, ...(l || [])])
    setView({ name: 'wizard', id: ch.id })
  }
  const exportAll = async () => {
    const r = await shareFile(backupText((chars || []).filter((c) => !c.draft)), backupName())
    if (r !== 'cancelled') { setSetting('lastBackupAt', Date.now()); say('Backup saved. Keep the file somewhere safe.') }
  }
  const importFile = async (file) => {
    try {
      const list = parseBackupFile(await file.text())
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
    screen = <CharacterSheet ch={current} setCh={update} roll={roll} mode={mode} setMode={setMode} onBack={() => setView({ name: 'home' })}
      onDelete={async () => { await deleteCharacter(current.id); setChars((l) => l.filter((c) => c.id !== current.id)); setView({ name: 'home' }) }} />
  } else {
    screen = <Home chars={chars} onOpen={(c) => setView({ name: c.draft ? 'wizard' : 'sheet', id: c.id })} onNew={start} onExport={exportAll} onImport={importFile} settings={settings} setSettings={setSettings} />
  }

  return (
    <>
      {screen}
      {view.name !== 'wizard' && !tray && <button className="fab" onClick={() => { setTray(true); if (throwOn) load3d().catch(() => {}) }} aria-label="Dice">🎲</button>}
      {tray && <DiceTray pool={pool} setPool={setPool} mod={poolMod} setMod={setPoolMod} throwOn={throwOn} setThrowOn={setThrowOn} last={log[0]}
        onClose={() => setTray(false)} onThrow={() => { setTray(false); roll({ kind: 'pool', pool, mod: poolMod }) }} />}
      {shown && <div className="toast roll-toast" role="status"><small>{shown.label}</small><b>{shown.total}</b><small>{shown.text}{shown.flag ? ` · ${shown.flag}` : ''}</small></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}

function Home({ chars, onOpen, onNew, onExport, onImport, settings, setSettings }) {
  const file = useRef(null)
  const [table, setTable] = useState(false)
  const [installHidden, setInstallHidden] = useState(() => getSetting('installHidden', false))
  const last = getSetting('lastBackupAt', null)
  const real = chars.filter((c) => !c.draft || c.name)
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
      ) : (
        <ul className="char-list">
          {real.map((c) => {
            const d = derive(c)
            return (
              <li key={c.id}><button className={`char-card theme-${c.theme || { fighter: 'red', rogue: 'violet', monk: 'gold' }[c.classId] || 'gold'}`} onClick={() => onOpen(c)}>
                <Portrait ch={c} size={52} />
                <span className="grow"><b>{c.name || 'Unnamed hero'}</b><span className="muted small">{c.draft ? 'Draft, tap to continue' : `${d.species?.name || ''} ${d.cls?.name || ''} ${c.level}`}</span></span>
                {!c.draft && <span className="mini"><span>AC {d.ac.value}</span><span>HP {c.state.hp ?? d.hp.value}/{d.hp.value}</span></span>}
              </button></li>
            )
          })}
        </ul>
      )}
      <button className="btn primary wide big-btn" onClick={onNew}>+ New character</button>
      <section className="backup">
        <p className="muted small">Characters live on this phone. {last ? `Last backup ${Math.round((Date.now() - last) / 86400e3)} days ago.` : 'No backup yet.'}</p>
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
        </Sheet>
      )}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
