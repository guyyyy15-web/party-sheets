// What the avatar shows about the character right now (pure, tests/avatar-state.test.mjs): how hurt they are, the
// spell they concentrate on, Rage, spells on them, conditions, their turn. Every part comes from what the sheet
// already knows (derive(), state.buffs, conditions, the fight): nothing new is stored.
import { spellById } from '../content/spells.js'
import { CONDITIONS } from '../content/conditions.js'

/** HP tone: ok above half, bloodied at half or less, critical at a quarter or less, down at 0. */
export function hpTone(hp, max) {
  if (hp <= 0) return 'down'
  const pct = max > 0 ? hp / max : 1
  return pct <= 0.25 ? 'critical' : pct <= 0.5 ? 'bloodied' : 'ok'
}

export function avatarState(d, ch, { myTurn = false } = {}) {
  const st = ch?.state || {}
  const max = d.hp.value
  const hp = Math.max(0, Math.min(st.hp ?? max, max))
  const buffs = (d.buffs || []).filter((b) => !(b.from === ch.id && b.conc))
  return {
    hp, max, temp: st.temp || 0, pct: max ? hp / max : 1, tone: hpTone(hp, max),
    deathSaves: hp === 0 ? { ok: st.deathSaves?.ok || 0, fail: st.deathSaves?.fail || 0 } : null,
    conc: st.concentration ? { id: st.concentration, name: spellById(st.concentration)?.name || st.concentration } : null,
    raging: buffs.some((b) => b.spell === 'rage'),
    buffs: buffs.filter((b) => b.spell !== 'rage').map((b) => ({ id: b.id, name: b.name, from: b.from === ch.id ? null : b.fromName || null })),
    conditions: [...(st.conditions || []).map((id) => CONDITIONS.find((c) => c.id === id)?.name || id), ...(d.exhaustion ? [`Exhaustion ${d.exhaustion}`] : [])],
    inspiration: !!st.inspiration, myTurn: !!myTurn,
  }
}

/**
 * What just happened, from the last state to this one: the effects to play once ([{ kind, text }]). hurt / heal (with
 * the amount), down, up (back from 0), conc-broke (concentration ended), level (a new level).
 */
export function avatarEvents(prev, next) {
  if (!prev) return []
  const out = []
  const dh = next.hp - prev.hp
  if (next.hp === 0 && prev.hp > 0) out.push({ kind: 'down', text: `−${-dh}` })
  else if (dh < 0) out.push({ kind: 'hurt', text: `−${-dh}` })
  else if (dh > 0) out.push({ kind: prev.hp === 0 ? 'up' : 'heal', text: `+${dh}` })
  if (prev.conc && !next.conc) out.push({ kind: 'conc-broke', text: `${prev.conc.name} ends` })
  if (next.level > prev.level) out.push({ kind: 'level', text: `Level ${next.level}!` })
  if (next.myTurn && !prev.myTurn) out.push({ kind: 'turn', text: 'Your turn!' })
  return out
}
