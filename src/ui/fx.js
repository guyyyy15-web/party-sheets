// Sounds and haptics for what happens in the game (on by default, Guy 2026-11-25; Tavern settings turns them off).
// Sounds are synthesized with Web Audio (no files, works offline); haptics use navigator.vibrate where it exists
// (Android; iPhones have no web vibration). Every effect also has a visible sign, so nothing depends on sound.
import { getSetting } from './store.js'

let ctx = null
const audio = () => {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A() }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}
// iOS starts audio only from a tap: the first tap anywhere unlocks it
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => { if (soundsOn()) audio() }, { once: true, capture: true })

export const soundsOn = () => getSetting('table', {}).sounds !== false
const tone = (c, { f = 440, f2 = null, t = 0, d = 0.15, type = 'sine', v = 0.18 }) => {
  const o = c.createOscillator(), g = c.createGain(), at = c.currentTime + t
  o.type = type; o.frequency.setValueAtTime(f, at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + d)
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + d)
  o.connect(g).connect(c.destination); o.start(at); o.stop(at + d + 0.02)
}
// each sound short (≤ 0.6 s) and quiet: a table full of phones
const SOUNDS = {
  hurt: [{ f: 220, f2: 110, d: 0.18, type: 'square', v: 0.08 }],
  down: [{ f: 196, f2: 98, d: 0.35, type: 'sawtooth', v: 0.08 }, { f: 147, f2: 73, t: 0.2, d: 0.4, type: 'sawtooth', v: 0.06 }],
  heal: [{ f: 523, d: 0.12 }, { f: 659, t: 0.1, d: 0.12 }, { f: 784, t: 0.2, d: 0.2 }],
  up: [{ f: 392, d: 0.12 }, { f: 523, t: 0.1, d: 0.25 }],
  turn: [{ f: 587, d: 0.12, type: 'triangle' }, { f: 880, t: 0.12, d: 0.3, type: 'triangle' }],
  crit: [{ f: 523, d: 0.1, type: 'triangle' }, { f: 659, t: 0.08, d: 0.1, type: 'triangle' }, { f: 784, t: 0.16, d: 0.1, type: 'triangle' }, { f: 1047, t: 0.24, d: 0.35, type: 'triangle' }],
  fumble: [{ f: 330, f2: 165, d: 0.4, type: 'triangle', v: 0.1 }],
  'conc-broke': [{ f: 1200, f2: 300, d: 0.3, type: 'triangle', v: 0.08 }],
  level: [{ f: 523, d: 0.14 }, { f: 659, t: 0.14, d: 0.14 }, { f: 784, t: 0.28, d: 0.14 }, { f: 1047, t: 0.42, d: 0.4 }],
}
const BUZZ = { hurt: [40], down: [80, 60, 80], turn: [30, 40, 30], crit: [20, 30, 20, 30, 60], 'conc-broke': [50], level: [30, 30, 30] }

/** Play what happened: a sound (if on) and a short buzz (where phones can). */
export function feel(kind) {
  if (soundsOn()) { const c = audio(); if (c) for (const n of SOUNDS[kind] || []) tone(c, n) }
  if (BUZZ[kind] && navigator.vibrate && soundsOn()) try { navigator.vibrate(BUZZ[kind]) } catch {}
}
/** Effects that start outside the sheet (a critical hit from roll()) reach the avatar through this event. */
export const announce = (kind, text = '') => { window.dispatchEvent(new CustomEvent('tt-fx', { detail: { kind, text } })); feel(kind) }
