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

/** The rule behind each kind of roll, said so a player can do it with real dice. */
export const RULES = {
  attack: 'Attack roll: d20 + ability modifier + proficiency bonus (if proficient). You hit if the total is at least the target\'s AC. A natural 20 always hits (critical hit), a natural 1 always misses.',
  damage: 'Damage: roll the weapon\'s die and add the same ability modifier you used to hit.',
  crit: 'Critical hit: roll the damage dice twice and add the modifier once.',
  save: 'Saving throw: d20 + ability modifier + proficiency bonus (only if you are proficient in that save). You succeed if the total is at least the DC.',
  check: 'Ability check: d20 + ability modifier. The DM sets the DC.',
  skill: 'Skill check: d20 + the skill\'s ability modifier + proficiency bonus if proficient (double it with Expertise). The DM sets the DC.',
  initiative: 'Initiative: a DEX check at the start of combat. Highest goes first.',
  hitDie: 'Hit Die on a short rest: roll it and add your CON modifier. You heal at least 1.',
  pool: 'Add up every die, then the bonus.',
  adv: 'Advantage: roll two d20 and keep the higher.',
  dis: 'Disadvantage: roll two d20 and keep the lower.',
}

/** The math of a roll, step by step: [{ text, value }]. */
function stepsFor(req, r) {
  const sgn = (n) => (n >= 0 ? `+${n}` : `${n}`)
  const steps = []
  if (req.kind === 'd20') {
    if (r.faces.length > 1) steps.push({ text: `${req.mode === 'adv' ? 'Advantage' : 'Disadvantage'}: two d20 rolled ${r.faces.join(' and ')}, keep the ${req.mode === 'adv' ? 'higher' : 'lower'}`, value: String(r.kept) })
    else steps.push({ text: 'Roll a d20', value: String(r.kept) })
  } else if (req.kind === 'expr') {
    for (const g of r.rolls) {
      const n = g.faces.length
      steps.push({ text: `${req.crit ? 'Critical: twice the dice, roll' : 'Roll'} ${n}d${g.sides}${req.dieWhy ? ` (${req.dieWhy})` : ''}${n > 1 ? `: ${g.faces.join(' + ')}` : ''}`, value: String(g.faces.reduce((a, b) => a + b, 0)) })
    }
  } else {
    for (const g of r.groups) steps.push({ text: `Roll ${g.faces.length}d${g.sides}${g.faces.length > 1 ? `: ${g.faces.join(' + ')}` : ''}`, value: String(g.faces.reduce((a, b) => a + b, 0)) })
  }
  const bonus = req.kind === 'd20' ? req.bonus : req.kind === 'expr' ? r.bonus : req.mod
  const parts = (req.parts || []).filter((p) => p.value !== 0)
  const partsSum = parts.reduce((t, p) => t + p.value, 0)
  for (const p of parts) steps.push({ text: p.label, value: sgn(p.value) })
  if (bonus - partsSum !== 0) steps.push({ text: parts.length ? 'Other bonus' : 'Bonus', value: sgn(bonus - partsSum) })
  return steps
}

/** req: {kind:'d20',label,bonus,mode,attack,parts,rule} | {kind:'expr',label,expr,crit,parts,rule} | {kind:'pool',pool,mod} → a log entry. */
export async function performRoll(req, throwOn) {
  const sides = req.kind === 'd20' ? d20Needed(req.mode) : req.kind === 'expr' ? diceNeeded(req.expr, { crit: req.crit }) : poolSides(req.pool)
  let faces = null, D = null
  if (throwOn && sides.length) { try { D = await load3d(); faces = await D.throwDice(sides) } catch { D = null; faces = null } }
  let e
  if (req.kind === 'd20') {
    const r = rollD20(req.bonus, req.mode, Math.random, faces)
    const f = r.faces.length > 1 ? `[${r.faces.join(', ')}] keep ${r.kept}` : `${r.kept}`
    e = { label: req.label, total: r.total, text: `d20 ${f} ${signed(req.bonus)}`, flag: r.nat20 ? 'NAT 20' : r.nat1 ? 'NAT 1' : null, crit: !!req.attack && r.kept >= (req.critOn || 20), faces: r.faces, kept: r.kept }
  } else if (req.kind === 'expr') {
    const r = rollDice(req.expr, { crit: req.crit, faces })
    e = { label: req.crit ? `${req.label} (crit)` : req.label, total: r.total, text: `${r.rolls.map((g) => `d${g.sides}[${g.faces.join(', ')}]`).join(' ')} ${r.bonus ? signed(r.bonus) : ''}`.trim(), flag: req.crit ? 'CRIT' : null, raw: r }
  } else {
    const r = rollPool(req.pool, req.mod, { faces })
    e = { label: poolLabel(req.pool, req.mod), total: r.total, text: r.text, flag: null, raw: r }
  }
  // the math, for players learning to do it with real dice
  e.steps = stepsFor(req, req.kind === 'd20' ? { faces: e.faces, kept: e.kept } : e.raw)
  const rules = [req.rule ? RULES[req.rule] || req.rule : null, req.kind === 'd20' && req.mode !== 'normal' ? RULES[req.mode] : null, req.crit ? RULES.crit : null].filter(Boolean)
  if (req.kind === 'pool') rules.push(RULES.pool)
  e.rules = rules
  if (D) D.showResult({ title: e.label, total: String(e.total), detail: `${e.text}${e.flag ? ` · ${e.flag}` : ''}`, tone: e.flag === 'NAT 1' ? '#c0564d' : '#d9b56a', steps: req.showMath === false ? null : e.steps, rules: req.showMath === false ? null : rules })
  return { ...e, raw: undefined, id: `${Date.now()}${Math.random()}`, at: Date.now() }
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

/** The result of an instant roll, with its math, until dismissed or the next roll. */
export function RollCard({ e, onClose }) {
  const ref = React.useRef(null)
  // a tap anywhere else closes the card, and that tap still does what it was for
  React.useEffect(() => {
    const away = (ev) => { if (ref.current && !ref.current.contains(ev.target)) onClose() }
    document.addEventListener('pointerdown', away, true)
    return () => document.removeEventListener('pointerdown', away, true)
  }, [onClose])
  return (
    <div className="roll-card" role="status" aria-live="polite" ref={ref}>
      <div className="rc-head">
        <span className="grow"><small>{e.label}</small><b className={e.flag === 'NAT 1' ? 'bad' : ''}>{e.total}</b>{e.flag && <span className="rc-flag">{e.flag}</span>}</span>
        <button className="icon-btn" onClick={onClose} aria-label="Close the roll">✕</button>
      </div>
      {e.steps?.length > 0 && (
        <ol className="math" aria-label="How it was calculated">
          {e.steps.map((s, i) => <li key={i}><span>{s.text}</span><b className="mono">{s.value}</b></li>)}
          <li className="sum"><span>Total</span><b className="mono">{e.total}</b></li>
        </ol>
      )}
      {e.rules?.map((r, i) => <p key={i} className="rule">{r}</p>)}
    </div>
  )
}
