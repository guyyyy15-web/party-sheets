// Player's Handbook (2024) subclasses that are not in the SRD 5.2: Fighter, Monk, Paladin and Ranger (three each).
// For one gaming group's private use. Summarised in our own words, short and functional; the book wins.
// Same data model as classes.js / casters.js. `c.level` is the class level.
import { SKILLS } from './basics.js'

const SRC = 'PHB 2024'
const scale = (table) => (lvl) => table.filter(([l]) => lvl >= l).at(-1)?.[1] ?? 0
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)
const atLeast1 = (n) => Math.max(1, n)
const dc = (ab) => (c) => 8 + c.mod[ab] + c.prof
const skillOpts = (ids) => () => SKILLS.filter((s) => ids.includes(s.id)).map((s) => ({ id: s.id, name: s.name }))

// ---------------------------------------------------------------- Fighter

const FIGHTER_SKILLS = ['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival']

// Battle Master: superiority dice d8 → d10 (10) → d12 (18); 4 dice, 5 at 7, 6 at 15; maneuvers 3, 5 (7), 7 (10), 9 (15).
const supDie = scale([[3, 'd8'], [10, 'd10'], [18, 'd12']])
const supCount = scale([[3, 4], [7, 5], [15, 6]])
const maneuverCount = scale([[3, 3], [7, 5], [10, 7], [15, 9]])
const maneuverDc = (c) => 8 + c.prof + Math.max(c.mod.STR, c.mod.DEX)
const supRoll = (label, why) => ({ label, expr: (c) => `1${supDie(c.level)}`, why })

// [id, name, kind, summary, roll label, save ability or null]
const MANEUVERS = [
  ['ambush', 'Ambush', 'free', 'Add the die to a Stealth check or an initiative roll (not while Incapacitated).', 'Add to the roll', null],
  ['bait-and-switch', 'Bait and Switch', 'free', 'On your turn, swap places with a willing creature within 5 ft (costs 5 ft of movement, no opportunity attacks). You or it adds the die to AC until the start of your next turn.', 'AC bonus', null],
  ['commanders-strike', "Commander's Strike", 'free', 'When you Attack, give up one attack: an ally who sees or hears you uses its reaction to attack, adding the die to its damage.', 'Ally damage bonus', null],
  ['commanding-presence', 'Commanding Presence', 'free', 'Add the die to an Intimidation, Performance or Persuasion check.', 'Add to the check', null],
  ['disarming-attack', 'Disarming Attack', 'free', 'On a hit: add the die to damage, and the target makes a STR save or drops one object you choose.', 'Extra damage', 'STR'],
  ['distracting-strike', 'Distracting Strike', 'free', 'On a hit: add the die to damage. The next attack on the target by someone else before your next turn has advantage.', 'Extra damage', null],
  ['evasive-footwork', 'Evasive Footwork', 'bonus', 'Bonus action: Disengage, and add the die to your AC until the start of your next turn.', 'AC bonus', null],
  ['feinting-attack', 'Feinting Attack', 'bonus', 'Bonus action: advantage on your next attack this turn against a creature within 5 ft. On a hit, add the die to damage.', 'Extra damage', null],
  ['goading-attack', 'Goading Attack', 'free', 'On a hit: add the die to damage. WIS save or the target has disadvantage on attacks against anyone but you until the end of your next turn.', 'Extra damage', 'WIS'],
  ['lunging-attack', 'Lunging Attack', 'bonus', 'Bonus action: Dash. If you move 5+ ft in a straight line right before a melee hit this turn, add the die to its damage.', 'Extra damage', null],
  ['maneuvering-attack', 'Maneuvering Attack', 'free', 'On a hit: add the die to damage. An ally who sees or hears you can use its reaction to move half its speed without provoking from the target.', 'Extra damage', null],
  ['menacing-attack', 'Menacing Attack', 'free', 'On a hit: add the die to damage. WIS save or Frightened of you until the end of your next turn.', 'Extra damage', 'WIS'],
  ['parry', 'Parry', 'reaction', 'Reaction when a melee attack damages you: reduce the damage by the die + your STR or DEX modifier (the higher).', 'Reduce damage by', null],
  ['precision-attack', 'Precision Attack', 'free', 'When you miss with an attack roll: add the die to it, maybe turning it into a hit.', 'Add to the attack roll', null],
  ['pushing-attack', 'Pushing Attack', 'free', 'On a hit: add the die to damage. A Large or smaller target makes a STR save or is pushed up to 15 ft away.', 'Extra damage', 'STR'],
  ['rally', 'Rally', 'bonus', 'Bonus action: an ally within 30 ft who sees or hears you gains temp HP equal to the die + half your fighter level (round down).', 'Temp HP', null],
  ['riposte', 'Riposte', 'reaction', 'Reaction when a creature misses you with a melee attack: make one melee attack against it, adding the die to damage on a hit.', 'Extra damage', null],
  ['sweeping-attack', 'Sweeping Attack', 'free', 'On a melee hit: another creature within 5 ft of the target and within your reach takes the die in damage, if your attack roll would hit it.', 'Damage to the second creature', null],
  ['tactical-assessment', 'Tactical Assessment', 'free', 'Add the die to a History, Investigation or Insight check.', 'Add to the check', null],
  ['trip-attack', 'Trip Attack', 'free', 'On a hit: add the die to damage. A Large or smaller target makes a STR save or falls Prone.', 'Extra damage', 'STR'],
]
const maneuverOptions = () => MANEUVERS.map(([id, name, kind, summary, rollLabel, save]) => ({
  id: `man-${id}`, name, summary,
  effects: [{
    type: 'action', id: `man-${id}`, name, kind, cost: { resource: 'superiority', amount: 1 },
    summary: id === 'rally' ? (c) => `Temp HP = the die + ${Math.floor(c.level / 2)}.` : id === 'parry' ? (c) => `Reduce by the die + ${Math.max(c.mod.STR, c.mod.DEX)}.` : summary,
    roll: id === 'rally'
      ? { label: rollLabel, expr: (c) => `1${supDie(c.level)}+${Math.floor(c.level / 2)}`, why: 'Rally: your Superiority Die + half your fighter level (round down).' }
      : id === 'parry'
        ? { label: rollLabel, expr: (c) => `1${supDie(c.level)}${signed(Math.max(c.mod.STR, c.mod.DEX))}`, why: 'Parry: your Superiority Die + your STR or DEX modifier (the higher).' }
        : supRoll(rollLabel, `${name}: roll one Superiority Die.`),
    ...(save ? { save: { ability: save, dc: maneuverDc } } : {}),
  }],
}))

// Eldritch Knight: third-caster table (index 0 = fighter level 1; levels 1-2 have nothing).
export const SLOTS_THIRD = [
  [], [], [2], [3], [3], [3], [4, 2], [4, 2], [4, 2], [4, 3],
  [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
].map((row) => [...row, ...Array(4 - row.length).fill(0)])
const EK_CANTRIPS = Array.from({ length: 20 }, (_, i) => (i + 1 < 3 ? 0 : i + 1 >= 10 ? 3 : 2))
const EK_PREPARED = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13]
const thirdSlotResources = SLOTS_THIRD[19].map((_, i) => ({
  type: 'resource', id: `slot-${i + 1}`, name: `Level ${i + 1} spell slots`, max: (c) => SLOTS_THIRD[Math.min(20, c.level) - 1][i] || 0, reset: 'long',
}))

// Psi Warrior: Psionic Energy dice by fighter level.
const psiDie = scale([[3, 'd6'], [5, 'd8'], [11, 'd10'], [17, 'd12']])
const psiCount = scale([[3, 4], [5, 6], [9, 8], [13, 10], [17, 12]])

const FIGHTER_SUBS = [
  {
    id: 'battle-master', name: 'Battle Master', source: SRC, summary: 'Tactician: Superiority Dice fuel maneuvers that trip, push, parry and rally.',
    features: [
      { id: 'combat-superiority', level: 3, name: 'Combat Superiority', summary: 'Superiority Dice (4 d8; 5 at 7, 6 at 15) fuel maneuvers, one per attack. All back on a short or long rest. Save DC = 8 + prof + STR or DEX (higher). You know 3 maneuvers, 2 more at 7, 10 and 15; swap one when you level up.',
        effects: [
          { type: 'resource', id: 'superiority', name: 'Superiority Dice', max: (c) => supCount(c.level), reset: 'short' },
          { type: 'note', save: { label: 'Maneuver save DC (8 + prof + STR or DEX):', dc: maneuverDc } },
        ],
        choices: [{ key: 'maneuvers', label: 'Maneuvers', count: (c) => maneuverCount(c.level), kind: 'pick', options: maneuverOptions }] },
      { id: 'student-of-war', level: 3, name: 'Student of War', summary: "Proficiency with one type of Artisan's Tools and one skill from the fighter list.",
        choices: [{ key: 'skill', label: 'Student of War skill', count: 1, kind: 'skill', options: skillOpts(FIGHTER_SKILLS) }] },
      { id: 'know-your-enemy', level: 7, name: 'Know Your Enemy', summary: 'Bonus action: learn the immunities, resistances and vulnerabilities of a creature you can see within 30 ft. Once per long rest, or spend a Superiority Die to use it again.',
        effects: [
          { type: 'resource', id: 'know-your-enemy', name: 'Know Your Enemy', max: () => 1, reset: 'long' },
          { type: 'action', id: 'know-your-enemy', name: 'Know Your Enemy', kind: 'bonus', cost: { resource: 'know-your-enemy', amount: 1 }, summary: 'Immunities, resistances and vulnerabilities of one creature within 30 ft.' },
        ] },
      { id: 'improved-combat-superiority', level: 10, name: 'Improved Combat Superiority', summary: 'Superiority Dice become d10s.' },
      { id: 'relentless', level: 15, name: 'Relentless', summary: 'Once per turn when you use a maneuver, roll a d8 for it instead of spending a Superiority Die.' },
      { id: 'ultimate-combat-superiority', level: 18, name: 'Ultimate Combat Superiority', summary: 'Superiority Dice become d12s.' },
    ],
  },
  {
    id: 'eldritch-knight', name: 'Eldritch Knight', source: SRC, summary: 'Wizard spells (INT) mixed into your attacks; a bonded weapon you can call to hand.',
    // The engine reads class spellcasting only; this block is data for when it reads subclass spellcasting too.
    spellcasting: { ability: 'INT', kind: 'prepared', list: 'wizard', cantrips: EK_CANTRIPS, prepared: EK_PREPARED, slots: 'third', table: SLOTS_THIRD, focus: 'Arcane Focus' },
    features: [
      { id: 'ek-spellcasting', level: 3, name: 'Spellcasting', summary: 'Cast Wizard spells with INT: 2 cantrips (3 at 10), prepared spells and slots by the Eldritch Knight table (up to level 4 spells at 19). Swap one cantrip or prepared spell on a level up. An arcane focus is your focus. Slots come back on a long rest.',
        effects: [...thirdSlotResources, { type: 'note', save: { label: 'Spell save DC (8 + prof + INT):', dc: dc('INT') } }] },
      { id: 'war-bond', level: 3, name: 'War Bond', summary: "1-hour ritual (can be a short rest) bonds a weapon, up to two. You can't be disarmed of it unless Incapacitated; bonus action to summon it to your hand from the same plane.",
        effects: [{ type: 'action', id: 'war-bond', name: 'Summon Bonded Weapon', kind: 'bonus', summary: 'A bonded weapon on the same plane appears in your hand.' }] },
      { id: 'war-magic', level: 7, name: 'War Magic', summary: 'When you take the Attack action, replace one attack with a Wizard cantrip that takes an action to cast.' },
      { id: 'eldritch-strike', level: 10, name: 'Eldritch Strike', summary: 'A creature you hit with a weapon has disadvantage on its next save against your spell before the end of your next turn.' },
      { id: 'arcane-charge', level: 15, name: 'Arcane Charge', summary: 'When you use Action Surge, teleport up to 30 ft to a space you can see, before or after the extra action.' },
      { id: 'improved-war-magic', level: 18, name: 'Improved War Magic', summary: 'When you take the Attack action, replace two attacks with a level 1 or 2 Wizard spell that takes an action to cast.' },
    ],
  },
  {
    id: 'psi-warrior', name: 'Psi Warrior', source: SRC, summary: 'Psionic Energy Dice: force-charged strikes, shielding fields, telekinesis.',
    features: [
      { id: 'psionic-power', level: 3, name: 'Psionic Power', summary: 'Psionic Energy Dice: 4 d6 at 3, 6 d8 at 5, 8 d8 at 9, 8 d10 at 11, 10 d10 at 13, 12 d12 at 17. One back on a short rest, all on a long rest. Protective Field, Psionic Strike and Telekinetic Movement use them.',
        effects: [
          { type: 'resource', id: 'psionic-energy', name: 'Psionic Energy Dice', max: (c) => psiCount(c.level), reset: 'long', short: 1 },
          { type: 'action', id: 'protective-field', name: 'Protective Field', kind: 'reaction', cost: { resource: 'psionic-energy', amount: 1 }, summary: 'You or a creature you can see within 30 ft takes damage: reduce it.',
            roll: { label: 'Reduce by', expr: (c) => `1${psiDie(c.level)}+${atLeast1(c.mod.INT)}`, why: 'Protective Field: one Psionic Energy Die + INT modifier (at least 1).' } },
          { type: 'action', id: 'psionic-strike', name: 'Psionic Strike', kind: 'free', cost: { resource: 'psionic-energy', amount: 1 }, summary: 'Once a turn, right after a weapon hit on a target within 30 ft: extra Force damage.',
            roll: { label: 'Force damage', expr: (c) => `1${psiDie(c.level)}${signed(c.mod.INT)}`, why: 'Psionic Strike: one Psionic Energy Die + INT modifier.' } },
          { type: 'resource', id: 'telekinetic-movement', name: 'Telekinetic Movement', max: () => 1, reset: 'short' },
          { type: 'action', id: 'telekinetic-movement', name: 'Telekinetic Movement', kind: 'action', cost: { resource: 'telekinetic-movement', amount: 1 }, summary: 'Magic action: move a Large or smaller loose object or a willing creature (not you) within 30 ft up to 30 ft. Again for 1 Psionic Energy Die.' },
        ] },
      { id: 'telekinetic-adept', level: 7, name: 'Telekinetic Adept', summary: 'Psi-Powered Leap: bonus action, fly speed = twice your speed this turn (once per short rest, or 1 die). Telekinetic Thrust: a Psionic Strike target makes a STR save or is knocked Prone or pushed up to 10 ft.',
        effects: [
          { type: 'resource', id: 'psi-powered-leap', name: 'Psi-Powered Leap', max: () => 1, reset: 'short' },
          { type: 'action', id: 'psi-powered-leap', name: 'Psi-Powered Leap', kind: 'bonus', cost: { resource: 'psi-powered-leap', amount: 1 }, summary: (c) => 'Fly speed equal to twice your speed until the end of the turn. Again for 1 Psionic Energy Die.' },
          { type: 'note', save: { label: 'Telekinetic Thrust (STR save):', dc: dc('INT') } },
        ] },
      { id: 'guarded-mind', level: 10, name: 'Guarded Mind', summary: 'Resistance to Psychic damage. Start your turn Charmed or Frightened: spend 1 die to end those effects on you.',
        effects: [{ type: 'resist', damage: 'psychic' }] },
      { id: 'bulwark-of-force', level: 15, name: 'Bulwark of Force', summary: 'Bonus action: up to INT modifier (min 1) creatures within 30 ft, you included, have Half Cover for 1 minute. Once per long rest, or 1 die.',
        effects: [
          { type: 'resource', id: 'bulwark-of-force', name: 'Bulwark of Force', max: () => 1, reset: 'long' },
          { type: 'action', id: 'bulwark-of-force', name: 'Bulwark of Force', kind: 'bonus', cost: { resource: 'bulwark-of-force', amount: 1 }, summary: (c) => `Half Cover for up to ${atLeast1(c.mod.INT)} creatures within 30 ft, 1 minute.` },
        ] },
      { id: 'telekinetic-master', level: 18, name: 'Telekinetic Master', summary: 'Telekinesis always prepared; cast it with INT, no slot or components, once per long rest (or 1 die). While concentrating on it, one weapon attack as a bonus action each turn.',
        effects: [
          { type: 'resource', id: 'telekinetic-master', name: 'Free Telekinesis', max: () => 1, reset: 'long' },
          { type: 'action', id: 'telekinetic-master', name: 'Telekinesis', kind: 'action', cost: { resource: 'telekinetic-master', amount: 1 }, summary: 'Cast Telekinesis without a slot (concentration). Bonus action weapon attack each turn while it lasts.' },
        ] },
    ],
  },
]

// ---------------------------------------------------------------- Monk

const martialArts = scale([[1, 'd6'], [5, 'd8'], [11, 'd10'], [17, 'd12']])
const focusDc = (c) => 8 + c.mod.WIS + c.prof
const ELEMENTS = ['acid', 'cold', 'fire', 'lightning', 'thunder']

const MONK_SUBS = [
  {
    id: 'mercy', name: 'Warrior of Mercy', source: SRC, summary: 'Healer and harmer: Focus heals allies or adds necrotic damage.',
    features: [
      { id: 'hand-of-harm', level: 3, name: 'Hand of Harm', summary: 'Once a turn, on an Unarmed Strike hit: 1 Focus for extra Necrotic damage = Martial Arts die + WIS.',
        effects: [{ type: 'action', id: 'hand-of-harm', name: 'Hand of Harm', kind: 'free', cost: { resource: 'focus', amount: 1 }, summary: 'Once a turn, on an Unarmed Strike hit.',
          roll: { label: 'Necrotic damage', expr: (c) => `1${martialArts(c.level)}${signed(c.mod.WIS)}`, why: 'Hand of Harm: your Martial Arts die + WIS.' } }] },
      { id: 'hand-of-healing', level: 3, name: 'Hand of Healing', summary: 'Magic action, 1 Focus: touch heals Martial Arts die + WIS. In a Flurry of Blows, one strike can be this instead, with no Focus for the healing.',
        effects: [{ type: 'action', id: 'hand-of-healing', name: 'Hand of Healing', kind: 'action', cost: { resource: 'focus', amount: 1 }, summary: 'Touch a creature to heal it.', heal: true,
          roll: { label: 'Heal', expr: (c) => `1${martialArts(c.level)}${signed(c.mod.WIS)}`, why: 'Hand of Healing: your Martial Arts die + WIS.' } }] },
      { id: 'implements-of-mercy', level: 3, name: 'Implements of Mercy', summary: 'Proficiency in Insight, Medicine and the Herbalism Kit.',
        choices: [{ key: 'skills', label: 'Implements of Mercy (take both)', count: 2, kind: 'skill', options: skillOpts(['insight', 'medicine']) }] },
      { id: 'physicians-touch', level: 6, name: "Physician's Touch", summary: 'Hand of Harm can also leave the target Poisoned until the end of your next turn. Hand of Healing can also end Blinded, Deafened, Paralyzed, Poisoned or Stunned.' },
      { id: 'flurry-of-healing-and-harm', level: 11, name: 'Flurry of Healing and Harm', summary: 'In a Flurry of Blows, swap any strike for a free Hand of Healing, or add a free Hand of Harm to a strike that deals damage (still once a turn). WIS modifier (min 1) times per long rest.',
        effects: [{ type: 'resource', id: 'flurry-of-healing-and-harm', name: 'Flurry of Healing and Harm', max: (c) => atLeast1(c.mod.WIS), reset: 'long' }] },
      { id: 'hand-of-ultimate-mercy', level: 17, name: 'Hand of Ultimate Mercy', summary: 'Magic action, 5 Focus: touch a creature that died in the last 24 hours. It returns with 4d10 + WIS HP, free of Blinded, Deafened, Paralyzed, Poisoned and Stunned. Once per long rest.',
        effects: [
          { type: 'resource', id: 'hand-of-ultimate-mercy', name: 'Hand of Ultimate Mercy', max: () => 1, reset: 'long' },
          { type: 'action', id: 'hand-of-ultimate-mercy', name: 'Hand of Ultimate Mercy', kind: 'action', cost: { resource: 'focus', amount: 5 }, summary: 'Bring back a creature dead less than 24 hours (also uses the once-per-long-rest charge).', heal: true,
            roll: { label: 'HP on return', expr: (c) => `4d10${signed(c.mod.WIS)}`, why: 'Hand of Ultimate Mercy: 4d10 + WIS.' } },
        ] },
    ],
  },
  {
    id: 'shadow', name: 'Warrior of Shadow', source: SRC, summary: 'Stealthy monk: magical darkness, teleporting between shadows.',
    features: [
      { id: 'shadow-arts', level: 3, name: 'Shadow Arts', summary: 'Darkness: 1 Focus to cast it with no components; you see inside it and can move it up to 60 ft at the start of each of your turns. Darkvision 60 ft (+60 if you already have it). Minor Illusion cantrip (WIS).',
        effects: [
          { type: 'sense', name: 'Darkvision', range: 60 },
          { type: 'action', id: 'shadow-darkness', name: 'Darkness', kind: 'action', cost: { resource: 'focus', amount: 1 }, summary: 'Cast Darkness (no components); you see through it and can move it.' },
        ] },
      { id: 'shadow-step', level: 6, name: 'Shadow Step', summary: 'Bonus action: from dim light or darkness, teleport up to 60 ft to a space you can see in dim light or darkness. Advantage on your next melee attack this turn.',
        effects: [{ type: 'action', id: 'shadow-step', name: 'Shadow Step', kind: 'bonus', summary: 'Teleport 60 ft shadow to shadow; advantage on your next melee attack this turn.' }] },
      { id: 'improved-shadow-step', level: 11, name: 'Improved Shadow Step', summary: 'Spend 1 Focus on Shadow Step to ignore the light rule, and make an Unarmed Strike right after teleporting as part of it.' },
      { id: 'cloak-of-shadows', level: 17, name: 'Cloak of Shadows', summary: 'Magic action, 3 Focus: for 1 minute you are Invisible, can move through creatures (difficult terrain), and Flurry of Blows costs no Focus. Ends if Incapacitated or you end a turn in bright light.',
        effects: [{ type: 'action', id: 'cloak-of-shadows', name: 'Cloak of Shadows', kind: 'action', cost: { resource: 'focus', amount: 3 }, summary: 'Invisible for 1 minute, move through creatures, free Flurry of Blows.' }] },
    ],
  },
  {
    id: 'elements', name: 'Warrior of the Elements', source: SRC, summary: 'Elemental monk: longer reach, elemental strikes, blasts of energy.',
    features: [
      { id: 'elemental-attunement', level: 3, name: 'Elemental Attunement', summary: 'Start of your turn, 1 Focus: for 10 minutes Unarmed Strikes reach 10 ft farther and can deal Acid, Cold, Fire, Lightning or Thunder; with one of those, the target makes a STR save or you move it up to 10 ft toward or away from you.',
        effects: [
          { type: 'action', id: 'elemental-attunement', name: 'Elemental Attunement', kind: 'free', cost: { resource: 'focus', amount: 1 }, summary: 'Start of your turn: 10 minutes of +10 ft reach and elemental strikes.' },
          { type: 'note', save: { label: 'Elemental Strikes push (STR save):', dc: focusDc } },
        ] },
      { id: 'manipulate-elements', level: 3, name: 'Manipulate Elements', summary: 'You know the Elementalism cantrip (WIS).' },
      { id: 'elemental-burst', level: 6, name: 'Elemental Burst', summary: 'Magic action, 2 Focus: 20-ft-radius sphere within 120 ft, DEX save, three Martial Arts dice of Acid, Cold, Fire, Lightning or Thunder (half on a success).',
        effects: [{ type: 'action', id: 'elemental-burst', name: 'Elemental Burst', kind: 'action', cost: { resource: 'focus', amount: 2 }, summary: '20-ft sphere within 120 ft; half damage on a save.',
          roll: { label: 'Damage', expr: (c) => `3${martialArts(c.level)}`, why: 'Elemental Burst: three Martial Arts dice.' }, save: { ability: 'DEX', dc: focusDc } }] },
      { id: 'stride-of-the-elements', level: 11, name: 'Stride of the Elements', summary: 'While attuned, fly and swim speeds equal to your speed.' },
      { id: 'elemental-epitome', level: 17, name: 'Elemental Epitome', summary: 'While attuned: resistance to one of Acid, Cold, Fire, Lightning or Thunder (change at the start of each turn); Step of the Wind gives +20 ft speed and a Martial Arts die of damage to each creature you pass within 5 ft (once each per turn); once a turn, one Unarmed Strike deals an extra Martial Arts die.',
        effects: [{ type: 'action', id: 'empowered-strikes-elements', name: 'Elemental Epitome strike', kind: 'free', summary: 'While attuned, once a turn on an Unarmed Strike hit.',
          roll: { label: 'Extra damage', expr: (c) => `1${martialArts(c.level)}`, why: 'Elemental Epitome: one Martial Arts die of your element.' } }],
        choices: [{ key: 'resist', label: 'Elemental Epitome resistance (while attuned; change each turn)', count: 1, options: () => ELEMENTS.map((d) => ({ id: d, name: d[0].toUpperCase() + d.slice(1), summary: `Resistance to ${d} damage while attuned.` })) }] },
    ],
  },
]

// ---------------------------------------------------------------- Paladin

const cd = (n = 1) => ({ resource: 'channel-divinity', amount: n })

const PALADIN_SUBS = [
  {
    id: 'glory', name: 'Oath of Glory', source: SRC, summary: 'Heroic athlete: inspires allies with temp HP, speeds up the party.',
    features: [
      { id: 'glory-spells', level: 3, name: 'Oath of Glory Spells', summary: "Always prepared: Guiding Bolt, Heroism; Enhance Ability, Magic Weapon (5); Haste, Protection from Energy (9); Compulsion, Freedom of Movement (13); Legend Lore, Yolande's Regal Presence (17).",
        alwaysPrepared: { 3: ['guiding-bolt', 'heroism'], 5: ['enhance-ability', 'magic-weapon'], 9: ['haste', 'protection-from-energy'], 13: ['compulsion', 'freedom-of-movement'], 17: ['legend-lore'] } },
      { id: 'inspiring-smite', level: 3, name: 'Inspiring Smite', summary: 'Right after you cast Divine Smite, Channel Divinity: split 2d8 + paladin level temp HP among creatures you choose within 30 ft (you too).',
        effects: [{ type: 'action', id: 'inspiring-smite', name: 'Inspiring Smite', kind: 'free', cost: cd(), summary: 'After Divine Smite: temp HP to share within 30 ft.',
          roll: { label: 'Temp HP to share', expr: (c) => `2d8+${c.level}`, parts: (c) => [{ label: 'Paladin level', value: c.level, kind: 'level' }], why: 'Inspiring Smite: 2d8 + your paladin level, split as you like.' } }] },
      { id: 'peerless-athlete', level: 3, name: 'Peerless Athlete', summary: 'Bonus action, Channel Divinity: for 1 hour, advantage on Athletics and Acrobatics checks, and long and high jumps go 10 ft farther.',
        effects: [{ type: 'action', id: 'peerless-athlete', name: 'Peerless Athlete', kind: 'bonus', cost: cd(), summary: '1 hour: advantage on Athletics and Acrobatics, +10 ft jumps.' }] },
      { id: 'aura-of-alacrity', level: 7, name: 'Aura of Alacrity', summary: '+10 ft speed. An ally who enters or starts its turn in your aura gets +10 ft speed until the end of its next turn.',
        effects: [{ type: 'bonus', target: 'speed', label: 'Aura of Alacrity', value: () => 10 }] },
      { id: 'glorious-defense', level: 15, name: 'Glorious Defense', summary: 'Reaction when you or a creature within 10 ft is hit: add CHA (min +1) to its AC against that attack. If it misses, you may make one weapon attack against the attacker. CHA modifier (min 1) times per long rest.',
        effects: [
          { type: 'resource', id: 'glorious-defense', name: 'Glorious Defense', max: (c) => atLeast1(c.mod.CHA), reset: 'long' },
          { type: 'action', id: 'glorious-defense', name: 'Glorious Defense', kind: 'reaction', cost: { resource: 'glorious-defense', amount: 1 }, summary: (c) => `+${atLeast1(c.mod.CHA)} AC against one attack; on a miss, attack back.` },
        ] },
      { id: 'living-legend', level: 20, name: 'Living Legend', summary: 'Bonus action for 10 minutes: advantage on CHA checks, once a turn turn a missed weapon or unarmed attack into a hit, and reroll a failed save as a reaction. Once per long rest or a level 5 slot.',
        effects: [
          { type: 'resource', id: 'living-legend', name: 'Living Legend', max: () => 1, reset: 'long' },
          { type: 'action', id: 'living-legend', name: 'Living Legend', kind: 'bonus', cost: { resource: 'living-legend', amount: 1 }, summary: '10 minutes: CHA advantage, turn a miss into a hit each turn, reroll failed saves.' },
        ] },
    ],
  },
  {
    id: 'ancients', name: 'Oath of the Ancients', source: SRC, summary: 'Green knight: nature magic, restraining vines, resistance to magic damage.',
    features: [
      { id: 'ancients-spells', level: 3, name: 'Oath of the Ancients Spells', summary: 'Always prepared: Ensnaring Strike, Speak with Animals; Misty Step, Moonbeam (5); Plant Growth, Protection from Energy (9); Ice Storm, Stoneskin (13); Commune with Nature, Tree Stride (17).',
        alwaysPrepared: { 3: ['ensnaring-strike', 'speak-with-animals'], 5: ['misty-step', 'moonbeam'], 9: ['plant-growth', 'protection-from-energy'], 13: ['ice-storm', 'stoneskin'], 17: ['commune-with-nature', 'tree-stride'] } },
      { id: 'natures-wrath', level: 3, name: "Nature's Wrath", summary: 'Magic action, Channel Divinity: each creature you choose within 15 ft makes a STR save or is Restrained for 1 minute (save again at the end of each of its turns).',
        effects: [{ type: 'action', id: 'natures-wrath', name: "Nature's Wrath", kind: 'action', cost: cd(), summary: 'Creatures you choose within 15 ft: Restrained for 1 minute on a failed save.', save: { ability: 'STR', dc: dc('CHA') } }] },
      { id: 'aura-of-warding', level: 7, name: 'Aura of Warding', summary: 'You and allies in your Aura of Protection have resistance to Necrotic, Psychic and Radiant damage.',
        effects: ['necrotic', 'psychic', 'radiant'].map((damage) => ({ type: 'resist', damage })) },
      { id: 'undying-sentinel', level: 15, name: 'Undying Sentinel', summary: "Drop to 0 HP without dying outright: go to 1 HP and heal 3 x paladin level. Once per long rest. You can't be aged magically.",
        effects: [
          { type: 'resource', id: 'undying-sentinel', name: 'Undying Sentinel', max: () => 1, reset: 'long' },
          { type: 'action', id: 'undying-sentinel', name: 'Undying Sentinel', kind: 'free', cost: { resource: 'undying-sentinel', amount: 1 }, summary: (c) => `At 0 HP: back to 1 HP, then heal ${3 * c.level}.` },
        ] },
      { id: 'elder-champion', level: 20, name: 'Elder Champion', summary: 'Bonus action for 1 minute: regain 10 HP at the start of each turn, cast 1-action Paladin spells as a bonus action, enemies within 10 ft have disadvantage on saves against your Paladin spells and Channel Divinity. Once per long rest or a level 5 slot.',
        effects: [
          { type: 'resource', id: 'elder-champion', name: 'Elder Champion', max: () => 1, reset: 'long' },
          { type: 'action', id: 'elder-champion', name: 'Elder Champion', kind: 'bonus', cost: { resource: 'elder-champion', amount: 1 }, summary: '1 minute: 10 HP a turn, bonus action spells, enemies nearby save at disadvantage.' },
        ] },
    ],
  },
  {
    id: 'vengeance', name: 'Oath of Vengeance', source: SRC, summary: 'Avenger: marks one foe and hunts it down.',
    features: [
      { id: 'vengeance-spells', level: 3, name: 'Oath of Vengeance Spells', summary: "Always prepared: Bane, Hunter's Mark; Hold Person, Misty Step (5); Haste, Protection from Energy (9); Banishment, Dimension Door (13); Hold Monster, Scrying (17).",
        alwaysPrepared: { 3: ['bane', 'hunters-mark'], 5: ['hold-person', 'misty-step'], 9: ['haste', 'protection-from-energy'], 13: ['banishment', 'dimension-door'], 17: ['hold-monster', 'scrying'] } },
      { id: 'vow-of-enmity', level: 3, name: 'Vow of Enmity', summary: 'When you take the Attack action, Channel Divinity: advantage on attacks against one creature you can see within 30 ft for 1 minute. If it drops to 0 HP first, move the vow to another creature within 30 ft (no action).',
        effects: [{ type: 'action', id: 'vow-of-enmity', name: 'Vow of Enmity', kind: 'free', cost: cd(), summary: 'Advantage on attacks against one creature for 1 minute.' }] },
      { id: 'relentless-avenger', level: 7, name: 'Relentless Avenger', summary: 'Hit with an opportunity attack: the target\'s speed is 0 for the turn, and you move up to half your speed without provoking, as part of the same reaction.' },
      { id: 'soul-of-vengeance', level: 15, name: 'Soul of Vengeance', summary: 'When the creature under your Vow of Enmity makes an attack roll (hit or miss), reaction: one melee attack against it if it is in range.',
        effects: [{ type: 'action', id: 'soul-of-vengeance', name: 'Soul of Vengeance', kind: 'reaction', summary: 'Your vowed foe attacks: you attack it back.' }] },
      { id: 'avenging-angel', level: 20, name: 'Avenging Angel', summary: 'Bonus action for 10 minutes: fly 60 ft (hover), and enemies starting a turn in your aura make a WIS save or are Frightened for 1 minute or until damaged; attacks against them have advantage. Once per long rest or a level 5 slot.',
        effects: [
          { type: 'resource', id: 'avenging-angel', name: 'Avenging Angel', max: () => 1, reset: 'long' },
          { type: 'action', id: 'avenging-angel', name: 'Avenging Angel', kind: 'bonus', cost: { resource: 'avenging-angel', amount: 1 }, summary: '10 minutes: fly 60 ft, frightening aura.', save: { ability: 'WIS', dc: dc('CHA') } },
        ] },
    ],
  },
]

// ---------------------------------------------------------------- Ranger

// Beast Master companions (2024 stat blocks), in short. HP and attack scale with ranger level and proficiency.
const BEASTS = [
  { id: 'land', name: 'Beast of the Land', hp: (c) => 5 + 5 * c.level, dmg: (c) => `1d8+${2 + c.mod.WIS}`, type: 'Bludgeoning, Piercing or Slashing (chosen on summon)',
    summary: 'Speed 40 ft, climb 40 ft. Charge: after moving 20+ ft straight at a target, a hit adds 1d6 and a Large or smaller target makes a STR save or falls Prone.' },
  { id: 'sea', name: 'Beast of the Sea', hp: (c) => 5 + 5 * c.level, dmg: (c) => `1d6+${2 + c.mod.WIS}`, type: 'Bludgeoning or Piercing, and the target is Grappled (escape DC = your spell save DC)',
    summary: 'Speed 5 ft, swim 60 ft, breathes air and water.' },
  { id: 'sky', name: 'Beast of the Sky', hp: (c) => 4 + 4 * c.level, dmg: (c) => `1d4+${3 + c.mod.WIS}`, type: 'Slashing',
    summary: 'Speed 10 ft, fly 60 ft. Flyby: it does not provoke opportunity attacks when it flies out of reach.' },
]

const RANGER_SUBS = [
  {
    id: 'beast-master', name: 'Beast Master', source: SRC, summary: 'A primal beast companion of land, sea or sky fights at your command.',
    features: [
      { id: 'primal-companion', level: 3, name: 'Primal Companion', summary: "A primal beast of the land, sea or sky: AC 13 + WIS, hit bonus = your spell attack. It acts on your turn and only Dodges unless you spend a bonus action to command it, or give up one of your attacks for its Beast's Strike. Dead within the hour: Magic action + a spell slot brings it back after 1 minute. Change it on a long rest.",
        effects: [{ type: 'note', save: { label: "Your beast's AC (13 + WIS); escape DC for the Sea beast's grapple = your spell save DC.", dc: (c) => 13 + c.mod.WIS } }],
        choices: [{ key: 'beast', label: 'Primal beast', count: 1, options: () => BEASTS.map((b) => ({
          id: b.id, name: b.name, summary: b.summary,
          effects: [{ type: 'action', id: 'beasts-strike', name: `${b.name}: Beast's Strike`, kind: 'bonus', summary: (c) => `Command it (bonus action, or in place of one of your attacks). HP ${b.hp(c)}, AC ${13 + c.mod.WIS}. ${b.summary}`,
            roll: { label: 'Damage', expr: b.dmg, why: `Beast's Strike: ${b.type}.` } }],
        })) }] },
      { id: 'exceptional-training', level: 7, name: 'Exceptional Training', summary: 'When you command your beast with a bonus action, it can also Dash, Disengage, Dodge or Help as a bonus action. Its hits can deal Force damage instead.' },
      { id: 'bestial-fury', level: 11, name: 'Bestial Fury', summary: "Beast's Strike can be used twice per command. The first hit each turn on your Hunter's Mark target adds the spell's extra Force damage." },
      { id: 'share-spells', level: 15, name: 'Share Spells', summary: 'A spell you cast on yourself can also affect your beast within 30 ft.' },
    ],
  },
  {
    id: 'fey-wanderer', name: 'Fey Wanderer', source: SRC, summary: 'Touched by the Feywild: psychic strikes, charm, and fey allies.',
    features: [
      { id: 'dreadful-strikes', level: 3, name: 'Dreadful Strikes', summary: 'Your weapon hits deal an extra 1d4 Psychic (1d6 at 11); each creature takes it only once per turn.',
        effects: [{ type: 'action', id: 'dreadful-strikes', name: 'Dreadful Strikes', kind: 'free', summary: 'Each weapon hit, once per creature per turn.',
          roll: { label: 'Psychic damage', expr: (c) => (c.level >= 11 ? '1d6' : '1d4'), why: 'Dreadful Strikes: 1d4 psychic (1d6 from ranger level 11).' } }] },
      { id: 'fey-wanderer-spells', level: 3, name: 'Fey Wanderer Spells', summary: 'Always prepared: Charm Person; Misty Step (5); Summon Fey (9); Dimension Door (13); Mislead (17). Also a fey gift (a harmless magical trinket or trait).',
        alwaysPrepared: { 3: ['charm-person'], 5: ['misty-step'], 13: ['dimension-door'], 17: ['mislead'] } },
      { id: 'otherworldly-glamour', level: 3, name: 'Otherworldly Glamour', summary: 'Add your WIS modifier (min +1) to CHA checks. Proficiency in Deception, Performance or Persuasion.',
        choices: [{ key: 'skill', label: 'Otherworldly Glamour skill', count: 1, kind: 'skill', options: skillOpts(['deception', 'performance', 'persuasion']) }] },
      { id: 'beguiling-twist', level: 7, name: 'Beguiling Twist', summary: 'Advantage on saves against Charmed and Frightened. When you or a creature within 120 ft succeeds on such a save, reaction: another creature within 120 ft makes a WIS save or is Charmed or Frightened (you pick) for 1 minute, saving again each turn.',
        effects: [{ type: 'action', id: 'beguiling-twist', name: 'Beguiling Twist', kind: 'reaction', summary: 'After a successful save against Charmed/Frightened nearby.', save: { ability: 'WIS', dc: dc('WIS') } }] },
      { id: 'fey-reinforcements', level: 11, name: 'Fey Reinforcements', summary: 'Summon Fey needs no material component; cast it once per long rest without a slot, and you may drop its concentration (it then lasts 1 minute). Dreadful Strikes becomes 1d6.',
        effects: [{ type: 'resource', id: 'fey-reinforcements', name: 'Free Summon Fey', max: () => 1, reset: 'long' }] },
      { id: 'misty-wanderer', level: 15, name: 'Misty Wanderer', summary: 'Cast Misty Step without a slot WIS modifier (min 1) times per long rest, and bring a willing creature within 5 ft along.',
        effects: [
          { type: 'resource', id: 'misty-wanderer', name: 'Free Misty Step', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'misty-wanderer', name: 'Misty Step (free)', kind: 'bonus', cost: { resource: 'misty-wanderer', amount: 1 }, summary: 'Teleport 30 ft, and take one willing creature within 5 ft with you.' },
        ] },
    ],
  },
  {
    id: 'gloom-stalker', name: 'Gloom Stalker', source: SRC, summary: 'Ambusher of the dark: first-turn burst, invisible to darkvision.',
    features: [
      { id: 'gloom-stalker-spells', level: 3, name: 'Gloom Stalker Spells', summary: 'Always prepared: Disguise Self; Rope Trick (5); Fear (9); Greater Invisibility (13); Seeming (17).',
        alwaysPrepared: { 3: ['disguise-self'], 5: ['rope-trick'], 9: ['fear'], 13: ['greater-invisibility'], 17: ['seeming'] } },
      { id: 'dread-ambusher', level: 3, name: 'Dread Ambusher', summary: "+10 ft speed on your first turn of each combat. Add WIS to initiative. Dreadful Strike: once a turn on a weapon hit, +2d6 Psychic (2d8 at 11), WIS modifier (min 1) times per long rest.",
        effects: [
          { type: 'bonus', target: 'initiative', label: 'Dread Ambusher (WIS)', value: (c) => c.mod.WIS },
          { type: 'resource', id: 'dreadful-strike', name: 'Dreadful Strike', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'dreadful-strike', name: 'Dreadful Strike', kind: 'free', cost: { resource: 'dreadful-strike', amount: 1 }, summary: 'Once a turn, on a weapon hit.',
            roll: { label: 'Psychic damage', expr: (c) => (c.level >= 11 ? '2d8' : '2d6'), why: "Dreadful Strike: 2d6 psychic (2d8 from ranger level 11, Stalker's Flurry)." } },
        ] },
      { id: 'umbral-sight', level: 3, name: 'Umbral Sight', summary: 'Darkvision 60 ft (+60 if you already have it). While entirely in darkness, you are Invisible to creatures that rely on darkvision to see you there.',
        effects: [{ type: 'sense', name: 'Darkvision', range: 60 }] },
      { id: 'iron-mind', level: 7, name: 'Iron Mind', summary: 'Proficiency in WIS saving throws (if you already have it, INT or CHA instead).',
        effects: [{ type: 'prof', saves: ['WIS'] }] },
      { id: 'stalkers-flurry', level: 11, name: "Stalker's Flurry", summary: 'Dreadful Strike deals 2d8. When you use it, also pick one: Sudden Strike (another attack with the same weapon on a different creature within 5 ft of the target) or Mass Fear (the target and creatures within 10 ft of it make a WIS save or are Frightened until the start of your next turn).',
        effects: [{ type: 'note', save: { label: 'Mass Fear (WIS save):', dc: dc('WIS') } }] },
      { id: 'shadowy-dodge', level: 15, name: 'Shadowy Dodge', summary: 'Reaction when a creature makes an attack roll against you: give it disadvantage, then teleport up to 30 ft to a space you can see.',
        effects: [{ type: 'action', id: 'shadowy-dodge', name: 'Shadowy Dodge', kind: 'reaction', summary: 'Disadvantage on one attack against you, then teleport 30 ft.' }] },
    ],
  },
]

export const PHB_SUBCLASSES_2 = { fighter: FIGHTER_SUBS, monk: MONK_SUBS, paladin: PALADIN_SUBS, ranger: RANGER_SUBS }
