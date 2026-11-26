// "Start my turn": a guided walk through one turn in a fight. Move, pick what you do, roll to hit (d20), ask the DM
// whether it hits, roll damage, attack again if you can, then a bonus action. Every roll goes through the same
// roll() as the rest of the sheet (3D dice, the math shown), so the numbers match the sheet.
import React, { useState } from 'react'
import { Sheet, GameIcon, signed } from './common.jsx'
import { spellRoll, cantripDice } from '../engine/spells.js'
import { hitRiders, smiteExpr, spellDamageParts } from '../engine/riders.js'
import { allowed, used as usedTurn } from './turnstate.js'
import { EnemyPic } from './initiative.jsx'

const OTHER = 'Dash (move again), Dodge, Disengage, Help, Hide, Ready, Search or use an object'

/** What this character can do with its action, as targets the guide can walk through. */
export function turnOptions(d) {
  const out = d.attacks.map((a) => ({
    key: `w:${a.id}`, kind: 'attack', name: a.name, icon: `w.${a.icon || a.id}`, count: d.attacksPerAction, critOn: d.crit,
    toHit: a.toHit, toHitParts: a.toHitSources, toHitDice: a.toHitDice, damage: a.damage, damageParts: a.damageParts, dieWhy: a.dieWhy, dieWhys: a.dieWhys, type: a.type, weapon: a.id !== 'unarmed' ? a.icon || a.id : null, unarmed: a.id === 'unarmed', ability: a.ability, props: a.props, range: a.range,
    sub: `${signed(a.toHit)} to hit · ${a.damage} ${a.type}`,
  }))
  const spells = [
    ...(d.spellcasting?.cantrips || []).map((s) => ({ s, mod: d.spellcasting.mod, ability: d.spellcasting.ability, dc: d.spellcasting.dc.value, atk: d.spellcasting.attack })),
    ...(d.featSpells || []).filter((x) => x.spell.level === 0).map((x) => ({ s: x.spell, mod: x.mod, ability: x.ability, dc: x.dc.value, atk: x.attack })),
  ]
  const seen = new Set()
  for (const { s, mod, ability, dc, atk } of spells) {
    if (seen.has(s.id)) continue
    seen.add(s.id)
    const r0 = spellRoll(s, { level: d.level, castLevel: 0, mod, ability })
    if (!r0 || r0.heal || s.time !== 'Action') continue
    const r = withSpellDamage(r0, spellDamageParts(d, s))
    if (s.attack) out.push({ key: `s:${s.id}`, kind: 'attack', name: s.name, icon: `school.${s.school.toLowerCase()}`, count: s.beams ? cantripDice(d.level) : 1, critOn: 20, toHit: atk.value, toHitParts: atk.parts, toHitDice: atk.dice, damage: r.expr, damageParts: r.parts, dieWhy: r.why, type: r.type, spell: true, sub: `cantrip · ${signed(atk.value)} to hit · ${r.expr} ${r.type}` })
    else if (s.save) out.push({ key: `s:${s.id}`, kind: 'save', name: s.name, icon: `school.${s.school.toLowerCase()}`, count: 1, save: s.save, dc, damage: r.expr, damageParts: r.parts, dieWhy: r.why, type: r.type, spell: true, sub: `cantrip · ${s.save} save DC ${dc} · ${r.expr} ${r.type}` })
  }
  return out
}

/** A spell's roll with the modifiers your features add (Potent Spellcasting…), in the expression and the math. */
export function withSpellDamage(r, extra) {
  if (!r || !extra.length) return r
  const add = extra.reduce((t, p) => t + p.value, 0)
  return { ...r, expr: `${r.expr}${add >= 0 ? '+' : ''}${add}`.replace(/\+-/, '-'), parts: [...(r.parts || []), ...extra] }
}

export function TurnGuide({ d, ch, setState, roll, mode, setMode, bonus, canPay, onUse, onSpells, onClose, fight, takeAction }) {
  const options = turnOptions(d)
  const [t, setT] = useState(null) // what the action is
  const [n, setN] = useState(1) // which attack of the action
  const [phase, setPhase] = useState('pick') // pick → hit → dmg → next → bonus → end
  const [hit, setHit] = useState(null) // the to-hit roll
  const [dmg, setDmg] = useState(null) // the damage roll
  const [crit, setCrit] = useState(false)
  const [busy, setBusy] = useState(false)
  // in a group fight: whom the attack goes to, and what happened to the damage sent
  const inFight = !!(fight?.enc && fight.me)
  const [target, setTarget] = useState(null)
  const [sent, setSent] = useState(null) // { applied } | 'failed' | null
  const targetC = target && fight?.enc?.combatants.find((c) => c.id === target)
  const go = async (fn) => { if (busy) return; setBusy(true); try { await fn() } finally { setBusy(false) } }

  const attackPhase = (o) => (o.kind === 'save' ? 'save' : 'hit')
  const choose = (o) => { if (n === 1 && takeAction && !takeAction()) return; setT(o); setHit(null); setDmg(null); setCrit(false); setSent(null); setPhase(inFight && fight.targets.length && !target ? 'target' : attackPhase(o)) }
  const rollHit = () => go(async () => {
    const e = await roll({ kind: 'd20', label: `${t.name} to hit`, bonus: t.toHit, mode, attack: true, critOn: t.critOn, parts: t.toHitParts, dice: t.toHitDice, rule: t.spell ? 'Spell attack: d20 + your spellcasting modifier + proficiency bonus.' : 'attack' })
    if (e) { setHit(e); setCrit(!!e.crit) }
  })
  const savage = d.actions.find((a) => a.id === 'savage-attacker')
  const canSavage = !!(savage && t?.weapon && !ch?.state?.turn?.once?.['savage-attacker'])
  const [useSavage, setUseSavage] = useState(true)
  const rollDmg = () => go(async () => {
    const req = { kind: 'expr', label: `${t.name} damage`, expr: t.damage, crit, parts: t.damageParts, dieWhy: t.dieWhy, dieWhys: t.dieWhys, rule: 'damage' }
    let e = await roll(req)
    if (e && canSavage && useSavage) {
      // Savage Attacker: the weapon's damage dice twice, keep the better (once per turn)
      const e2 = await roll({ ...req, label: `${t.name} damage (Savage Attacker, 2nd roll)` })
      if (e2 && e2.total > e.total) e = e2
      if (setState) setState({ turn: usedTurn(ch.state.turn, { once: { id: 'savage-attacker', name: 'Savage Attacker' } }) })
    }
    if (e) {
      setDmg(e); setPhase('next'); setSent(null)
      if (inFight && target) { const r = await fight.claim(target, e.total, t.name, crit ? { crit: true } : null); setSent(r || 'failed') }
    }
  })
  const nextAttack = () => { setN(n + 1); setHit(null); setDmg(null); setCrit(false); setSent(null); setPhase(attackPhase(t)) }
  const toBonus = () => setPhase(bonus.length ? 'bonus' : 'end')
  const more = t && n < t.count

  return (
    <Sheet title="Your turn" onClose={onClose}>
      <ol className="turn-steps" aria-label="Steps of your turn">
        {['Action', 'Roll', 'Bonus', 'Done'].map((s, i) => <li key={s} className={['pick', ['target', 'hit', 'save', 'dmg', 'next'], 'bonus', 'end'].findIndex((p) => (Array.isArray(p) ? p.includes(phase) : p === phase)) >= i ? 'on' : ''}>{s}</li>)}
      </ol>

      {phase === 'pick' && (
        <>
          <p className="guide-line">🏃 You can <b>move up to {d.speed.value} ft</b>: before, after or between attacks.</p>
          <h3 className="guide-q">What do you do with your action?</h3>
          <div className="guide-options">
            {options.map((o) => (
              <button key={o.key} className="guide-opt" onClick={() => choose(o)}>
                <GameIcon id={o.icon} size={32} /><span><b>{o.kind === 'save' ? 'Cast' : 'Attack with'} {o.name}</b><small>{o.sub}{o.count > 1 ? ` · ${o.count} attacks` : ''}</small></span>
              </button>
            ))}
            {d.spellcasting && <button className="guide-opt" onClick={onSpells}><GameIcon id="ui.spell" size={32} /><span><b>Cast a spell</b><small>opens your Spells</small></span></button>}
          </div>
          <p className="muted small">Something else? {OTHER}. Then skip to your bonus action.</p>
          <button className="btn ghost wide" onClick={toBonus}>Skip to bonus action</button>
        </>
      )}

      {phase === 'target' && t && (
        <>
          <h3 className="guide-q">Who are you attacking?</h3>
          <div className="guide-options">
            {fight.targets.map((c) => (
              <button key={c.id} className={`guide-opt ${c.kind} ${c.color ? `ec-${c.color}` : ''}`} onClick={() => { setTarget(c.id); setPhase(attackPhase(t)) }}>
                <EnemyPic c={c} size={30} />{!c.monster && c.icon && <span className="e-icon big" aria-hidden>{c.icon}</span>}
                <span><b>{c.name}</b>{c.note ? <small className="e-note">{c.note}</small> : null}<small>{c.kind === 'npc' ? (c.dmg ? `${c.dmg} damage taken` : 'no damage yet') : 'in your party'}{c.conditions?.length ? ` · ${c.conditions.join(', ')}` : ''}</small></span>
              </button>
            ))}
          </div>
          <button className="btn ghost wide" onClick={() => { setTarget(null); setPhase(attackPhase(t)) }}>Someone not on the list</button>
        </>
      )}

      {(phase === 'hit' || phase === 'save' || phase === 'dmg' || phase === 'next') && t && (
        <>
          <h3 className="guide-q">{t.name}{t.count > 1 ? <span className="muted small"> · attack {n} of {t.count}</span> : null}</h3>
          {inFight && fight.targets.length > 0 && <p className="muted small target-line">Target: <b>{targetC?.name || 'not on the list'}</b> · <button className="linkish" onClick={() => setPhase('target')}>change</button></p>}
          {phase === 'hit' && !hit && (
            <>
              <p className="guide-line"><b>1. Roll to hit:</b> d20 {signed(t.toHit)}. The DM compares it with the target's AC.</p>
              <button className="btn primary wide big-btn" disabled={busy} onClick={rollHit}>🎲 Roll to hit ({signed(t.toHit)})</button>
            </>
          )}
          {phase === 'hit' && hit && (
            <>
              <p className="guide-result" role="status"><span className="mono big">{hit.total}</span> to hit{hit.flag ? <b> · {hit.flag}</b> : null}</p>
              {hit.crit ? <><p className="ok-line">Critical hit! It hits, and the damage dice are doubled.</p><button className="btn primary wide big-btn" onClick={() => setPhase('dmg')}>Roll damage ›</button></>
                : hit.flag === 'NAT 1' ? <><p className="warn-line">A natural 1 always misses.</p><button className="btn primary wide" onClick={() => setPhase('next')}>OK ›</button></>
                  : <><p className="guide-line">Tell the DM <b>{hit.total}</b>. Does it hit?</p>
                    <div className="row"><button className="btn primary grow big-btn" onClick={() => setPhase('dmg')}>Hit</button><button className="btn ghost grow big-btn" onClick={() => setPhase('next')}>Miss</button></div></>}
            </>
          )}
          {phase === 'save' && (
            <>
              <p className="guide-line">The target makes a <b>{t.save} save</b> against your <b>DC {t.dc}</b>. Tell the DM, and ask how it went.</p>
              <div className="row"><button className="btn primary grow big-btn" onClick={() => setPhase('dmg')}>It failed</button><button className="btn ghost grow big-btn" onClick={() => setPhase('next')}>It saved</button></div>
              <p className="muted small">A saved cantrip usually does nothing. Check the spell.</p>
            </>
          )}
          {phase === 'dmg' && (
            <>
              <p className="guide-line"><b>2. Roll damage:</b> {t.damage} {t.type}{crit ? ', dice doubled for the critical hit' : ''}.</p>
              {canSavage && <label className="row toggle small"><input type="checkbox" checked={useSavage} onChange={(e) => setUseSavage(e.target.checked)} /><span>Savage Attacker: roll twice, keep the better (once a turn)</span></label>}
              <button className="btn primary wide big-btn" disabled={busy} onClick={rollDmg}>🎲 Roll damage ({t.damage}{crit ? ' ×2 dice' : ''})</button>
            </>
          )}
          {phase === 'next' && (
            <>
              {dmg && <p className="guide-result" role="status"><span className="mono big">{dmg.total}</span> {t.type} damage{targetC ? <> to <b>{targetC.name}</b></> : ''}.{!targetC ? ' Tell the DM.' : ''}</p>}
              {dmg && targetC && <p className={sent === 'failed' ? 'warn-line' : 'ok-line'} role="status">{!sent ? 'Sending…' : sent === 'failed' ? 'Couldn\'t send it: tell the DM.' : sent.applied ? `Added to ${targetC.name}'s damage.` : 'Sent: the DM confirms it.'}</p>}
              {!dmg && <p className="guide-line">No damage this time.</p>}
              {dmg && ch && <HitRiders key={`${n}:${dmg.id}`} d={d} ch={ch} setState={setState} t={t} crit={crit} roll={roll} fight={inFight ? fight : null} target={targetC} />}
              {more && <button className="btn primary wide big-btn" onClick={nextAttack}>Next attack ({n + 1} of {t.count}) ›</button>}
              {more && <button className="btn ghost wide" onClick={() => { setN(n + 1); setPhase('pick') }}>{d.features.some((f) => f.id === 'war-magic') ? 'A different weapon, or a cantrip (War Magic)' : 'Use a different weapon for the next attack'}</button>}
              <button className={`btn wide ${more ? 'ghost' : 'primary'}`} onClick={toBonus}>{bonus.length ? 'Bonus action ›' : 'End my turn ›'}</button>
            </>
          )}
        </>
      )}

      {phase === 'bonus' && (
        <>
          <h3 className="guide-q">A bonus action? <span className="muted small">optional, one per turn</span></h3>
          <div className="guide-options">
            {bonus.map((a) => (
              <button key={a.id} className="guide-opt" disabled={!canPay(a)} onClick={() => { onUse(a); setPhase('end') }}>
                <GameIcon id="ui.feat" size={32} /><span><b>{a.name}</b><small>{a.summary}{a.cost ? ` · costs ${a.cost.amount}` : ''}</small></span>
              </button>
            ))}
          </div>
          <button className="btn ghost wide" onClick={() => setPhase('end')}>No bonus action</button>
        </>
      )}

      {phase === 'end' && (
        <>
          <p className="ok-line" role="status">Your turn is done.</p>
          <p className="guide-line">Until your next turn you still have <b>one reaction</b>, for example an opportunity attack when an enemy leaves your reach.</p>
          <button className="btn primary wide" onClick={onClose}>Close</button>
        </>
      )}
    </Sheet>
  )
}

/**
 * Right after a hit: what you may add to it (src/content/triggers.js). Each pays its cost, takes the bonus action
 * when it is one, locks for the turn when it is once a turn, rolls its damage (doubled on a crit) and sends it to the
 * target like the hit itself.
 */
function HitRiders({ d, ch, setState, t, crit, roll, fight, target }) {
  const riders = hitRiders(d, ch.state, t)
  const [done, setDone] = useState({}) // id → total
  const [vs, setVs] = useState(false)
  if (!riders.length) return null
  const use = async (r, slot) => {
    const kind = r.kind === 'bonus' ? 'bonus' : null
    const isSlot = slot && !slot.free
    const once = r.perTurn ? { id: r.id, name: r.name } : null
    if (!allowed(ch.state.turn, { kind, slot: isSlot, once })) return
    const pay = slot ? { [slot.id]: 1 } : r.cost ? { [r.cost.resource]: r.cost.amount } : null
    const used = { ...ch.state.used }
    for (const [id, n] of Object.entries(pay || {})) used[id] = (used[id] || 0) + n
    const patch = { turn: usedTurn(ch.state.turn, { kind, slot: isSlot, once, spend: pay }), used }
    if (r.spell?.concentration) Object.assign(patch, { concentration: r.spell.id, concAt: Date.now() })
    setState(patch)
    const expr = r.spell ? smiteExpr(r.spell, slot.level, { vs }) : r.expr
    if (!expr || r.noDamageNow) { setDone({ ...done, [r.id]: 'used' }); return }
    const e = await roll({ kind: 'expr', label: `${r.name}${r.type ? `: ${r.type}` : ''}`, expr, crit, parts: r.parts, rule: r.why || (r.spell ? `${r.name}: ${r.spell.damage?.higher || ''}`.trim() : undefined) })
    if (!e) return
    setDone({ ...done, [r.id]: e.total })
    if (fight && target) fight.claim(target.id, e.total, r.name, crit ? { crit: true } : null)
  }
  return (
    <div className="riders" aria-label="On this hit">
      <h4 className="guide-q small">On this hit you can add</h4>
      {riders.map((r) => (
        <div key={r.id} className="rider">
          <b>{r.name}</b>{r.kind === 'bonus' ? <span className="muted small"> · bonus action</span> : null}{r.perTurn ? <span className="muted small"> · once a turn</span> : null}
          <small>{r.ask || r.summary}</small>
          {done[r.id] != null ? <p className="ok-line">✓ {done[r.id] === 'used' ? 'used' : `+${done[r.id]} damage${target ? `, sent for ${target.name}` : ': tell the DM'}`}</p>
            : r.locked ? <p className="muted small">Used this turn.</p>
            : !r.canPay ? <p className="muted small">Nothing left to pay for it.</p>
            : r.spell ? (
              <>
                {r.vs && <label className="row toggle small"><input type="checkbox" checked={vs} onChange={(e) => setVs(e.target.checked)} /><span>The target is a {r.vs.types} (+{r.vs.dice})</span></label>}
                <div className="row">{r.slots.map((sl) => <button key={sl.id} className="btn small ghost" onClick={() => use(r, sl)}>{sl.free ? 'Free use' : `Level ${sl.level} slot`} · {smiteExpr(r.spell, sl.level, { vs }) || 'cast'}</button>)}</div>
              </>
            ) : <div className="row"><button className="btn small ghost" onClick={() => use(r)}>{r.expr ? `Add ${r.expr}${crit && /d/.test(r.expr) ? ' ×2 dice' : ''}` : 'Use it'}{r.cost ? ` · costs ${r.cost.amount}` : ''}</button></div>}
        </div>
      ))}
    </div>
  )
}
