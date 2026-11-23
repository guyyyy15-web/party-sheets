// Barbarian and the eight spellcasting classes of the SRD 5.2 (CC-BY-4.0), levels 1-20, each with its SRD subclass,
// summarised in our own words. Same data model as classes.js; spell lists come from spells.js.
import { FEATS } from './feats.js'
import { WEAPONS, SKILLS } from './basics.js'
import { SPELLS } from './spells.js'

const asi = (level) => ({ id: `asi-${level}`, level, name: 'Ability Score Improvement', summary: '+2 to one ability, +1 to two, or a feat you qualify for.', asi: true })
const epicBoon = { id: 'epic-boon', level: 19, name: 'Epic Boon', summary: 'An Epic Boon feat (or another feat you qualify for).', asi: 'epic' }
const ASIS = [4, 8, 12, 16].map(asi)
const scale = (table) => (lvl) => table.filter(([l]) => lvl >= l).at(-1)?.[1] ?? 0
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)
const dc = (ab) => (c) => 8 + c.mod[ab] + c.prof
const atLeast1 = (n) => Math.max(1, n)

const masteryChoice = (count, filter) => ({
  key: 'weapons', label: 'Weapon Mastery', count, kind: 'weapon',
  options: () => WEAPONS.filter(filter).map((wp) => ({ id: wp.id, name: wp.name, summary: `${wp.mastery} mastery` })),
})
const fightingStyles = () => FEATS.filter((f) => f.category === 'fighting-style')
const expertiseChoice = (count, key = 'skills') => ({ key, label: 'Expertise', count, kind: 'expertise', options: (c) => c.proficientSkills() })
const spellOptions = (lists, maxLevel) => (c) => SPELLS
  .filter((s) => s.classes.some((x) => lists.includes(x)) && s.level <= (typeof maxLevel === 'function' ? maxLevel(c) : maxLevel))
  .map((s) => ({ id: s.id, name: s.name, summary: `${s.level ? `Level ${s.level}` : 'Cantrip'}: ${s.summary}` }))

// Spell slots by class level (index 0 = level 1), from the class tables of the SRD 5.2.
export const SLOTS_FULL = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
].map((row) => [...row, ...Array(9 - row.length).fill(0)])
// Paladin and Ranger (spell levels 1-5)
export const SLOTS_HALF = [
  [2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2],
  [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2],
].map((row) => [...row, ...Array(5 - row.length).fill(0)])
// Warlock Pact Magic: [number of slots, slot level]
export const PACT_SLOTS = [
  [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5],
]
/** Highest spell level this class level has slots for. */
export const maxSpellLevel = (slots, level) => {
  if (slots === 'pact') return PACT_SLOTS[Math.min(20, Math.max(1, level)) - 1][1]
  const row = (slots === 'half' ? SLOTS_HALF : SLOTS_FULL)[Math.min(20, Math.max(1, level)) - 1]
  return row.reduce((m, n, i) => (n > 0 ? i + 1 : m), 0)
}
/** Spell slots as trackable resources (back on a long rest). */
const slotResources = (table) => table[0].map((_, i) => ({
  type: 'resource', id: `slot-${i + 1}`, name: `Level ${i + 1} spell slots`, max: (c) => table[Math.min(20, c.level) - 1][i] || 0, reset: 'long',
}))
const pactResource = { type: 'resource', id: 'pact-slots', name: 'Pact Magic slots', max: (c) => PACT_SLOTS[Math.min(20, c.level) - 1][0], reset: 'short' }
const spellSave = (ab) => ({ type: 'note', save: { label: 'Spell save DC', dc: dc(ab) } })

const SAME = (n) => Array(20).fill(n)
const PREPARED_FULL = [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]
const PREPARED_HALF = [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15]
const cantripsFrom = (base) => Array.from({ length: 20 }, (_, i) => base + (i + 1 >= 4 ? 1 : 0) + (i + 1 >= 10 ? 1 : 0))

// ---------------------------------------------------------------- Barbarian
const rageDamage = scale([[1, 2], [9, 3], [16, 4]])
const notHeavy = (c) => c.armor?.type !== 'heavy'

export const BARBARIAN = {
  id: 'barbarian', name: 'Barbarian', hitDie: 12, primary: ['STR'], blurb: 'Rage-fuelled warrior: shrugs off blows and hits hard.',
  difficulty: 'Easy', saves: ['STR', 'CON'], armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'],
  skills: { count: 2, from: ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
  packs: [
    { id: 'a', name: 'Barbarian kit', items: "Greataxe, 4 Handaxes, Explorer's Pack, 15 GP", weapons: ['greataxe', 'handaxe'], gp: 15 },
    { id: 'b', name: 'Gold', items: '75 GP to buy your own', gp: 75 },
  ],
  subclassLevel: 3,
  scales: { rageDamage },
  features: [
    { id: 'rage', level: 1, name: 'Rage', summary: 'Bonus action, not in heavy armor: resist bludgeoning, piercing and slashing, bonus damage on STR attacks, advantage on STR checks and saves. No spells or concentration. One use back on a short rest.',
      effects: [
        { type: 'resource', id: 'rage', name: 'Rage', max: (c) => scale([[1, 2], [3, 3], [6, 4], [12, 5], [17, 6]])(c.level), reset: 'long', short: 1 },
        { type: 'action', id: 'rage', name: 'Rage', kind: 'bonus', cost: { resource: 'rage', amount: 1 }, summary: (c) => `Resistance to physical damage, +${rageDamage(c.level)} damage on STR attacks. Lasts while you keep attacking (up to 10 minutes).` },
      ] },
    { id: 'barbarian-unarmored-defense', level: 1, name: 'Unarmored Defense', summary: 'Without armor, AC = 10 + DEX + CON. A shield still counts.',
      effects: [{ type: 'ac', label: 'Unarmored Defense (10 + DEX + CON)', value: (c) => 10 + c.mod.DEX + c.mod.CON, when: (c) => !c.armor }] },
    { id: 'barbarian-mastery', level: 1, name: 'Weapon Mastery', summary: 'Use the mastery property of melee weapons you choose. Swap one on a long rest.',
      choices: [masteryChoice((c) => scale([[1, 2], [4, 3], [10, 4]])(c.level), (wp) => wp.cat.endsWith('melee'))] },
    { id: 'danger-sense', level: 2, name: 'Danger Sense', summary: 'Advantage on DEX saving throws unless you are Incapacitated.' },
    { id: 'reckless-attack', level: 2, name: 'Reckless Attack', summary: 'On your first attack of the turn: advantage on STR attacks until your next turn, but attacks against you have advantage too.',
      effects: [{ type: 'action', id: 'reckless-attack', name: 'Reckless Attack', kind: 'free', summary: 'Advantage on STR attacks; enemies get advantage on you.' }] },
    { id: 'primal-knowledge', level: 3, name: 'Primal Knowledge', summary: 'One more Barbarian skill. While raging, Acrobatics, Intimidation, Perception, Stealth and Survival checks can use STR.',
      choices: [{ key: 'skill', label: 'Barbarian skill', count: 1, kind: 'skill', options: (c) => ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'].map((id) => ({ id, name: SKILLS.find((s) => s.id === id).name })) }] },
    ASIS[0],
    { id: 'barbarian-extra-attack', level: 5, name: 'Extra Attack', summary: 'Attack twice when you take the Attack action.', effects: [{ type: 'attacks', value: () => 2 }] },
    { id: 'fast-movement', level: 5, name: 'Fast Movement', summary: '+10 ft speed while not in heavy armor.',
      effects: [{ type: 'bonus', target: 'speed', label: 'Fast Movement', value: () => 10, when: notHeavy }] },
    { id: 'feral-instinct', level: 7, name: 'Feral Instinct', summary: 'Advantage on initiative rolls.' },
    { id: 'instinctive-pounce', level: 7, name: 'Instinctive Pounce', summary: 'When you enter a Rage, also move up to half your speed.' },
    ASIS[1],
    { id: 'brutal-strike', level: 9, name: 'Brutal Strike', summary: 'With Reckless Attack, give up advantage on one STR attack: on a hit, extra damage plus Forceful Blow (push 15 ft) or Hamstring Blow (-15 ft speed).',
      effects: [{ type: 'action', id: 'brutal-strike', name: 'Brutal Strike', kind: 'free', summary: (c) => (c.level >= 17 ? 'Two different effects.' : 'One effect.'), roll: { label: 'Extra damage', expr: (c) => (c.level >= 17 ? '2d10' : '1d10'), why: 'Brutal Strike: 1d10 extra (2d10 from level 17), the same type as the weapon.' } }] },
    { id: 'relentless-rage', level: 11, name: 'Relentless Rage', summary: 'Drop to 0 HP while raging: DC 10 CON save (+5 each later use) to go to twice your barbarian level in HP instead. DC resets on a rest.' },
    ASIS[2],
    { id: 'improved-brutal-strike', level: 13, name: 'Improved Brutal Strike', summary: 'New Brutal Strike effects: Staggering Blow (disadvantage on its next save, no opportunity attacks) and Sundering Blow (+5 to the next attack on it).' },
    { id: 'persistent-rage', level: 15, name: 'Persistent Rage', summary: 'On initiative, regain all Rage uses (once per long rest). Rage lasts 10 minutes without extending it.',
      effects: [
        { type: 'resource', id: 'persistent-rage', name: 'Persistent Rage', max: () => 1, reset: 'long' },
        { type: 'action', id: 'persistent-rage', name: 'Persistent Rage', kind: 'free', cost: { resource: 'persistent-rage', amount: 1 }, summary: 'On initiative: Rage uses back to full.', refill: 'rage' },
      ] },
    ASIS[3],
    { id: 'improved-brutal-strike-17', level: 17, name: 'Improved Brutal Strike', summary: 'Brutal Strike deals 2d10 and you can use two different effects.' },
    { id: 'indomitable-might', level: 18, name: 'Indomitable Might', summary: 'A STR check or save total lower than your STR score uses the score instead.' },
    epicBoon,
    { id: 'primal-champion', level: 20, name: 'Primal Champion', summary: 'STR and CON +4 each, to a maximum of 25.', effects: [{ type: 'score', ability: 'STR', value: 4, max: 25 }, { type: 'score', ability: 'CON', value: 4, max: 25 }] },
  ],
  subclasses: [{
    id: 'berserker', name: 'Path of the Berserker', summary: 'Rage turned into pure violence.',
    features: [
      { id: 'frenzy', level: 3, name: 'Frenzy', summary: 'Reckless Attack while raging: the first target you hit with a STR attack takes extra d6s equal to your Rage Damage bonus.',
        effects: [{ type: 'action', id: 'frenzy', name: 'Frenzy', kind: 'free', summary: 'First STR hit of the turn while raging and reckless.', roll: { label: 'Extra damage', expr: (c) => `${rageDamage(c.level)}d6`, why: 'Frenzy: one d6 for each point of your Rage Damage bonus.' } }] },
      { id: 'mindless-rage', level: 6, name: 'Mindless Rage', summary: 'Immune to Charmed and Frightened while raging; entering a Rage ends them.' },
      { id: 'retaliation', level: 10, name: 'Retaliation', summary: 'Reaction when a creature within 5 ft damages you: one melee attack against it.',
        effects: [{ type: 'action', id: 'retaliation', name: 'Retaliation', kind: 'reaction', summary: 'One melee attack against the creature that hurt you.' }] },
      { id: 'intimidating-presence', level: 14, name: 'Intimidating Presence', summary: 'Bonus action: creatures you choose within 30 ft make a WIS save or are Frightened for 1 minute. Once per long rest, or spend a Rage use.',
        effects: [
          { type: 'resource', id: 'intimidating-presence', name: 'Intimidating Presence', max: () => 1, reset: 'long' },
          { type: 'action', id: 'intimidating-presence', name: 'Intimidating Presence', kind: 'bonus', cost: { resource: 'intimidating-presence', amount: 1 }, summary: 'Frighten creatures within 30 ft (or spend a Rage use).', save: { ability: 'WIS', dc: dc('STR') } },
        ] },
    ],
  }],
}

// ---------------------------------------------------------------- Bard
const bardicDie = scale([[1, 'd6'], [5, 'd8'], [10, 'd10'], [15, 'd12']])
const bardicUses = (c) => atLeast1(c.mod.CHA)

export const BARD = {
  id: 'bard', name: 'Bard', hitDie: 8, primary: ['CHA'], blurb: 'Inspiring performer: magic, skills and help for friends.',
  difficulty: 'Medium', saves: ['DEX', 'CHA'], armor: ['light'], weapons: ['simple'], tools: ['Three Musical Instruments of your choice'],
  skills: { count: 3, from: SKILLS.map((s) => s.id) },
  packs: [
    { id: 'a', name: 'Bard kit', items: "Leather Armor, 2 Daggers, a Musical Instrument, Entertainer's Pack, 19 GP", armor: 'leather', weapons: ['dagger'], gp: 19 },
    { id: 'b', name: 'Gold', items: '90 GP to buy your own', gp: 90 },
  ],
  subclassLevel: 3,
  scales: { bardicDie },
  spellcasting: { ability: 'CHA', kind: 'prepared', list: 'bard', cantrips: cantripsFrom(2), prepared: PREPARED_FULL, slots: 'full', ritual: true, focus: 'Musical Instrument' },
  features: [
    { id: 'bardic-inspiration', level: 1, name: 'Bardic Inspiration', summary: 'Bonus action: a creature within 60 ft gets your Bardic Inspiration die to add to one failed D20 Test within the hour. Uses = CHA modifier (min 1).',
      effects: [
        { type: 'resource', id: 'bardic-inspiration', name: 'Bardic Inspiration', max: bardicUses, reset: 'long', when: (c) => c.level < 5 },
        { type: 'resource', id: 'bardic-inspiration', name: 'Bardic Inspiration', max: bardicUses, reset: 'short', when: (c) => c.level >= 5 },
        { type: 'action', id: 'bardic-inspiration', name: 'Bardic Inspiration', kind: 'bonus', cost: { resource: 'bardic-inspiration', amount: 1 }, summary: (c) => `Give a creature a ${bardicDie(c.level)} for a failed D20 Test.`, roll: { label: 'Inspiration die', expr: (c) => `1${bardicDie(c.level)}`, why: 'Bardic Inspiration: d6, d8 at level 5, d10 at 10, d12 at 15.' } },
      ] },
    { id: 'bard-spellcasting', level: 1, name: 'Spellcasting', summary: 'Cast Bard spells with CHA; prepare spells and swap one each level. A musical instrument is your focus.',
      effects: [...slotResources(SLOTS_FULL), spellSave('CHA')] },
    { id: 'bard-expertise-2', level: 2, name: 'Expertise', summary: 'Double your proficiency bonus for two skills you are proficient in.', choices: [expertiseChoice(2)] },
    { id: 'jack-of-all-trades', level: 2, name: 'Jack of All Trades', summary: 'Add half your proficiency bonus (round down) to skill checks you are not proficient in.' },
    ASIS[0],
    { id: 'font-of-inspiration', level: 5, name: 'Font of Inspiration', summary: 'Bardic Inspiration comes back on a short rest too, and you can spend a spell slot to regain one use.' },
    { id: 'countercharm', level: 7, name: 'Countercharm', summary: 'Reaction when you or a creature within 30 ft fails a save against Charmed or Frightened: reroll it with advantage.',
      effects: [{ type: 'action', id: 'countercharm', name: 'Countercharm', kind: 'reaction', summary: 'Reroll a failed save against Charmed or Frightened, with advantage.' }] },
    ASIS[1],
    { id: 'bard-expertise-9', level: 9, name: 'Expertise', summary: 'Two more skills with expertise.', choices: [expertiseChoice(2)] },
    { id: 'magical-secrets', level: 10, name: 'Magical Secrets', summary: 'New prepared spells can come from the Bard, Cleric, Druid and Wizard lists.' },
    ASIS[2], ASIS[3],
    { id: 'superior-inspiration', level: 18, name: 'Superior Inspiration', summary: 'On initiative, regain Bardic Inspiration uses up to two.' },
    epicBoon,
    { id: 'words-of-creation', level: 20, name: 'Words of Creation', summary: 'Power Word Heal and Power Word Kill are always prepared, and each can hit a second creature within 10 ft of the first.',
      alwaysPrepared: { 20: ['power-word-heal', 'power-word-kill'] } },
  ],
  subclasses: [{
    id: 'lore', name: 'College of Lore', summary: 'Collector of secrets: extra skills, cutting words and spells from other lists.',
    features: [
      { id: 'lore-proficiencies', level: 3, name: 'Bonus Proficiencies', summary: 'Proficiency in three skills of your choice.',
        choices: [{ key: 'skills', label: 'Three skills', count: 3, kind: 'skill', options: (c) => c.skillOptions() }] },
      { id: 'cutting-words', level: 3, name: 'Cutting Words', summary: 'Reaction when a creature within 60 ft rolls damage or succeeds on a check or attack: spend Bardic Inspiration and subtract the die.',
        effects: [{ type: 'action', id: 'cutting-words', name: 'Cutting Words', kind: 'reaction', cost: { resource: 'bardic-inspiration', amount: 1 }, summary: 'Subtract your Bardic Inspiration die from its roll.', roll: { label: 'Subtract', expr: (c) => `1${bardicDie(c.level)}` } }] },
      { id: 'magical-discoveries', level: 6, name: 'Magical Discoveries', summary: 'Two always-prepared spells from the Cleric, Druid or Wizard lists (cantrips or levels you have slots for).',
        choices: [{ key: 'spells', label: 'Two spells', count: 2, kind: 'pick', options: spellOptions(['cleric', 'druid', 'wizard'], (c) => maxSpellLevel('full', c.level)) }] },
      { id: 'peerless-skill', level: 14, name: 'Peerless Skill', summary: 'Fail a check or attack: spend Bardic Inspiration and add the die. It is not spent if you still fail.',
        effects: [{ type: 'action', id: 'peerless-skill', name: 'Peerless Skill', kind: 'free', cost: { resource: 'bardic-inspiration', amount: 1 }, summary: 'Add your Bardic Inspiration die to a failed check or attack.', roll: { label: 'Add', expr: (c) => `1${bardicDie(c.level)}` } }] },
    ],
  }],
}

// ---------------------------------------------------------------- Cleric
const sparkDice = scale([[1, 1], [7, 2], [13, 3], [18, 4]])
const channelDivinity = (table) => ({ type: 'resource', id: 'channel-divinity', name: 'Channel Divinity', max: (c) => scale(table)(c.level), reset: 'long', short: 1 })

export const CLERIC = {
  id: 'cleric', name: 'Cleric', hitDie: 8, primary: ['WIS'], blurb: 'Divine caster: heals, protects and smites.',
  difficulty: 'Medium', saves: ['WIS', 'CHA'], armor: ['light', 'medium', 'shield'], weapons: ['simple'],
  skills: { count: 2, from: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
  packs: [
    { id: 'a', name: 'Cleric kit', items: "Chain Shirt, Shield, Mace, Holy Symbol, Priest's Pack, 7 GP", armor: 'chain-shirt', shield: true, weapons: ['mace'], gp: 7 },
    { id: 'b', name: 'Gold', items: '110 GP to buy your own', gp: 110 },
  ],
  subclassLevel: 3,
  spellcasting: { ability: 'WIS', kind: 'prepared', list: 'cleric', cantrips: cantripsFrom(3), prepared: PREPARED_FULL, slots: 'full', ritual: true, focus: 'Holy Symbol' },
  features: [
    { id: 'cleric-spellcasting', level: 1, name: 'Spellcasting', summary: 'Cast Cleric spells with WIS; change your prepared spells on a long rest. A holy symbol is your focus.',
      effects: [...slotResources(SLOTS_FULL), spellSave('WIS')] },
    { id: 'divine-order', level: 1, name: 'Divine Order', summary: 'Protector (martial weapons and heavy armor) or Thaumaturge (one more cantrip, +WIS to Arcana and Religion checks).',
      choices: [{ key: 'order', label: 'Divine Order', count: 1, options: () => [
        { id: 'protector', name: 'Protector', summary: 'Proficiency with martial weapons and training with heavy armor.' },
        { id: 'thaumaturge', name: 'Thaumaturge', summary: 'One extra Cleric cantrip; add your WIS modifier (min +1) to INT (Arcana or Religion) checks.' },
      ] }] },
    { id: 'cleric-channel-divinity', level: 2, name: 'Channel Divinity', summary: 'Divine Spark (heal or harm) or Turn Undead. One use back on a short rest.',
      effects: [
        channelDivinity([[2, 2], [6, 3], [18, 4]]),
        { type: 'action', id: 'divine-spark', name: 'Divine Spark', kind: 'action', cost: { resource: 'channel-divinity', amount: 1 }, summary: 'A creature within 30 ft: heal it, or CON save against necrotic or radiant damage (half on a success).',
          roll: { label: 'Heal or damage', expr: (c) => `${sparkDice(c.level)}d8${signed(c.mod.WIS)}`, parts: (c) => [{ label: 'WIS modifier', value: c.mod.WIS }], why: 'Divine Spark: 1d8 + WIS (2d8 at level 7, 3d8 at 13, 4d8 at 18).' }, save: { ability: 'CON', dc: dc('WIS') } },
        { type: 'action', id: 'turn-undead', name: 'Turn Undead', kind: 'action', cost: { resource: 'channel-divinity', amount: 1 }, summary: 'Undead of your choice within 30 ft: WIS save or Frightened and Incapacitated for 1 minute.', save: { ability: 'WIS', dc: dc('WIS') } },
      ] },
    ASIS[0],
    { id: 'sear-undead', level: 5, name: 'Sear Undead', summary: 'Turn Undead also deals radiant damage: a d8 per point of WIS modifier (min 1d8) to each Undead that fails.',
      effects: [{ type: 'action', id: 'sear-undead', name: 'Sear Undead', kind: 'free', summary: 'With Turn Undead, to each Undead that fails.', roll: { label: 'Radiant damage', expr: (c) => `${atLeast1(c.mod.WIS)}d8`, why: 'Sear Undead: one d8 per point of WIS modifier (at least 1d8).' } }] },
    { id: 'blessed-strikes', level: 7, name: 'Blessed Strikes', summary: 'Divine Strike (+1d8 necrotic or radiant on a weapon hit, once a turn) or Potent Spellcasting (+WIS to Cleric cantrip damage).',
      choices: [{ key: 'option', label: 'Blessed Strikes', count: 1, options: () => [
        { id: 'divine-strike', name: 'Divine Strike', summary: 'Once a turn, a weapon hit deals +1d8 necrotic or radiant (2d8 at level 14).',
          effects: [{ type: 'action', id: 'divine-strike', name: 'Divine Strike', kind: 'free', summary: 'Once a turn on a weapon hit.', roll: { label: 'Extra damage', expr: (c) => (c.level >= 14 ? '2d8' : '1d8') } }] },
        { id: 'potent-spellcasting', name: 'Potent Spellcasting', summary: 'Add your WIS modifier to Cleric cantrip damage. At 14, damaging cantrips also give temp HP (twice WIS).' },
      ] }] },
    ASIS[1],
    { id: 'divine-intervention', level: 10, name: 'Divine Intervention', summary: 'Magic action: cast any Cleric spell of level 5 or lower (no reaction spells) without a slot or material components. Once per long rest.',
      effects: [
        { type: 'resource', id: 'divine-intervention', name: 'Divine Intervention', max: () => 1, reset: 'long' },
        { type: 'action', id: 'divine-intervention', name: 'Divine Intervention', kind: 'action', cost: { resource: 'divine-intervention', amount: 1 }, summary: 'Cast a Cleric spell of level 5 or lower for free.' },
      ] },
    ASIS[2],
    { id: 'improved-blessed-strikes', level: 14, name: 'Improved Blessed Strikes', summary: 'Divine Strike becomes 2d8; Potent Spellcasting also grants temp HP equal to twice your WIS modifier.' },
    ASIS[3],
    epicBoon,
    { id: 'greater-divine-intervention', level: 20, name: 'Greater Divine Intervention', summary: 'Divine Intervention can cast Wish; if it does, it is unavailable for 2d4 long rests.' },
  ],
  subclasses: [{
    id: 'life', name: 'Life Domain', summary: 'Master healer: every healing spell does more.',
    features: [
      { id: 'disciple-of-life', level: 3, name: 'Disciple of Life', summary: 'Healing spells cast with a slot restore an extra 2 + the slot level HP.' },
      { id: 'life-domain-spells', level: 3, name: 'Life Domain Spells', summary: 'Always prepared: Aid, Bless, Cure Wounds, Lesser Restoration; then Mass Healing Word and Revivify (5), Aura of Life and Death Ward (7), Greater Restoration and Mass Cure Wounds (9).',
        alwaysPrepared: { 3: ['aid', 'bless', 'cure-wounds', 'lesser-restoration'], 5: ['mass-healing-word', 'revivify'], 7: ['aura-of-life', 'death-ward'], 9: ['greater-restoration', 'mass-cure-wounds'] } },
      { id: 'preserve-life', level: 3, name: 'Preserve Life', summary: 'Channel Divinity: share 5 x cleric level HP among Bloodied creatures within 30 ft, up to half their HP maximum.',
        effects: [{ type: 'action', id: 'preserve-life', name: 'Preserve Life', kind: 'action', cost: { resource: 'channel-divinity', amount: 1 }, summary: (c) => `Share ${5 * c.level} HP among Bloodied creatures within 30 ft.` }] },
      { id: 'blessed-healer', level: 6, name: 'Blessed Healer', summary: 'When a slot spell of yours heals someone else, you regain 2 + the slot level HP.' },
      { id: 'supreme-healing', level: 17, name: 'Supreme Healing', summary: 'Healing dice from your spells and Channel Divinity always roll their maximum.' },
    ],
  }],
}

// ---------------------------------------------------------------- Druid
const wildShapeUses = scale([[2, 2], [6, 3], [17, 4]])
const landTypes = [
  ['arid', 'Arid', 'fire', { 3: ['blur', 'burning-hands', 'fire-bolt'], 5: ['fireball'], 7: ['blight'], 9: ['wall-of-stone'] }],
  ['polar', 'Polar', 'cold', { 3: ['fog-cloud', 'hold-person', 'ray-of-frost'], 5: ['sleet-storm'], 7: ['ice-storm'], 9: ['cone-of-cold'] }],
  ['temperate', 'Temperate', 'lightning', { 3: ['misty-step', 'shocking-grasp', 'sleep'], 5: ['lightning-bolt'], 7: ['freedom-of-movement'], 9: ['tree-stride'] }],
  ['tropical', 'Tropical', 'poison', { 3: ['acid-splash', 'ray-of-sickness', 'web'], 5: ['stinking-cloud'], 7: ['polymorph'], 9: ['insect-plague'] }],
]

export const DRUID = {
  id: 'druid', name: 'Druid', hitDie: 8, primary: ['WIS'], blurb: 'Nature caster who turns into beasts.',
  difficulty: 'Hard', saves: ['INT', 'WIS'], armor: ['light', 'shield'], weapons: ['simple'], tools: ['Herbalism Kit'],
  skills: { count: 2, from: ['animal-handling', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] },
  packs: [
    { id: 'a', name: 'Druid kit', items: "Leather Armor, Shield, Sickle, Druidic Focus (Quarterstaff), Explorer's Pack, Herbalism Kit, 9 GP", armor: 'leather', shield: true, weapons: ['sickle', 'quarterstaff'], gp: 9 },
    { id: 'b', name: 'Gold', items: '50 GP to buy your own', gp: 50 },
  ],
  subclassLevel: 3,
  spellcasting: { ability: 'WIS', kind: 'prepared', list: 'druid', cantrips: cantripsFrom(2), prepared: PREPARED_FULL, slots: 'full', ritual: true, focus: 'Druidic Focus' },
  features: [
    { id: 'druid-spellcasting', level: 1, name: 'Spellcasting', summary: 'Cast Druid spells with WIS; change your prepared spells on a long rest. A druidic focus is your focus.',
      effects: [...slotResources(SLOTS_FULL), spellSave('WIS')] },
    { id: 'druidic', level: 1, name: 'Druidic', summary: 'You know the secret Druidic language, and Speak with Animals is always prepared.', alwaysPrepared: { 1: ['speak-with-animals'] } },
    { id: 'primal-order', level: 1, name: 'Primal Order', summary: 'Magician (one more cantrip, +WIS to Arcana and Nature checks) or Warden (martial weapons and medium armor).',
      choices: [{ key: 'order', label: 'Primal Order', count: 1, options: () => [
        { id: 'magician', name: 'Magician', summary: 'One extra Druid cantrip; add your WIS modifier (min +1) to INT (Arcana or Nature) checks.' },
        { id: 'warden', name: 'Warden', summary: 'Proficiency with martial weapons and training with medium armor.' },
      ] }] },
    { id: 'wild-shape', level: 2, name: 'Wild Shape', summary: 'Bonus action: turn into a Beast form you know, for half your druid level (round up) in hours. You gain temp HP equal to your druid level. One use back on a short rest.',
      effects: [
        { type: 'resource', id: 'wild-shape', name: 'Wild Shape', max: (c) => wildShapeUses(c.level), reset: 'long', short: 1 },
        { type: 'action', id: 'wild-shape', name: 'Wild Shape', kind: 'bonus', cost: { resource: 'wild-shape', amount: 1 },
          summary: (c) => `${scale([[2, 4], [4, 6], [8, 8]])(c.level)} known forms, CR up to ${scale([[2, '1/4'], [4, '1/2'], [8, '1']])(c.level)}${c.level >= 8 ? ', flying allowed' : ', no flying'}. ${c.level} temp HP, lasts ${Math.floor(c.level / 2)} hours.` },
      ] },
    { id: 'wild-companion', level: 2, name: 'Wild Companion', summary: 'Magic action: spend a spell slot or a Wild Shape use to cast Find Familiar (a Fey familiar until your next long rest).',
      effects: [{ type: 'action', id: 'wild-companion', name: 'Wild Companion', kind: 'action', cost: { resource: 'wild-shape', amount: 1 }, summary: 'Cast Find Familiar (or spend a spell slot instead).' }] },
    ASIS[0],
    { id: 'wild-resurgence', level: 5, name: 'Wild Resurgence', summary: 'Out of Wild Shape: once a turn, spend a spell slot for a use. Once per long rest, turn a Wild Shape use into a level 1 slot.' },
    { id: 'elemental-fury', level: 7, name: 'Elemental Fury', summary: 'Potent Spellcasting (+WIS to Druid cantrip damage) or Primal Strike (+1d8 cold, fire, lightning or thunder on a weapon or beast hit, once a turn).',
      choices: [{ key: 'option', label: 'Elemental Fury', count: 1, options: () => [
        { id: 'potent-spellcasting', name: 'Potent Spellcasting', summary: 'Add your WIS modifier to Druid cantrip damage. At 15, cantrips with 10+ ft range reach 300 ft farther.' },
        { id: 'primal-strike', name: 'Primal Strike', summary: 'Once a turn, a weapon or Beast-form hit deals +1d8 cold, fire, lightning or thunder (2d8 at level 15).',
          effects: [{ type: 'action', id: 'primal-strike', name: 'Primal Strike', kind: 'free', summary: 'Once a turn on a hit.', roll: { label: 'Extra damage', expr: (c) => (c.level >= 15 ? '2d8' : '1d8') } }] },
      ] }] },
    ASIS[1], ASIS[2],
    { id: 'improved-elemental-fury', level: 15, name: 'Improved Elemental Fury', summary: 'Primal Strike becomes 2d8; Potent Spellcasting adds 300 ft to cantrip range.' },
    ASIS[3],
    { id: 'beast-spells', level: 18, name: 'Beast Spells', summary: 'Cast spells in Wild Shape, except ones with costly or consumed materials.' },
    epicBoon,
    { id: 'archdruid', level: 20, name: 'Archdruid', summary: 'Regain a Wild Shape use on initiative if you have none. Once per long rest, turn Wild Shape uses into a spell slot (2 levels each). You age slowly.' },
  ],
  subclasses: [{
    id: 'land', name: 'Circle of the Land', summary: 'Keeper of old rites: spells and protection from the land you choose.',
    features: [
      { id: 'circle-of-the-land-spells', level: 3, name: 'Circle of the Land Spells', summary: 'After each long rest pick a land (arid, polar, temperate, tropical): its circle spells for your level are prepared.',
        choices: [{ key: 'land', label: 'Land', count: 1, options: () => landTypes.map(([id, name, damage, spells]) => ({ id, name, summary: `Circle spells: ${Object.values(spells).flat().join(', ')}. Nature's Ward: ${damage}.`, alwaysPrepared: spells,
          effects: [{ type: 'resist', damage, when: (c) => c.level >= 10 }] })) }] },
      { id: 'lands-aid', level: 3, name: "Land's Aid", summary: 'Magic action, one Wild Shape use: creatures in a 10-ft sphere within 60 ft make a CON save for necrotic damage (half on a success); one creature there heals the same dice.',
        effects: [{ type: 'action', id: 'lands-aid', name: "Land's Aid", kind: 'action', cost: { resource: 'wild-shape', amount: 1 }, summary: 'Damage creatures you choose and heal one.', roll: { label: 'Damage / heal', expr: (c) => `${scale([[3, 2], [10, 3], [14, 4]])(c.level)}d6`, why: "Land's Aid: 2d6, 3d6 at level 10, 4d6 at 14." }, save: { ability: 'CON', dc: dc('WIS') } }] },
      { id: 'natural-recovery', level: 6, name: 'Natural Recovery', summary: 'Once per long rest, cast one circle spell without a slot. Once per long rest on a short rest, recover slots totalling half your druid level (no level 6+).',
        effects: [
          { type: 'resource', id: 'natural-recovery-cast', name: 'Natural Recovery (free circle spell)', max: () => 1, reset: 'long' },
          { type: 'resource', id: 'natural-recovery', name: 'Natural Recovery (slots)', max: () => 1, reset: 'long' },
        ] },
      { id: 'natures-ward', level: 10, name: "Nature's Ward", summary: 'Immune to Poisoned, and resistance to the damage type of your current land (fire, cold, lightning or poison).' },
      { id: 'natures-sanctuary', level: 14, name: "Nature's Sanctuary", summary: "Magic action, one Wild Shape use: a 15-ft cube of spectral trees within 120 ft for 1 minute; you and allies there have half cover, allies gain your Nature's Ward resistance.",
        effects: [{ type: 'action', id: 'natures-sanctuary', name: "Nature's Sanctuary", kind: 'action', cost: { resource: 'wild-shape', amount: 1 }, summary: 'Half cover and resistance in a 15-ft cube for 1 minute.' }] },
    ],
  }],
}

// ---------------------------------------------------------------- Paladin
export const PALADIN = {
  id: 'paladin', name: 'Paladin', hitDie: 10, primary: ['STR', 'CHA'], blurb: 'Holy warrior: heavy armor, healing hands, smites.',
  difficulty: 'Easy', saves: ['WIS', 'CHA'], armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'],
  skills: { count: 2, from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
  packs: [
    { id: 'a', name: 'Paladin kit', items: "Chain Mail, Shield, Longsword, 6 Javelins, Holy Symbol, Priest's Pack, 9 GP", armor: 'chain-mail', shield: true, weapons: ['longsword', 'javelin'], gp: 9 },
    { id: 'b', name: 'Gold', items: '150 GP to buy your own', gp: 150 },
  ],
  subclassLevel: 3,
  spellcasting: { ability: 'CHA', kind: 'prepared', list: 'paladin', cantrips: SAME(0), prepared: PREPARED_HALF, slots: 'half', ritual: true, focus: 'Holy Symbol' },
  features: [
    { id: 'lay-on-hands', level: 1, name: 'Lay On Hands', summary: 'A pool of 5 x paladin level HP. Bonus action: touch a creature and restore HP from the pool, or spend 5 to end Poisoned.',
      effects: [
        { type: 'resource', id: 'lay-on-hands', name: 'Lay On Hands pool', max: (c) => 5 * c.level, reset: 'long' },
        { type: 'action', id: 'lay-on-hands', name: 'Lay On Hands', kind: 'bonus', cost: { resource: 'lay-on-hands', amount: 1, variable: true }, summary: (c) => `Restore any number of HP from your pool of ${5 * c.level}, or 5 to end Poisoned.` },
      ] },
    { id: 'paladin-spellcasting', level: 1, name: 'Spellcasting', summary: 'Cast Paladin spells with CHA; swap one prepared spell on a long rest. A holy symbol is your focus.',
      effects: [...slotResources(SLOTS_HALF), spellSave('CHA')] },
    { id: 'paladin-mastery', level: 1, name: 'Weapon Mastery', summary: 'Use the mastery property of two weapons you choose. Change them on a long rest.',
      choices: [masteryChoice(() => 2, () => true)] },
    { id: 'paladin-fighting-style', level: 2, name: 'Fighting Style', summary: 'A Fighting Style feat, or Blessed Warrior: two Cleric cantrips that use CHA.',
      choices: [{ key: 'style', label: 'Fighting Style', count: 1, kind: 'feat', options: () => [...fightingStyles(), { id: 'blessed-warrior', name: 'Blessed Warrior', summary: 'Two Cleric cantrips (they count as Paladin spells and use CHA).' }] }] },
    { id: 'paladins-smite', level: 2, name: "Paladin's Smite", summary: 'Divine Smite is always prepared, and you can cast it once per long rest without a slot.', alwaysPrepared: { 2: ['divine-smite'] },
      effects: [
        { type: 'resource', id: 'paladins-smite', name: 'Free Divine Smite', max: () => 1, reset: 'long' },
        { type: 'action', id: 'divine-smite', name: 'Divine Smite', kind: 'bonus', summary: 'Right after a melee hit: +2d8 radiant (+1d8 per slot level above 1, +1d8 vs Fiends and Undead).', roll: { label: 'Radiant damage', expr: () => '2d8', why: 'Divine Smite with a level 1 slot (or the free use): 2d8 radiant.' } },
      ] },
    { id: 'paladin-channel-divinity', level: 3, name: 'Channel Divinity', summary: 'Divine Sense, plus options from your oath. One use back on a short rest.',
      effects: [
        channelDivinity([[3, 2], [11, 3]]),
        { type: 'action', id: 'divine-sense', name: 'Divine Sense', kind: 'bonus', cost: { resource: 'channel-divinity', amount: 1 }, summary: 'For 10 minutes, sense Celestials, Fiends and Undead within 60 ft.' },
      ] },
    ASIS[0],
    { id: 'paladin-extra-attack', level: 5, name: 'Extra Attack', summary: 'Attack twice when you take the Attack action.', effects: [{ type: 'attacks', value: () => 2 }] },
    { id: 'faithful-steed', level: 5, name: 'Faithful Steed', summary: 'Find Steed is always prepared, and you can cast it once per long rest without a slot.', alwaysPrepared: { 5: ['find-steed'] },
      effects: [{ type: 'resource', id: 'faithful-steed', name: 'Free Find Steed', max: () => 1, reset: 'long' }] },
    { id: 'aura-of-protection', level: 6, name: 'Aura of Protection', summary: 'You and allies within 10 ft (30 ft at 18) add your CHA modifier (min +1) to saving throws while you are not Incapacitated.' },
    ASIS[1],
    { id: 'abjure-foes', level: 9, name: 'Abjure Foes', summary: 'Magic action, Channel Divinity: up to CHA modifier creatures within 60 ft make a WIS save or are Frightened (and limited to one thing per turn) for 1 minute, or until the creature takes damage.',
      effects: [{ type: 'action', id: 'abjure-foes', name: 'Abjure Foes', kind: 'action', cost: { resource: 'channel-divinity', amount: 1 }, summary: (c) => `Up to ${atLeast1(c.mod.CHA)} creatures within 60 ft.`, save: { ability: 'WIS', dc: dc('CHA') } }] },
    { id: 'aura-of-courage', level: 10, name: 'Aura of Courage', summary: 'You and allies in your aura are immune to Frightened.' },
    { id: 'radiant-strikes', level: 11, name: 'Radiant Strikes', summary: 'Your melee weapon and unarmed hits deal an extra 1d8 radiant.',
      effects: [{ type: 'action', id: 'radiant-strikes', name: 'Radiant Strikes', kind: 'free', summary: 'Every melee weapon or unarmed hit.', roll: { label: 'Extra damage', expr: () => '1d8' } }] },
    ASIS[2],
    { id: 'restoring-touch', level: 14, name: 'Restoring Touch', summary: 'Lay On Hands can also end Blinded, Charmed, Deafened, Frightened, Paralyzed or Stunned, 5 points from the pool each.' },
    ASIS[3],
    { id: 'aura-expansion', level: 18, name: 'Aura Expansion', summary: 'Your Aura of Protection reaches 30 ft.' },
    epicBoon,
  ],
  subclasses: [{
    id: 'devotion', name: 'Oath of Devotion', summary: 'The knight in shining armor: justice, honesty, protection.',
    features: [
      { id: 'devotion-spells', level: 3, name: 'Oath of Devotion Spells', summary: 'Always prepared: Protection from Evil and Good, Shield of Faith; Aid, Zone of Truth (5); Beacon of Hope, Dispel Magic (9); Freedom of Movement, Guardian of Faith (13); Commune, Flame Strike (17).',
        alwaysPrepared: { 3: ['protection-from-evil-and-good', 'shield-of-faith'], 5: ['aid', 'zone-of-truth'], 9: ['beacon-of-hope', 'dispel-magic'], 13: ['freedom-of-movement', 'guardian-of-faith'], 17: ['commune', 'flame-strike'] } },
      { id: 'sacred-weapon', level: 3, name: 'Sacred Weapon', summary: 'When you Attack, Channel Divinity: for 10 minutes add CHA (min +1) to attacks with a melee weapon, which can deal radiant damage and sheds light.',
        effects: [{ type: 'action', id: 'sacred-weapon', name: 'Sacred Weapon', kind: 'free', cost: { resource: 'channel-divinity', amount: 1 }, summary: (c) => `+${atLeast1(c.mod.CHA)} to attack rolls with one melee weapon for 10 minutes.` }] },
      { id: 'aura-of-devotion', level: 7, name: 'Aura of Devotion', summary: 'You and allies in your aura are immune to Charmed.' },
      { id: 'smite-of-protection', level: 15, name: 'Smite of Protection', summary: 'When you cast Divine Smite, you and allies in your aura have half cover until your next turn.' },
      { id: 'holy-nimbus', level: 20, name: 'Holy Nimbus', summary: 'Bonus action for 10 minutes: advantage on saves forced by Fiends or Undead, enemies starting in your aura take CHA + proficiency radiant, and it sheds sunlight. Once per long rest or a level 5 slot.',
        effects: [
          { type: 'resource', id: 'holy-nimbus', name: 'Holy Nimbus', max: () => 1, reset: 'long' },
          { type: 'action', id: 'holy-nimbus', name: 'Holy Nimbus', kind: 'bonus', cost: { resource: 'holy-nimbus', amount: 1 }, summary: (c) => `Enemies starting their turn in your aura take ${c.mod.CHA + c.prof} radiant.` },
        ] },
    ],
  }],
}

// ---------------------------------------------------------------- Ranger
export const RANGER = {
  id: 'ranger', name: 'Ranger', hitDie: 10, primary: ['DEX', 'WIS'], blurb: 'Wilderness hunter: weapons, tracking and nature magic.',
  difficulty: 'Medium', saves: ['STR', 'DEX'], armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'],
  skills: { count: 3, from: ['animal-handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'] },
  packs: [
    { id: 'a', name: 'Ranger kit', items: "Studded Leather Armor, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Druidic Focus, Explorer's Pack, 7 GP", armor: 'studded-leather', weapons: ['scimitar', 'shortsword', 'longbow'], gp: 7 },
    { id: 'b', name: 'Gold', items: '150 GP to buy your own', gp: 150 },
  ],
  subclassLevel: 3,
  spellcasting: { ability: 'WIS', kind: 'prepared', list: 'ranger', cantrips: SAME(0), prepared: PREPARED_HALF, slots: 'half', ritual: true, focus: 'Druidic Focus' },
  features: [
    { id: 'ranger-spellcasting', level: 1, name: 'Spellcasting', summary: 'Cast Ranger spells with WIS; swap one prepared spell on a long rest. A druidic focus is your focus.',
      effects: [...slotResources(SLOTS_HALF), spellSave('WIS')] },
    { id: 'favored-enemy', level: 1, name: 'Favored Enemy', summary: "Hunter's Mark is always prepared, and you can cast it a few times per long rest without a slot.", alwaysPrepared: { 1: ['hunters-mark'] },
      effects: [
        { type: 'resource', id: 'favored-enemy', name: "Free Hunter's Mark", max: (c) => scale([[1, 2], [5, 3], [9, 4], [13, 5], [17, 6]])(c.level), reset: 'long' },
        { type: 'action', id: 'hunters-mark', name: "Hunter's Mark", kind: 'bonus', cost: { resource: 'favored-enemy', amount: 1 }, summary: 'Mark a creature: your attack hits on it deal extra force damage (concentration, 1 hour).', roll: { label: 'Extra damage', expr: (c) => (c.level >= 20 ? '1d10' : '1d6'), why: "Hunter's Mark: 1d6 force on each hit (1d10 with Foe Slayer)." } },
      ] },
    { id: 'ranger-mastery', level: 1, name: 'Weapon Mastery', summary: 'Use the mastery property of two weapons you choose. Change them on a long rest.',
      choices: [masteryChoice(() => 2, () => true)] },
    { id: 'deft-explorer', level: 2, name: 'Deft Explorer', summary: 'Expertise in one skill you are proficient in, and two languages.', choices: [expertiseChoice(1)] },
    { id: 'ranger-fighting-style', level: 2, name: 'Fighting Style', summary: 'A Fighting Style feat, or Druidic Warrior: two Druid cantrips that use WIS.',
      choices: [{ key: 'style', label: 'Fighting Style', count: 1, kind: 'feat', options: () => [...fightingStyles(), { id: 'druidic-warrior', name: 'Druidic Warrior', summary: 'Two Druid cantrips (they count as Ranger spells and use WIS).' }] }] },
    ASIS[0],
    { id: 'ranger-extra-attack', level: 5, name: 'Extra Attack', summary: 'Attack twice when you take the Attack action.', effects: [{ type: 'attacks', value: () => 2 }] },
    { id: 'roving', level: 6, name: 'Roving', summary: '+10 ft speed while not in heavy armor, and climb and swim speeds equal to your speed.',
      effects: [{ type: 'bonus', target: 'speed', label: 'Roving', value: () => 10, when: notHeavy }] },
    ASIS[1],
    { id: 'ranger-expertise', level: 9, name: 'Expertise', summary: 'Expertise in two more skills you are proficient in.', choices: [expertiseChoice(2)] },
    { id: 'tireless', level: 10, name: 'Tireless', summary: 'Magic action: gain 1d8 + WIS temp HP, WIS modifier times (min 1) per long rest. A short rest lowers Exhaustion by 1.',
      effects: [
        { type: 'resource', id: 'tireless', name: 'Tireless', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
        { type: 'action', id: 'tireless', name: 'Tireless', kind: 'action', cost: { resource: 'tireless', amount: 1 }, summary: 'Gain temporary hit points (at least 1).', roll: { label: 'Temp HP', expr: (c) => `1d8${signed(c.mod.WIS)}`, parts: (c) => [{ label: 'WIS modifier', value: c.mod.WIS }], why: 'Tireless: 1d8 + WIS, at least 1.' } },
      ] },
    ASIS[2],
    { id: 'relentless-hunter', level: 13, name: 'Relentless Hunter', summary: "Damage can't break your concentration on Hunter's Mark." },
    { id: 'natures-veil', level: 14, name: "Nature's Veil", summary: 'Bonus action: Invisible until the end of your next turn. WIS modifier uses (min 1) per long rest.',
      effects: [
        { type: 'resource', id: 'natures-veil', name: "Nature's Veil", max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
        { type: 'action', id: 'natures-veil', name: "Nature's Veil", kind: 'bonus', cost: { resource: 'natures-veil', amount: 1 }, summary: 'Invisible until the end of your next turn.' },
      ] },
    ASIS[3],
    { id: 'precise-hunter', level: 17, name: 'Precise Hunter', summary: "Advantage on attacks against the creature marked by your Hunter's Mark." },
    { id: 'feral-senses', level: 18, name: 'Feral Senses', summary: 'Blindsight 30 ft.', effects: [{ type: 'sense', name: 'Blindsight', range: 30 }] },
    epicBoon,
    { id: 'foe-slayer', level: 20, name: 'Foe Slayer', summary: "Hunter's Mark deals a d10 instead of a d6." },
  ],
  subclasses: [{
    id: 'hunter', name: 'Hunter', summary: 'Protector of the wild: tactics against big foes and hordes.',
    features: [
      { id: 'hunters-lore', level: 3, name: "Hunter's Lore", summary: "You know the immunities, resistances and vulnerabilities of a creature under your Hunter's Mark." },
      { id: 'hunters-prey', level: 3, name: "Hunter's Prey", summary: 'Colossus Slayer (+1d8 once a turn against a wounded target) or Horde Breaker (one extra attack on a second creature nearby). Swap on a rest.',
        choices: [{ key: 'option', label: "Hunter's Prey", count: 1, options: () => [
          { id: 'colossus-slayer', name: 'Colossus Slayer', summary: 'Once a turn, a weapon hit on a creature missing HP deals +1d8.',
            effects: [{ type: 'action', id: 'colossus-slayer', name: 'Colossus Slayer', kind: 'free', summary: 'Once a turn, against a wounded target.', roll: { label: 'Extra damage', expr: () => '1d8' } }] },
          { id: 'horde-breaker', name: 'Horde Breaker', summary: 'Once a turn, attack another creature within 5 ft of your target with the same weapon.' },
        ] }] },
      { id: 'defensive-tactics', level: 7, name: 'Defensive Tactics', summary: 'Escape the Horde (opportunity attacks against you have disadvantage) or Multiattack Defense (after a hit, its other attacks on you have disadvantage). Swap on a rest.',
        choices: [{ key: 'option', label: 'Defensive Tactics', count: 1, options: () => [
          { id: 'escape-the-horde', name: 'Escape the Horde', summary: 'Opportunity attacks against you have disadvantage.' },
          { id: 'multiattack-defense', name: 'Multiattack Defense', summary: 'A creature that hits you has disadvantage on its other attacks against you this turn.' },
        ] }] },
      { id: 'superior-hunters-prey', level: 11, name: "Superior Hunter's Prey", summary: "Once a turn, when you damage your marked creature, deal Hunter's Mark damage to another creature within 30 ft of it too." },
      { id: 'superior-hunters-defense', level: 15, name: "Superior Hunter's Defense", summary: 'Reaction when you take damage: resistance to that damage type until the end of the turn.',
        effects: [{ type: 'action', id: 'superior-hunters-defense', name: "Superior Hunter's Defense", kind: 'reaction', summary: 'Resistance to that damage type this turn.' }] },
    ],
  }],
}

// ---------------------------------------------------------------- Sorcerer
const METAMAGIC = [
  ['careful', 'Careful Spell', 1, 'Up to CHA modifier creatures auto-succeed on the save and take no damage on a half-damage save.'],
  ['distant', 'Distant Spell', 1, 'Double the range, or make a touch spell 30 ft.'],
  ['empowered', 'Empowered Spell', 1, 'Reroll up to CHA modifier damage dice. Stacks with another option.'],
  ['extended', 'Extended Spell', 1, 'Double a duration of 1 minute or more (max 24 hours); advantage on concentration saves.'],
  ['heightened', 'Heightened Spell', 2, 'One target has disadvantage on saves against the spell.'],
  ['quickened', 'Quickened Spell', 2, 'Cast an action spell as a bonus action (no other level 1+ spell that turn).'],
  ['seeking', 'Seeking Spell', 1, 'Reroll a missed spell attack. Stacks with another option.'],
  ['subtle', 'Subtle Spell', 1, 'Cast with no verbal, somatic or (cheap) material components.'],
  ['transmuted', 'Transmuted Spell', 1, 'Swap acid, cold, fire, lightning, poison or thunder damage for another of them.'],
  ['twinned', 'Twinned Spell', 1, 'Raise the spell\'s effective level by 1 for spells that gain targets that way.'],
]

export const SORCERER = {
  id: 'sorcerer', name: 'Sorcerer', hitDie: 6, primary: ['CHA'], blurb: 'Born with magic: bends spells with Sorcery Points.',
  difficulty: 'Hard', saves: ['CON', 'CHA'], armor: [], weapons: ['simple'],
  skills: { count: 2, from: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
  packs: [
    { id: 'a', name: 'Sorcerer kit', items: "Spear, 2 Daggers, Arcane Focus (crystal), Dungeoneer's Pack, 28 GP", weapons: ['spear', 'dagger'], gp: 28 },
    { id: 'b', name: 'Gold', items: '50 GP to buy your own', gp: 50 },
  ],
  subclassLevel: 3,
  spellcasting: { ability: 'CHA', kind: 'prepared', list: 'sorcerer', cantrips: cantripsFrom(4), prepared: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22], slots: 'full', ritual: true, focus: 'Arcane Focus' },
  features: [
    { id: 'sorcerer-spellcasting', level: 1, name: 'Spellcasting', summary: 'Cast Sorcerer spells with CHA; swap one prepared spell each level. An arcane focus is your focus.',
      effects: [...slotResources(SLOTS_FULL), spellSave('CHA')] },
    { id: 'innate-sorcery', level: 1, name: 'Innate Sorcery', summary: 'Bonus action for 1 minute: +1 to your Sorcerer spell save DC and advantage on Sorcerer spell attacks. Twice per long rest.',
      effects: [
        { type: 'resource', id: 'innate-sorcery', name: 'Innate Sorcery', max: () => 2, reset: 'long' },
        { type: 'action', id: 'innate-sorcery', name: 'Innate Sorcery', kind: 'bonus', cost: { resource: 'innate-sorcery', amount: 1 }, summary: (c) => `1 minute: spell save DC ${8 + c.mod.CHA + c.prof + 1}, advantage on spell attacks.` },
      ] },
    { id: 'font-of-magic', level: 2, name: 'Font of Magic', summary: 'Sorcery Points equal to your sorcerer level. Turn a slot into points (its level), or points into a slot as a bonus action: 2/3/5/6/7 points for a level 1/2/3/4/5 slot.',
      effects: [
        { type: 'resource', id: 'sorcery-points', name: 'Sorcery Points', max: (c) => c.level, reset: 'long' },
        { type: 'action', id: 'create-slot', name: 'Create Spell Slot', kind: 'bonus', summary: 'Slot level 1: 2 points, 2: 3 (level 3+), 3: 5 (level 5+), 4: 6 (level 7+), 5: 7 (level 9+). Created slots vanish on a long rest.' },
      ] },
    { id: 'metamagic', level: 2, name: 'Metamagic', summary: 'Metamagic options to change spells with Sorcery Points: two, four at level 10, six at 17. One per spell unless an option says otherwise.',
      choices: [{ key: 'options', label: 'Metamagic', count: (c) => scale([[2, 2], [10, 4], [17, 6]])(c.level), kind: 'pick',
        options: () => METAMAGIC.map(([id, name, cost, summary]) => ({ id, name, summary: `${cost} point${cost > 1 ? 's' : ''}: ${summary}` })) }] },
    ASIS[0],
    { id: 'sorcerous-restoration', level: 5, name: 'Sorcerous Restoration', summary: 'On a short rest, regain Sorcery Points up to half your sorcerer level. Once per long rest.',
      effects: [{ type: 'resource', id: 'sorcerous-restoration', name: 'Sorcerous Restoration', max: () => 1, reset: 'long' }] },
    { id: 'sorcery-incarnate', level: 7, name: 'Sorcery Incarnate', summary: 'Out of Innate Sorcery uses, spend 2 Sorcery Points to use it. While it is active, use up to two Metamagic options per spell.' },
    ASIS[1], ASIS[2], ASIS[3],
    epicBoon,
    { id: 'arcane-apotheosis', level: 20, name: 'Arcane Apotheosis', summary: 'While Innate Sorcery is active, one Metamagic option per turn costs no points.' },
  ],
  subclasses: [{
    id: 'draconic', name: 'Draconic Sorcery', summary: 'Dragon magic in your blood: scales, resistance, wings.',
    features: [
      { id: 'draconic-resilience', level: 3, name: 'Draconic Resilience', summary: '+1 HP per sorcerer level. Without armor, AC = 10 + DEX + CHA.',
        effects: [
          { type: 'bonus', target: 'hpMax', label: 'Draconic Resilience', value: (c) => c.level },
          { type: 'ac', label: 'Draconic Resilience (10 + DEX + CHA)', value: (c) => 10 + c.mod.DEX + c.mod.CHA, when: (c) => !c.armor },
        ] },
      { id: 'draconic-spells', level: 3, name: 'Draconic Spells', summary: "Always prepared: Alter Self, Chromatic Orb, Command, Dragon's Breath; Fear, Fly (5); Arcane Eye, Charm Monster (7); Legend Lore, Summon Dragon (9).",
        alwaysPrepared: { 3: ['alter-self', 'chromatic-orb', 'command', 'dragons-breath'], 5: ['fear', 'fly'], 7: ['arcane-eye', 'charm-monster'], 9: ['legend-lore', 'summon-dragon'] } },
      { id: 'elemental-affinity', level: 6, name: 'Elemental Affinity', summary: 'Pick acid, cold, fire, lightning or poison: resistance to it, and add CHA to one damage roll of spells of that type.',
        choices: [{ key: 'type', label: 'Damage type', count: 1, options: () => ['acid', 'cold', 'fire', 'lightning', 'poison'].map((d) => ({ id: d, name: d[0].toUpperCase() + d.slice(1), effects: [{ type: 'resist', damage: d }] })) }] },
      { id: 'dragon-wings', level: 14, name: 'Dragon Wings', summary: 'Bonus action: fly speed 60 ft for 1 hour. Once per long rest, or 3 Sorcery Points.',
        effects: [
          { type: 'resource', id: 'dragon-wings', name: 'Dragon Wings', max: () => 1, reset: 'long' },
          { type: 'action', id: 'dragon-wings', name: 'Dragon Wings', kind: 'bonus', cost: { resource: 'dragon-wings', amount: 1 }, summary: 'Fly 60 ft for 1 hour (or spend 3 Sorcery Points).' },
        ] },
      { id: 'dragon-companion', level: 18, name: 'Dragon Companion', summary: 'Summon Dragon needs no material component, can skip concentration (lasts 1 minute), and once per long rest needs no slot.',
        effects: [{ type: 'resource', id: 'dragon-companion', name: 'Free Summon Dragon', max: () => 1, reset: 'long' }] },
    ],
  }],
}

// ---------------------------------------------------------------- Warlock
const INVOCATIONS = [
  ['agonizing-blast', 'Agonizing Blast', 2, 'Add CHA to the damage of one damaging Warlock cantrip. Repeatable.'],
  ['armor-of-shadows', 'Armor of Shadows', 1, 'Cast Mage Armor on yourself at will.'],
  ['ascendant-step', 'Ascendant Step', 5, 'Cast Levitate on yourself at will.'],
  ['devils-sight', "Devil's Sight", 2, 'See normally in dim light and darkness, magical too, within 120 ft.'],
  ['devouring-blade', 'Devouring Blade', 12, 'Thirsting Blade gives two extra attacks. Needs Thirsting Blade.'],
  ['eldritch-mind', 'Eldritch Mind', 1, 'Advantage on CON saves to keep concentration.'],
  ['eldritch-smite', 'Eldritch Smite', 5, 'Once a turn on a pact weapon hit, spend a Pact slot: +1d8 force plus 1d8 per slot level, and knock a Huge or smaller target Prone. Needs Pact of the Blade.'],
  ['eldritch-spear', 'Eldritch Spear', 2, 'One damaging cantrip with 10+ ft range reaches 30 x warlock level ft farther. Repeatable.'],
  ['fiendish-vigor', 'Fiendish Vigor', 2, 'Cast False Life on yourself at will, with the maximum temp HP.'],
  ['gaze-of-two-minds', 'Gaze of Two Minds', 5, 'Bonus action: perceive through a willing creature\'s senses and cast from its space.'],
  ['gift-of-the-depths', 'Gift of the Depths', 5, 'Breathe underwater, swim speed, and Water Breathing once per long rest without a slot.'],
  ['gift-of-the-protectors', 'Gift of the Protectors', 9, 'Creatures named in your Book of Shadows drop to 1 HP instead of 0, once per long rest. Needs Pact of the Tome.'],
  ['investment-of-the-chain-master', 'Investment of the Chain Master', 5, 'Your familiar flies or swims 40 ft, attacks as a bonus action, uses your save DC and more. Needs Pact of the Chain.'],
  ['lessons-of-the-first-ones', 'Lessons of the First Ones', 2, 'Gain one Origin feat. Repeatable.'],
  ['lifedrinker', 'Lifedrinker', 9, 'Once a turn on a pact weapon hit: +1d6 necrotic, psychic or radiant, and you can spend a Hit Die to heal. Needs Pact of the Blade.'],
  ['mask-of-many-faces', 'Mask of Many Faces', 2, 'Cast Disguise Self at will.'],
  ['master-of-myriad-forms', 'Master of Myriad Forms', 5, 'Cast Alter Self at will.'],
  ['misty-visions', 'Misty Visions', 2, 'Cast Silent Image at will.'],
  ['one-with-shadows', 'One with Shadows', 5, 'In dim light or darkness, cast Invisibility on yourself at will.'],
  ['otherworldly-leap', 'Otherworldly Leap', 2, 'Cast Jump on yourself at will.'],
  ['pact-of-the-blade', 'Pact of the Blade', 1, 'Bonus action: conjure or bond a melee weapon; proficient with it, use CHA for its attacks, necrotic/psychic/radiant damage.'],
  ['pact-of-the-chain', 'Pact of the Chain', 1, 'Find Familiar without a slot, with special forms (imp, pseudodragon, quasit...); trade one of your attacks for its attack.'],
  ['pact-of-the-tome', 'Pact of the Tome', 1, 'A Book of Shadows with three cantrips and two level 1 rituals from any list.'],
  ['repelling-blast', 'Repelling Blast', 2, 'One attack cantrip pushes a Large or smaller target 10 ft on a hit. Repeatable.'],
  ['thirsting-blade', 'Thirsting Blade', 5, 'Extra Attack with your pact weapon. Needs Pact of the Blade.'],
  ['visions-of-distant-realms', 'Visions of Distant Realms', 9, 'Cast Arcane Eye at will.'],
  ['whispers-of-the-grave', 'Whispers of the Grave', 7, 'Cast Speak with Dead at will.'],
  ['witch-sight', 'Witch Sight', 15, 'Truesight 30 ft.'],
]
const arcanum = (level, spellLevel) => ({
  id: `mystic-arcanum-${spellLevel}`, level, name: `Mystic Arcanum (level ${spellLevel})`, summary: `One level ${spellLevel} Warlock spell you can cast once per long rest without a slot.`,
  choices: [{ key: 'spell', label: `Level ${spellLevel} arcanum`, count: 1, kind: 'pick', options: () => SPELLS.filter((s) => s.level === spellLevel && s.classes.includes('warlock')).map((s) => ({ id: s.id, name: s.name, summary: s.summary })) }],
  effects: [{ type: 'resource', id: `arcanum-${spellLevel}`, name: `Mystic Arcanum (level ${spellLevel})`, max: () => 1, reset: 'long' }],
})

export const WARLOCK = {
  id: 'warlock', name: 'Warlock', hitDie: 8, primary: ['CHA'], blurb: 'Pact with an otherworldly patron: few slots, back on a short rest.',
  difficulty: 'Medium', saves: ['WIS', 'CHA'], armor: ['light'], weapons: ['simple'],
  skills: { count: 2, from: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] },
  packs: [
    { id: 'a', name: 'Warlock kit', items: "Leather Armor, Sickle, 2 Daggers, Arcane Focus (orb), Book (occult lore), Scholar's Pack, 15 GP", armor: 'leather', weapons: ['sickle', 'dagger'], gp: 15 },
    { id: 'b', name: 'Gold', items: '100 GP to buy your own', gp: 100 },
  ],
  subclassLevel: 3,
  spellcasting: { ability: 'CHA', kind: 'prepared', list: 'warlock', cantrips: cantripsFrom(2), prepared: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15], slots: 'pact', pactSlots: PACT_SLOTS, ritual: true, focus: 'Arcane Focus' },
  features: [
    { id: 'eldritch-invocations', level: 1, name: 'Eldritch Invocations', summary: 'Pieces of forbidden lore: one at level 1, more as you level (10 at 18). Swap one each level.',
      choices: [{ key: 'invocations', label: 'Eldritch Invocations', count: (c) => scale([[1, 1], [2, 3], [5, 5], [7, 6], [9, 7], [12, 8], [15, 9], [18, 10]])(c.level), kind: 'pick',
        options: (c) => INVOCATIONS.filter(([, , lvl]) => lvl <= c.level).map(([id, name, lvl, summary]) => ({ id, name, summary: `${lvl > 1 ? `Level ${lvl}+. ` : ''}${summary}` })) }] },
    { id: 'pact-magic', level: 1, name: 'Pact Magic', summary: 'Cast Warlock spells with CHA. All your slots are the same level and come back on a short rest. Swap one prepared spell each level.',
      effects: [pactResource, spellSave('CHA')] },
    { id: 'magical-cunning', level: 2, name: 'Magical Cunning', summary: '1-minute rite: regain up to half your Pact slots (round up). Once per long rest.',
      effects: [{ type: 'resource', id: 'magical-cunning', name: 'Magical Cunning', max: () => 1, reset: 'long' }] },
    ASIS[0], ASIS[1],
    { id: 'contact-patron', level: 9, name: 'Contact Patron', summary: 'Contact Other Plane is always prepared; once per long rest cast it without a slot to reach your patron, succeeding on its save.', alwaysPrepared: { 9: ['contact-other-plane'] },
      effects: [{ type: 'resource', id: 'contact-patron', name: 'Contact Patron', max: () => 1, reset: 'long' }] },
    arcanum(11, 6), ASIS[2], arcanum(13, 7), arcanum(15, 8), ASIS[3], arcanum(17, 9),
    epicBoon,
    { id: 'eldritch-master', level: 20, name: 'Eldritch Master', summary: 'Magical Cunning restores all your Pact slots.' },
  ],
  subclasses: [{
    id: 'fiend', name: 'Fiend Patron', summary: 'A bargain with the Lower Planes: fire, luck and toughness.',
    features: [
      { id: 'dark-ones-blessing', level: 3, name: "Dark One's Blessing", summary: 'When you (or someone within 10 ft of you) drop an enemy to 0 HP, gain CHA + warlock level temp HP (min 1).',
        effects: [{ type: 'action', id: 'dark-ones-blessing', name: "Dark One's Blessing", kind: 'free', summary: (c) => `Gain ${atLeast1(c.mod.CHA + c.level)} temp HP when an enemy drops near you.` }] },
      { id: 'fiend-spells', level: 3, name: 'Fiend Spells', summary: 'Always prepared: Burning Hands, Command, Scorching Ray, Suggestion; Fireball, Stinking Cloud (5); Fire Shield, Wall of Fire (7); Geas, Insect Plague (9).',
        alwaysPrepared: { 3: ['burning-hands', 'command', 'scorching-ray', 'suggestion'], 5: ['fireball', 'stinking-cloud'], 7: ['fire-shield', 'wall-of-fire'], 9: ['geas', 'insect-plague'] } },
      { id: 'dark-ones-own-luck', level: 6, name: "Dark One's Own Luck", summary: 'Add 1d10 to an ability check or save after seeing the roll. CHA modifier uses (min 1) per long rest.',
        effects: [
          { type: 'resource', id: 'dark-ones-own-luck', name: "Dark One's Own Luck", max: (c) => atLeast1(c.mod.CHA), reset: 'long' },
          { type: 'action', id: 'dark-ones-own-luck', name: "Dark One's Own Luck", kind: 'free', cost: { resource: 'dark-ones-own-luck', amount: 1 }, summary: 'Add to a check or save, once per roll.', roll: { label: 'Add', expr: () => '1d10' } },
        ] },
      { id: 'fiendish-resilience', level: 10, name: 'Fiendish Resilience', summary: 'After each rest, pick a damage type other than force: you resist it.' },
      { id: 'hurl-through-hell', level: 14, name: 'Hurl Through Hell', summary: 'Once a turn on an attack hit: CHA save or the target vanishes through the Lower Planes, taking 8d10 psychic (not Fiends) and Incapacitated until your next turn. Once per long rest or a Pact slot.',
        effects: [
          { type: 'resource', id: 'hurl-through-hell', name: 'Hurl Through Hell', max: () => 1, reset: 'long' },
          { type: 'action', id: 'hurl-through-hell', name: 'Hurl Through Hell', kind: 'free', cost: { resource: 'hurl-through-hell', amount: 1 }, summary: 'On a hit (or spend a Pact slot to use it again).', roll: { label: 'Psychic damage', expr: () => '8d10' }, save: { ability: 'CHA', dc: dc('CHA') } },
        ] },
    ],
  }],
}

// ---------------------------------------------------------------- Wizard
export const WIZARD = {
  id: 'wizard', name: 'Wizard', hitDie: 6, primary: ['INT'], blurb: 'Scholar of magic with a spellbook full of options.',
  difficulty: 'Hard', saves: ['INT', 'WIS'], armor: [], weapons: ['simple'],
  skills: { count: 2, from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'] },
  packs: [
    { id: 'a', name: 'Wizard kit', items: "2 Daggers, Arcane Focus (Quarterstaff), Robe, Spellbook, Scholar's Pack, 5 GP", weapons: ['dagger', 'quarterstaff'], gp: 5 },
    { id: 'b', name: 'Gold', items: '55 GP to buy your own', gp: 55 },
  ],
  subclassLevel: 3,
  spellcasting: { ability: 'INT', kind: 'prepared', list: 'wizard', cantrips: cantripsFrom(3), prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25], slots: 'full', ritual: true, spellbook: true, focus: 'Arcane Focus or spellbook' },
  features: [
    { id: 'wizard-spellcasting', level: 1, name: 'Spellcasting', summary: 'Cast Wizard spells with INT, prepared from your spellbook (6 level 1 spells to start, 2 more each level). Change them on a long rest.',
      effects: [...slotResources(SLOTS_FULL), spellSave('INT')] },
    { id: 'ritual-adept', level: 1, name: 'Ritual Adept', summary: 'Cast any Ritual spell in your spellbook as a ritual without preparing it.' },
    { id: 'arcane-recovery', level: 1, name: 'Arcane Recovery', summary: 'Once per long rest, on a short rest, recover spell slots totalling up to half your wizard level (round up), none of level 6+.',
      effects: [
        { type: 'resource', id: 'arcane-recovery', name: 'Arcane Recovery', max: () => 1, reset: 'long' },
        { type: 'action', id: 'arcane-recovery', name: 'Arcane Recovery', kind: 'free', cost: { resource: 'arcane-recovery', amount: 1 }, summary: (c) => `On a short rest: recover up to ${Math.ceil(c.level / 2)} levels of spell slots (none of level 6+).` },
      ] },
    { id: 'scholar', level: 2, name: 'Scholar', summary: 'Expertise in one of Arcana, History, Investigation, Medicine, Nature or Religion (one you are proficient in).',
      choices: [{ key: 'skill', label: 'Expertise', count: 1, kind: 'expertise', options: (c) => c.proficientSkills().filter((s) => ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'].includes(s.id)) }] },
    ASIS[0],
    { id: 'memorize-spell', level: 5, name: 'Memorize Spell', summary: 'On a short rest, swap one prepared level 1+ spell for another from your spellbook.' },
    ASIS[1], ASIS[2], ASIS[3],
    { id: 'spell-mastery', level: 18, name: 'Spell Mastery', summary: 'Pick a level 1 and a level 2 action spell from your spellbook: always prepared, cast at their lowest level without a slot.' },
    epicBoon,
    { id: 'signature-spells', level: 20, name: 'Signature Spells', summary: 'Two level 3 spells always prepared; cast each once at level 3 without a slot, back on a short or long rest.',
      effects: [{ type: 'resource', id: 'signature-spells', name: 'Signature Spells', max: () => 2, reset: 'short' }] },
  ],
  subclasses: [{
    id: 'evoker', name: 'Evoker', summary: 'Master of blasts: fire, cold, lightning, thunder and acid.',
    features: [
      { id: 'evocation-savant', level: 3, name: 'Evocation Savant', summary: 'Two free Evocation spells (level 2 or lower) in your spellbook, plus one free Evocation spell each time you gain a new spell level.' },
      { id: 'potent-cantrip', level: 3, name: 'Potent Cantrip', summary: 'A damaging cantrip that misses or is saved against still deals half damage (no other effect).' },
      { id: 'sculpt-spells', level: 6, name: 'Sculpt Spells', summary: 'Protect 1 + spell level creatures from your Evocation spells: they succeed on the save and take no damage if they would take half.' },
      { id: 'empowered-evocation', level: 10, name: 'Empowered Evocation', summary: 'Add your INT modifier to one damage roll of your Wizard Evocation spells.' },
      { id: 'overchannel', level: 14, name: 'Overchannel', summary: 'Deal maximum damage with a level 1-5 Wizard spell. Free once per long rest; after that, 2d12 necrotic per slot level (+1d12 each further use) that ignores Resistance and Immunity.',
        effects: [{ type: 'resource', id: 'overchannel', name: 'Overchannel (free use)', max: () => 1, reset: 'long' }] },
    ],
  }],
}

export const CASTER_CLASSES = [BARBARIAN, BARD, CLERIC, DRUID, PALADIN, RANGER, SORCERER, WARLOCK, WIZARD]
