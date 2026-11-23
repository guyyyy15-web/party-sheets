// The account sheet: create one (Face ID and/or username + password), sign in on a new phone, or sign out.
import React, { useState } from 'react'
import { Sheet } from './common.jsx'
import { account, signedIn, passkeysAvailable, passkeyName, addPasskey, signInPasskey, setPassword, signInPassword, validUsername, usernameFree } from './account.js'

export function AccountSheet({ onClose, onSignedIn, onSignOut, hasCharacters }) {
  const a = account()
  const [mode, setMode] = useState(signedIn() ? 'manage' : hasCharacters ? 'create' : 'signin')
  const [user, setUser] = useState(a?.username || '')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)
  const [ok, setOk] = useState(null)
  const pk = passkeysAvailable()
  const run = async (what, fn) => {
    setBusy(what); setMsg(null); setOk(null)
    try { await fn() } catch (e) { if (e.code !== 'cancelled') setMsg(e.message || 'Something went wrong. Try again.') } finally { setBusy(null) }
  }
  const has = (kind) => !!account()?.methods?.some((m) => m.kind === kind)

  const signinPk = () => run('pk', async () => { const b = await signInPasskey(); await onSignedIn(b) })
  const signinPw = () => run('pw', async () => { const b = await signInPassword(user, pw); await onSignedIn(b) })
  const createPk = () => run('pk', async () => { await addPasskey(account()?.username || user || 'Player'); setOk(`${passkeyName()} is set. Sign in with it on any of your devices.`); setMode('manage') })
  const createPw = () => run('pw', async () => {
    if (!validUsername(user)) throw new Error('Username: 3-24 letters, numbers, dots, dashes or underscores.')
    if (!(await usernameFree(user))) throw new Error('That username is taken. Try another.')
    await setPassword(user, pw); setPw(''); setOk('Saved. Sign in with this username and password on any phone or computer.'); setMode('manage')
  })

  const tabs = !signedIn() && (
    <div className="seg" role="tablist">
      <button role="tab" aria-selected={mode === 'signin'} onClick={() => { setMode('signin'); setMsg(null) }}>I have an account</button>
      <button role="tab" aria-selected={mode === 'create'} onClick={() => { setMode('create'); setMsg(null) }}>Create one</button>
    </div>
  )
  const pwForm = (submit, label, isNew) => (
    <form className="acct-form" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <label className="field"><span>Username</span><input className="input" autoComplete="username" autoCapitalize="none" spellCheck="false" value={user} onChange={(e) => setUser(e.target.value)} /></label>
      <label className="field"><span>Password{isNew ? ' (8+ characters)' : ''}</span><input className="input" type="password" autoComplete={isNew ? 'new-password' : 'current-password'} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      <button className="btn primary wide" type="submit" disabled={!!busy || !user || !pw}>{busy === 'pw' ? 'One moment…' : label}</button>
    </form>
  )

  return (
    <Sheet title={signedIn() ? 'Your account' : 'Sign in'} onClose={onClose}>
      {tabs}
      {mode === 'signin' && (
        <>
          
          {pk && <button className="btn primary wide big-btn" disabled={!!busy} onClick={signinPk}>{busy === 'pk' ? 'Waiting for ' + passkeyName() + '…' : `Sign in with ${passkeyName()}`}</button>}
          {pk && <p className="or"><span>or</span></p>}
          {pwForm(signinPw, 'Sign in', false)}
        </>
      )}
      {mode === 'create' && (
        <>
          <p className="muted small">Sign in on any phone or computer. Your password never leaves this device.</p>
          {pk && <button className="btn primary wide big-btn" disabled={!!busy} onClick={createPk}>{busy === 'pk' ? 'Waiting for ' + passkeyName() + '…' : `Use ${passkeyName()}`}</button>}
          {pk && <p className="or"><span>and / or</span></p>}
          {pwForm(createPw, 'Create with username + password', true)}
        </>
      )}
      {mode === 'manage' && (
        <>
          <p className="acct-who"><span className="acct-avatar" aria-hidden>👤</span><b>{account()?.username || 'Signed in'}</b></p>
          <ul className="acct-methods">
            <li><span className="grow">{passkeyName()}</span>{has('passkey') ? <span className="ok-line">✓ on</span> : pk ? <button className="btn small ghost" disabled={!!busy} onClick={createPk}>Add</button> : <span className="muted small">not on this device</span>}</li>
            <li><span className="grow">Username + password</span>{has('password') ? <span className="ok-line">✓ on</span> : <button className="btn small ghost" onClick={() => setMode('add-pw')}>Add</button>}</li>
          </ul>
          
          <button className="btn danger wide" onClick={() => { if (confirm('Sign out on this phone? Your characters stay saved in your account, and come back when you sign in again.')) onSignOut() }}>Sign out on this phone</button>
        </>
      )}
      {mode === 'add-pw' && pwForm(createPw, 'Save username + password', true)}
      {msg && <p className="warn-line" role="alert">{msg}</p>}
      {ok && <p className="ok-line" role="status">{ok}</p>}
    </Sheet>
  )
}

/** On the home screen: an account chip, or a nudge to save one once there are characters. */
export function AccountChip({ onOpen }) {
  const a = account()
  return <button className={`acct-chip ${signedIn() ? 'in' : ''}`} onClick={onOpen} aria-label={signedIn() ? `Account: ${a?.username || 'signed in'}` : 'Sign in'}>{signedIn() ? `👤 ${a?.username || 'Account'}` : 'Sign in'}</button>
}
export function SaveAccountNudge({ onOpen }) {
  if (signedIn()) return null
  return (
    <button className="nudge" onClick={onOpen}><span>Save to an account to sign in on any phone</span><b>Create ›</b></button>
  )
}
