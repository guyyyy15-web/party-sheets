// A card for every game term: what it is (general text) and what it does for THIS character (explain()).
// TermButton = a small ⓘ that opens a card; GlossaryView = every term, searchable, by group.
import React, { useState, useMemo } from 'react'
import { GLOSSARY, GROUPS, termById } from '../content/glossary.js'
import { explain } from '../engine/explain.js'
import { Sheet } from './common.jsx'

/** The card for one term. `ch` (optional) adds the "For you" part. `onWear` puts on an armor from the table. */
export function TermCard({ id, ch, onClose, onOpen, onWear }) {
  const t = termById(id)
  const ex = useMemo(() => (ch ? explain(id, ch) : { lines: [] }), [id, ch])
  if (!t) return null
  return (
    <Sheet title={t.term} onClose={onClose}>
      <p className="term-text">{t.text}</p>
      {ex.lines.length > 0 && (
        <div className="panel for-you">
          <b>For {ch?.name || 'you'}</b>
          <ul>{ex.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      )}
      {ex.table && (
        <div className="term-table-wrap">
          <table className="term-table">
            <thead><tr>{ex.table.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>{ex.table.rows.map((r, i) => (
              <tr key={i} className={ch?.equipment?.armor === ex.table.ids?.[i] || (!ch?.equipment?.armor && ex.table.ids?.[i] === null) ? 'on' : ''}>
                {r.map((c, j) => <td key={j}>{j === 0 && onWear && ex.table.ids ? <button className="linkish" onClick={() => onWear(ex.table.ids[i])}>{c}</button> : c}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {t.related?.length > 0 && onOpen && (
        <div className="term-related">{t.related.filter(termById).map((r) => <button key={r} className="chip" onClick={() => onOpen(r)}>{termById(r).term}</button>)}</div>
      )}
    </Sheet>
  )
}

/** A small ⓘ next to a word; opens its card. */
export function TermButton({ id, label, onOpen }) {
  const t = termById(id)
  if (!t) return null
  return <button className="term-i" onClick={(e) => { e.stopPropagation(); onOpen(id) }} aria-label={`What is ${label || t.term}?`}>ⓘ</button>
}

/** Every term, searchable and grouped. */
export function GlossaryView({ ch, onBack }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const match = (t) => !q || [t.term, ...(t.aliases || [])].some((x) => x.toLowerCase().includes(q.toLowerCase()))
  return (
    <main className="glossary-page">
      <header className="char-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">‹</button>
        <div className="grow"><h1>Rules glossary</h1>{ch && <p className="muted small">With numbers for {ch.name}</p>}</div>
      </header>
      <input className="input" type="search" placeholder="Search: AC, advantage, concentration…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the glossary" />
      {GROUPS.map(([g, label]) => {
        const list = GLOSSARY.filter((t) => t.group === g && match(t))
        if (!list.length) return null
        return (
          <section key={g} className="gl-group">
            <h2>{label}</h2>
            <ul className="gl-list">{list.map((t) => <li key={t.id}><button onClick={() => setOpen(t.id)}><b>{t.term}</b><span className="muted small">{t.text.split(/(?<=\.)\s/)[0]}</span></button></li>)}</ul>
          </section>
        )
      })}
      {open && <TermCard id={open} ch={ch} onClose={() => setOpen(null)} onOpen={setOpen} />}
    </main>
  )
}

/** For the "how it's made" sheets: their title → a glossary term. */
export const TITLE_TERM = { 'Armor Class': 'ac', Speed: 'speed', Initiative: 'initiative', 'Spell save DC': 'spell-save-dc', 'Strength score': 'STR', 'Dexterity score': 'DEX', 'Constitution score': 'CON', 'Intelligence score': 'INT', 'Wisdom score': 'WIS', 'Charisma score': 'CHA' }
