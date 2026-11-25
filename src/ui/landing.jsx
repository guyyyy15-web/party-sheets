// The first screen a new visitor sees: what Tavern Table is, in a few lines, then Start / Sign in / Share.
// Shown once (until a character exists, or the visitor starts); "About Tavern Table" in Table settings reopens it.
import React, { useState } from 'react'
import { GameIcon } from './common.jsx'
import { AvatarImg } from './avatar.jsx'
import { LiveAvatar } from './live-avatar.jsx'
import { derive, newCharacter } from '../engine/engine.js'
import { rollD20With, rollDice } from '../dice.js'
import { announce } from './fx.js'

export const appUrl = () => location.href.split('#')[0]
/** Share the app's link: the phone's share sheet, else copy. Returns 'shared' | 'copied' | 'manual' | 'cancelled'. */
export async function shareApp() {
  const url = appUrl()
  try { if (navigator.share) { await navigator.share({ title: 'Tavern Table', text: 'D&D character sheets for our table: build a hero in minutes, roll with the math shown, play together with the DM.', url }); return 'shared' } } catch (e) { if (e?.name === 'AbortError') return 'cancelled' }
  try { await navigator.clipboard.writeText(url); return 'copied' } catch { return 'manual' }
}

const POINTS = [
  ['class.fighter', 'Build a hero in minutes', 'Pick a class, species and background. Every 2024 rule is applied: 12 classes, 125 subclasses, all the feats and 339 spells.'],
  ['ui.spell', 'Every number explained', 'Tap any number to see where it comes from. Every roll shows its math, so you learn to play with real dice too.'],
  ['ui.feat', 'Advice as you level up', 'Tell it how you want to play; it recommends what to pick at every level, and shows what each level brings.'],
  ['ui.group', 'Play together', 'Make a table, send the invite. Spells land on your friends\' sheets, the fight order shows everyone, the DM sees it all live.'],
  ['ui.dm', 'Yours, everywhere', 'Saved as you play, works with no signal, signs in on any phone with Face ID, prints to PDF.'],
]
// the screens, from the test runs (node scripts/shots.cjs)
const SHOWS = [
  ['build', 'Your look', 'An avatar for every hero: a face of your own, your class\'s hat, hood or horns, your species\' ears or beard.'],
  ['alive', 'A hero that feels it', 'The ring is your HP. A hit shakes your hero, healing glows, your turn shines gold, and a critical sounds like one.'],
  ['turn', 'Your turn, step by step', 'Move, attack, roll to hit, roll damage. Right after a hit it offers what you can add: Sneak Attack, Divine Smite, Hunter\'s Mark.'],
  ['hit', 'When you are hit', 'Pick the damage type and your resistances halve it. Shield, Uncanny Dodge or Deflect Attacks, right there.'],
  ['friends', 'Spells on your friends', 'Cast Bless on two friends: it shows on their sheets and in their rolls, and ends everywhere when your concentration breaks.'],
  ['fight', 'The fight, together', 'The order of turns with everyone\'s HP, conditions and who is concentrating on what. Enemies with their own icon and color.'],
  ['dm', 'The DM\'s table', 'Every sheet, live. Damage, conditions, inspiration and magic items in a tap.'],
  ['print', 'On paper too', 'Print your sheet or save it as a PDF, in our own design, with the same numbers as the app.'],
]
const PARADE = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard']
const SPECIES = ['dwarf', 'elf', 'human', 'orc', 'human', 'elf', 'aasimar', 'halfling', 'human', 'tiefling', 'tiefling', 'gnome']

export function Landing({ onStart, onSignIn, onClose }) {
  const [shared, setShared] = useState(null)
  return (
    <main className="landing">
      <header className="landing-hero">
        <div className="parade" aria-hidden>{PARADE.map((c, i) => <AvatarImg key={c} ch={{ id: `parade-${c}`, classId: c, speciesId: SPECIES[i] }} size={52} />)}</div>
        <h1>Tavern Table</h1>
        <p className="landing-lead">Your D&D sheet that plays along. 2024 rules, real 3D dice, heroes that react, and a table for the whole party.</p>
        <div className="landing-cta">
          <button className="btn primary wide big-btn" onClick={onStart}>Start: build a hero</button>
          <button className="btn ghost wide" onClick={onSignIn}>I have an account: sign in</button>
        </div>
      </header>
      <TryTurn />
      <ul className="landing-points">
        {POINTS.map(([icon, title, text]) => (
          <li key={title}><GameIcon id={icon} size={30} /><span><b>{title}</b><span className="muted">{text}</span></span></li>
        ))}
      </ul>
      <div className="landing-shows">
        {SHOWS.map(([img, title, text]) => (
          <section key={img} className="show">
            <div className="show-text"><h2>{title}</h2><p className="muted">{text}</p></div>
            <img className="show-shot" src={`landing/${img}.jpg`} alt={`${title}: a screenshot`} loading="lazy" width="390" height="680" />
          </section>
        ))}
      </div>
      <div className="landing-cta">
        <button className="btn primary wide big-btn" onClick={onStart}>Start: build a hero</button>
        <button className="btn ghost wide" onClick={async () => setShared(await shareApp())}>{shared === 'copied' ? '✓ Link copied' : '↗ Share Tavern Table'}</button>
        {shared === 'manual' && <input className="input mono" readOnly value={appUrl()} aria-label="Tavern Table link" onFocus={(e) => e.target.select()} />}
        {onClose && <button className="btn ghost wide" onClick={onClose}>Back</button>}
      </div>
      <p className="muted small legal">Free, for our table. Rules from the SRD 5.2 (CC-BY-4.0); not affiliated with Wizards of the Coast. Avatars: Adventurer by Lisa Wischofsky (DiceBear), CC BY 4.0. Icons: game-icons.net, CC BY 3.0.</p>
    </main>
  )
}

// ── try a turn: a ready rogue against a goblin, with the app's own engine and dice (no account, nothing saved)
const VEX = () => { const c = { ...newCharacter(), id: 'demo-vex', name: 'Vex', classId: 'rogue', level: 5, speciesId: 'halfling', backgroundId: 'criminal', scores: { STR: 8, DEX: 18, CON: 14, INT: 12, WIS: 10, CHA: 13 }, equipment: { weapons: ['rapier'] } }; c.state.hp = derive(c).hp.value; return c }
const GOBLIN_AC = 13, GOBLIN_HP = 30

function TryTurn() {
  const [ch, setCh] = useState(VEX)
  const [step, setStep] = useState('start') // start → hit/miss → damage → sneak → done
  const [log, setLog] = useState([])
  const [gob, setGob] = useState(0) // damage on the goblin
  const d = derive(ch)
  const rapier = d.attacks.find((a) => a.id === 'rapier')
  const say = (line) => setLog((l) => [...l, line])
  const toHit = () => {
    const r = rollD20With(rapier.toHit, 'normal', [])
    const hit = r.kept === 20 || (r.kept !== 1 && r.total >= GOBLIN_AC)
    if (r.kept === 20) announce('crit', 'NAT 20!')
    say(`🎲 d20 ${r.kept} ${rapier.toHit >= 0 ? '+' : ''}${rapier.toHit} = ${r.total} against the goblin's AC ${GOBLIN_AC}: ${hit ? 'a hit!' : 'a miss.'}`)
    setStep(hit ? (r.kept === 20 ? 'crit' : 'hit') : 'miss')
  }
  const damage = () => {
    const r = rollDice(rapier.damage, { crit: step === 'crit' })
    setGob((g) => g + r.total); say(`⚔ ${rapier.damage}${step === 'crit' ? ' (dice doubled)' : ''}: ${r.total} piercing.`); setStep('sneak')
  }
  const sneak = () => { const r = rollDice('3d6', { crit: false }); setGob((g) => g + r.total); say(`🗡 Sneak Attack 3d6: ${r.total} more (once a turn, with a Finesse weapon).`); setStep('done') }
  const hitBack = () => { setCh((c) => ({ ...c, state: { ...c.state, hp: Math.max(0, (c.state.hp ?? d.hp.value) - 7) } })); say('👺 The goblin stabs back: 7 damage. Watch Vex.') }
  const reset = () => { setCh(VEX()); setGob(0); setLog([]); setStep('start') }
  return (
    <section className="try-turn" aria-label="Try a turn">
      <h2>Try a turn</h2>
      <div className="row try-cast">
        <LiveAvatar ch={ch} d={d} size={72} myTurn={step !== 'done' && step !== 'start'} live />
        <span className="grow"><b>Vex</b><span className="muted small">Halfling Rogue 5 · Rapier {rapier.toHit >= 0 ? '+' : ''}{rapier.toHit} · {rapier.damage}</span></span>
        <span className="try-goblin" aria-label={`Goblin: ${gob} damage of ${GOBLIN_HP}`}><span aria-hidden>👺</span><span className="small">{gob >= GOBLIN_HP ? 'down!' : `${gob} dmg`}</span></span>
      </div>
      <ol className="try-log" aria-live="polite">{log.map((l, i) => <li key={i}>{l}</li>)}</ol>
      <div className="row">
        {step === 'start' && <button className="btn primary grow" onClick={toHit}>🎲 Attack the goblin</button>}
        {(step === 'hit' || step === 'crit') && <button className="btn primary grow" onClick={damage}>🎲 Roll damage</button>}
        {step === 'sneak' && <button className="btn primary grow" onClick={sneak}>+ Sneak Attack 3d6</button>}
        {(step === 'miss' || step === 'done') && <button className="btn primary grow" onClick={hitBack}>👺 The goblin's turn</button>}
        {step !== 'start' && <button className="btn ghost" onClick={reset}>Again</button>}
      </div>
      <p className="muted small">The real app throws 3D dice, shows the math of every roll, and sends the damage to the DM.</p>
    </section>
  )
}
