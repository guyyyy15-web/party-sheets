// The first screen a new visitor sees: what Party Sheets is, in a few lines, then Start / Sign in / Share.
// Shown once (until a character exists, or the visitor starts); "About Party Sheets" in Table settings reopens it.
import React, { useState } from 'react'
import { GameIcon } from './common.jsx'

export const appUrl = () => location.href.split('#')[0]
/** Share the app's link: the phone's share sheet, else copy. Returns 'shared' | 'copied' | 'manual' | 'cancelled'. */
export async function shareApp() {
  const url = appUrl()
  try { if (navigator.share) { await navigator.share({ title: 'Party Sheets', text: 'D&D character sheets for our table: build a hero in minutes, roll with the math shown, play together with the DM.', url }); return 'shared' } } catch (e) { if (e?.name === 'AbortError') return 'cancelled' }
  try { await navigator.clipboard.writeText(url); return 'copied' } catch { return 'manual' }
}

const POINTS = [
  ['class.fighter', 'Build a hero in minutes', 'Pick a class, species and background. The app applies every rule: 12 classes, 125 subclasses, all the feats and 339 spells.'],
  ['ui.spell', 'Every number explained', 'Tap any number to see where it comes from. Every roll shows its math, so you learn to play with real dice.'],
  ['ui.feat', 'Advice as you level up', 'Tell it how you want to play; it recommends what to pick at every level, and shows what each level brings.'],
  ['ui.group', 'Play together', 'Make a group, send the invite. The DM sees every sheet live and can mark damage and conditions.'],
  ['ui.dm', 'Yours, everywhere', 'Saved on the server as you play, works with no signal, and signs in on any phone with Face ID.'],
]

export function Landing({ onStart, onSignIn, onClose }) {
  const [shared, setShared] = useState(null)
  return (
    <main className="landing">
      <header className="landing-hero">
        <span className="logo" aria-hidden>🎲</span>
        <h1>Party Sheets</h1>
        <p className="landing-lead">Character sheets for your D&D table, on your phone. 2024 rules, real 3D dice, and a DM screen.</p>
      </header>
      <ul className="landing-points">
        {POINTS.map(([icon, title, text]) => (
          <li key={title}><GameIcon id={icon} size={30} /><span><b>{title}</b><span className="muted">{text}</span></span></li>
        ))}
      </ul>
      <div className="landing-cta">
        <button className="btn primary wide big-btn" onClick={onStart}>Start: build a character</button>
        <button className="btn ghost wide" onClick={onSignIn}>I have an account: sign in</button>
        <button className="btn ghost wide" onClick={async () => setShared(await shareApp())}>{shared === 'copied' ? '✓ Link copied' : '↗ Share Party Sheets'}</button>
        {shared === 'manual' && <input className="input mono" readOnly value={appUrl()} aria-label="Party Sheets link" onFocus={(e) => e.target.select()} />}
        {onClose && <button className="btn ghost wide" onClick={onClose}>Back</button>}
      </div>
      <p className="muted small legal">Free, for our table. Rules from the SRD 5.2 (CC-BY-4.0); not affiliated with Wizards of the Coast.</p>
    </main>
  )
}
