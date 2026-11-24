// Spell picks inside feats (Magic Initiate, Fey Touched, Shadow Touched, Ritual Caster). A choice of kind 'spell'
// lists spells from spells.js; its options read the feature's own earlier picks through c.own(key) (Magic
// Initiate's spell list, fixed by some backgrounds). The engine turns them into d.featSpells (engine/spells.js).
import { SPELLS } from './spells.js'

const card = (s) => ({ id: s.id, name: s.name, summary: s.summary, school: s.school })
/** A spell choice: `count` spells (a number or c => number) that pass `keep(spell, c)`. */
export const spellChoice = (key, label, count, keep) => ({ key, label, count, kind: 'spell', options: (c) => SPELLS.filter((s) => keep(s, c)).map(card) })
export const listOf = (c) => (c.own ? c.own('list')[0] : null)
