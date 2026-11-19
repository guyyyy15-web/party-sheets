// Dice for every screen: the tray behind the 🎲 button, and one roll() that throws them on screen (physics) when
// that's on. Same rules as Katsebushi: the faces come from the physics, never a separate random number.
import React from 'react'
import { rollDice, rollD20, rollPool, poolSides, poolLabel, diceNeeded, d20Needed, signed } from '../dice.js'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
export const webglOk = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } }
export const throwDefault = () => !reducedMotion() && webglOk()

let p3d = null
/** three.js + cannon-es are a separate file, loaded the first time dice are thrown. */
export function load3d() {
  if (window.KDice3D) return Promise.resolve(window.KDice3D)
  if (!p3d) p3d = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'dice3d.js'
    s.onload = () => res(window.KDice3D); s.onerror = () => { p3d = null; rej(new Error('dice3d')) }
    document.head.appendChild(s)
  })
  return p3d
}

/** req: {kind:'d20',label,bonus,mode,attack} | {kind:'expr',label,expr,crit} | {kind:'pool',pool,mod} → a log entry. */
export async function performRoll(req, throwOn) {
  const sides = req.kind === 'd20' ? d20Needed(req.mode) : req.kind === 'expr' ? diceNeeded(req.expr, { crit: req.crit }) : poolSides(req.pool)
  let faces = null, D = null
  if (throwOn && sides.length) { try { D = await load3d(); faces = await D.throwDice(sides) } catch { D = null; faces = null } }
  let e
  if (req.kind === 'd20') {
    const r = rollD20(req.bonus, req.mode, Math.random, faces)
    const f = r.faces.length > 1 ? `[${r.faces.join(', ')}] keep ${r.kept}` : `${r.kept}`
    e = { label: req.label, total: r.total, text: `d20 ${f} ${signed(req.bonus)}`, flag: r.nat20 ? 'NAT 20' : r.nat1 ? 'NAT 1' : null, crit: !!req.attack && r.kept >= (req.critOn || 20) }
  } else if (req.kind === 'expr') {
    const r = rollDice(req.expr, { crit: req.crit, faces })
    e = { label: req.crit ? `${req.label} (crit)` : req.label, total: r.total, text: `${r.rolls.map((g) => `d${g.sides}[${g.faces.join(', ')}]`).join(' ')} ${r.bonus ? signed(r.bonus) : ''}`.trim(), flag: req.crit ? 'CRIT' : null }
  } else {
    const r = rollPool(req.pool, req.mod, { faces })
    e = { label: poolLabel(req.pool, req.mod), total: r.total, text: r.text, flag: null }
  }
  if (D) D.showResult({ title: e.label, total: String(e.total), detail: `${e.text}${e.flag ? ` · ${e.flag}` : ''}`, tone: e.flag === 'NAT 1' ? '#c0564d' : '#d9b56a' })
  return { ...e, id: `${Date.now()}${Math.random()}`, at: Date.now() }
}

/** The tray: tap a die to add one, − to take one off, a bonus, Reset, Throw. */
export function DiceTray({ pool, setPool, mod, setMod, throwOn, setThrowOn, last, onThrow, onClose }) {
  const count = Object.values(pool).reduce((a, b) => a + b, 0)
  const add = (s, n) => setPool((p) => { const v = Math.max(0, Math.min(12, (p[s] || 0) + n)); const q = { ...p, [s]: v }; if (!v) delete q[s]; return q })
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Throw dice" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Throw dice</h2>
          <button className="btn ghost small" onClick={() => { setPool({}); setMod(0) }} disabled={!count && !mod} aria-label="Reset all dice and the bonus">↺ Reset</button>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="muted small">Tap a die to add one, − to take one off.</p>
        <div className="dice-grid">
          {[4, 6, 8, 10, 12, 20, 100].map((n) => (
            <div key={n} className="die-cell">
              <button className={`die ${pool[n] ? 'on' : ''}`} onClick={() => add(n, 1)} aria-label={`Add a d${n}`}>d{n}{pool[n] > 0 && <span className="badge">{pool[n]}</span>}</button>
              <button className="die-minus" onClick={() => add(n, -1)} disabled={!pool[n]} aria-label={`Remove a d${n}`}>−</button>
            </div>
          ))}
        </div>
        <div className="row">
          <span className="muted grow">Bonus</span>
          <button className="icon-btn boxed" onClick={() => setMod((m) => m - 1)} aria-label="Bonus down">−</button>
          <span className="mono big-num">{signed(mod)}</span>
          <button className="icon-btn boxed" onClick={() => setMod((m) => m + 1)} aria-label="Bonus up">+</button>
        </div>
        <button className="btn primary wide" disabled={!count} onClick={() => count && onThrow()}>{count ? `Throw ${poolLabel(pool, mod)}` : 'Tap the dice to throw'}</button>
        {last && <div className="row muted small"><span className="grow">Last: {last.label}</span><span className="mono">{last.total}</span></div>}
        <button className={`btn wide ${throwOn ? 'ok' : 'ghost'}`} aria-pressed={throwOn} onClick={() => setThrowOn(!throwOn)}>{throwOn ? '✓ Throw on screen' : 'Throw on screen: off'}</button>
      </div>
    </div>
  )
}
