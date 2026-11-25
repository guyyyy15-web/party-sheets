// Groups ("rooms"): each playing group has its own room, an invite link for the players and a DM link for its DM.
import React, { useState, useEffect } from 'react'
import { Sheet, GameIcon } from './common.jsx'
import { createRoom, listRooms, inviteLink, dmLink, initLink, makeInitLink, roomById, fetchRoom, forgetRoom, deleteRoom, syncStatus, onSyncStatus } from './sync.js'

/** Share a link: the phone's share sheet, else copy, else show it to copy by hand. */
async function shareUrl(url, title, text) {
  try { if (navigator.share) { await navigator.share({ title, text, url }); return 'shared' } } catch (e) { if (e?.name === 'AbortError') return 'cancelled' }
  try { await navigator.clipboard.writeText(url); return 'copied' } catch { return 'manual' }
}

function LinkRow({ label, hint, url, title, text, icon = 'ui.group' }) {
  const [done, setDone] = useState(null)
  const copy = async () => { try { await navigator.clipboard.writeText(url); setDone('copied') } catch { setDone('manual') } }
  return (
    <div className="link-row">
      <div className="link-head"><GameIcon id={icon} size={30} /><span className="grow"><b>{label}</b><span className="muted small" style={{ display: 'block' }}>{hint}</span></span></div>
      <input className="link-url" readOnly value={url} aria-label={label} onFocus={(e) => e.target.select()} />
      <div className="row">
        <button className="btn primary grow" onClick={copy}>{done === 'copied' ? '✓ Copied' : '⧉ Copy link'}</button>
        <button className="btn ghost grow" onClick={async () => { const r = await shareUrl(url, title, text); if (r === 'copied' || r === 'manual') setDone(r) }}>↗ Share</button>
      </div>
      {done === 'manual' && <p className="muted small">Select the link above and copy it.</p>}
    </div>
  )
}

export function ShareLinks({ room: room0, onClose, onGone }) {
  const [room, setRoom] = useState(() => roomById(room0.id) || room0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const inv = inviteLink(room), dm = dmLink(room), init = initLink(room)
  const make = async () => {
    if (init && !confirm('Make a new Initiative link? The old one stops working.')) return
    setBusy(true); setErr(null)
    try { setRoom(await makeInitLink(room)) } catch (e) { setErr(e.status === 0 ? 'No connection. Try again when online.' : e.message) } finally { setBusy(false) }
  }
  return (
    <Sheet title={`Links for ${room.name}`} onClose={onClose}>
      {inv && <LinkRow icon="ui.group" label="Invite for players" hint="Each player opens it once and brings a character." url={inv} title={`Join ${room.name}`} text={`⚔️ Join our D&D group "${room.name}" on Party Sheets. Tap to join:`} />}
      {init && <LinkRow label="Initiative link" hint="For whoever runs the initiative at the table: the order, enemies, HP and conditions. No gold, items or notes." url={init} icon="ui.d20" title={`Initiative: ${room.name}`} text={`🎲 Run the initiative for "${room.name}" on Party Sheets:`} />}
      {room.dmKey && <button className="btn ghost wide" disabled={busy} onClick={make}>{init ? '↻ Make a new Initiative link' : '⚔ Make an Initiative link'}</button>}
      {err && <p className="warn-line" role="alert">{err}</p>}
      {dm && <LinkRow icon="ui.dm" label="DM link (keep it for the DM)" hint="Only for the DM: every sheet, live." url={dm} title={`DM: ${room.name}`} text={`🛡 The DM screen for "${room.name}" on Party Sheets (keep it to yourself):`} />}
      <div className="danger-zone">
        {room.dmKey ? (
          <button className="btn ghost wide danger-text" disabled={busy} onClick={async () => {
            if (!confirm(`Delete "${room.name}" for everyone? Its links stop working and the fight is cleared. Every character stays saved, just in no group.`)) return
            setBusy(true); setErr(null)
            try { await deleteRoom(room); onGone?.(room); onClose() } catch (e) { setErr(e.status === 0 ? 'No connection. Try again when online.' : e.message); setBusy(false) }
          }}>🗑 Delete this group</button>
        ) : (
          <button className="btn ghost wide danger-text" onClick={() => { if (confirm(`Remove "${room.name}" from this phone? Your characters stay saved; open the invite again to come back.`)) { forgetRoom(room.id); onGone?.(room); onClose() } }}>Remove this group from my phone</button>
        )}
      </div>
    </Sheet>
  )
}

export function NewRoomSheet({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const go = async () => {
    setBusy(true); setErr(null)
    try { onCreated(await createRoom(name.trim())) } catch (e) { setErr(e.status === 0 ? 'No connection. Try again when online.' : e.status === 429 ? 'Too many new groups from here. Try again in an hour.' : e.message); setBusy(false) }
  }
  return (
    <Sheet title="New group" onClose={onClose}>
      
      <label className="field"><span>Group name</span><input className="input" value={name} maxLength={60} placeholder="Thursday night" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) go() }} autoFocus /></label>
      {err && <p className="warn-line" role="alert">{err}</p>}
      <button className="btn primary wide" disabled={!name.trim() || busy} onClick={go}>{busy ? 'Creating…' : 'Create group'}</button>
    </Sheet>
  )
}

/** Home: the groups this phone knows, with my characters in each and the rest of the party. */
export function RoomsSection({ chars, renderChar, onDm, onInit, onNewInRoom, onBring, joined, onGone }) {
  const [rooms, setRooms] = useState(listRooms)
  const [party, setParty] = useState({})
  const [share, setShare] = useState(null)
  const [create, setCreate] = useState(false)
  const [bring, setBring] = useState(null)
  useEffect(() => {
    let live = true
    for (const r of rooms) fetchRoom(r, false).then((j) => live && setParty((p) => ({ ...p, [r.id]: j.characters }))).catch((e) => { if (live && e.status === 404) { forgetRoom(r.id); setRooms(listRooms()) } }) // deleted by its DM
    return () => { live = false }
  }, [rooms])
  useEffect(() => { if (joined) setRooms(listRooms()) }, [joined])
  const mine = (r) => chars.filter((c) => c.roomId === r.id)
  const free = chars.filter((c) => !c.roomId && !c.draft)
  return (
    <section className="rooms" aria-label="Groups">
      <div className="section-head"><h2>Groups</h2><button className="btn ghost small" onClick={() => setCreate(true)}>+ New group</button></div>
      {rooms.length === 0 && <p className="muted small">Make a group, or open an invite someone sent you.</p>}
      {rooms.map((r) => {
        const own = mine(r), others = (party[r.id] || []).filter((p) => !own.some((c) => c.id === p.id))
        return (
          <div key={r.id} className={`room ${joined === r.id ? 'fresh' : ''}`}>
            <div className="room-head">
              <span className="grow"><b>{r.name}</b><span className="muted small">{r.dmKey ? 'You are the DM' : r.initKey ? 'You run the initiative' : 'Player'}{party[r.id] ? ` · ${party[r.id].length} in the party` : ''}</span></span>
              {(r.initKey || r.dmKey) && <button className="btn small primary" onClick={() => onInit(r)}>⚔ Initiative</button>}
              {r.dmKey && <button className="btn small primary" onClick={() => onDm(r)}>DM screen</button>}
              <button className="btn small ghost" onClick={() => setShare(r)} aria-label={`Links for ${r.name}`}>Links</button>
            </div>
            {joined === r.id && <p className="ok-line small" role="status">You joined {r.name}.</p>}
            {own.length > 0 && <ul className="char-list">{own.map(renderChar)}</ul>}
            {others.length > 0 && <p className="muted small party-line">Also here: {others.map((p) => `${p.name} (${p.level})`).join(', ')}</p>}
            {r.playerKey && (
              <div className="row">
                {free.length > 0 && <button className="btn ghost grow" onClick={() => setBring(r)}>Bring a character</button>}
                <button className="btn ghost grow" onClick={() => onNewInRoom(r)}>+ New for this group</button>
              </div>
            )}
          </div>
        )
      })}
      {share && <ShareLinks room={share} onClose={() => setShare(null)} onGone={(r) => { setRooms(listRooms()); onGone?.(r) }} />}
      {create && <NewRoomSheet onClose={() => setCreate(false)} onCreated={(r) => { setCreate(false); setRooms(listRooms()); setShare(r) }} />}
      {bring && (
        <Sheet title={`Bring to ${bring.name}`} onClose={() => setBring(null)}>
          
          <ul className="char-list">{free.map((c) => <li key={c.id}><button className="btn wide ghost" onClick={() => { onBring(c, bring); setBring(null) }}>{c.name || 'Unnamed hero'}</button></li>)}</ul>
        </Sheet>
      )}
    </section>
  )
}

/** Forget a group on this phone (the DM link holder keeps it). */
export function forgetGroup(r) { forgetRoom(r.id) }

/** The little cloud next to a shared character's name. */
export function SyncBadge({ id, roomName, onSaveNow }) {
  const [s, setS] = useState(() => syncStatus(id))
  const [busy, setBusy] = useState(false)
  useEffect(() => onSyncStatus((x) => { if (x === id) setS(syncStatus(id)) }), [id])
  const st = s?.state || 'pending'
  const text = { ok: 'Saved', sending: 'Saving…', pending: 'Saving…', offline: 'Not saved: no connection', error: 'Not saved' }[st]
  const stuck = st === 'offline' || st === 'error' || (st === 'pending' && Date.now() - (s?.at || 0) > 3000)
  return (
    <span className={`sync-badge ${st}`} role="status" title={s?.msg || ''}>
      ☁ {roomName ? `${roomName} · ` : ''}{text}
      {stuck && onSaveNow && <button className="btn small ghost save-now" disabled={busy} onClick={async () => { setBusy(true); try { await onSaveNow() } finally { setBusy(false) } }}>{busy ? 'Saving…' : 'Save now'}</button>}
      {st === 'error' && s?.msg && <span className="sync-msg">{s.msg}</span>}
    </span>
  )
}
