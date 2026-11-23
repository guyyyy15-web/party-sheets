// The owner's admin screen (#/admin): every group and character, and how much the app is used. Protected by an admin
// password: the first one set becomes the admin's (the server keeps only its hash). Usage counts writes only.
import React, { useState, useEffect, useCallback } from 'react'
import { classById } from '../content/classes.js'
import { speciesById } from '../content/species.js'
import { getSetting, setSetting } from './store.js'
import { apiBase } from './sync.js'

const KINDS = { room_created: 'New groups', character_saved: 'New characters', character_joined: 'Joined a group', player_write: 'Player changes', dm_action: 'DM actions' }
const when = (t) => { if (!t) return '—'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago` }

async function call(path, { key, method = 'GET', body } = {}) {
  let r
  try { r = await fetch(apiBase() + path, { method, headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }) } catch { throw Object.assign(new Error('No connection'), { status: 0 }) }
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j.error || `error ${r.status}`), { status: r.status })
  return j
}

export function AdminView({ onBack }) {
  const [key, setKey] = useState(() => getSetting('adminKey', null))
  const [stats, setStats] = useState(null)
  const [err, setErr] = useState(null)
  const load = useCallback(async (k = key) => {
    if (!k) return
    try { setStats(await call('/admin/stats', { key: k })); setErr(null) } catch (e) {
      if (e.status === 403) { setSetting('adminKey', null); setKey(null) }
      setErr(e.status === 403 ? 'Wrong admin password.' : e.status === 404 ? 'No admin password yet.' : e.message)
    }
  }, [key])
  useEffect(() => { load() }, [load])

  if (!key) return <AdminLogin onBack={onBack} err={err} onKey={(k) => { setSetting('adminKey', k); setKey(k) }} />
  const t = stats?.totals
  return (
    <main className="admin-page">
      <header className="char-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">‹</button>
        <div className="grow"><h1>Admin</h1></div>
        <button className="btn ghost small" onClick={() => load()}>↻ Refresh</button>
      </header>
      {err && <p className="warn-line" role="alert">{err}</p>}
      {!stats ? <p className="muted">Loading…</p> : (
        <>
          <section className="admin-totals" aria-label="Totals">
            <Tile n={t.rooms} label="Groups" sub={`${t.activeRooms7d} active this week`} />
            <Tile n={t.characters} label="Characters saved" sub={`${t.activeCharacters7d} changed this week`} />
            <Tile n={t.players} label="Players (phones)" />
            <Tile n={`${Math.round(t.bytes / 1024)} KB`} label="Stored" sub={`up to ${stats.limits.totalRooms} groups`} />
          </section>
          <UsageChart usage={stats.usage} />
          {stats.solo?.length > 0 && (
            <>
              <h2 className="admin-h">Not in a group ({stats.solo.length})</h2>
              <ul className="admin-chars room">
                {stats.solo.map((c) => (
                  <li key={c.id}>
                    <span className="portrait mini-portrait" aria-hidden>{c.portrait || (c.name || '?').slice(0, 1)}</span>
                    <span className="grow"><b>{c.name || 'Unnamed (in the wizard)'}</b><span className="muted small">{speciesById(c.speciesId)?.name || ''} {classById(c.classId)?.name || ''} {c.level}</span></span>
                    <span className="muted small" title={`Player ${c.player}`}>{when(c.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h2 className="admin-h">Groups</h2>
          {stats.rooms.length === 0 && <p className="muted">No groups yet.</p>}
          <ul className="admin-rooms">
            {stats.rooms.map((r) => (
              <li key={r.id} className="room">
                <div className="room-head">
                  <span className="grow"><b>{r.name}</b><span className="muted small">{r.characters.length} character{r.characters.length === 1 ? '' : 's'} · {new Set(r.characters.map((c) => c.player)).size} player{new Set(r.characters.map((c) => c.player)).size === 1 ? '' : 's'} · active {when(r.lastActive)} · made {new Date(r.createdAt).toLocaleDateString()}</span></span>
                  <button className="btn small danger" onClick={async () => { if (!confirm(`Delete the group "${r.name}" and its ${r.characters.length} shared characters from the server? The characters stay on the players' phones.`)) return; try { await call(`/admin/rooms/${r.id}`, { key, method: 'DELETE' }); load() } catch (e) { setErr(e.message) } }}>Delete</button>
                </div>
                {r.characters.length > 0 && (
                  <ul className="admin-chars">
                    {r.characters.map((c) => (
                      <li key={c.id}>
                        <span className="portrait mini-portrait" aria-hidden>{c.portrait || (c.name || '?').slice(0, 1)}</span>
                        <span className="grow"><b>{c.name}</b><span className="muted small">{speciesById(c.speciesId)?.name || ''} {classById(c.classId)?.name || c.classId} {c.level}{c.hp != null ? ` · HP ${c.hp}` : ''}</span></span>
                        <span className="muted small" title={`Player ${c.player} · ${c.rev} changes · ${Math.round(c.bytes / 1024)} KB`}>{when(c.updatedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <button className="btn ghost wide" onClick={() => { setSetting('adminKey', null); setKey(null); setStats(null) }}>Sign out on this device</button>
        </>
      )}
    </main>
  )
}

const Tile = ({ n, label, sub }) => <div className="stat-card"><b className="mono">{n}</b><span className="lbl">{label}</span>{sub && <span className="muted small">{sub}</span>}</div>

/** Actions per day, last 30 days: one bar per day, the total by kind underneath. */
function UsageChart({ usage }) {
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10))
  const per = Object.fromEntries(days.map((d) => [d, 0]))
  const byKind = {}
  for (const u of usage) { if (u.day in per) per[u.day] += u.count; byKind[u.kind] = (byKind[u.kind] || 0) + u.count }
  const max = Math.max(1, ...Object.values(per))
  const total = Object.values(per).reduce((a, b) => a + b, 0)
  return (
    <section className="panel usage" aria-label="Usage, last 30 days">
      <div className="row"><h2 className="grow">Usage, last 30 days</h2><span className="mono">{total} actions</span></div>
      <div className="bars" role="img" aria-label={`Actions per day over the last 30 days, ${total} in total, most in one day ${max}`}>
        {days.map((d) => <span key={d} className="bar" style={{ height: `${(per[d] / max) * 100}%` }} title={`${d}: ${per[d]}`} />)}
      </div>
      <div className="bars-axis muted small"><span>{days[0].slice(5)}</span><span>today</span></div>
      <ul className="kinds">{Object.entries(KINDS).map(([k, l]) => <li key={k}><span>{l}</span><b className="mono">{byKind[k] || 0}</b></li>)}</ul>
    </section>
  )
}

function AdminLogin({ onBack, onKey, err: outer }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(outer)
  const [first, setFirst] = useState(false)
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true); setErr(null)
    try {
      if (first) await call('/admin/claim', { method: 'POST', body: { key: pw } })
      await call('/admin/stats', { key: pw })
      onKey(pw)
    } catch (e) {
      if (e.status === 404) { setFirst(true); setErr('No admin password yet. Choose one now (12 characters or more) and keep it safe: it becomes the admin password.') }
      else setErr(e.status === 409 ? 'An admin password is already set.' : e.status === 403 ? 'Wrong admin password.' : e.message)
    } finally { setBusy(false) }
  }
  return (
    <main className="admin-page">
      <header className="char-top"><button className="icon-btn" onClick={onBack} aria-label="Back">‹</button><div className="grow"><h1>Admin</h1></div></header>
      <div className="panel">
        <label className="field"><span>{first ? 'Choose the admin password' : 'Admin password'}</span>
          <input className="input" type="password" autoComplete={first ? 'new-password' : 'current-password'} value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && pw) go() }} /></label>
        {err && <p className="warn-line" role="alert">{err}</p>}
        <button className="btn primary wide" disabled={busy || (first ? pw.length < 12 : !pw)} onClick={go}>{first ? 'Set the admin password' : 'Open'}</button>
      </div>
    </main>
  )
}
