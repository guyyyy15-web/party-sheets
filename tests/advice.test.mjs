// Play style, recommendations and the term cards.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { derive, newCharacter } from '../src/engine/engine.js'
import { BUILDS, buildById } from '../src/content/builds.js'
import { pathsFor, abilityOrder, recommend, recommendAsi, recommendSpells } from '../src/engine/advice.js'
import { classById } from '../src/content/classes.js'
import { featById } from '../src/content/feats.js'
import { spellById } from '../src/content/spells.js'
import { weaponById, armorById, ARMOR, SKILLS } from '../src/content/basics.js'
import { GLOSSARY, GROUPS, termById } from '../src/content/glossary.js'
import { explain } from '../src/engine/explain.js'

const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const CLASSES = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard']

test('build paths: 2-4 per class, every id real', () => {
  const seen = new Set()
  for (const c of CLASSES) {
    const paths = BUILDS[c]
    assert.ok(paths?.length >= 2 && paths.length <= 4, `${c}: ${paths?.length} paths`)
    const cls = classById(c)
    for (const p of paths) {
      assert.ok(!seen.has(p.id), `unique ${p.id}`); seen.add(p.id)
      assert.equal(buildById(p.id), p)
      assert.ok(p.label && p.label.split(' ').length <= 9, `${p.id}: label`)
      assert.equal(p.invest.length, 3); assert.ok(p.invest.every((a) => ABIL.includes(a)), `${p.id}: invest`)
      assert.ok(cls.subclasses.some((s) => s.id === p.subclass), `${p.id}: subclass ${p.subclass}`)
      for (const f of [...(p.style || []), ...(p.feats || [])]) assert.ok(featById(f), `${p.id}: feat ${f}`)
      for (const w of p.weapons || []) assert.ok(weaponById(w), `${p.id}: weapon ${w}`)
      if (p.armor) assert.ok(armorById(p.armor) && cls.armor.includes(armorById(p.armor).type), `${p.id}: armor ${p.armor} trained`)
      for (const s of p.skills || []) assert.ok(SKILLS.some((x) => x.id === s), `${p.id}: skill ${s}`)
      for (const s of p.spells || []) assert.ok(spellById(s)?.classes.includes(c), `${p.id}: spell ${s} on the ${c} list`)
    }
  }
})

const fighter = (build, o = {}) => ({ ...newCharacter(), name: 'F', classId: 'fighter', build, speciesId: 'dwarf', backgroundId: 'soldier', level: 1, scores: { STR: 14, DEX: 14, CON: 14, INT: 10, WIS: 12, CHA: 8 }, ...o })

test('a bow fighter is steered to DEX and Archery, a sword fighter to STR', () => {
  const bowId = pathsFor('fighter').find((p) => p.invest[0] === 'DEX')?.id
  const strId = pathsFor('fighter').find((p) => p.invest[0] === 'STR')?.id
  assert.ok(bowId && strId, 'fighter has a DEX path and a STR path')
  assert.equal(abilityOrder(fighter(bowId))[0], 'DEX')
  assert.equal(abilityOrder(fighter(strId))[0], 'STR')
  const ch = fighter(bowId, { equipment: { armor: 'leather', shield: false, weapons: ['longbow'] } })
  const d = derive(ch)
  const style = d.pending.find((c) => /Fighting Style/i.test(c.label))
  const rec = recommend(ch, d, style)
  assert.equal(Object.keys(rec)[0], 'archery', 'Archery first for the bow fighter')
  assert.match(rec.archery, /\+2 to hit/)
  const asi = recommendAsi(fighter(bowId, { level: 4 }), derive(fighter(bowId, { level: 4 })), { scores: { STR: 14, DEX: 16, CON: 14, INT: 10, WIS: 12, CHA: 8 } })
  assert.deepEqual(asi.value, { type: 'plus2', ability: 'DEX' })
  assert.match(asi.reason, /DEX 16 → 18/)
})

test('every path, 1→20 taking the recommended options: no choice left, and the path ability leads', () => {
  for (const c of CLASSES) {
    for (const p of pathsFor(c)) {
      const base = { STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 }
      ;[15, 14, 13].forEach((v, i) => { base[p.invest[i]] = v })
      for (const a of ABIL) if (base[a] === 8) { base[a] = [12, 10, 8].find((v) => !Object.values(base).includes(v) || v === 8) }
      let ch = { ...newCharacter(), name: p.id, classId: c, build: p.id, speciesId: 'dwarf', backgroundId: 'sage', scores: base, equipment: { armor: p.armor, shield: false, weapons: p.weapons || [] } }
      for (let lv = 1; lv <= 20; lv++) {
        ch = { ...ch, level: lv }
        for (let g = 0; g < 30; g++) {
          const d = derive(ch)
          const cc = d.pending[0]
          if (!cc) break
          let v
          if (cc.kind === 'bg-abilities') v = { mode: '2-1', plus2: cc.options.find((o) => o.id === p.invest[0])?.id || cc.options[0].id, plus1: cc.options.find((o) => o.id !== (cc.options.find((x) => x.id === p.invest[0])?.id || cc.options[0].id)).id }
          else if (cc.kind === 'asi' || cc.kind === 'epic') {
            const taken = d.features.filter((f) => f.source === 'feat' || f.source === 'background').map((f) => f.id)
            v = recommendAsi(ch, d, { epic: cc.kind === 'epic', takenFeats: taken, scores: Object.fromEntries(ABIL.map((a) => [a, d.scores[a].total])) })?.value || { type: 'plus2', ability: 'CON' }
          } else {
            const rec = Object.keys(recommend(ch, d, cc)).filter((id) => cc.options.some((o) => o.id === id))
            const rest = cc.options.filter((o) => !o.disabled && !o.taken && !(cc.kind === 'skill' && d.skills.find((s) => s.id === o.id)?.prof)).map((o) => o.id)
            v = [...new Set([...cc.picked, ...rec, ...rest])].slice(0, cc.count)
          }
          ch = { ...ch, choices: { ...ch.choices, [cc.key]: v } }
        }
        const d = derive(ch)
        assert.equal(d.pending.length, 0, `${p.id} ${lv}: choices left ${d.pending.map((x) => x.key)}`)
        if (lv === 8) {
          const top = Math.max(...ABIL.map((a) => d.scores[a].total))
          assert.equal(d.scores[p.invest[0]].total, top, `${p.id} 8: ${p.invest[0]} is the highest score`)
        }
        if (lv === 3) assert.equal(d.subclass?.id, p.subclass, `${p.id}: the recommended subclass was taken at 3`)
      }
      if (d0(ch).spellcasting) assert.ok(Object.keys(recommendSpells(ch, d0(ch))).length + Object.keys(recommendSpells(ch, d0(ch), { cantrips: true })).length > 0 || !p.spells?.length, `${p.id}: spells recommended`)
    }
  }
})
const d0 = (ch) => derive(ch)

test('glossary: every term readable, groups real, related terms exist, data terms covered', () => {
  const groups = new Set(GROUPS.map(([g]) => g))
  for (const t of GLOSSARY) {
    assert.ok(t.text && t.text.length > 20 && t.text.split(/(?<=\.)\s/).length <= 4, `${t.id}: text`)
    assert.ok(groups.has(t.group), `${t.id}: group ${t.group}`)
    for (const r of t.related || []) assert.ok(termById(r), `${t.id}: related ${r}`)
  }
  for (const a of ARMOR) assert.ok(termById(a.id), `armor ${a.id}`)
  for (const id of ['ac', 'hp', 'concentration', 'advantage', 'short-rest', 'long-rest', 'finesse', 'heavy', 'poisoned', 'exhaustion', 'STR', 'spell-save-dc']) assert.ok(termById(id), id)
})

test('term cards agree with the sheet: every armor\'s AC, weapon properties, the ability lines', () => {
  const ch = fighter(pathsFor('fighter')[0].id, { level: 5, equipment: { armor: 'chain-mail', shield: true, weapons: ['longsword', 'longbow', 'dagger'] } })
  for (const a of ARMOR) {
    const ac = derive({ ...ch, equipment: { ...ch.equipment, armor: a.id } }).ac.value
    assert.match(explain(a.id, ch).lines[0], new RegExp(`AC would be ${ac}:`), `${a.id}: AC ${ac}`)
    const row = explain(a.id, ch).table.rows[explain(a.id, ch).table.ids.indexOf(a.id)]
    assert.equal(row[1], String(ac), `${a.id}: table AC`)
  }
  const d = derive(ch)
  const fin = explain('finesse', ch).lines.join(' ')
  assert.match(fin, new RegExp(`Dagger: \\+${d.attacks.find((x) => x.id === 'dagger').toHit} to hit`))
  assert.match(explain('STR', ch).lines[1], new RegExp(`STR save \\+${d.saves.STR.value}`))
  assert.match(explain('ac', ch).lines[0], new RegExp(`Your AC is ${d.ac.value}`))
})

test('every term the UI links to exists in the glossary', () => {
  const ui = ['src/ui/sheet.jsx', 'src/ui/glossary.jsx'].map((f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')).join('\n')
  for (const m of ui.matchAll(/TITLE_TERM = \{([^}]+)\}/g)) for (const id of [...m[1].matchAll(/: '([^']+)'/g)].map((x) => x[1])) assert.ok(termById(id), `TITLE_TERM ${id}`)
})

test('a path whose subclass is an expansion falls back to a core one when expansions are off', () => {
  const p = Object.values(BUILDS).flat().find((x) => classById(x.id.split('.')[0]).subclasses.find((s) => s.id === x.subclass)?.expansion)
  if (!p) return
  const c = p.id.split('.')[0]
  const ch = { ...newCharacter(), classId: c, build: p.id, level: 3, speciesId: 'dwarf' }
  const d = derive(ch)
  const sub = d.pending.find((x) => x.kind === 'subclass')
  const core = { ...sub, options: sub.options.filter((o) => !o.expansion) }
  const rec = recommend(ch, d, core)
  assert.equal(Object.keys(rec).length, 1)
  assert.ok(!classById(c).subclasses.find((s) => s.id === Object.keys(rec)[0]).expansion)
})

test('backgrounds: all 16 of the 2024 rules, each with 3 abilities, a real origin feat, 2 real skills, a tool, an icon', async () => {
  const { BACKGROUNDS } = await import('../src/content/backgrounds.js')
  const { ICONS } = await import('../src/content/icons-data.js')
  assert.equal(BACKGROUNDS.length, 16)
  for (const b of BACKGROUNDS) {
    assert.equal(b.abilities.length, 3, b.id); assert.ok(b.abilities.every((a) => ABIL.includes(a)), b.id)
    assert.equal(featById(b.feat)?.category, 'origin', `${b.id}: feat ${b.feat}`)
    assert.equal(b.skills.length, 2); assert.ok(b.skills.every((s) => SKILLS.some((x) => x.id === s)), `${b.id}: skills`)
    assert.ok(b.tool && b.blurb, b.id); assert.ok(ICONS[`bg.${b.id}`], `${b.id}: icon`)
    // a level 1 character with it derives with no error and gets both skills
    const d = derive({ ...newCharacter(), classId: 'fighter', speciesId: 'dwarf', backgroundId: b.id, level: 1, scores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 } })
    for (const s of b.skills) assert.ok(d.skills.find((x) => x.id === s).prof, `${b.id}: ${s}`)
  }
})

test('a picked subclass stays in the choice list (done), so the picker does not vanish', () => {
  const ch = { ...newCharacter(), classId: 'bard', speciesId: 'dwarf', backgroundId: 'sage', level: 3, choices: { subclass: ['lore'] } }
  const c = derive(ch).choices.find((x) => x.kind === 'subclass')
  assert.ok(c && c.done && c.picked[0] === derive(ch).subclass?.id)
})
