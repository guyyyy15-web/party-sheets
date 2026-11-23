// Groups ("rooms"): each playing group has its own room, an invite link for the players and a DM link for its DM.
import React, { useState, useEffect } from 'react'
import { Sheet } from './common.jsx'
import { createRoom, listRooms, inviteLink, dmLink, fetchRoom, forgetRoom, syncStatus, onSyncStatus } from './sync.js'

/** Share a link: the phone's share sheet, else copy, else show it to copy by hand. */
async function shareUrl(url, title, text) {
  try { if (navigator.share) { await navigator.share({ title, text, url }); return 'shared' } } catch (e) { if (e?.name === 'AbortError') return 'cancelled' }
  try { await navigator.clipboard.writeText(url); return 'copied' } catch { return 'manual' }
}

function LinkRow({ label, hint, url, title, text }) {
  const [done, setDone] = useState(null)
  return (
    <div className="link-row">
      <b>{label}</b><p className="muted small">{hint}</p>
      <div className="row">
        <input className="input mono grow" readOnly value={url} aria-label={label} onFocus={(e) => e.target.select()} />
        <button className="btn primary" onClick={async () => setDone(await shareUrl(url, title, text))}>{done === 'copied' ? '✓ Copied' : 'Share'}</button>
      </div>
      {done === 'manual' && <p className="muted small">Select the link above and copy it.</p>}
    </div>
  )
}

export function ShareLinks({ room, onClose }) {
  const inv = inviteLink(room), dm = dmLink(room)
  return (
    <Sheet title={`Links for ${room.name}`} onClose={onClose}>
      {inv && <LinkRow label="Invite for players" hint="Players open it on their phone and bring a character. They see the party, not each other's sheets." url={inv} title={`Join ${room.name}`} text={`Join our group "${room.name}" on Party Sheets:`} />}
      {dm && <LinkRow label="DM link (keep it for the DM)" hint="Opens the DM screen: every sheet, live, with quick HP, conditions and Inspiration. Send it only to the DM." url={dm} title={`DM: ${room.name}`} text={`DM screen for "${room.name}":`} />}
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
      <p className="muted small">One group per table. You get two links: an invite for the players and a link for the DM.</p>
      <label className="field"><span>Group name</span><input className="input" value={name} maxLength={60} placeholder="Thursday night" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) go() }} autoFocus /></label>
      {err && <p className="warn-line" role="alert">{err}</p>}
      <button className="btn primary wide" disabled={!name.trim() || busy} onClick={go}>{busy ? 'Creating…' : 'Create group'}</button>
    </Sheet>
  )
}

/** Home: the groups this phone knows, with my characters in each and the rest of the party. */
export function RoomsSection({ chars, renderChar, onDm, onNewInRoom, onBring, joined }) {
  const [rooms, setRooms] = useState(listRooms)
  const [party, setParty] = useState({})
  const [share, setShare] = useState(null)
  const [create, setCreate] = useState(false)
  const [bring, setBring] = useState(null)
  useEffect(() => {
    let live = true
    for (const r of rooms) fetchRoom(r, false).then((j) => live && setParty((p) => ({ ...p, [r.id]: j.characters }))).catch(() => {})
    return () => { live = false }
  }, [rooms])
  useEffect(() => { if (joined) setRooms(listRooms()) }, [joined])
  const mine = (r) => chars.filter((c) => c.roomId === r.id)
  const free = chars.filter((c) => !c.roomId && !c.draft)
  return (
    <section className="rooms" aria-label="Groups">
      <div className="section-head"><h2>Groups</h2><button className="btn ghost small" onClick={() => setCreate(true)}>+ New group</button></div>
      {rooms.length === 0 && <p className="muted small">Playing with a group? Make a group and send the invite: the DM sees everyone's sheet live. Or open an invite link someone sent you.</p>}
      {rooms.map((r) => {
        const own = mine(r), others = (party[r.id] || []).filter((p) => !own.some((c) => c.id === p.id))
        return (
          <div key={r.id} className={`room ${joined === r.id ? 'fresh' : ''}`}>
            <div className="room-head">
              <span className="grow"><b>{r.name}</b><span className="muted small">{r.dmKey ? 'You are the DM' : 'Player'}{party[r.id] ? ` · ${party[r.id].length} in the party` : ''}</span></span>
              {r.dmKey && <button className="btn small primary" onClick={() => onDm(r)}>DM screen</button>}
              <button className="btn small ghost" onClick={() => setShare(r)} aria-label={`Links for ${r.name}`}>Links</button>
            </div>
            {joined === r.id && <p className="panel info small" role="status">You joined <b>{r.name}</b>. Bring a character or build a new one for this group.</p>}
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
      {share && <ShareLinks room={share} onClose={() => setShare(null)} />}
      {create && <NewRoomSheet onClose={() => setCreate(false)} onCreated={(r) => { setCreate(false); setRooms(listRooms()); setShare(r) }} />}
      {bring && (
        <Sheet title={`Bring to ${bring.name}`} onClose={() => setBring(null)}>
          <p className="muted small">A character is in one group at a time. It stays on your phone too, and keeps working offline.</p>
          <ul className="char-list">{free.map((c) => <li key={c.id}><button className="btn wide ghost" onClick={() => { onBring(c, bring); setBring(null) }}>{c.name || 'Unnamed hero'}</button></li>)}</ul>
        </Sheet>
      )}
    </section>
  )
}

/** Forget a group on this phone (the DM link holder keeps it). */
export function forgetGroup(r) { forgetRoom(r.id) }

/** The little cloud next to a shared character's name. */
export function SyncBadge({ id, roomName }) {
  const [s, setS] = useState(() => syncStatus(id))
  useEffect(() => onSyncStatus((x) => { if (x === id) setS(syncStatus(id)) }), [id])
  const st = s?.state || 'ok'
  const text = st === 'offline' ? 'offline, will sync' : st === 'error' ? 'not syncing' : st === 'sending' ? 'syncing…' : 'synced'
  return <span className={`sync-badge ${st}`} title={s?.msg || ''}>☁ {roomName} · {text}</span>
}
