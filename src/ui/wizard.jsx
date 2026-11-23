// The onboarding wizard: name → class → species → background → abilities → choices → equipment → finish.
// Every step saves a draft, so closing the app halfway keeps the character.
import React, { useState, useMemo } from 'react'
import { derive, readyToPlay } from '../engine/engine.js'
import { CLASSES, classById } from '../content/classes.js'
import { SPECIES, speciesById } from '../content/species.js'
import { BACKGROUNDS, backgroundById } from '../content/backgrounds.js'
import { ABILITIES, ABILITY_NAMES, skillName, armorById, weaponById } from '../content/basics.js'
import { OptionCards, AsiPicker, asiDone, Stepper, signed } from './common.jsx'
import { shrinkImage } from './store.js'
import { load3d } from './dice.jsx'

const STANDARD = [15, 14, 13, 12, 10, 8]
const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }
const STEPS = ['Hero', 'Class', 'Species', 'Background', 'Abilities', 'Choices', 'Gear', 'Ready']
const ICONS = ['⚔️', '🗡️', '🥋', '🛡️', '🏹', '🐉', '🦉', '🌙', '🔥', '🍀', '💀', '👑']

/** Suggested score order for a class (primary first, CON next). */
function suggested(cls) {
  const order = [...(cls?.primary || []), 'CON', ...ABILITIES].filter((a, i, l) => l.indexOf(a) === i)
  return order
}

export function Wizard({ ch, setCh, onDone, onCancel, settings, throwOn }) {
  const [step, setStep] = useState(ch.wizardStep || 0)
  const d = useMemo(() => derive(ch), [ch])
  const go = (n) => { setStep(n); setCh({ ...ch, wizardStep: n }); window.scrollTo(0, 0) }
  const ready = readyToPlay(ch)
  const stepOk = [
    !!ch.name.trim(),
    !!ch.classId,
    !!ch.speciesId && d.choices.filter((c) => c.source === 'species').every((c) => c.done),
    !!ch.backgroundId && !!ch.choices['background.abilities'] && d.choices.filter((c) => c.source === 'background').every((c) => c.done),
    !!ch.scoreMethod,
    d.choices.filter((c) => c.source !== 'species' && c.source !== 'background').every((c) => c.done),
    true,
    ready.ok,
  ]
  return (
    <div className="wizard">
      <header className="wiz-top">
        <button className="icon-btn" onClick={step ? () => go(step - 1) : onCancel} aria-label={step ? 'Back' : 'Cancel'}>‹</button>
        <div className="wiz-progress" role="progressbar" aria-label="Character wizard" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-valuetext={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
          {STEPS.map((s, i) => <span key={s} className={i < step ? 'done' : i === step ? 'on' : ''} />)}
        </div>
        <span className="muted small">{step + 1}/{STEPS.length}</span>
      </header>
      <main className="wiz-body">
        {step === 0 && <HeroStep ch={ch} setCh={setCh} />}
        {step === 1 && <ClassStep ch={ch} setCh={setCh} />}
        {step === 2 && <SpeciesStep ch={ch} setCh={setCh} d={d} />}
        {step === 3 && <BackgroundStep ch={ch} setCh={setCh} d={d} />}
        {step === 4 && <AbilityStep ch={ch} setCh={setCh} d={d} settings={settings} throwOn={throwOn} />}
        {step === 5 && <ChoicesStep ch={ch} setCh={setCh} d={d} filter={(c) => c.source !== 'species' && c.source !== 'background'} />}
        {step === 6 && <GearStep ch={ch} setCh={setCh} d={d} />}
        {step === 7 && <ReadyStep ch={ch} d={d} ready={ready} go={go} />}
      </main>
      <footer className="wiz-foot">
        {step < STEPS.length - 1
          ? <button className="btn primary wide" disabled={!stepOk[step]} onClick={() => go(step + 1)}>{stepOk[step] ? `Next: ${STEPS[step + 1]}` : stepHint(step)}</button>
          : <button className="btn primary wide" disabled={!ready.ok} onClick={onDone}>{ready.ok ? 'Start playing' : `Still missing: ${ready.missing.slice(0, 2).join(', ')}`}</button>}
      </footer>
    </div>
  )
}
const stepHint = (s) => ['Give your hero a name', 'Pick a class', 'Pick a species (and its options)', 'Pick a background and its bonuses', 'Set your ability scores', 'Make the choices above', '', ''][s]

function HeroStep({ ch, setCh }) {
  const pickPhoto = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) setCh({ ...ch, portrait: { kind: 'photo', src: await shrinkImage(f) } })
  }
  return (
    <section>
      <h1 className="wiz-title">Who is your hero?</h1>
      <p className="lead">A name, a face, and the level you start at. You can change all of it later.</p>
      <label className="field"><span>Name</span>
        <input className="input" value={ch.name} onChange={(e) => setCh({ ...ch, name: e.target.value.slice(0, 40) })} placeholder="e.g. Katsebushi" autoComplete="off" enterKeyHint="next" />
      </label>
      <span className="field-label">Portrait</span>
      <div className="portraits">
        <label className="portrait-pick" aria-label="Choose a photo">
          {ch.portrait?.kind === 'photo' ? <img src={ch.portrait.src} alt="" /> : <span>📷<small>Photo</small></span>}
          <input type="file" accept="image/*" onChange={pickPhoto} hidden />
        </label>
        {ICONS.map((ic) => <button key={ic} className={`portrait-icon ${ch.portrait?.kind === 'icon' && ch.portrait.src === ic ? 'on' : ''}`} onClick={() => setCh({ ...ch, portrait: { kind: 'icon', src: ic } })} aria-label={`Icon ${ic}`}>{ic}</button>)}
      </div>
      <div className="row field">
        <span className="grow"><b>Starting level</b><br /><span className="muted small">Joining a campaign that's already going? Start higher.</span></span>
        <Stepper value={ch.level} min={1} max={20} label="Level" onChange={(level) => setCh({ ...ch, level })} />
      </div>
    </section>
  )
}

const QUIZ = [
  { q: 'In a fight, you want to…', a: [['Hit hard up close', ['barbarian', 'fighter', 'monk', 'paladin']], ['Strike from afar or the shadows', ['rogue', 'ranger', 'warlock']], ['Cast big spells', ['wizard', 'sorcerer', 'druid']], ['Keep friends standing', ['cleric', 'bard', 'paladin', 'druid']]] },
  { q: 'Your power comes from…', a: [['Training and grit', ['fighter', 'barbarian', 'rogue', 'monk']], ['Study and books', ['wizard']], ['Gods, oaths or nature', ['cleric', 'paladin', 'druid', 'ranger']], ['Your blood, a patron or a song', ['sorcerer', 'warlock', 'bard']]] },
  { q: 'You like…', a: [['Simple and sturdy', ['fighter', 'barbarian', 'paladin']], ['Lots of options each turn', ['monk', 'rogue', 'bard', 'ranger']], ['A big book of spells', ['wizard', 'cleric', 'druid']], ['Few spells, used well', ['warlock', 'sorcerer']]] },
]

function ClassStep({ ch, setCh }) {
  const [answers, setAnswers] = useState([])
  const score = (id) => answers.filter((a) => a.includes(id)).length
  const best = answers.length === QUIZ.length ? CLASSES.reduce((b, c) => (score(c.id) > score(b.id) ? c : b)).id : null
  const choose = (id) => {
    const cls = classById(id)
    setCh({ ...ch, classId: id, subclassId: ch.classId === id ? ch.subclassId : null, choices: Object.fromEntries(Object.entries(ch.choices).filter(([k]) => k.startsWith('species.') || k.startsWith('background'))), spells: { cantrips: [], prepared: [] }, equipment: { ...ch.equipment, pack: null, armor: null, shield: false, weapons: [] }, theme: ch.theme || null, hpRolls: {}, _cls: cls.id })
  }
  return (
    <section>
      <h1 className="wiz-title">Pick a class</h1>
      <p className="lead">Your class is how you fight and what you're good at. More classes arrive with spells.</p>
      <details className="quiz">
        <summary>Not sure? Two quick questions</summary>
        {QUIZ.map((q, i) => (
          <div key={i} className="quiz-q"><span>{q.q}</span><div className="seg">{q.a.map(([label, ids]) => (
            <button key={label} aria-pressed={answers[i] === ids} onClick={() => setAnswers(Object.assign([...answers], { [i]: ids }))}>{label}</button>
          ))}</div></div>
        ))}
      </details>
      <div className="cards">
        {CLASSES.map((c) => (
          <button key={c.id} className={`card class-card cls-${c.id} ${ch.classId === c.id ? 'on' : ''}`} aria-pressed={ch.classId === c.id} onClick={() => choose(c.id)}>
            <span className="opt-name">{c.name} {best === c.id && <span className="pill">Suggested</span>}{ch.classId === c.id && <span className="tick">✓</span>}</span>
            <span className="opt-sum">{c.blurb}</span>
            <span className="facts"><span>d{c.hitDie} hit die</span><span>{c.primary.join(' + ')}</span><span>{c.difficulty}</span></span>
          </button>
        ))}
      </div>
    </section>
  )
}

function SpeciesStep({ ch, setCh, d }) {
  const sp = speciesById(ch.speciesId)
  return (
    <section>
      <h1 className="wiz-title">Pick a species</h1>
      <p className="lead">Where your hero comes from: senses, speed and a gift or two.</p>
      <div className="cards cols-2">
        {SPECIES.map((s) => (
          <button key={s.id} className={`card opt ${ch.speciesId === s.id ? 'on' : ''}`} aria-pressed={ch.speciesId === s.id} onClick={() => setCh({ ...ch, speciesId: s.id, choices: Object.fromEntries(Object.entries(ch.choices).filter(([k]) => !k.startsWith('species.'))) })}>
            <span className="opt-name">{s.name}{ch.speciesId === s.id && <span className="tick">✓</span>}</span>
            <span className="opt-sum">{s.blurb}</span>
            <span className="facts"><span>{s.size}</span><span>{s.speed} ft</span></span>
          </button>
        ))}
      </div>
      {sp && (
        <div className="panel">
          <h2>{sp.name} traits</h2>
          <ul className="traits">{sp.features.map((f) => <li key={f.id}><b>{f.name}{f.level ? ` (level ${f.level})` : ''}.</b> {f.summary}</li>)}</ul>
          <ChoicesStep ch={ch} setCh={setCh} d={d} filter={(c) => c.source === 'species'} embedded />
        </div>
      )}
    </section>
  )
}

function BackgroundStep({ ch, setCh, d }) {
  const bg = backgroundById(ch.backgroundId)
  const pick = ch.choices['background.abilities']
  const setPick = (v) => setCh({ ...ch, choices: { ...ch.choices, 'background.abilities': v } })
  return (
    <section>
      <h1 className="wiz-title">Pick a background</h1>
      <p className="lead">What you did before adventuring. It raises your ability scores and gives a feat, skills and a tool.</p>
      <div className="cards">
        {BACKGROUNDS.map((b) => (
          <button key={b.id} className={`card opt ${ch.backgroundId === b.id ? 'on' : ''}`} aria-pressed={ch.backgroundId === b.id} onClick={() => setCh({ ...ch, backgroundId: b.id, choices: Object.fromEntries(Object.entries(ch.choices).filter(([k]) => !k.startsWith('background'))) })}>
            <span className="opt-name">{b.name}{ch.backgroundId === b.id && <span className="tick">✓</span>}</span>
            <span className="opt-sum">{b.blurb}</span>
            <span className="facts"><span>{b.abilities.join(' · ').replace(/ · /g, ', ')}</span><span>{d.features.find((f) => f.source === 'background')?.name && ch.backgroundId === b.id ? d.features.find((f) => f.source === 'background').name : b.feat.replace(/-/g, ' ')}</span><span>{b.skills.map(skillName).join(', ')}</span></span>
          </button>
        ))}
      </div>
      {bg && (
        <div className="panel">
          <h2>Ability score increase</h2>
          <div className="seg">
            <button aria-pressed={pick?.mode === '2-1'} onClick={() => setPick({ mode: '2-1', plus2: bg.abilities[0], plus1: bg.abilities[1] })}>+2 and +1</button>
            <button aria-pressed={pick?.mode === '1-1-1'} onClick={() => setPick({ mode: '1-1-1' })}>+1 to all three</button>
          </div>
          {pick?.mode === '2-1' && (
            <div className="bg-abil">
              {bg.abilities.map((a) => (
                <div key={a} className="row"><span className="grow">{ABILITY_NAMES[a]}</span>
                  <button className={`chip ${pick.plus2 === a ? 'on' : ''}`} onClick={() => setPick({ ...pick, plus2: a, plus1: pick.plus1 === a ? bg.abilities.find((x) => x !== a) : pick.plus1 })}>+2</button>
                  <button className={`chip ${pick.plus1 === a ? 'on' : ''}`} onClick={() => setPick({ ...pick, plus1: a, plus2: pick.plus2 === a ? bg.abilities.find((x) => x !== a) : pick.plus2 })}>+1</button>
                </div>
              ))}
            </div>
          )}
          <p className="muted small">Also: {d.features.find((f) => f.source === 'background')?.name} feat, {bg.skills.map(skillName).join(' and ')}, {bg.tool}.</p>
          <ChoicesStep ch={ch} setCh={setCh} d={d} filter={(c) => c.source === 'background' && c.kind !== 'bg-abilities'} embedded />
        </div>
      )}
    </section>
  )
}

function AbilityStep({ ch, setCh, d, settings, throwOn }) {
  const cls = classById(ch.classId)
  const method = ch.scoreMethod || ch._method || 'standard'
  const [rolled, setRolled] = useState(ch.rolled || [])
  const [rolling, setRolling] = useState(false)
  const pool = method === 'standard' ? STANDARD : method === 'roll' ? rolled.map((r) => r.total) : null
  const assign = ch.assign || {} // ability → index into pool
  const setMethod = (m) => setCh({ ...ch, _method: m, scoreMethod: null, assign: {}, scores: Object.fromEntries(ABILITIES.map((a) => [a, m === 'point-buy' ? 8 : 10])) })
  const applyAssign = (next, list = pool) => {
    const full = ABILITIES.every((a) => next[a] != null)
    setCh({ ...ch, assign: next, rolled, scores: Object.fromEntries(ABILITIES.map((a) => [a, next[a] != null ? list[next[a]] : 10])), scoreMethod: full ? method : null, _method: method })
  }
  const auto = (list = pool) => {
    const order = suggested(cls)
    const idx = list.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i)
    applyAssign(Object.fromEntries(order.map((a, i) => [a, idx[i]])), list)
  }
  const spent = ABILITIES.reduce((t, a) => t + (POINT_COST[ch.scores[a]] ?? 0), 0)
  const roll4d6 = async () => {
    setRolling(true)
    const out = []
    try {
      const D = throwOn ? await load3d().catch(() => null) : null
      for (let i = 0; i < 6; i++) {
        const faces = D ? await D.throwDice([6, 6, 6, 6]) : Array.from({ length: 4 }, () => 1 + Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * 6))
        const low = Math.min(...faces), drop = faces.indexOf(low)
        const total = faces.reduce((a, b) => a + b, 0) - low
        out.push({ faces, drop, total })
        if (D) D.showResult({ title: `Roll ${i + 1} of 6: 4d6, drop the lowest`, total: String(total), detail: faces.map((f, j) => (j === drop ? `(${f})` : f)).join(' ') })
        setRolled([...out])
      }
      if (D) D.close()
    } finally { setRolling(false) }
    setCh({ ...ch, rolled: out, assign: {}, scoreMethod: null, _method: 'roll' })
  }
  const methods = [['standard', 'Standard array'], ['point-buy', 'Point buy'], ...(settings.allowRoll !== false ? [['roll', 'Roll 4d6']] : [])]
  return (
    <section>
      <h1 className="wiz-title">Ability scores</h1>
      <p className="lead">{cls ? `A ${cls.name} wants high ${cls.primary.join(' and ')}.` : ''} Background bonuses are added on top.</p>
      <div className="seg">{methods.map(([m, l]) => <button key={m} aria-pressed={method === m} onClick={() => setMethod(m)}>{l}</button>)}</div>
      {method === 'roll' && (
        <div className="panel">
          <button className="btn primary wide" onClick={roll4d6} disabled={rolling}>{rolling ? 'Rolling…' : rolled.length ? '🎲 Roll all six again' : '🎲 Roll 4d6 six times'}</button>
          {rolled.length > 0 && <div className="rolled">{rolled.map((r, i) => <span key={i} className="roll-chip"><b>{r.total}</b><small>{r.faces.map((f, j) => <s key={j} className={j === r.drop ? 'drop' : ''}>{f}</s>)}</small></span>)}</div>}
        </div>
      )}
      {(method === 'standard' || (method === 'roll' && rolled.length === 6)) && (
        <>
          <div className="row"><span className="muted small grow">Give each value to one ability.</span><button className="btn ghost small" onClick={() => auto()}>Suggest for {cls?.name || 'me'}</button></div>
          <div className="assign">
            {ABILITIES.map((a) => (
              <div key={a} className="assign-row">
                <span className="abil-name">{ABILITY_NAMES[a]}</span>
                <div className="assign-vals">
                  {pool.map((v, i) => {
                    const usedBy = ABILITIES.find((x) => assign[x] === i)
                    return <button key={i} className={`chip ${assign[a] === i ? 'on' : ''} ${usedBy && usedBy !== a ? 'used' : ''}`} onClick={() => {
                      const next = { ...assign }
                      if (usedBy && usedBy !== a) next[usedBy] = assign[a]
                      next[a] = i
                      for (const k of Object.keys(next)) if (next[k] == null) delete next[k]
                      applyAssign(next)
                    }} aria-label={`${a} ${v}`}>{v}</button>
                  })}
                </div>
                <span className="mono final">{d.scores[a].total} <small>({signed(d.mod[a])})</small></span>
              </div>
            ))}
          </div>
        </>
      )}
      {method === 'point-buy' && (
        <>
          <p className={`points ${spent > 27 ? 'over' : ''}`}><b>{27 - spent}</b> of 27 points left</p>
          <div className="assign">
            {ABILITIES.map((a) => (
              <div key={a} className="assign-row">
                <span className="abil-name">{ABILITY_NAMES[a]}</span>
                <Stepper value={ch.scores[a]} min={8} max={15} label={a} onChange={(v) => {
                  const scores = { ...ch.scores, [a]: v }
                  const cost = ABILITIES.reduce((t, x) => t + POINT_COST[scores[x]], 0)
                  if (cost <= 27) setCh({ ...ch, scores, scoreMethod: 'point-buy', _method: 'point-buy' })
                }} />
                <span className="mono final">{d.scores[a].total} <small>({signed(d.mod[a])})</small></span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

/** Every open choice that `filter` keeps, as pickers. ASI drafts stay local until complete. */
export function ChoicesStep({ ch, setCh, d, filter, embedded }) {
  const [drafts, setDrafts] = useState({})
  const list = d.choices.filter(filter).filter((c) => c.kind !== 'bg-abilities')
  const set = (key, v) => setCh({ ...ch, choices: { ...ch.choices, [key]: v } })
  const takenFeats = d.features.filter((f) => f.source === 'feat' || f.source === 'background').map((f) => f.id)
  if (!list.length) return embedded ? null : <section><h1 className="wiz-title">Choices</h1><p className="lead">Nothing to choose here. Next!</p></section>
  return (
    <section>
      {!embedded && <><h1 className="wiz-title">Your choices</h1><p className="lead">What your class and feats let you pick at level {ch.level}.</p></>}
      {list.map((c) => (
        <div key={c.key} className={`panel choice ${c.done ? 'done' : ''}`}>
          <h2>{c.featureName && c.featureName !== c.label ? `${c.featureName}: ` : ''}{c.label}{c.level > 1 ? <span className="muted small"> · level {c.level}</span> : null}</h2>
          {c.kind === 'asi' || c.kind === 'epic'
            ? <AsiPicker value={drafts[c.key] || ch.choices[c.key]} epic={c.kind === 'epic'} level={ch.level} takenFeats={takenFeats} caster={!!d.spellcasting} armor={d.cls?.armor || []} scores={Object.fromEntries(Object.entries(d.scores).map(([a, s]) => [a, s.total - ((ch.choices[c.key]?.ability === a ? (ch.choices[c.key]?.type === 'plus2' ? 2 : 1) : 0) + ((ch.choices[c.key]?.abilities || []).includes(a) ? 1 : 0))]))}
                onChange={(v) => { setDrafts({ ...drafts, [c.key]: v }); if (asiDone(v)) set(c.key, v); else if (ch.choices[c.key]) { const next = { ...ch.choices }; delete next[c.key]; setCh({ ...ch, choices: next }) } }} />
            : <>
                <p className="muted small">{c.count > 1 ? `Choose ${c.count} (${c.picked.length} chosen).` : 'Choose one.'}</p>
                <OptionCards columns={c.options.length > 6 ? 2 : 1} count={c.count} picked={c.picked} onChange={(v) => set(c.key, v)}
                  options={c.options.map((o) => ({ ...o, summary: o.summary || (c.kind === 'skill' && d.skills.find((s) => s.id === o.id)?.prof && !c.picked.includes(o.id) ? 'Already proficient' : ''), disabled: c.kind === 'skill' && d.skills.find((s) => s.id === o.id)?.prof && !c.picked.includes(o.id) }))} />
              </>}
        </div>
      ))}
    </section>
  )
}

function GearStep({ ch, setCh, d }) {
  const cls = d.cls
  const setPack = (p) => setCh({ ...ch, equipment: { ...ch.equipment, pack: p.id, armor: p.armor || null, weapons: p.weapons || [], gp: (p.gp || 0) + 50, items: p.items } })
  return (
    <section>
      <h1 className="wiz-title">Gear</h1>
      <p className="lead">Take the {cls?.name} kit or gold to shop with. Your background adds 50 GP. You can change weapons and armor on the sheet.</p>
      <OptionCards count={1} picked={ch.equipment.pack ? [ch.equipment.pack] : []} onChange={([id]) => setPack(cls.packs.find((p) => p.id === id))}
        options={(cls?.packs || []).map((p) => ({ id: p.id, name: p.name, summary: p.items }))} />
      {cls?.armor.includes('shield') && (
        <label className="row toggle"><input type="checkbox" checked={!!ch.equipment.shield} onChange={(e) => setCh({ ...ch, equipment: { ...ch.equipment, shield: e.target.checked } })} /><span>Carry a shield (+2 AC)</span></label>
      )}
      <div className="panel">
        <div className="row"><span className="grow">AC</span><b className="mono">{d.ac.value}</b></div>
        <div className="row"><span className="grow">Armor</span><span>{armorById(ch.equipment.armor)?.name || 'None'}</span></div>
        <div className="row"><span className="grow">Weapons</span><span>{(ch.equipment.weapons || []).map((w) => weaponById(w)?.name).join(', ') || 'None'}</span></div>
      </div>
    </section>
  )
}

function ReadyStep({ ch, d, ready, go }) {
  return (
    <section>
      <div className={`hero-card cls-${ch.classId}`}>
        <Portrait ch={ch} size={96} />
        <h1>{ch.name || 'Your hero'}</h1>
        <p>{d.species?.name} {d.cls?.name} {ch.level}{d.subclass ? `, ${d.subclass.name}` : ''}</p>
        <div className="hero-stats">
          <span><b>{d.ac.value}</b>AC</span><span><b>{d.hp.value}</b>HP</span><span><b>{d.speed.value}</b>Speed</span><span><b>{signed(d.initiative.value)}</b>Init</span>
        </div>
        <div className="hero-abil">{ABILITIES.map((a) => <span key={a}><small>{a}</small><b>{d.scores[a].total}</b><small>{signed(d.mod[a])}</small></span>)}</div>
      </div>
      {!ready.ok && (
        <div className="panel warn">
          <h2>Almost there</h2>
          <p>Still missing: {ready.missing.join(', ')}.</p>
          <button className="btn ghost" onClick={() => go(ready.missing[0] === 'a name' ? 0 : 5)}>Go fix it</button>
        </div>
      )}
    </section>
  )
}

export function Portrait({ ch, size = 48 }) {
  const p = ch.portrait
  return (
    <span className={`portrait cls-${ch.classId || 'none'}`} style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {p?.kind === 'photo' ? <img src={p.src} alt="" /> : p?.kind === 'icon' ? p.src : (ch.name || '?').slice(0, 1).toUpperCase()}
    </span>
  )
}

