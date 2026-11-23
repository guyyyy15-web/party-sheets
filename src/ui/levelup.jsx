// What a level gives: the card after "Become level N" (what changed, with a Try it for each new roll), and the same
// card as a preview of the next level. Both come from levelDiff, so they always agree.
import React from 'react'
import { derive } from '../engine/engine.js'
import { levelDiff, headlines } from '../engine/levelup.js'

/** The diff between this character and itself one level up (no choices made yet: the preview). */
export function nextLevelDiff(ch) {
  if (ch.level >= 20) return null
  const next = { ...ch, level: ch.level + 1 }
  return levelDiff(derive(ch), derive(next), next)
}
/** What the last level gave (for the "What's new" link). */
export function lastLevelDiff(ch) {
  if (ch.level <= 1) return null
  return levelDiff(derive({ ...ch, level: ch.level - 1 }), derive(ch), ch)
}

export function LevelSummary({ diff, preview, roll }) {
  return (
    <div className="lvl-summary">
      {diff.lines.length > 0 && (
        <ul className="lvl-lines">
          {diff.lines.map((l, i) => (
            <li key={i}>
              <span className="grow">{l.label}{l.note && <span className="muted small lvl-note">{l.note}</span>}</span>
              <span className={`mono lvl-val k-${l.kind}`}><span className="lvl-before">{l.before}</span> → <b>{l.after}</b></span>
            </li>
          ))}
        </ul>
      )}
      {diff.features.length > 0 && <h3 className="lvl-h">{preview ? 'New features' : 'You gained'}</h3>}
      {diff.features.map((f) => {
        const acts = diff.actions.filter((a) => a.from === f.name && a.roll)
        return (
          <div key={f.key} className="panel lvl-feature">
            <b>{f.name}</b>
            <p className="small">{f.summary}</p>
            {!preview && roll && acts.map((a) => (
              <button key={a.id} className="btn small primary" onClick={() => roll({ kind: 'expr', label: `${a.name}: ${a.roll.label}`, expr: a.roll.expr, parts: a.roll.parts, rule: a.roll.why })}>Try it: {a.roll.label} {a.roll.expr}</button>
            ))}
          </div>
        )
      })}
      {preview && diff.choices.length > 0 && <p className="lvl-choose"><b>You'll choose:</b> {[...new Set(diff.choices)].join(', ')}</p>}
      {!diff.lines.length && !diff.features.length && <p className="muted">No new numbers at this level.</p>}
    </div>
  )
}

/** One line on the sheet: what the next level brings. */
export function NextLevelLine({ ch, onOpen }) {
  const diff = React.useMemo(() => nextLevelDiff(ch), [ch])
  if (!diff) return null
  const h = headlines(diff)
  return (
    <button className="next-level" onClick={() => onOpen(diff)} aria-label={`What level ${diff.level} brings: ${h.join(', ')}`}>
      <span className="lbl">Level {diff.level}</span><span className="grow">{h.join(' · ') || 'More HP'}</span><span aria-hidden>›</span>
    </button>
  )
}
