// A campaign, simulated: a party of twelve (one per class) levels up from 1 to 20 through the same choices a player
// makes, fights, spends resources, and rests. At every level every number is checked against an independent oracle
// written here from the SRD 5.2 / 2024 class tables (not the engine's data), so a wrong table or formula shows up.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { derive, newCharacter, rest, spendHitDie } from '../src/engine/engine.js'
import { spellRoll } from '../src/engine/spells.js'
import { spellById } from '../src/content/spells.js'

// ── the oracle: SRD 5.2 tables, typed in by hand
const PROF = (l) => Math.ceil(l / 4) + 1
const mod = (s) => Math.floor((s - 10) / 2)
const FULL = { 1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2], 6: [4, 3, 3], 7: [4, 3, 3, 1], 8: [4, 3, 3, 2], 9: [4, 3, 3, 3, 1], 10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1], 12: [4, 3, 3, 3, 2, 1], 13: [4, 3, 3, 3, 2, 1, 1], 14: [4, 3, 3, 3, 2, 1, 1], 15: [4, 3, 3, 3, 2, 1, 1, 1], 16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1], 18: [4, 3, 3, 3, 3, 1, 1, 1, 1], 19: [4, 3, 3, 3, 3, 2, 1, 1, 1], 20: [4, 3, 3, 3, 3, 2, 2, 1, 1] }
const HALF = { 1: [2], 2: [2], 3: [3], 4: [3], 5: [4, 2], 6: [4, 2], 7: [4, 3], 8: [4, 3], 9: [4, 3, 2], 10: [4, 3, 2], 11: [4, 3, 3], 12: [4, 3, 3],
  13: [4, 3, 3, 1], 14: [4, 3, 3, 1], 15: [4, 3, 3, 2], 16: [4, 3, 3, 2], 17: [4, 3, 3, 3, 1], 18: [4, 3, 3, 3, 1], 19: [4, 3, 3, 3, 2], 20: [4, 3, 3, 3, 2] }
const PACT = (l) => [l >= 17 ? 4 : l >= 11 ? 3 : l >= 2 ? 2 : 1, l >= 9 ? 5 : Math.ceil(l / 2)]
const step = (l, table) => table.filter(([lv]) => l >= lv).at(-1)[1]
const CANTRIPS = { bard: [2, 3, 4], cleric: [3, 4, 5], druid: [2, 3, 4], sorcerer: [4, 5, 6], warlock: [2, 3, 4], wizard: [3, 4, 5] } // at 1, 4, 10
const PREPARED_FULL = [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]
const EXTRA_ATTACK = { fighter: [[1, 1], [5, 2], [11, 3], [20, 4]], barbarian: [[1, 1], [5, 2]], monk: [[1, 1], [5, 2]], paladin: [[1, 1], [5, 2]], ranger: [[1, 1], [5, 2]] }
const ASI_LEVELS = { fighter: [4, 6, 8, 12, 14, 16], rogue: [4, 8, 10, 12, 16] }
const RESOURCES = {
  barbarian: { rage: (l) => step(l, [[1, 2], [3, 3], [6, 4], [12, 5], [17, 6]]) },
  fighter: { 'second-wind': (l) => step(l, [[1, 2], [4, 3], [10, 4]]), 'action-surge': (l) => (l >= 17 ? 2 : l >= 2 ? 1 : 0), indomitable: (l) => step(l, [[1, 0], [9, 1], [13, 2], [17, 3]]) },
  monk: { focus: (l) => (l >= 2 ? l : 0) },
  cleric: { 'channel-divinity': (l) => step(l, [[1, 0], [2, 2], [6, 3], [18, 4]]) },
  paladin: { 'lay-on-hands': (l) => 5 * l, 'channel-divinity': (l) => step(l, [[1, 0], [3, 2], [11, 3]]) },
  druid: { 'wild-shape': (l) => step(l, [[1, 0], [2, 2], [6, 3], [17, 4]]) },
  ranger: { 'favored-enemy': (l) => step(l, [[1, 2], [5, 3], [9, 4], [13, 5], [17, 6]]) },
  sorcerer: { 'sorcery-points': (l) => (l >= 2 ? l : 0) },
}

// ── the party: SRD subclass for each, a species and background, standard array scores
const PARTY = [
  { cls: 'barbarian', species: 'goliath', bg: 'soldier', hd: 12, saves: ['STR', 'CON'], scores: { STR: 15, DEX: 13, CON: 14, INT: 8, WIS: 12, CHA: 10 }, bgPick: ['STR', 'CON'], main: 'STR', armor: null, weapon: 'greataxe', unarmored: ['DEX', 'CON'] },
  { cls: 'bard', species: 'elf', bg: 'acolyte', hd: 8, saves: ['DEX', 'CHA'], scores: { STR: 8, DEX: 14, CON: 13, INT: 10, WIS: 12, CHA: 15 }, bgPick: ['CHA', 'WIS'], main: 'CHA', caster: 'full', armor: 'leather', weapon: 'dagger' },
  { cls: 'cleric', species: 'dwarf', bg: 'acolyte', hd: 8, saves: ['WIS', 'CHA'], scores: { STR: 14, DEX: 10, CON: 13, INT: 8, WIS: 15, CHA: 12 }, bgPick: ['WIS', 'CHA'], main: 'WIS', caster: 'full', armor: 'scale-mail', shield: true, weapon: 'mace' },
  { cls: 'druid', species: 'gnome', bg: 'sage', hd: 8, saves: ['INT', 'WIS'], scores: { STR: 8, DEX: 13, CON: 14, INT: 12, WIS: 15, CHA: 10 }, bgPick: ['WIS', 'INT'], main: 'WIS', caster: 'full', armor: 'leather', shield: true, weapon: 'quarterstaff' },
  { cls: 'fighter', species: 'orc', bg: 'soldier', hd: 10, saves: ['STR', 'CON'], scores: { STR: 15, DEX: 13, CON: 14, INT: 8, WIS: 12, CHA: 10 }, bgPick: ['STR', 'CON'], main: 'STR', armor: 'chain-mail', shield: true, weapon: 'longsword' },
  { cls: 'monk', species: 'elf', bg: 'criminal', hd: 8, saves: ['STR', 'DEX'], scores: { STR: 12, DEX: 15, CON: 13, INT: 10, WIS: 14, CHA: 8 }, bgPick: ['DEX', 'CON'], main: 'DEX', armor: null, weapon: 'quarterstaff', unarmored: ['DEX', 'WIS'], alert: true },
  { cls: 'paladin', species: 'dragonborn', bg: 'soldier', hd: 10, saves: ['WIS', 'CHA'], scores: { STR: 15, DEX: 10, CON: 13, INT: 8, WIS: 12, CHA: 14 }, bgPick: ['STR', 'CON'], main: 'STR', spell: 'CHA', caster: 'half', armor: 'chain-mail', shield: true, weapon: 'longsword' },
  { cls: 'ranger', species: 'halfling', bg: 'soldier', hd: 10, saves: ['STR', 'DEX'], scores: { STR: 12, DEX: 15, CON: 13, INT: 10, WIS: 14, CHA: 8 }, bgPick: ['DEX', 'CON'], main: 'DEX', spell: 'WIS', caster: 'half', armor: 'studded-leather', weapon: 'shortsword' },
  { cls: 'rogue', species: 'tiefling', bg: 'criminal', hd: 8, saves: ['DEX', 'INT'], scores: { STR: 8, DEX: 15, CON: 13, INT: 14, WIS: 12, CHA: 10 }, bgPick: ['DEX', 'INT'], main: 'DEX', armor: 'leather', weapon: 'rapier', alert: true },
  { cls: 'sorcerer', species: 'goliath', bg: 'acolyte', hd: 6, saves: ['CON', 'CHA'], scores: { STR: 8, DEX: 13, CON: 14, INT: 10, WIS: 12, CHA: 15 }, bgPick: ['CHA', 'WIS'], main: 'CHA', caster: 'full', armor: null, weapon: 'dagger', draconic: true },
  { cls: 'warlock', species: 'tiefling', bg: 'acolyte', hd: 8, saves: ['WIS', 'CHA'], scores: { STR: 8, DEX: 13, CON: 14, INT: 10, WIS: 12, CHA: 15 }, bgPick: ['CHA', 'WIS'], main: 'CHA', caster: 'pact', armor: 'leather', weapon: 'dagger' },
  { cls: 'wizard', species: 'elf', bg: 'sage', hd: 6, saves: ['INT', 'WIS'], scores: { STR: 8, DEX: 13, CON: 14, INT: 15, WIS: 12, CHA: 10 }, bgPick: ['INT', 'CON'], main: 'INT', caster: 'full', armor: null, weapon: 'dagger' },
]
const ARMOR = { leather: [11, 'dex'], 'studded-leather': [12, 'dex'], 'scale-mail': [14, 'dex2'], 'chain-mail': [16, 'none'] }

/** The player's policy at each ASI: +2 to the main ability while it fits under 20, else +2 CON, else +1/+1. */
function asiPick(scores, main) {
  for (const a of [main, 'CON', 'DEX', 'WIS']) if (scores[a] <= 18) return { type: 'plus2', ability: a }
  const lows = Object.entries(scores).filter(([, v]) => v < 20).map(([a]) => a).slice(0, 2)
  return { type: 'plus1', abilities: lows }
}

/** Makes every open choice the way a player would (first options; ASIs by the policy above). */
function chooseAll(ch, P, tracked) {
  for (let guard = 0; guard < 20; guard++) {
    const d = derive(ch)
    const c = d.pending[0]
    if (!c) return ch
    let v
    if (c.kind === 'bg-abilities') v = { mode: '2-1', plus2: P.bgPick[0], plus1: P.bgPick[1] }
    else if (c.kind === 'asi') { v = asiPick(tracked, P.main); apply(tracked, v) }
    else if (c.kind === 'epic') { v = { type: 'feat', feat: 'boon-combat-prowess', ability: P.main }; tracked[P.main] = Math.min(30, tracked[P.main] + 1) }
    else {
      const opts = c.options.filter((o) => !o.disabled && !o.taken && !(c.kind === 'skill' && d.skills.find((s) => s.id === o.id)?.prof))
      v = [...c.picked, ...opts.map((o) => o.id).filter((id) => !c.picked.includes(id))].slice(0, c.count)
    }
    ch = { ...ch, choices: { ...ch.choices, [c.key]: v } }
  }
  throw new Error(`${P.cls}: choices never settle: ${derive(ch).pending.map((p) => p.key)}`)
}
const apply = (s, v) => { if (v.type === 'plus2') s[v.ability] = Math.min(20, s[v.ability] + 2); else for (const a of v.abilities) s[a] = Math.min(20, s[a] + 1) }

/** Everything the oracle expects at a level. */
function expected(P, level, sc) {
  const prof = PROF(level)
  const m = (a) => mod(sc[a])
  let hp = P.hd + m('CON') + (level - 1) * (P.hd / 2 + 1 + m('CON'))
  if (P.species === 'dwarf') hp += level // Dwarven Toughness
  if (P.draconic && level >= 3) hp += level // Draconic Resilience
  let ac
  if (P.armor) { const [base, dex] = ARMOR[P.armor]; ac = base + (dex === 'dex' ? m('DEX') : dex === 'dex2' ? Math.min(2, m('DEX')) : 0) }
  else if (P.unarmored) ac = 10 + m(P.unarmored[0]) + m(P.unarmored[1])
  else if (P.draconic && level >= 3) ac = 10 + m('DEX') + m('CHA')
  else ac = 10 + m('DEX')
  if (P.shield) ac += 2
  // class features that add save proficiencies: Monk 14 Disciplined Survivor (all), Rogue 15 Slippery Mind (WIS, CHA)
  const saveProf = new Set(P.saves)
  if (P.cls === 'monk' && level >= 14) for (const x of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) saveProf.add(x)
  if (P.cls === 'rogue' && level >= 15) { saveProf.add('WIS'); saveProf.add('CHA') }
  const out = { prof, hp, ac, init: m('DEX') + (P.alert ? prof : 0), saves: Object.fromEntries(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((a) => [a, m(a) + (saveProf.has(a) ? prof : 0)])) }
  out.attacks = EXTRA_ATTACK[P.cls] ? step(level, EXTRA_ATTACK[P.cls]) : 1
  const sa = P.spell || P.main
  if (P.caster) {
    out.dc = 8 + prof + m(sa); out.spellAttack = prof + m(sa)
    if (P.caster === 'full') out.slots = FULL[level]
    if (P.caster === 'half') out.slots = HALF[level]
    if (P.caster === 'pact') out.pact = PACT(level)
    if (CANTRIPS[P.cls]) out.cantrips = CANTRIPS[P.cls][level >= 10 ? 2 : level >= 4 ? 1 : 0]
    if (['bard', 'cleric', 'druid'].includes(P.cls)) out.prepared = PREPARED_FULL[level - 1]
  }
  out.resources = Object.fromEntries(Object.entries(RESOURCES[P.cls] || {}).map(([id, f]) => [id, f(level)]))
  if (P.cls === 'rogue') out.sneak = `${Math.ceil(level / 2)}d6`
  if (P.cls === 'fighter') out.crit = level >= 15 ? 18 : level >= 3 ? 19 : 20 // Champion
  if (P.cls === 'barbarian') out.rageDamage = step(level, [[1, 2], [9, 3], [16, 4]])
  if (P.cls === 'monk') out.martialArts = step(level, [[1, 'd6'], [5, 'd8'], [11, 'd10'], [17, 'd12']])
  return out
}

for (const P of PARTY) {
  test(`campaign: a ${P.cls} from level 1 to 20, every number at every level, fights and rests`, () => {
    const tracked = { ...P.scores }
    tracked[P.bgPick[0]] += 2; tracked[P.bgPick[1]] += 1
    let ch = { ...newCharacter(), name: P.cls, classId: P.cls, speciesId: P.species, backgroundId: P.bg, scores: { ...P.scores }, scoreMethod: 'standard',
      equipment: { pack: null, armor: P.armor, shield: !!P.shield, weapons: [P.weapon], gp: 0, items: '' } }
    ch = chooseAll(ch, P, tracked)
    const log = []
    for (let level = 1; level <= 20; level++) {
      if (level > 1) {
        // level up: average HP (what the app suggests), then the new choices
        ch = { ...ch, level, hpRolls: { ...ch.hpRolls, [level]: P.hd / 2 + 1 } }
        ch = chooseAll(ch, P, tracked)
      }
      if (P.cls === 'barbarian' && level === 20) { tracked.STR = Math.min(25, tracked.STR + 4); tracked.CON = Math.min(25, tracked.CON + 4) } // Primal Champion
      if (P.cls === 'monk' && level === 20) { tracked.DEX = Math.min(25, tracked.DEX + 4); tracked.WIS = Math.min(25, tracked.WIS + 4) } // Body and Mind
      const d = derive(ch)
      const e = expected(P, level, tracked)
      const at = `${P.cls} ${level}`
      assert.equal(d.pending.length, 0, `${at}: choices left`)
      for (const a of Object.keys(tracked)) assert.equal(d.scores[a].total, tracked[a], `${at}: ${a} score`)
      assert.equal(d.prof, e.prof, `${at}: proficiency`)
      assert.equal(d.hp.value, e.hp, `${at}: max HP ${d.hp.sources.map((s) => `${s.label}=${s.value}`).join(', ')}`)
      assert.equal(d.hp.sources.reduce((t, s) => t + s.value, 0), d.hp.value, `${at}: HP parts add up`)
      assert.equal(d.ac.value, e.ac, `${at}: AC ${d.ac.sources.map((s) => `${s.label}=${s.value}`).join(', ')}`)
      assert.equal(d.initiative.value, e.init, `${at}: initiative`)
      for (const a of Object.keys(e.saves)) assert.equal(d.saves[a].value, e.saves[a], `${at}: ${a} save`)
      for (const a of Object.keys(e.saves)) assert.equal(d.saves[a].parts.reduce((t, p) => t + p.value, 0), d.saves[a].value, `${at}: ${a} save parts add up`)
      assert.equal(d.attacksPerAction, e.attacks, `${at}: attacks per Attack action`)
      // the weapon attack: ability + proficiency, and its parts add up to the number shown
      const w = d.attacks.find((x) => x.id === P.weapon)
      assert.ok(w, `${at}: weapon attack`)
      assert.equal(w.toHitSources.reduce((t, p) => t + p.value, 0), w.toHit, `${at}: to-hit parts add up`)
      const best = ['dagger', 'rapier', 'shortsword'].includes(P.weapon) || P.cls === 'monk' ? Math.max(mod(tracked.STR), mod(tracked.DEX)) : mod(tracked.STR)
      assert.equal(w.toHit, best + e.prof, `${at}: ${P.weapon} to hit`)
      if (e.crit) assert.equal(w.crit, e.crit, `${at}: crits on`)
      if (P.caster) {
        const sc = d.spellcasting
        assert.equal(sc.dc.value, e.dc, `${at}: spell save DC`)
        assert.equal(sc.dc.parts.reduce((t, p) => t + p.value, 0), sc.dc.value, `${at}: DC parts add up`)
        assert.equal(sc.attack.value, e.spellAttack, `${at}: spell attack`)
        if (e.slots) assert.deepEqual(sc.slots.map((s) => s.max), e.slots, `${at}: spell slots`)
        if (e.pact) assert.deepEqual([sc.pact.count, sc.pact.level], e.pact, `${at}: pact slots`)
        if (e.cantrips != null) assert.equal(sc.cantripsMax, e.cantrips, `${at}: cantrips known`)
        if (e.prepared != null) assert.equal(sc.preparedMax, e.prepared, `${at}: prepared spells`)
      }
      for (const [id, max] of Object.entries(e.resources)) assert.equal(d.resources.find((r) => r.id === id)?.max || 0, max, `${at}: ${id} uses`)
      assert.equal(d.resources.find((r) => r.id === 'hit-dice').max, level, `${at}: hit dice`)
      if (e.sneak) assert.ok(d.actions.some((a) => a.roll && (typeof a.roll.expr === 'string' ? a.roll.expr : '').startsWith(e.sneak)) || JSON.stringify(d.actions).includes(e.sneak), `${at}: Sneak Attack ${e.sneak}`)
      if (e.rageDamage) assert.ok(JSON.stringify(d.actions.filter((a) => /rage/i.test(a.name)).map((a) => a.summary)).includes(`+${e.rageDamage}`), `${at}: Rage damage +${e.rageDamage}`)
      if (e.martialArts) assert.ok(d.attacks.some((x) => x.damageDie === `1${e.martialArts}` || x.damageDie === e.martialArts), `${at}: Martial Arts ${e.martialArts}`)

      // a fight at each tier's milestone: take damage (temp HP first), spend everything, short rest, then long rest
      if ([1, 3, 5, 8, 11, 15, 20].includes(level)) {
        let st = { ...ch.state, hp: d.hp.value, temp: 5, used: {}, conditions: [] }
        const dmg = Math.floor(d.hp.value * 0.6)
        // damage soaks temp HP first (the sheet's HP dialog does this)
        const fromTemp = Math.min(st.temp, dmg); st = { ...st, temp: st.temp - fromTemp, hp: Math.max(0, st.hp - (dmg - fromTemp)) }
        assert.equal(st.hp, d.hp.value - Math.max(0, dmg - 5), `${at}: damage after temp HP`)
        assert.equal(st.temp, Math.max(0, 5 - dmg), `${at}: temp HP left`)
        // spend every resource, slot and Hit Die
        const used = Object.fromEntries(d.resources.map((r) => [r.id, r.max]))
        ch = { ...ch, state: { ...st, used, concentration: P.caster ? 'bless' : null } }
        // spending a Hit Die on an empty pool does nothing
        assert.equal(spendHitDie(ch, 5), null, `${at}: no Hit Dice left to spend`)
        const sr = rest(ch, 'short')
        const after = derive({ ...ch, state: sr })
        for (const r of after.resources) {
          const meant = r.reset === 'short' ? 0 : r.short ? Math.max(0, r.max - r.short) : r.max
          if (r.id === 'hit-dice') assert.equal(sr.used[r.id], r.max, `${at}: a short rest gives back no Hit Dice`)
          else assert.equal(sr.used[r.id] || 0, meant, `${at}: short rest → ${r.id}`)
        }
        if (e.pact) assert.equal(sr.used['pact-slots'], 0, `${at}: pact slots back on a short rest`)
        assert.equal(sr.concentration, P.caster ? 'bless' : null, `${at}: a short rest leaves concentration to the player`)
        if (e.slots) assert.equal(sr.used['slot-1'], e.slots[0], `${at}: spell slots stay spent after a short rest`)
        const lr = rest({ ...ch, state: sr }, 'long')
        assert.equal(lr.hp, d.hp.value, `${at}: long rest → full HP`)
        assert.equal(lr.temp, 0, `${at}: long rest → no temp HP`)
        assert.equal(lr.concentration, null, `${at}: a long rest ends concentration`)
        for (const r of derive({ ...ch, state: lr }).resources) assert.equal(lr.used[r.id] || 0, 0, `${at}: long rest → ${r.id} back`)
        // a Hit Die after the rest heals die + CON, at least 1
        const hurt = { ...ch, state: { ...lr, hp: 1 } }
        const hd = spendHitDie(hurt, 1)
        assert.equal(hd.healed, Math.max(1, 1 + mod(tracked.CON)), `${at}: Hit Die heals roll + CON (min 1)`)
        ch = { ...ch, state: { ...lr, concentration: null } }
        log.push(`L${level}: HP ${d.hp.value} AC ${d.ac.value} prof +${d.prof}${P.caster ? ` DC ${d.spellcasting.dc.value}` : ''}`)
      }
    }
    assert.equal(log.length, 7)
  })
}

test('campaign: spells in the fights (cantrips grow with the caster, slots make spells stronger)', () => {
  const r = (id, level, castLevel, m = 4) => spellRoll(spellById(id), { level, castLevel, mod: m, ability: 'INT' }).expr
  // Fire Bolt across a career: 1d10, 2d10 at 5, 3d10 at 11, 4d10 at 17
  assert.deepEqual([1, 4, 5, 10, 11, 16, 17, 20].map((l) => r('fire-bolt', l)), ['1d10', '1d10', '2d10', '2d10', '3d10', '3d10', '4d10', '4d10'])
  // Fireball 8d6 at 3rd, +1d6 per slot level above (9th: 14d6)
  assert.deepEqual([3, 4, 5, 9].map((s) => r('fireball', 9, s)), ['8d6', '9d6', '10d6', '14d6'])
  // Cure Wounds 2d8 + modifier, +2d8 per level above 1
  assert.deepEqual([1, 2, 5].map((s) => r('cure-wounds', 9, s)), ['2d8+4', '4d8+4', '10d8+4'])
  // Eldritch Blast stays 1d10 per beam
  assert.equal(r('eldritch-blast', 17), '1d10')
})

test('campaign: exhaustion and conditions in a hard fight', () => {
  const P = PARTY.find((p) => p.cls === 'fighter')
  const ch = { ...newCharacter(), classId: 'fighter', level: 8, speciesId: 'orc', backgroundId: 'soldier', scores: { ...P.scores }, choices: { 'background.abilities': { mode: '2-1', plus2: 'STR', plus1: 'CON' } }, equipment: { armor: 'chain-mail', shield: true, weapons: ['longsword'] } }
  const fresh = derive(ch)
  const tired = derive({ ...ch, state: { ...ch.state, exhaustion: 2, conditions: ['poisoned'] } })
  assert.equal(tired.attacks.find((a) => a.id === 'longsword').toHit, fresh.attacks.find((a) => a.id === 'longsword').toHit - 4, 'exhaustion 2: -4 to hit')
  assert.equal(tired.saves.STR.value, fresh.saves.STR.value - 4, 'exhaustion 2: -4 to saves')
  assert.equal(tired.speed.value, fresh.speed.value - 10, 'exhaustion 2: -10 ft speed')
  assert.equal(tired.passivePerception, fresh.passivePerception, 'passive Perception is not a roll')
  // a long rest takes one level of Exhaustion away
  assert.equal(rest({ ...ch, state: { ...ch.state, exhaustion: 2 } }, 'long').exhaustion, 1)
})

test('campaign: PHB subclasses with their own tables (Eldritch Knight, Arcane Trickster, Battle Master)', () => {
  const THIRD = { 3: [2], 4: [3], 5: [3], 6: [3], 7: [4, 2], 8: [4, 2], 9: [4, 2], 10: [4, 3], 11: [4, 3], 12: [4, 3], 13: [4, 3, 2], 14: [4, 3, 2], 15: [4, 3, 2], 16: [4, 3, 3], 17: [4, 3, 3], 18: [4, 3, 3], 19: [4, 3, 3, 1], 20: [4, 3, 3, 1] }
  const scores = { STR: 16, DEX: 16, CON: 14, INT: 16, WIS: 10, CHA: 8 }
  for (let level = 3; level <= 20; level++) {
    const ek = derive({ ...newCharacter(), classId: 'fighter', subclassId: 'eldritch-knight', level, speciesId: 'dwarf', scores }).spellcasting
    assert.deepEqual(ek.slots.map((s) => s.max), THIRD[level], `Eldritch Knight ${level}: slots`)
    assert.equal(ek.dc.value, 8 + PROF(level) + 3, `Eldritch Knight ${level}: DC`)
    const at = derive({ ...newCharacter(), classId: 'rogue', subclassId: 'arcane-trickster', level, speciesId: 'dwarf', scores }).spellcasting
    assert.deepEqual(at.slots.map((s) => s.max), THIRD[level], `Arcane Trickster ${level}: slots`)
    const bm = derive({ ...newCharacter(), classId: 'fighter', subclassId: 'battle-master', level, speciesId: 'dwarf', scores })
    assert.equal(bm.resources.find((r) => r.id === 'superiority')?.max, step(level, [[3, 4], [7, 5], [15, 6]]), `Battle Master ${level}: superiority dice`)
    assert.equal(bm.resources.find((r) => r.id === 'superiority')?.reset, 'short', `Battle Master ${level}: back on a short rest`)
  }
})
