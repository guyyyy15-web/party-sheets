// The character sheet at the table: stats with sources, My Turn, checks, features, gear, notes; rests and level up.
import React, { useState, useMemo } from 'react'
import { derive, rest, spendHitDie } from '../engine/engine.js'
import { CONDITIONS, EXHAUSTION, INSPIRATION } from '../content/conditions.js'
import { ABILITIES, ABILITY_NAMES, ARMOR, WEAPONS, armorById, weaponById, MASTERY } from '../content/basics.js'
import { SourcesSheet, Sheet, Stepper, signed, Num, Breakdown, Legend, themeOf, GameIcon } from './common.jsx'
import { ChoicesStep, Portrait } from './wizard.jsx'
import { SyncBadge } from './rooms.jsx'
import { SpellsTab } from './spells.jsx'

const KIND = { action: 'Action', bonus: 'Bonus action', reaction: 'Reaction', free: 'Free / on a hit', info: 'Good to know' }
const THEMES = ['gold', 'red', 'jade', 'blue', 'violet', 'rose']

export function CharacterSheet({ ch, setCh, roll, mode, setMode, onBack, onDelete, group }) {
  const d = useMemo(() => derive(ch), [ch])
  const [tab, setTab] = useState('turn')
  const [sources, setSources] = useState(null)
  const [hpOpen, setHpOpen] = useState(false)
  const [levelUp, setLevelUp] = useState(false)
  const [settings, setSettings] = useState(false)
  const [shortRest, setShortRest] = useState(false)
  const [condOpen, setCondOpen] = useState(false)
  const hp = ch.state.hp ?? d.hp.value
  const setState = (patch) => setCh({ ...ch, state: { ...ch.state, ...patch } })
  const used = (id) => ch.state.used?.[id] || 0
  const spend = (id, n = 1) => setState({ used: { ...ch.state.used, [id]: Math.max(0, used(id) + n) } })
  const show = (title, x) => setSources({ title, total: x.value, sources: x.sources })
  const theme = themeOf(ch)
  // spell slots live in the Spells tab
  const sideRes = d.resources.filter((r) => !(d.spellcasting && (/^slot-\d$/.test(r.id) || r.id === 'pact-slots')))

  return (
    <main className={`sheet-page theme-${theme}`}>
      <header className="char-top">
        <button className="icon-btn" onClick={onBack} aria-label="All characters">‹</button>
        <Portrait ch={ch} size={44} />
        <div className="grow"><h1>{ch.name}</h1><p className="muted small">{d.species?.name} {d.cls?.name} {ch.level}{d.subclass ? ` · ${d.subclass.name}` : ''}</p>{group && <SyncBadge id={ch.id} roomName={group.name} />}</div>
        <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Character settings">⚙</button>
      </header>

      <div className="sheet-grid">
      <aside className="sheet-side" aria-label="Vitals and resources">
      <section className="vitals">
        <button className="hp" onClick={() => setHpOpen(true)} aria-label="Hit points">
          <span className="lbl">HP</span><b className="mono">{hp}<small>/{d.hp.value}</small></b>{ch.state.temp > 0 && <span className="temp">+{ch.state.temp} temp</span>}
          <span className="hp-bar"><span style={{ width: `${Math.max(0, Math.min(100, (hp / d.hp.value) * 100))}%` }} /></span>
        </button>
        <button className="stat" onClick={() => show('Armor Class', d.ac)} aria-label={`Armor Class ${d.ac.value}: how it's made`}><span className="lbl">AC</span><b>{d.ac.value}</b><span className="tap-hint" aria-hidden>how?</span></button>
        <button className="stat" onClick={() => show('Speed', d.speed)} aria-label={`Speed ${d.speed.value} ft: how it's made`}><span className="lbl">Speed</span><b>{d.speed.value}</b><span className="tap-hint" aria-hidden>ft</span></button>
        <button className="stat" onClick={() => roll({ kind: 'd20', label: 'Initiative', bonus: d.initiative.value, mode, parts: d.initiative.sources, rule: 'initiative' })} aria-label={`Roll initiative, ${signed(d.initiative.value)}`}><span className="lbl">Init 🎲</span><b>{signed(d.initiative.value)}</b><Breakdown parts={d.initiative.sources} /></button>
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

      {d.spellcasting?.concentration && <button className="banner conc-banner" onClick={() => setTab('spells')}>◎ Concentrating: {d.spellcasting.concentration.name} ›</button>}
      {d.pending.length > 0 && <button className="banner" onClick={() => setLevelUp('choices')}>⚠ {d.pending.length} choice{d.pending.length > 1 ? 's' : ''} to make ›</button>}

      <section className="rests">
        <button className="btn ghost" onClick={() => setShortRest(true)}>☕ Short rest</button>
        <button className="btn ghost" onClick={() => { if (confirm('Long rest: HP and every resource back to full?')) setCh({ ...ch, state: rest(ch, 'long') }) }}>🌙 Long rest</button>
        {ch.level < 20 && <button className="btn primary" onClick={() => setLevelUp('up')}>⬆ Level up</button>}
      </section>
      <Legend />
      </aside>

      <div className="sheet-main">
      <nav className="tabs" role="tablist">
        {[['turn', 'My Turn'], ...(d.spellcasting ? [['spells', 'Spells']] : []), ['checks', 'Checks'], ['features', 'Features'], ['gear', 'Gear'], ['notes', 'Notes']].map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{l}</button>
        ))}
      </nav>

      <div className="seg mode">{[['dis', 'Disadvantage'], ['normal', 'Normal'], ['adv', 'Advantage']].map(([m, l]) => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{l}</button>)}</div>

      {tab === 'turn' && <TurnTab d={d} ch={ch} roll={roll} mode={mode} used={used} spend={spend} setState={setState} hp={hp} show={show} />}
      {tab === 'spells' && d.spellcasting && <SpellsTab d={d} ch={ch} setCh={setCh} setState={setState} roll={roll} mode={mode} show={show} />}
      {tab === 'checks' && <ChecksTab d={d} roll={roll} mode={mode} show={show} />}
      {tab === 'features' && <FeaturesTab d={d} />}
      {tab === 'gear' && <GearTab d={d} ch={ch} setCh={setCh} />}
      {tab === 'notes' && <textarea className="input notes" value={ch.notes} placeholder="Backstory, NPCs, loot, plans…" onChange={(e) => setCh({ ...ch, notes: e.target.value })} aria-label="Notes" />}
      </div>
      </div>

      {sources && <SourcesSheet {...sources} onClose={() => setSources(null)} />}
      {shortRest && <ShortRest ch={ch} setCh={setCh} roll={roll} onClose={() => setShortRest(false)} />}
      {condOpen && <ConditionsSheet d={d} ch={ch} setState={setState} onClose={() => setCondOpen(false)} />}
      {hpOpen && <HpSheet d={d} ch={ch} hp={hp} setState={setState} onClose={() => setHpOpen(false)} />}
      {levelUp && <LevelUp ch={ch} setCh={setCh} start={levelUp} roll={roll} onClose={() => setLevelUp(false)} />}
      {settings && (
        <Sheet title="Character" onClose={() => setSettings(false)}>
          <span className="field-label">Color</span>
          <div className="themes">{THEMES.map((t) => <button key={t} className={`swatch theme-${t} ${theme === t ? 'on' : ''}`} aria-label={t} onClick={() => setCh({ ...ch, theme: t })} />)}</div>
          <label className="field"><span>Name</span><input className="input" value={ch.name} onChange={(e) => setCh({ ...ch, name: e.target.value.slice(0, 40) })} /></label>
          {group && (
            <div className="panel">
              <b>Group: {group.name}</b>
              <p className="muted small">Your DM sees this sheet live and can mark damage, conditions and Inspiration.</p>
              <button className="btn ghost wide" onClick={() => { if (confirm(`Take ${ch.name} out of ${group.name}? The character stays on this phone.`)) { setSettings(false); group.onLeave() } }}>Leave the group</button>
            </div>
          )}
          <button className="btn danger wide" onClick={() => { if (confirm(`Delete ${ch.name}? Export a backup first if you might want it back.`)) onDelete() }}>Delete character</button>
        </Sheet>
      )}
    </main>
  )
}

function TurnTab({ d, ch, roll, mode, used, spend, setState, hp, show }) {
  const atk = d.attacks
  const pinned = new Set(ch.pinned || [])
  const groups = ['action', 'bonus', 'reaction', 'free', 'info']
  const canPay = (a) => !a.cost || d.resources.find((r) => r.id === a.cost.resource)?.max - used(a.cost.resource) >= a.cost.amount
  const doAction = (a) => {
    if (a.cost) spend(a.cost.resource, a.cost.amount)
    if (a.setHp != null) setState({ hp: a.setHp, used: { ...ch.state.used, ...(a.cost ? { [a.cost.resource]: used(a.cost.resource) + a.cost.amount } : {}) } })
    if (a.refill) setState({ used: { ...ch.state.used, [a.refill]: 0, ...(a.cost ? { [a.cost.resource]: used(a.cost.resource) + a.cost.amount } : {}) } })
    if (a.roll) roll({ kind: 'expr', label: `${a.name}: ${a.roll.label}`, expr: a.roll.expr, parts: a.roll.parts, rule: a.roll.why }).then((e) => { if (a.heal && e) setState({ hp: Math.min(d.hp.value, hp + Math.max(a.min || 0, e.total)), ...(a.cost || a.refill ? {} : {}) }) })
  }
  return (
    <section className="turn">
      <h2 className="sec">Attacks <span className="muted small">{d.attacksPerAction} per Attack action{d.crit < 20 ? `, crit on ${d.crit}+` : ''}</span></h2>
      {atk.map((a) => (
        <div key={a.id} className="attack">
          <GameIcon id={`w.${a.id}`} size={34} className="atk-icon" />
          <div className="grow">
            <b>{a.name}</b>
            <span className="atk-math"><span className="am-line"><span className="am-lbl">To hit</span><span className="num k-dice">d20</span><Breakdown parts={a.toHitSources} label="To hit" /></span>
              <span className="am-line"><span className="am-lbl">Damage</span><span className="num k-dice">{a.damageDie || a.damage.split(/[+-]/)[0]}</span><Breakdown parts={a.damageParts} label="Damage" /></span></span>
            <span className="muted small">{a.type}{a.range ? `, ${a.range} ft` : ''}{a.props?.length ? `, ${a.props.join(', ')}` : ''}{a.note ? `. ${a.note}` : ''}</span>
            {a.mastery && <details className="mastery"><summary>Mastery: {a.mastery.name}</summary>{a.mastery.text}</details>}
          </div>
          <button className="roll-btn" aria-label={`${a.name}: roll to hit, ${signed(a.toHit)}`} onClick={() => roll({ kind: 'd20', label: `${a.name} to hit`, bonus: a.toHit, mode, attack: true, critOn: d.crit, parts: a.toHitSources, rule: 'attack' })}>{signed(a.toHit)}<small>to hit</small></button>
          <button className="roll-btn" aria-label={`${a.name}: roll damage, ${a.damage}`} onClick={() => roll({ kind: 'expr', label: `${a.name} damage`, expr: a.damage, parts: a.damageParts, dieWhy: a.dieWhy, rule: 'damage' })}>{a.damage}<small>damage</small></button>
          <button className="roll-btn ghost" onClick={() => roll({ kind: 'expr', label: `${a.name} damage`, expr: a.damage, crit: true, parts: a.damageParts, dieWhy: a.dieWhy, rule: 'damage' })} aria-label={`${a.name} critical damage`}>×2<small>crit</small></button>
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
            <button className="ab-roll" onClick={() => roll({ kind: 'd20', label: `${ABILITY_NAMES[a]} check`, bonus: d.checks[a], mode, parts: d.checkParts[a], rule: 'check' })} aria-label={`${ABILITY_NAMES[a]} check, ${signed(d.checks[a])}`}><span>Check</span><b>{signed(d.checks[a])}</b></button>
            <button className={`ab-roll ${d.saves[a].prof ? 'prof' : ''}`} onClick={() => roll({ kind: 'd20', label: `${a} save`, bonus: d.saves[a].value, mode, parts: d.saves[a].parts, rule: 'save' })} aria-label={`${a} saving throw, ${signed(d.saves[a].value)}${d.saves[a].prof ? ', proficient' : ''}`}><span>Save{d.saves[a].prof ? ' ●' : ''}</span><b>{signed(d.saves[a].value)}</b><Breakdown parts={d.saves[a].parts} label="Save" /></button>
          </div>
        ))}
      </div>
      <h2 className="sec">Skills <span className="muted small">Passive Perception {d.passivePerception}</span></h2>
      <ul className="skills">
        {d.skills.map((s) => (
          <li key={s.id}><button onClick={() => roll({ kind: 'd20', label: s.name, bonus: s.value, mode, parts: s.parts, rule: 'skill' })}>
            <span className={`dot ${s.expertise ? 'ex' : s.prof ? 'pr' : ''}`} aria-label={s.expertise ? 'expertise' : s.prof ? 'proficient' : ''} />
            <span className="grow">{s.name} <small className="muted">{s.ability}</small></span><Breakdown parts={s.parts} label={s.name} /><b className="mono sk-total">{signed(s.value)}</b>
          </button></li>
        ))}
      </ul>
      {(d.senses.length > 0 || d.resistances.length > 0) && <p className="muted small">{d.senses.map((s) => `${s.name} ${s.range} ft`).join(', ')}{d.resistances.length ? `${d.senses.length ? '. ' : ''}Resistant to ${d.resistances.join(', ')}.` : ''}</p>}
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
      <p className="muted small legal">Rules summarised from the SRD 5.2 by Wizards of the Coast, CC-BY-4.0. The book wins.</p>
    </section>
  )
}

function GearTab({ d, ch, setCh }) {
  const eq = ch.equipment
  const setEq = (patch) => setCh({ ...ch, equipment: { ...eq, ...patch } })
  const [adding, setAdding] = useState(false)
  return (
    <section>
      <h2 className="sec">Armor</h2>
      <div className="gear-grid" role="radiogroup" aria-label="Armor">
        {[{ id: '', name: 'No armor', type: 'unarmored', base: null }, ...ARMOR].map((a) => {
          const on = (eq.armor || '') === a.id
          return (
            <button key={a.id || 'none'} role="radio" aria-checked={on} className={`gear-card ${on ? 'on' : ''}`} onClick={() => setEq({ armor: a.id || null })}>
              <GameIcon id={a.id ? `a.${a.id}` : 'a.none'} size={36} />
              <b>{a.name}</b><span className="muted small">{a.base != null ? `${a.type}, AC ${a.base}${a.dex === false || a.type === 'heavy' ? '' : a.type === 'medium' ? ' + DEX (max 2)' : ' + DEX'}` : '10 + DEX'}</span>
            </button>
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

export function HpSheet({ d, ch, hp, setState, onClose }) {
  const [n, setN] = useState('')
  const v = parseInt(n, 10) || 0
  const damage = () => { let left = v, temp = ch.state.temp || 0; const fromTemp = Math.min(temp, left); temp -= fromTemp; left -= fromTemp; setState({ temp, hp: Math.max(0, hp - left) }); onClose() }
  return (
    <Sheet title={`Hit points: ${hp} / ${d.hp.value}`} onClose={onClose}>
      <input className="input big" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Amount" autoFocus aria-label="Amount" />
      <div className="row">
        <button className="btn danger grow" disabled={!v} onClick={damage}>Damage</button>
        <button className="btn ok grow" disabled={!v} onClick={() => { setState({ hp: Math.min(d.hp.value, hp + v) }); onClose() }}>Heal</button>
        <button className="btn ghost grow" disabled={!v} onClick={() => { setState({ temp: Math.max(ch.state.temp || 0, v) }); onClose() }}>Temp HP</button>
      </div>
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
function LevelUp({ ch, setCh, start, roll, onClose }) {
  const [stage, setStage] = useState(start === 'choices' ? 'choices' : 'preview')
  const [next, setNext] = useState(start === 'choices' ? ch : { ...ch, level: ch.level + 1 })
  const before = derive(ch), after = derive(next)
  const gained = after.features.filter((f) => !before.features.some((g) => g.key === f.key))
  const die = after.hitDie
  const avg = Math.floor(die / 2) + 1
  const setHp = (value) => { const n = { ...next, hpRolls: { ...next.hpRolls, [next.level]: value } }; setNext(n); setStage('choices') }
  const finish = () => {
    const d2 = derive(next)
    const gainedHp = d2.hp.value - before.hp.value
    setCh({ ...next, state: { ...next.state, hp: Math.min(d2.hp.value, (ch.state.hp ?? before.hp.value) + Math.max(0, gainedHp)) } })
    onClose()
  }
  return (
    <Sheet title={start === 'choices' ? 'Choices to make' : `Level ${ch.level} → ${ch.level + 1}`} onClose={onClose}>
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
export function ConditionsSheet({ d, ch, setState, onClose }) {
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
          </li>
        ))}
      </ul>
      <button className="btn ghost wide" disabled={!d.conditions.length} onClick={() => setState({ conditions: [] })}>Clear all conditions</button>
    </Sheet>
  )
}

/** Choose a weapon from cards: picture, damage, properties; the ones you're trained with first. */
function WeaponPicker({ cls, onPick, onClose }) {
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
