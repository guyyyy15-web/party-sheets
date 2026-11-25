// The character sheet at the table: stats with sources, My Turn, checks, features, gear, notes; rests and level up.
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { derive, rest, spendHitDie } from '../engine/engine.js'
import { CONDITIONS, EXHAUSTION, INSPIRATION } from '../content/conditions.js'
import { ABILITIES, ABILITY_NAMES, ARMOR, WEAPONS, armorById, weaponById, MASTERY } from '../content/basics.js'
import { SourcesSheet, Sheet, Stepper, signed, Num, Breakdown, Legend, themeOf, GameIcon } from './common.jsx'
import { ChoicesStep, Portrait } from './wizard.jsx'
import { LookSheet } from './avatar.jsx'
import { LiveAvatar, TONE_WORD } from './live-avatar.jsx'
import { avatarState } from '../engine/avatar-state.js'
import { SyncBadge } from './rooms.jsx'
import { SpellsTab, FeatSpells } from './spells.jsx'
import { TurnGuide } from './turn.jsx'
import { useFight, FightBanner } from './initiative.jsx'
import { ItemsSection, GiftBanner } from './items.jsx'
import { newTurn, used as usedTurn, allowed, timeKind, concentrationDC, turnStartPatch, endConcentration } from './turnstate.js'
import { buffLabel, applyBuff, cleanBuff, makeBuff } from '../engine/buffs.js'
import { hurtOptions, finalDamage, DAMAGE_TYPES } from '../engine/riders.js'
import { AT_ZERO } from '../content/triggers.js'
import { spellById } from '../content/spells.js'
import { roomById, endBuffs } from './sync.js'
import { LevelSummary, NextLevelLine, lastLevelDiff } from './levelup.jsx'
import { levelDiff } from '../engine/levelup.js'
import { pathsFor } from '../engine/advice.js'
import { TermCard, TermButton, TITLE_TERM } from './glossary.jsx'
import { termById } from '../content/glossary.js'

const KIND = { action: 'Action', bonus: 'Bonus action', reaction: 'Reaction', free: 'Free / on a hit', info: 'Good to know' }
const THEMES = ['gold', 'red', 'jade', 'blue', 'violet', 'rose']

export function CharacterSheet({ ch, setCh, roll, mode, setMode, onBack, onDelete, group, onSaveNow, onGlossary, onPrint }) {
  const d = useMemo(() => derive(ch), [ch])
  const [tab, setTab] = useState('turn')
  const [sources, setSources] = useState(null)
  const [hpOpen, setHpOpen] = useState(false)
  const [levelUp, setLevelUp] = useState(false)
  const [spellPick, setSpellPick] = useState(false)
  const [term, setTerm] = useState(null) // a glossary card
  const [peek, setPeek] = useState(null) // { diff, preview }: the next level, or what the last one gave
  const recent = ch.state.leveledAt && Date.now() - ch.state.leveledAt < 864e5 && ch.level > 1
  const [settings, setSettings] = useState(false)
  const [shortRest, setShortRest] = useState(false)
  const [condOpen, setCondOpen] = useState(false)
  const [lookOpen, setLookOpen] = useState(false)
  // (a buff that raised max HP and ended leaves current HP at the new max)
  const hp = Math.min(ch.state.hp ?? d.hp.value, d.hp.value)
  // every state change goes through here: when concentration ends or changes, the caster's buffs end everywhere
  const setState = (patch) => {
    const was = ch.state.concentration
    const p = was && 'concentration' in patch && (patch.concentration !== was || patch.concAt) ? { ...endConcentration(ch.state, ch.id), ...patch } : patch
    setCh({ ...ch, state: { ...ch.state, ...p } })
  }
  // buffs this character put on others that still have to come off (retried until the server answers)
  const ends = ch.state.concEnds || []
  const latest = useRef(ch)
  latest.current = ch
  useEffect(() => {
    const r = ch.roomId && roomById(ch.roomId)
    if (!ends.length || !r) return
    let live = true
    Promise.all(ends.map((t) => endBuffs(r, ch, t).then(() => t, (e) => (e.status === 404 || e.status === 403 ? t : null)))).then((done) => {
      const cur = latest.current
      if (live && done.some(Boolean)) setCh({ ...cur, state: { ...cur.state, concEnds: (cur.state.concEnds || []).filter((t) => !done.includes(t)) } })
    })
    return () => { live = false }
  }, [ends.join(','), ch.roomId])
  // a fight in the group: the initiative rolled here goes to the Initiative screen by itself
  const fight = useFight(ch)
  // in a group fight, the turn guide opens by itself when this character's turn comes
  const [guideReq, setGuideReq] = useState(0)
  const turnKey = fight.enc && fight.me && fight.enc.turn === fight.me.id ? `${fight.enc.round}:${fight.enc.turn}` : null
  // (only when the turn changes while the sheet is open: opening the sheet mid-turn shows the banner, no pop-up)
  const lastTurn = useRef(undefined)
  useEffect(() => {
    if (!fight.loaded) return // the first answer is "as it was when the sheet opened": no pop-up for that
    const first = lastTurn.current === undefined
    if (lastTurn.current === turnKey) return
    lastTurn.current = turnKey
    if (turnKey && !first) { setState(turnStartPatch(ch.state, d)); setTab('turn'); setGuideReq((n) => n + 1) }
  }, [turnKey, fight.loaded])
  // the tabs stick right under the app bar, whatever its height (a "Save now" makes it taller)
  const barRef = useRef(null)
  useEffect(() => {
    const el = barRef.current
    if (!el || !window.ResizeObserver) return
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--bar-h', `${Math.round(el.getBoundingClientRect().height)}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const rollInit = () => roll({ kind: 'd20', label: 'Initiative', bonus: d.initiative.value, mode, parts: d.initiative.sources, adv: d.initiative.adv, rule: 'initiative' }).then((e) => { if (e && fight.enc) fight.send(e.total) })
  const used = (id) => ch.state.used?.[id] || 0
  const spend = (id, n = 1) => setState({ used: { ...ch.state.used, [id]: Math.max(0, used(id) + n) } })
  const show = (title, x) => setSources({ title, total: x.value, sources: x.sources })
  const theme = themeOf(ch)
  // spell slots live in the Spells tab
  // the tabs sit at the bottom on phones: a new tab starts at its top, not wherever the last one was scrolled to
  const pickTab = (id) => {
    setTab(id)
    requestAnimationFrame(() => {
      const el = document.querySelector('.sheet-main'), bar = barRef.current?.getBoundingClientRect().height || 0
      if (el && el.getBoundingClientRect().top < bar) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - bar - 8 })
    })
  }
  const sideRes = d.resources.filter((r) => !r.hidden && !(d.spellcasting && (/^slot-\d$/.test(r.id) || r.id === 'pact-slots')))

  return (
    <main className={`sheet-page theme-${theme}`}>
      <header className="char-top" ref={barRef}>
        <button className="icon-btn" onClick={onBack} aria-label="All characters">‹</button>
        <Portrait ch={ch} size={44} />
        <div className="grow"><h1>{ch.name}</h1><p className="muted small">{d.species?.name} {d.cls?.name} {ch.level}{d.subclass ? ` · ${d.subclass.name}` : ''}{recent && <> · <button className="linkish" onClick={() => setPeek({ diff: lastLevelDiff(ch), preview: false })}>What's new</button></>}</p><SyncBadge id={ch.id} roomName={group?.name} onSaveNow={onSaveNow} /></div>
        {onGlossary && <button className="icon-btn" onClick={onGlossary} aria-label="Rules glossary">📖</button>}
        <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Character settings">⚙</button>
      </header>

      <div className="sheet-grid">
      <aside className="sheet-side" aria-label="Vitals and resources">
      <HeroStrip ch={ch} d={d} myTurn={!!turnKey} onConc={() => pickTab('spells')} onCond={() => setCondOpen(true)} />
      <section className="vitals">
        <button className="hp" onClick={() => setHpOpen(true)} aria-label="Hit points">
          <span className="lbl">HP</span><b className="mono">{hp}<small>/{d.hp.value}</small></b>{ch.state.temp > 0 && <span className="temp">+{ch.state.temp} temp</span>}
          <span className="hp-bar"><span style={{ width: `${Math.max(0, Math.min(100, (hp / d.hp.value) * 100))}%` }} /></span>
        </button>
        <button className="stat" onClick={() => show('Armor Class', d.ac)} aria-label={`Armor Class ${d.ac.value}: how it's made`}><span className="lbl">AC</span><b>{d.ac.value}</b><span className="tap-hint" aria-hidden>how?</span></button>
        <button className="stat" onClick={() => show('Speed', d.speed)} aria-label={`Speed ${d.speed.value} ft: how it's made`}><span className="lbl">Speed</span><b>{d.speed.value}</b><span className="tap-hint" aria-hidden>ft</span></button>
        <button className="stat" onClick={rollInit} aria-label={`Roll initiative, ${signed(d.initiative.value)}`}><span className="lbl">Init 🎲</span><b>{signed(d.initiative.value)}</b><Breakdown parts={d.initiative.sources} /></button>
        <div className="stat"><span className="lbl">Prof</span><b><Num kind="prof" value={d.prof} /></b></div>
      </section>

      <section className="abil-strip" aria-label="Ability scores">
        {ABILITIES.map((a) => (
          <button key={a} className="abil-mini" onClick={() => show(`${ABILITY_NAMES[a]} score`, { value: d.scores[a].total, sources: d.scores[a].sources })} aria-label={`${ABILITY_NAMES[a]} ${d.scores[a].total}, modifier ${signed(d.mod[a])}`}>
            <small>{a}</small><Num kind="ability" value={d.mod[a]} className="big" /><span className="score">{d.scores[a].total}</span>
          </button>
        ))}
      </section>

      <section className="status-row" aria-label="Inspiration and conditions">
        <button className={`insp ${d.inspiration ? 'on' : ''}`} aria-pressed={d.inspiration} onClick={() => setState({ inspiration: !d.inspiration })} title={INSPIRATION}>
          <span aria-hidden>{d.inspiration ? '★' : '☆'}</span> Inspiration
        </button>
        <button className={`cond-btn ${d.conditions.length || d.exhaustion ? 'on' : ''}`} onClick={() => setCondOpen(true)}>
          {d.conditions.length || d.exhaustion
            ? [...d.conditions.map((id) => CONDITIONS.find((c) => c.id === id)?.name), d.exhaustion ? `Exhaustion ${d.exhaustion}` : null].filter(Boolean).join(', ')
            : 'No conditions'}
        </button>
      </section>
      {d.exhaustion > 0 && <p className="warn-line" role="status">Exhaustion {d.exhaustion}: -{d.d20Pen} on every d20 test and -{d.exhaustion * EXHAUSTION.speedPerLevel} ft speed (already in the numbers below).</p>}

      {sideRes.length > 0 && (
        <section className="resources">
          {sideRes.map((r) => (
            <div key={r.id} className="res">
              <span className="res-name">{r.name}<small>{r.reset === 'short' ? 'short rest' : 'long rest'}</small></span>
              <span className="pips">{Array.from({ length: r.max }).map((_, i) => (
                <button key={i} className={`pip ${i < r.max - used(r.id) ? 'full' : ''}`} aria-label={`${r.name} ${i + 1}`}
                  onClick={() => setState({ used: { ...ch.state.used, [r.id]: i < r.max - used(r.id) ? r.max - i : r.max - i - 1 } })} />
              ))}</span>
            </div>
          ))}
        </section>
      )}

      <FightBanner fight={fight} onRoll={rollInit} bonus={d.initiative.value} />
      <GiftBanner ch={ch} setCh={setCh} />
      <BuffList d={d} ch={ch} setState={setState} />
      {d.pending.length > 0 && <button className="banner" onClick={() => setLevelUp('choices')}>⚠ {d.pending.length} choice{d.pending.length > 1 ? 's' : ''} to make ›</button>}

      {ch.level < 20 && <NextLevelLine ch={ch} onOpen={(diff) => setPeek({ diff, preview: true })} />}
      <section className="rests">
        <button className="btn ghost" onClick={() => setShortRest(true)}>☕ Catch your breath<small>short rest</small></button>
        <button className="btn ghost" onClick={() => { if (confirm('Long rest: HP and every resource back to full?')) setCh({ ...ch, state: rest(ch, 'long') }) }}>🌙 Sleep it off<small>long rest</small></button>
        {ch.level < 20 && <button className="btn primary" onClick={() => setLevelUp('up')}>⬆ Level up!</button>}
      </section>
      <Legend />
      </aside>

      <div className="sheet-main">
      <nav className="tabs" role="tablist">
        {[['turn', 'Turn'], ...(d.spellcasting || d.featSpells.length ? [['spells', 'Spells']] : []), ['checks', 'Checks'], ['features', 'Features'], ['gear', 'Gear'], ['notes', 'Notes']].map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => pickTab(id)}>{l}</button>
        ))}
      </nav>

      <EdgeTracker edge={ch.state.edge || 0} onSet={(edge) => setState({ edge })} />

      {tab === 'turn' && <TurnTab d={d} ch={ch} setCh={setCh} roll={roll} mode={mode} setMode={setMode} used={used} spend={spend} setState={setState} hp={hp} show={show} setTerm={setTerm} onSpells={() => setTab('spells')} fight={fight} guideReq={guideReq} />}
      {tab === 'spells' && d.spellcasting && <SpellsTab key={spellPick ? 'pick' : 'tab'} openPicker={spellPick} onPickerClosed={() => setSpellPick(false)} d={d} ch={ch} setCh={setCh} setState={setState} roll={roll} mode={mode} show={show} fight={fight} hp={hp} />}
      {tab === 'spells' && d.featSpells.length > 0 && <FeatSpells d={d} ch={ch} setState={setState} roll={roll} mode={mode} fight={fight} hp={hp} />}
      {tab === 'checks' && <ChecksTab d={d} roll={roll} mode={mode} show={show} />}
      {tab === 'features' && <FeaturesTab d={d} />}
      {tab === 'gear' && <GearTab d={d} ch={ch} setCh={setCh} onTerm={setTerm} roll={roll} hp={hp} />}
      {tab === 'notes' && <textarea className="input notes" value={ch.notes} placeholder="Backstory, NPCs, loot, plans…" onChange={(e) => setCh({ ...ch, notes: e.target.value })} aria-label="Notes" />}
      </div>
      </div>

      {sources && <SourcesSheet {...sources} onClose={() => setSources(null)}>{TITLE_TERM[sources.title] && termById(TITLE_TERM[sources.title]) && <p className="term-text small">{termById(TITLE_TERM[sources.title]).text} <button className="linkish" onClick={() => { const t = TITLE_TERM[sources.title]; setSources(null); setTerm(t) }}>More</button></p>}</SourcesSheet>}
      {term && <TermCard id={term} ch={ch} onClose={() => setTerm(null)} onOpen={setTerm} onWear={(armor) => setCh({ ...ch, equipment: { ...ch.equipment, armor } })} />}
      {shortRest && <ShortRest ch={ch} setCh={setCh} roll={roll} onClose={() => setShortRest(false)} />}
      {lookOpen && <LookSheet ch={ch} setCh={setCh} onClose={() => setLookOpen(false)} />}
      {condOpen && <ConditionsSheet d={d} ch={ch} setState={setState} onClose={() => setCondOpen(false)} onTerm={(id) => { setCondOpen(false); setTerm(id) }} />}
      {hpOpen && <HpSheet d={d} ch={ch} hp={hp} setState={setState} onClose={() => setHpOpen(false)} roll={roll} />}
      {levelUp && <LevelUp ch={ch} setCh={setCh} start={levelUp} roll={roll} onClose={() => setLevelUp(false)} onSpells={() => { setLevelUp(false); setTab('spells'); setSpellPick(true) }} />}
      {peek && (
        <Sheet title={peek.preview ? `At level ${peek.diff.level}` : `Level ${peek.diff.level}: what's new`} onClose={() => setPeek(null)}>
          <LevelSummary diff={peek.diff} preview={peek.preview} roll={roll} />
          {peek.preview && <button className="btn primary wide" onClick={() => { setPeek(null); setLevelUp('up') }}>⬆ Level up now</button>}
        </Sheet>
      )}
      {settings && (
        <Sheet title="Character" onClose={() => setSettings(false)}>
          <button className="btn ghost wide look-btn" onClick={() => { setSettings(false); setLookOpen(true) }}><Portrait ch={ch} size={40} /> ✎ Your look</button>
          {onPrint && <button className="btn ghost wide" onClick={() => { setSettings(false); onPrint() }}>🖨 Print / PDF sheet</button>}
          <span className="field-label">Color</span>
          <div className="themes">{THEMES.map((t) => <button key={t} className={`swatch theme-${t} ${theme === t ? 'on' : ''}`} aria-label={t} onClick={() => setCh({ ...ch, theme: t })} />)}</div>
          <label className="field"><span>Name</span><input className="input" value={ch.name} onChange={(e) => setCh({ ...ch, name: e.target.value.slice(0, 40) })} /></label>
          {pathsFor(ch.classId).length > 0 && (
            <label className="field"><span>Play style (steers the recommendations)</span>
              <select className="input" value={ch.build || ''} onChange={(e) => setCh({ ...ch, build: e.target.value || null })}>
                <option value="">Not chosen (general advice)</option>
                {pathsFor(ch.classId).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
          )}
          {group && (
            <div className="panel">
              <b>Table: {group.name}</b>
              <p className="muted small">Your DM sees this sheet live.</p>
              <button className="btn ghost wide" onClick={() => { if (confirm(`Take ${ch.name} out of ${group.name}? The character stays on this phone.`)) { setSettings(false); group.onLeave() } }}>Leave the table</button>
            </div>
          )}
          <button className="btn danger wide" onClick={() => { if (confirm(`Delete ${ch.name}? It's deleted from the server too. Export a backup first if you might want it back.`)) onDelete() }}>Delete character</button>
        </Sheet>
      )}
    </main>
  )
}

function TurnTab({ d, ch, setCh, roll, mode, setMode, used, spend, setState, hp, show, setTerm, onSpells, fight, guideReq }) {
  const [openAtk, setOpenAtk] = useState(null) // phones: an attack's math and properties fold away behind ⓘ
  const [guide, setGuide] = useState(false)
  useEffect(() => { if (guideReq) setGuide(true) }, [guideReq])
  const atk = d.attacks
  const pinned = new Set(ch.pinned || [])
  const groups = ['action', 'bonus', 'reaction', 'free', 'info']
  const canPay = (a) => !a.cost || d.resources.find((r) => r.id === a.cost.resource)?.max - used(a.cost.resource) >= a.cost.amount
  const turn = ch.state.turn
  const doAction = (a) => {
    const kind = ['action', 'bonus', 'reaction'].includes(a.kind) ? a.kind : null
    const once = a.perTurn ? { id: a.id, name: a.name } : null
    if (!allowed(turn, { kind, once })) return
    // one update for everything (separate updates would overwrite each other)
    let t = usedTurn(turn, { kind, once, spend: a.cost ? { [a.cost.resource]: a.cost.amount } : null })
    if (a.id === 'action-surge') t = { ...t, action: false } // one more action this turn
    const u = { ...ch.state.used, ...(a.cost ? { [a.cost.resource]: used(a.cost.resource) + a.cost.amount } : {}), ...(a.refill ? { [a.refill]: 0 } : {}) }
    const patch = { turn: t, used: u, ...(a.setHp != null ? { hp: a.setHp } : {}) }
    // a feature that lasts (Rage): a buff on yourself; one that you concentrate on (Hunter's Mark from Favored Enemy)
    if (a.buff) Object.assign(patch, { buffs: applyBuff(ch.state, cleanBuff({ ...a.buff, id: `b${Date.now().toString(36)}`, spell: a.id, from: ch.id, fromName: ch.name, conc: false, at: Date.now() })).buffs })
    if (a.endsConcentration && ch.state.concentration) patch.concentration = null
    if (a.concentration) Object.assign(patch, { concentration: a.concentration, concAt: Date.now() })
    setState(patch)
    if (a.roll) roll({ kind: 'expr', label: `${a.name}: ${a.roll.label}`, expr: a.roll.expr, parts: a.roll.parts, rule: a.roll.why }).then((e) => { if (a.heal && e) setCh({ ...ch, state: { ...ch.state, ...patch, hp: Math.min(d.hp.value, hp + Math.max(a.min || 0, e.total)) } }) })
  }
  return (
    <section className="turn">
      <TurnBar d={d} ch={ch} setState={setState} />
      <button className="btn primary wide big-btn start-turn" onClick={() => { setState(turnStartPatch(ch.state, d)); setGuide(true) }}>⚔ Your turn<small>step by step: move, attack, roll to hit, roll damage</small></button>
      {guide && <TurnGuide d={d} ch={ch} setState={setState} roll={roll} mode={mode} setMode={setMode} bonus={d.actions.filter((a) => a.kind === 'bonus')} canPay={canPay} onUse={doAction} onSpells={() => { setGuide(false); onSpells() }} onClose={() => setGuide(false)} fight={fight}
        takeAction={() => { if (!allowed(ch.state.turn, { kind: 'action' })) return false; setState({ turn: usedTurn(ch.state.turn, { kind: 'action' }) }); return true }} />}
      <h2 className="sec">Attacks <span className="muted small">{d.attacksPerAction} per Attack action{d.crit < 20 ? `, crit on ${d.crit}+` : ''}</span></h2>
      <p className="muted small tap-hint">🎲 Tap a number to roll it: first <b>to hit</b> (d20), then <b>damage</b> if it hits.</p>
      {atk.map((a) => (
        <div key={a.id} className={`attack ${openAtk === a.id ? 'open' : ''}`}>
          <GameIcon id={`w.${a.icon || a.id}`} size={34} className="atk-icon" />
          <div className="grow">
            <span className="atk-head"><b>{a.name}</b><span className="atk-short muted small">{a.type}{a.range ? ` · ${a.range} ft` : ''}{a.mastery ? ` · ${a.mastery.name}` : ''}</span>
              <button className="icon-btn info-btn" aria-expanded={openAtk === a.id} aria-label={`${a.name}: how it's made`} onClick={() => setOpenAtk(openAtk === a.id ? null : a.id)}>ⓘ</button></span>
            <span className="atk-math"><span className="am-line"><span className="am-lbl">To hit</span><span className="num k-dice">d20</span><Breakdown parts={a.toHitSources} label="To hit" /></span>
              <span className="am-line"><span className="am-lbl">Damage</span><span className="num k-dice">{a.damageDie || a.damage.split(/[+-]/)[0]}</span><Breakdown parts={a.damageParts} label="Damage" /></span></span>
            <span className="muted small atk-props">{a.type}{a.range ? `, ${a.range} ft` : ''}{(a.props || []).map((p) => { const id = p.split(' ')[0]; return <React.Fragment key={p}>, {termById(id) ? <button className="linkish term-word" onClick={() => setTerm(id)}>{p}</button> : p}</React.Fragment> })}{a.note ? `. ${a.note}` : ''}</span>
            {a.mastery && <details className="mastery atk-mastery"><summary>Mastery: {a.mastery.name}</summary>{a.mastery.text} {termById(a.mastery.name.toLowerCase()) && <button className="linkish" onClick={() => setTerm(a.mastery.name.toLowerCase())}>More</button>}</details>}
          </div>
          <div className="roll-row">
          <button className="roll-btn" aria-label={`${a.name}: roll to hit, ${signed(a.toHit)}`} onClick={() => roll({ kind: 'd20', label: `${a.name} to hit`, bonus: a.toHit, mode, attack: true, critOn: d.crit, parts: a.toHitSources, dice: a.toHitDice, rule: 'attack' })}>{signed(a.toHit)}<small>to hit</small></button>
          <button className="roll-btn" aria-label={`${a.name}: roll damage, ${a.damage}`} onClick={() => roll({ kind: 'expr', label: `${a.name} damage`, expr: a.damage, parts: a.damageParts, dieWhy: a.dieWhy, dieWhys: a.dieWhys, rule: 'damage' })}>{a.damage}<small>damage</small></button>
          <button className="roll-btn ghost" onClick={() => roll({ kind: 'expr', label: `${a.name} damage`, expr: a.damage, crit: true, parts: a.damageParts, dieWhy: a.dieWhy, dieWhys: a.dieWhys, rule: 'damage' })} aria-label={`${a.name} critical damage`}>×2<small>crit</small></button>
          </div>
        </div>
      ))}
      {groups.map((g) => {
        const list = d.actions.filter((a) => a.kind === g && a.id !== 'attack').sort((a, b) => (pinned.has(b.id) ? 1 : 0) - (pinned.has(a.id) ? 1 : 0))
        if (!list.length) return null
        return (
          <div key={g}>
            <h2 className="sec">{KIND[g]}</h2>
            {list.map((a) => (
              <div key={a.id} className={`action ${canPay(a) ? '' : 'spent'}`}>
                <div className="grow">
                  <b>{a.name}</b>{a.cost && <span className="cost">{a.cost.amount} {d.resources.find((r) => r.id === a.cost.resource)?.name || a.cost.resource}</span>}
                  <span className="muted small">{a.summary}{a.save ? ` ${a.save.ability ? `${a.save.ability} save ` : ''}DC ${a.save.dc}.` : ''}</span>
                </div>
                {(a.roll || a.cost) && <button className="roll-btn" disabled={!canPay(a)} onClick={() => doAction(a)} aria-label={`${a.name}: ${a.roll ? `roll ${a.roll.expr}` : 'use'}${a.cost ? `, costs ${a.cost.amount}` : ''}`}>{a.roll ? a.roll.expr : 'Use'}<small>{a.roll ? a.roll.label : 'spend'}</small></button>}
              </div>
            ))}
          </div>
        )
      })}
    </section>
  )
}

function ChecksTab({ d, roll, mode, show }) {
  return (
    <section>
      <h2 className="sec">Abilities and saves</h2>
      <div className="abil-cards">
        {ABILITIES.map((a) => (
          <div key={a} className="abil-card">
            <button className="ab-top" onClick={() => show(`${ABILITY_NAMES[a]} score`, { value: d.scores[a].total, sources: d.scores[a].sources })} aria-label={`${ABILITY_NAMES[a]} score ${d.scores[a].total}: how it's made`}><small>{ABILITY_NAMES[a]}</small><b>{d.scores[a].total}</b><Num kind="ability" value={d.mod[a]} /></button>
            <button className="ab-roll" onClick={() => roll({ kind: 'd20', label: `${ABILITY_NAMES[a]} check`, bonus: d.checks[a], mode, parts: d.checkParts[a], adv: d.checkAdv[a], rule: 'check' })} aria-label={`${ABILITY_NAMES[a]} check, ${signed(d.checks[a])}`}><span>Check</span><b>{signed(d.checks[a])}</b></button>
            <button className={`ab-roll ${d.saves[a].prof ? 'prof' : ''}`} onClick={() => roll({ kind: 'd20', label: `${a} save`, bonus: d.saves[a].value, mode, parts: d.saves[a].parts, dice: d.saves[a].dice, adv: d.saves[a].adv, rule: 'save' })} aria-label={`${a} saving throw, ${signed(d.saves[a].value)}${d.saves[a].prof ? ', proficient' : ''}`}><span>Save{d.saves[a].prof ? ' ●' : ''}</span><b>{signed(d.saves[a].value)}</b><Breakdown parts={d.saves[a].parts} label="Save" /></button>
          </div>
        ))}
      </div>
      <h2 className="sec">Skills <span className="muted small">Passive Perception {d.passivePerception}</span></h2>
      <ul className="skills">
        {d.skills.map((s) => (
          <li key={s.id}><button onClick={() => roll({ kind: 'd20', label: s.name, bonus: s.value, mode, parts: s.parts, adv: d.checkAdv[s.ability], rule: 'skill' })}>
            <span className={`dot ${s.expertise ? 'ex' : s.prof ? 'pr' : ''}`} aria-label={s.expertise ? 'expertise' : s.prof ? 'proficient' : ''} />
            <span className="grow">{s.name} <small className="muted">{s.ability}</small></span><Breakdown parts={s.parts} label={s.name} /><b className="mono sk-total">{signed(s.value)}</b>
          </button></li>
        ))}
      </ul>
      {(d.senses.length > 0 || d.resistances.length > 0 || d.immunities.length > 0) && <p className="muted small">{[d.senses.map((s) => `${s.name} ${s.range} ft`).join(', '), d.resistances.length ? `Resistant to ${d.resistances.join(', ')}` : '', d.immunities.length ? `Immune to ${d.immunities.join(', ')}` : ''].filter(Boolean).join('. ')}.</p>}
    </section>
  )
}

function FeaturesTab({ d }) {
  const by = (src) => d.features.filter((f) => f.source === src)
  const block = (title, list) => list.length > 0 && (
    <><h2 className="sec">{title}</h2>{list.map((f) => <details key={f.key} className="feature"><summary><b>{f.name}</b>{f.level > 1 ? <span className="muted small"> level {f.level}</span> : null}</summary><p>{f.summary}</p></details>)}</>
  )
  return (
    <section>
      {block(d.cls?.name || 'Class', by('class').filter((f) => !f.id.startsWith('asi')))}
      {block(d.subclass?.name || 'Subclass', by('subclass'))}
      {block(d.species?.name || 'Species', by('species'))}
      {block('Feats', [...by('background'), ...by('feat')])}
      
    </section>
  )
}

function GearTab({ d, ch, setCh, onTerm, roll, hp }) {
  const eq = ch.equipment
  const setEq = (patch) => setCh({ ...ch, equipment: { ...eq, ...patch } })
  const [adding, setAdding] = useState(false)
  return (
    <section>
      <ItemsSection ch={ch} setCh={setCh} d={d} roll={roll} hp={hp} />
      <h2 className="sec">Armor</h2>
      <div className="gear-grid" role="radiogroup" aria-label="Armor">
        {[{ id: '', name: 'No armor', type: 'unarmored', base: null }, ...ARMOR].map((a) => {
          const on = (eq.armor || '') === a.id
          return (
            <div key={a.id || 'none'} className="gear-cell">{a.id && <TermButton id={a.id} label={a.name} onOpen={onTerm} />}<button role="radio" aria-checked={on} className={`gear-card ${on ? 'on' : ''}`} onClick={() => setEq({ armor: a.id || null })}>
              <GameIcon id={a.id ? `a.${a.id}` : 'a.none'} size={36} />
              <b>{a.name}</b><span className="muted small">{a.base != null ? `${a.type}, AC ${a.base}${a.dex === false || a.type === 'heavy' ? '' : a.type === 'medium' ? ' + DEX (max 2)' : ' + DEX'}` : '10 + DEX'}</span>
            </button></div>
          )
        })}
      </div>
      <label className="row toggle"><input type="checkbox" checked={!!eq.shield} onChange={(e) => setEq({ shield: e.target.checked })} /><span>Shield (+2 AC)</span></label>
      {armorById(eq.armor) && d.cls && !d.cls.armor.includes(armorById(eq.armor).type) && <p className="warn-line">Not proficient with {armorById(eq.armor).type} armor: disadvantage on STR and DEX rolls, no spells.</p>}
      <h2 className="sec">Weapons</h2>
      <ul className="gear">
        {(eq.weapons || []).map((id, i) => <li key={`${id}${i}`}><GameIcon id={`w.${id}`} size={30} /><span className="grow">{weaponById(id)?.name}<span className="muted small"> · {weaponById(id)?.dmg} {weaponById(id)?.type}</span></span><button className="icon-btn" aria-label={`Remove ${weaponById(id)?.name}`} onClick={() => setEq({ weapons: eq.weapons.filter((_, j) => j !== i) })}>✕</button></li>)}
      </ul>
      <button className="btn ghost" onClick={() => setAdding(true)}>+ Add a weapon</button>
      {adding && <WeaponPicker cls={d.cls} onPick={(id) => { setEq({ weapons: [...(eq.weapons || []), id] }); setAdding(false) }} onClose={() => setAdding(false)} />}
      <h2 className="sec">Gold and items</h2>
      <div className="row"><span className="grow">Gold pieces</span><Stepper value={eq.gp || 0} min={0} label="Gold" onChange={(gp) => setEq({ gp })} /></div>
      <textarea className="input" value={eq.items || ''} onChange={(e) => setEq({ items: e.target.value })} placeholder="Rope, rations, a mysterious key…" />
    </section>
  )
}

export function HpSheet({ d, ch, hp, setState, onClose, roll }) {
  const [n, setN] = useState('')
  const [type, setType] = useState('') // damage type: resistance, vulnerability, immunity
  const [attack, setAttack] = useState(true) // from an attack (reactions, Heavy Armor Master) or not (a spell's save…)
  const [react, setReact] = useState({}) // reactions used against this hit: { halve, reduce: [{label,value}], missed, id }
  const [ask, setAsk] = useState(null) // a +AC reaction: "does it miss now?"
  const [zero, setZero] = useState(null) // the hit took you to 0: features that step in
  const v = parseInt(n, 10) || 0
  const t = ch.state.turn || {}
  const opts = hurtOptions(d, ch.state).filter((o) => (!o.types || !type || o.types.includes(type)))
  const fin = react.missed ? { total: 0, steps: [`${react.missedBy}: the attack misses`] }
    : finalDamage(v, { type: type || null, resistances: d.resistances, vulnerabilities: d.vulnerabilities, immunities: d.immunities, halve: !!react.halve, reduce: react.reduce || [], reductions: d.reductions, attack })
  const atZero = d.actions.filter((a) => AT_ZERO.includes(a.id) && (!a.needsBuff || (ch.state.buffs || []).some((b) => b.spell === a.needsBuff)) && (!a.cost || d.resources.find((r) => r.id === a.cost.resource)?.max - (ch.state.used?.[a.cost.resource] || 0) >= a.cost.amount))
  // the reaction itself: your reaction for the round, and its cost (a slot for Shield, a die for Parry…)
  const useReaction = (o, extra = {}) => {
    // (the one-slot-a-turn rule is about your own turn: Shield on an enemy's turn doesn't count against it)
    if (!allowed(t, { kind: 'reaction' })) return null
    const used = { ...ch.state.used }
    if (o.cost) used[o.cost.resource] = (used[o.cost.resource] || 0) + o.cost.amount
    if (o.spell && o.slot) used[o.slot.id] = (used[o.slot.id] || 0) + 1
    return { turn: usedTurn(t, { kind: 'reaction', spend: o.cost ? { [o.cost.resource]: o.cost.amount } : o.slot ? { [o.slot.id]: 1 } : null }), used, ...extra }
  }
  const pick = async (o) => {
    if (o.effect === 'halve') { const p = useReaction(o); if (p) { setState(p); setReact({ ...react, halve: o.name, id: o.id }) } return }
    if (o.effect === 'reduce') {
      const p = useReaction(o); if (!p) return
      setState(p)
      const e = o.roll && await roll({ kind: 'expr', label: `${o.name}: ${o.roll.label || 'reduce by'}`, expr: o.roll.expr, parts: o.roll.parts, rule: o.roll.why })
      if (e) setReact({ ...react, reduce: [...(react.reduce || []), { label: o.name, value: e.total }], id: o.id })
      return
    }
    if (o.effect === 'ac') setAsk(o)
  }
  const acReaction = (o, misses) => {
    // Shield (+5) and Parry (+PB) last until your next turn: a buff; Arcane Deflection only against this attack
    const lasting = o.id === 'spell:shield' ? makeBuff(spellById('shield'), { caster: { id: ch.id, name: ch.name, mod: 0 } })
      : o.id === 'parry' ? cleanBuff({ id: `b${Date.now().toString(36)}`, spell: 'parry', name: 'Parry', from: ch.id, fromName: ch.name, effects: [{ on: 'ac', value: o.value }], until: 'turn', at: Date.now() }) : null
    const p = useReaction(o, lasting ? { buffs: applyBuff(ch.state, lasting).buffs } : {})
    setAsk(null)
    if (!p) return
    setState(p)
    setReact(misses ? { missed: true, missedBy: `${o.name} (AC ${d.ac.value} → ${d.ac.value + o.value})`, id: o.id } : { ...react, id: o.id })
  }
  const damage = async () => {
    const amount = fin.total
    let left = amount, temp = ch.state.temp || 0; const fromTemp = Math.min(temp, left); temp -= fromTemp; left -= fromTemp
    const patch = { temp, hp: Math.max(0, hp - left) }
    if (patch.hp === 0 && hp > 0 && atZero.length && amount > 0) { setZero({ patch }); return }
    await finish(patch, amount)
  }
  const finish = async (patch, amount) => {
    const conc = ch.state.concentration
    if (conc && amount > 0) {
      // Concentration: any damage → CON save, DC 10 or half the damage (higher), at most 30; at 0 HP it simply ends
      const dc = concentrationDC(amount)
      if (patch.hp === 0) patch.concentration = null
      else if (roll) {
        onClose()
        const e = await roll({ kind: 'd20', label: `Concentration: CON save, DC ${dc}`, bonus: d.saves.CON.value, parts: d.saves.CON.parts, dice: d.saves.CON.dice, adv: d.saves.CON.adv, rule: `Took ${amount} damage while concentrating: CON save against DC ${dc} (10, or half the damage if higher). Fail and the spell ends.` })
        if (e && e.total < dc) patch.concentration = null
        setState(patch); return
      }
    }
    setState(patch); onClose()
  }
  const saveMe = async (a) => {
    // a feature that keeps you up at 0 HP (Relentless Endurance: 1 HP)
    const patch = { ...zero.patch, used: { ...ch.state.used, ...(a.cost ? { [a.cost.resource]: (ch.state.used?.[a.cost.resource] || 0) + a.cost.amount } : {}) } }
    if (a.save) {
      const e = await roll({ kind: 'd20', label: `${a.name}: ${a.save.ability} save, DC ${a.save.dc}`, bonus: d.saves[a.save.ability].value, parts: d.saves[a.save.ability].parts, dice: d.saves[a.save.ability].dice, adv: d.saves[a.save.ability].adv, rule: 'save' })
      if (!e) return
      if (e.total < a.save.dc) { setZero(null); return finish(patch, fin.total) }
    }
    if (a.setHp != null) patch.hp = a.setHp
    setZero(null)
    return finish(patch, fin.total)
  }
  if (zero) {
    return (
      <Sheet title="Down to 0 HP" onClose={() => finish(zero.patch, fin.total)}>
        <p className="warn-line">That hit takes you to 0 HP. Something can stop it:</p>
        <div className="guide-options">
          {atZero.map((a) => <button key={a.id} className="guide-opt" onClick={() => saveMe(a)}><span><b>{a.name}</b><small>{a.summary}{a.cost ? ` · costs ${a.cost.amount}` : ''}</small></span></button>)}
        </div>
        <button className="btn ghost wide" onClick={() => finish(zero.patch, fin.total)}>No: I drop to 0</button>
      </Sheet>
    )
  }
  return (
    <Sheet title={`Hit points: ${hp} / ${d.hp.value}`} onClose={onClose}>
      <input className="input big" inputMode="numeric" value={n} onChange={(e) => { setN(e.target.value.replace(/\D/g, '').slice(0, 3)); setReact({}) }} placeholder="Amount" autoFocus aria-label="Amount" />
      {v > 0 && (
        <div className="hurt">
          <label className="field"><span>Damage type</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Damage type">
              <option value="">Not sure / doesn't matter</option>
              {DAMAGE_TYPES.map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}{d.immunities.includes(x) ? ' (immune)' : d.resistances.includes(x) ? ' (you resist)' : d.vulnerabilities.includes(x) ? ' (vulnerable)' : ''}</option>)}
            </select>
          </label>
          {(opts.length > 0 || d.reductions.length > 0) && (
            <label className="row toggle small"><input type="checkbox" checked={attack} onChange={(e) => setAttack(e.target.checked)} /><span>From an attack that hit me</span></label>
          )}
          {attack && opts.length > 0 && !react.missed && (
            <div className="react-opts" role="group" aria-label="Reactions">
              <p className="small muted">You were hit. Use your reaction?{t.reaction ? ' (already used this round)' : ''}</p>
              {opts.map((o) => (
                <button key={o.id} className={`btn small ${react.id === o.id ? 'ok' : 'ghost'}`} disabled={!o.canPay || !!react.id} onClick={() => pick(o)}>
                  {o.name}{o.effect === 'halve' ? ': half' : o.effect === 'ac' ? `: +${o.value} AC` : o.roll ? `: −${o.roll.expr}` : ''}{o.melee ? ' (melee)' : ''}
                </button>
              ))}
            </div>
          )}
          {ask && (
            <div className="panel small" role="alertdialog" aria-label={`${ask.name}: does it miss?`}>
              <p><b>{ask.name}</b>: your AC becomes <b>{d.ac.value + ask.value}</b> against this attack. Does it miss now?</p>
              <div className="row"><button className="btn primary grow" onClick={() => acReaction(ask, true)}>It misses</button><button className="btn ghost grow" onClick={() => acReaction(ask, false)}>Still hits</button></div>
              <button className="btn ghost wide small" onClick={() => setAsk(null)}>Don't use it</button>
            </div>
          )}
          <p className={`dmg-final ${fin.total !== v ? 'changed' : ''}`} role="status">You take <b className="mono">{fin.total}</b>{fin.steps.length ? <small>{fin.steps.join(' · ')}</small> : null}</p>
        </div>
      )}
      <div className="row">
        <button className="btn danger grow" disabled={!v} onClick={damage}>Damage{v && fin.total !== v ? ` ${fin.total}` : ''}</button>
        <button className="btn ok grow" disabled={!v} onClick={() => { setState({ hp: Math.min(d.hp.value, hp + v) }); onClose() }}>Heal</button>
        <button className="btn ghost grow" disabled={!v} onClick={() => { setState({ temp: Math.max(ch.state.temp || 0, v) }); onClose() }}>Temp HP</button>
      </div>
      {(d.resistances.length > 0 || d.immunities.length > 0) && <p className="muted small">You resist: {d.resistances.join(', ') || 'nothing'}{d.immunities.length ? ` · immune: ${d.immunities.join(', ')}` : ''}</p>}
      {ch.state.concentration && <p className="warn-line">Concentrating: taking damage means a CON save (DC 10 or half the damage, whichever is higher) or the spell ends.</p>}
      {hp === 0 && (
        <div className="panel"><h2>Death saves</h2>
          <div className="row"><span className="grow">Successes</span><Stepper value={ch.state.deathSaves?.ok || 0} min={0} max={3} label="Successes" onChange={(ok) => setState({ deathSaves: { ...ch.state.deathSaves, ok } })} /></div>
          <div className="row"><span className="grow">Failures</span><Stepper value={ch.state.deathSaves?.fail || 0} min={0} max={3} label="Failures" onChange={(fail) => setState({ deathSaves: { ...ch.state.deathSaves, fail } })} /></div>
        </div>
      )}
      <ul className="sources">{d.hp.sources.map((s, i) => <li key={i}><span>{s.label}</span><span className="mono">{s.value}</span></li>)}</ul>
    </Sheet>
  )
}

/** Level up: what you get, hit points (average or a thrown die), then the new choices. */
function LevelUp({ ch, setCh, start, roll, onClose, onSpells }) {
  const [stage, setStage] = useState(start === 'choices' ? 'choices' : 'preview')
  const [next, setNext] = useState(start === 'choices' ? ch : { ...ch, level: ch.level + 1 })
  const before = derive(ch), after = derive(next)
  const gained = after.features.filter((f) => !before.features.some((g) => g.key === f.key))
  const die = after.hitDie
  const avg = Math.floor(die / 2) + 1
  const setHp = (value) => { const n = { ...next, hpRolls: { ...next.hpRolls, [next.level]: value } }; setNext(n); setStage('choices') }
  const [summary, setSummary] = useState(null)
  const finish = () => {
    const d2 = derive(next)
    const gainedHp = d2.hp.value - before.hp.value
    const levelled = start !== 'choices'
    setCh({ ...next, state: { ...next.state, hp: Math.min(d2.hp.value, (ch.state.hp ?? before.hp.value) + Math.max(0, gainedHp)), ...(levelled ? { leveledAt: Date.now() } : {}) } })
    if (!levelled) return onClose()
    setSummary(levelDiff(before, d2, next))
    setStage('summary')
  }
  return (
    <Sheet title={stage === 'summary' ? `Level ${summary.level}!` : start === 'choices' ? 'Choices to make' : `Level ${ch.level} → ${ch.level + 1}`} onClose={onClose}>
      {stage === 'summary' && (
        <>
          <LevelSummary diff={summary} roll={roll} />
          {summary.lines.some((l) => /^(Cantrips known|Prepared spells)$/.test(l.label)) && <button className="btn primary wide" onClick={onSpells}>Choose new spells</button>}
          <button className={`btn wide ${summary.lines.some((l) => /^(Cantrips known|Prepared spells)$/.test(l.label)) ? 'ghost' : 'primary'}`} onClick={onClose}>Done</button>
        </>
      )}
      {stage === 'preview' && (
        <>
          {gained.length ? gained.map((f) => <div key={f.key} className="panel"><b>{f.name}</b><p className="small">{f.summary}</p></div>) : <p className="muted">Better numbers, no new features this level.</p>}
          {after.prof > before.prof && <p className="ok-line">Proficiency bonus {signed(before.prof)} → {signed(after.prof)}</p>}
          <h2 className="sec">Hit points</h2>
          <div className="row">
            <button className="btn ghost grow" onClick={() => setHp(avg)}>Take {avg} (average)</button>
            <button className="btn primary grow" onClick={async () => { const e = await roll({ kind: 'expr', label: `Hit die (d${die})`, expr: `1d${die}` }); if (e) setHp(Math.max(1, e.total)) }}>🎲 Roll d{die}</button>
          </div>
          <p className="muted small">Plus your CON modifier ({signed(after.mod.CON)}).</p>
        </>
      )}
      {stage === 'choices' && (
        <>
          <ChoicesStep ch={next} setCh={setNext} d={after} filter={(c) => !c.done || c.level === next.level} embedded />
          {!after.choices.length && <p className="muted">Nothing to choose.</p>}
          <button className="btn primary wide" disabled={after.pending.length > 0} onClick={finish}>{after.pending.length ? `${after.pending.length} choice${after.pending.length > 1 ? 's' : ''} left` : start === 'choices' ? 'Done' : `Become level ${next.level}`}</button>
        </>
      )}
    </Sheet>
  )
}

/** Short rest: spend Hit Dice one at a time (die + CON each), then finish to get short-rest resources back. */
function ShortRest({ ch, setCh, roll, onClose }) {
  const [log, setLog] = useState([])
  const [cur, setCur] = useState(ch)
  const d = derive(cur)
  const hd = d.resources.find((r) => r.id === 'hit-dice')
  const left = hd ? hd.max - hd.used : 0
  const hp = cur.state.hp ?? d.hp.value
  const spend = async () => {
    const e = await roll({ kind: 'expr', label: `Hit Die (d${d.hitDie})`, expr: `1d${d.hitDie}`, rule: 'hitDie' })
    if (!e) return
    const face = e.total
    const r = spendHitDie(cur, face)
    if (!r) return
    const next = { ...cur, state: r.state }
    setCur(next); setCh(next)
    setLog((l) => [...l, `d${d.hitDie}: ${face} ${signed(d.mod.CON)} CON = +${r.healed} HP`])
  }
  const finish = () => { setCh({ ...cur, state: rest(cur, 'short') }); onClose() }
  return (
    <Sheet title="Short rest" onClose={onClose}>
      <p className="lead small">At least an hour of rest. Spend Hit Dice to heal: each one is the die + your CON modifier ({signed(d.mod.CON)}).</p>
      <div className="row"><span className="grow">Hit points</span><b className="mono">{hp} / {d.hp.value}</b></div>
      <div className="row"><span className="grow">Hit Dice left</span><b className="mono">{left} of {hd?.max || 0} (d{d.hitDie})</b></div>
      <button className="btn primary wide" disabled={!left || hp >= d.hp.value} onClick={spend}>{!left ? 'No Hit Dice left' : hp >= d.hp.value ? 'Already at full HP' : `🎲 Spend a Hit Die (d${d.hitDie})`}</button>
      {log.length > 0 && <ul className="sources" aria-live="polite">{log.map((l, i) => <li key={i}><span>{l}</span></li>)}</ul>}
      <button className="btn ok wide" onClick={finish}>Finish short rest</button>
      <p className="muted small">Finishing gives back what recharges on a short rest{d.resources.filter((r) => r.reset === 'short' || r.short).length ? `: ${d.resources.filter((r) => r.reset === 'short' || r.short).map((r) => r.name).join(', ')}` : ''}. Hit Dice come back on a long rest.</p>
    </Sheet>
  )
}

/** Conditions on or off, and Exhaustion levels. */
export function ConditionsSheet({ d, ch, setState, onClose, onTerm }) {
  const on = new Set(d.conditions)
  const toggle = (id) => setState({ conditions: on.has(id) ? d.conditions.filter((x) => x !== id) : [...d.conditions, id] })
  return (
    <Sheet title="Conditions" onClose={onClose}>
      <div className="row exh">
        <span className="grow"><b>Exhaustion</b><br /><span className="muted small">{EXHAUSTION.summary}</span></span>
        <Stepper value={d.exhaustion} min={0} max={EXHAUSTION.max} label="Exhaustion" onChange={(exhaustion) => setState({ exhaustion })} />
      </div>
      {d.exhaustion >= EXHAUSTION.max && <p className="warn-line" role="alert">Exhaustion level 6: the character dies.</p>}
      <ul className="conds">
        {CONDITIONS.map((c) => (
          <li key={c.id}>
            <label className="cond">
              <input type="checkbox" checked={on.has(c.id)} onChange={() => toggle(c.id)} />
              <GameIcon id={`cond.${c.id}`} size={30} className="cond-icon" />
              <span><b>{c.name}</b><span className="muted small">{c.summary}</span></span>
            </label>
            <TermButton id={c.id} label={c.name} onOpen={onTerm} />
          </li>
        ))}
      </ul>
      <button className="btn ghost wide" disabled={!d.conditions.length} onClick={() => setState({ conditions: [] })}>Clear all conditions</button>
    </Sheet>
  )
}

/** Choose a weapon from cards: picture, damage, properties; the ones you're trained with first. */
export function WeaponPicker({ cls, onPick, onClose }) {
  const [q, setQ] = useState('')
  const trained = (w) => !cls || cls.weapons.some((t) => t === w.cat.split('-')[0] || (t === 'martial-light' && w.cat.startsWith('martial') && w.props.includes('light')) || (t === 'martial-finesse-light' && w.cat.startsWith('martial') && (w.props.includes('finesse') || w.props.includes('light'))))
  const groups = [['simple-melee', 'Simple melee'], ['simple-ranged', 'Simple ranged'], ['martial-melee', 'Martial melee'], ['martial-ranged', 'Martial ranged']]
  const list = WEAPONS.filter((w) => !q || w.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <Sheet title="Add a weapon" onClose={onClose}>
      <input className="input" type="search" placeholder="Search weapons" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search weapons" />
      {groups.map(([cat, label]) => {
        const ws = list.filter((w) => w.cat === cat)
        if (!ws.length) return null
        return (
          <React.Fragment key={cat}>
            <h3 className="sp-level">{label}</h3>
            <div className="gear-grid">
              {ws.map((w) => (
                <button key={w.id} className={`gear-card ${trained(w) ? '' : 'untrained'}`} onClick={() => onPick(w.id)}>
                  <GameIcon id={`w.${w.id}`} size={36} />
                  <b>{w.name}</b>
                  <span className="muted small">{w.dmg} {w.type}{w.range ? ` · ${w.range} ft` : ''}</span>
                  <span className="muted small">{[...w.props, w.mastery && `mastery: ${w.mastery}`].filter(Boolean).join(', ')}</span>
                  {!trained(w) && <span className="warn-line small">Not trained</span>}
                </button>
              ))}
            </div>
          </React.Fragment>
        )
      })}
    </Sheet>
  )
}

/**
 * Advantage tracker: + when something gives you advantage, − for disadvantage (they cancel). While it isn't 0, every
 * d20 roll asks whether it applies (app.jsx), because an advantage usually covers some rolls, not all.
 */
function EdgeTracker({ edge, onSet }) {
  const what = edge > 0 ? 'Advantage' : edge < 0 ? 'Disadvantage' : 'No advantage'
  return (
    <div className={`edge ${edge > 0 ? 'adv' : edge < 0 ? 'dis' : ''}`} role="group" aria-label="Advantage tracker">
      <button className="icon-btn boxed" onClick={() => onSet(edge - 1)} aria-label="Disadvantage: one more (or one less advantage)">−</button>
      <span className="grow edge-text"><b>{what}{edge ? ` (${edge > 0 ? '+' : ''}${edge})` : ''}</b>
        <small>{edge ? 'Your d20 rolls will ask whether it applies.' : 'Something gives you advantage? Tap +. Disadvantage? Tap −.'}</small></span>
      {edge !== 0 && <button className="btn ghost small" onClick={() => onSet(0)}>Clear</button>}
      <button className="icon-btn boxed" onClick={() => onSet(edge + 1)} aria-label="Advantage: one more (or one less disadvantage)">+</button>
    </div>
  )
}

/** This turn at a glance: Action, Bonus action, Reaction, the spell slot (one a turn), movement, and what was spent. */
export function TurnBar({ d, ch, setState }) {
  const t = { ...newTurn(), ...ch.state.turn }
  const set = (patch) => setState({ turn: { ...t, ...patch } })
  const left = Math.max(0, d.speed.value * (t.dash ? 2 : 1) - (t.moved || 0))
  const spent = Object.entries(t.spent || {}).map(([id, n]) => `${n} ${d.resources.find((r) => r.id === id)?.name || id}`)
  const chip = (k, label) => <button key={k} className={`tchip ${t[k] ? 'used' : ''}`} aria-pressed={!!t[k]} onClick={() => set({ [k]: !t[k] })} title={t[k] ? 'Used this turn (tap to undo)' : 'Still free this turn'}>{t[k] ? '✓ ' : ''}{label}</button>
  return (
    <div className="turn-bar" role="group" aria-label="This turn">
      <div className="tchips">
        {chip('action', 'Action')}{chip('bonus', 'Bonus')}{chip('reaction', 'Reaction')}
        {(d.spellcasting || d.featSpells?.length > 0) && chip('slot', 'Spell slot')}
      </div>
      <div className="row tmove">
        <span className="grow small"><b>{left} ft</b> of {d.speed.value * (t.dash ? 2 : 1)} to move{t.dash ? ' (Dash)' : ''}{spent.length ? <span className="muted"> · spent: {spent.join(', ')}</span> : null}</span>
        <button className="icon-btn boxed" aria-label="Moved 5 ft" onClick={() => set({ moved: Math.min(d.speed.value * (t.dash ? 2 : 1), (t.moved || 0) + 5) })} disabled={!left}>−5</button>
        {!t.dash && <button className="btn ghost small" onClick={() => { if (allowed(t, { kind: 'action' })) set({ action: true, dash: true }) }} title="Dash: your action, as much movement again">Dash</button>}
        <button className="btn ghost small" onClick={() => setState(turnStartPatch(ch.state, d))}>New turn</button>
      </div>
    </div>
  )
}

const sgnDice = (x) => (x.startsWith('-') ? `−${x.slice(1)}` : `+${x}`)
/** One effect in a few words: "+2 AC", "+1d4 attacks", "adv. DEX saves". */
export function effectText(e) {
  const who = e.ability ? `${e.ability} ` : ''
  switch (e.on) {
    case 'ac': return `${signed(e.value)} AC`
    case 'acMin': return `AC at least ${e.value}`
    case 'acBase': return `AC ${e.value} + DEX without armor`
    case 'speed': return e.mult ? 'speed ×2' : e.zero ? 'speed 0' : `${signed(e.value)} ft speed`
    case 'hpMax': return `${signed(e.value)} max HP`
    case 'tempHp': return `${e.value} temp HP each turn`
    case 'attack': return `${sgnDice(e.dice)} attack rolls`
    case 'save': return e.adv ? `advantage on ${who}saves` : `${sgnDice(e.dice)} ${who}saves`
    case 'check': return `advantage on ${who}checks`
    case 'damage': return `${e.dice ? sgnDice(e.dice) : signed(e.value)} ${e.str ? 'STR ' : ''}weapon damage`
    case 'resist': return `resist ${e.types.join(', ')}`
    default: return ''
  }
}

/** Spells and features on this character right now (Bless from Mira, Rage…): what they do and how they end. */
function BuffList({ d, ch, setState }) {
  if (!d.buffs.length) return null
  const remove = (b) => {
    // your own concentration spell: ending it ends it everywhere
    if (b.from === ch.id && b.conc && ch.state.concentration === b.spell) return setState({ concentration: null })
    if (b.conc && b.from !== ch.id && !confirm(`${b.name} ends when ${b.fromName || 'its caster'} stops concentrating. Remove it from your sheet anyway?`)) return
    setState({ buffs: (ch.state.buffs || []).filter((x) => x.id !== b.id).concat(b.after ? [{ ...b.after, id: `${b.id}a`, from: b.from, fromName: b.fromName, conc: false, at: b.at }] : []) })
  }
  return (
    <section className="buffs" aria-label="Active spells and effects">
      {d.buffs.map((b) => (
        <div key={b.id} className="buff">
          <span className="grow">
            <b>✦ {buffLabel(b, ch.id)}</b>
            <small>{[b.effects.map(effectText).filter(Boolean).join(', '), b.conc ? (b.from === ch.id ? 'your concentration' : `while ${b.fromName || 'the caster'} concentrates`) : b.until ? 'until your next turn' : null].filter(Boolean).join(' · ')}</small>
            {b.note && (b.effects.length === 0 || /haste|heroism|enlarge|rage/.test(b.spell)) && <small>{b.note}</small>}
          </span>
          <button className="btn ghost small" onClick={() => remove(b)} aria-label={`End ${b.name}`}>End</button>
        </div>
      ))}
    </section>
  )
}

/** The top of the sheet: the living avatar, how hurt the hero is in a word, and what is on them right now. */
function HeroStrip({ ch, d, myTurn, onConc, onCond }) {
  const s = avatarState(d, ch, { myTurn })
  const conc = d.spellcasting?.concentration
  return (
    <section className="hero-strip" aria-label="How your hero is doing">
      <LiveAvatar ch={ch} d={d} size={84} myTurn={myTurn} live />
      <div className="strip-info">
        <span className={`strip-tone ${s.tone}`}>{myTurn ? 'Your turn!' : TONE_WORD[s.tone] || 'Ready for anything'}</span>
        <div className="strip-chips">
          {conc && <button className="strip-chip conc-banner" onClick={onConc}>◎ {conc.name}</button>}
          {s.raging && <span className="strip-chip rage">🔥 Raging</span>}
          {s.conditions.length > 0 && <button className="strip-chip" onClick={onCond}>{s.conditions.join(', ')}</button>}
        </div>
      </div>
    </section>
  )
}
