// The character sheet on paper (A4 or Letter): Print / Save as PDF from the phone's share sheet. Built from
// printModel() (src/engine/print.js), in Tavern Table's own layout and words: no official sheet's frames or logo.
import React, { useState } from 'react'
import { printModel } from '../engine/print.js'
import { AvatarImg } from './avatar.jsx'
import { CLASS_COLORS } from '../content/avatars.js'

const Box = ({ title, children, className = '' }) => <section className={`pr-box ${className}`}><h3>{title}</h3>{children}</section>
const Pips = ({ n }) => <span className="pr-pips">{Array.from({ length: Math.min(n, 20) }).map((_, i) => <i key={i} />)}</span>

export function PrintView({ ch, onBack }) {
  const [paper, setPaper] = useState('A4')
  const p = printModel(ch)
  const photo = ch.portrait?.kind === 'photo'
  return (
    <main className="print-root" style={{ '--cls': CLASS_COLORS[ch.classId] || '#8a7f70' }}>
      <style>{`@page { size: ${paper}; margin: 12mm; }`}</style>
      <div className="pr-tools no-print">
        <button className="btn ghost" onClick={onBack}>‹ Back</button>
        <div className="seg" role="group" aria-label="Paper size">{['A4', 'Letter'].map((s) => <button key={s} aria-pressed={paper === s} className={paper === s ? 'on' : ''} onClick={() => setPaper(s)}>{s}</button>)}</div>
        <button className="btn primary grow" onClick={() => window.print()}>🖨 Print / Save as PDF</button>
      </div>
      <p className="muted small no-print pr-hint">On iPhone: Print, then share the preview → Save to Files to keep it as a PDF.</p>

      <article className="pr-page">
        <header className="pr-head">
          {photo ? <img className="pr-face" src={ch.portrait.src} alt="" /> : <AvatarImg ch={ch} size={86} className="pr-face" />}
          <div className="grow"><h1>{p.name}</h1><p>{p.line}</p>{p.background && <p className="pr-quiet">Background: {p.background}</p>}</div>
        </header>
        <div className="pr-stats">{p.stats.map(([k, v]) => <div key={k}><b>{v}</b><small>{k}</small></div>)}</div>
        <div className="pr-grid">
          <Box title="Abilities and saves">
            <table className="pr-table"><thead><tr><th /><th>Score</th><th>Mod</th><th>Save</th></tr></thead>
              <tbody>{p.abilities.map((a) => <tr key={a.id}><th>{a.name}</th><td>{a.score}</td><td><b>{a.mod}</b></td><td>{a.saveProf ? '● ' : ''}{a.save}</td></tr>)}</tbody></table>
          </Box>
          <Box title="Skills">
            <ul className="pr-skills">{p.skills.map((s) => <li key={s.name}><span>{s.expertise ? '◆' : s.prof ? '●' : '○'} {s.name} <small>{s.ability}</small></span><b>{s.value}</b></li>)}</ul>
          </Box>
        </div>
        <Box title="Attacks">
          <table className="pr-table wide"><thead><tr><th>Weapon</th><th>To hit</th><th>Damage</th><th>Notes</th></tr></thead>
            <tbody>{p.attacks.map((a) => <tr key={a.name}><th>{a.name}</th><td><b>{a.toHit}</b></td><td>{a.damage}</td><td className="pr-quiet">{a.notes}</td></tr>)}</tbody></table>
        </Box>
        <div className="pr-grid">
          {p.resources.length > 0 && <Box title="Resources (tick as you use them)"><ul className="pr-res">{p.resources.map((r) => <li key={r.name}><span>{r.name} <small>{r.reset}</small></span><Pips n={r.max} /></li>)}</ul></Box>}
          <Box title="Hit points on the night"><div className="pr-write" /><p className="pr-quiet">Temporary HP · Death saves ○○○ / ○○○</p>{p.defenses.map((x) => <p key={x} className="pr-quiet">{x}</p>)}</Box>
        </div>
      </article>

      <article className="pr-page">
        <Box title="Features and feats"><ul className="pr-feats">{p.features.map((f, i) => <li key={`${f.name}${i}`}><b>{f.name}</b>{f.level && f.source !== 'species' && f.source !== 'background' && f.source !== 'feat' ? <small> · level {f.level}</small> : null}<span>{f.summary}</span></li>)}</ul></Box>
        <div className="pr-grid">
          <Box title="Gear">{p.gear.length ? <ul className="pr-list">{p.gear.map((g) => <li key={g}>{g}</li>)}</ul> : <div className="pr-write" />}</Box>
          <Box title="Notes">{p.notes ? <p className="pr-notes">{p.notes}</p> : <div className="pr-write tall" />}</Box>
        </div>
      </article>

      {p.casting && (
        <article className="pr-page">
          <div className="pr-stats">{[['Spell save DC', p.casting.dc], ['Spell attack', p.casting.attack], ['Ability', p.casting.ability]].map(([k, v]) => <div key={k}><b>{v}</b><small>{k}</small></div>)}</div>
          {p.casting.pact && <p className="pr-quiet">{p.casting.pact}</p>}
          {p.spells.map((g) => (
            <Box key={g.title} title={<>{g.title}{g.slots ? <span className="pr-slots"> · slots <Pips n={g.slots} /></span> : null}</>}>
              <ul className="pr-spells">{g.list.map((s) => <li key={s.name}><b>{s.name}</b><small> {s.time} · {s.range}{s.conc ? ' · C' : ''}{s.ritual ? ' · R' : ''}</small><span>{s.summary}</span></li>)}</ul>
            </Box>
          ))}
        </article>
      )}
      <p className="pr-foot">Made with Tavern Table · Rules: SRD 5.2 by Wizards of the Coast LLC, CC-BY-4.0 · Avatar: Adventurer by Lisa Wischofsky (DiceBear), CC BY 4.0</p>
    </main>
  )
}
