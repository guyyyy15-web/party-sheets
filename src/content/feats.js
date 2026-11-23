// Feats from the SRD 5.2 (CC-BY-4.0), summarised. A feat is a feature: effects + choices.
import { SKILLS } from './basics.js'
import { PHB_FEATS } from './phb-feats.js'

const skillOptions = () => SKILLS.map((s) => ({ id: s.id, name: s.name }))

const SRD_FEATS = [
  // Origin feats
  {
    id: 'alert', name: 'Alert', category: 'origin',
    summary: 'Add your proficiency bonus to initiative. You can swap initiative with a willing ally right after rolling.',
    effects: [{ type: 'bonus', target: 'initiative', label: 'Alert', value: (c) => c.prof }],
  },
  {
    id: 'magic-initiate', name: 'Magic Initiate', category: 'origin',
    summary: 'Two cantrips and one level 1 spell from the Cleric, Druid or Wizard list. Cast the spell once per long rest without a slot. (Spells arrive in phase 2: note them for now.)',
    choices: [{ key: 'list', label: 'Spell list', count: 1, options: () => [{ id: 'cleric', name: 'Cleric' }, { id: 'druid', name: 'Druid' }, { id: 'wizard', name: 'Wizard' }] }],
    effects: [{ type: 'resource', id: 'magic-initiate', name: 'Magic Initiate spell', max: () => 1, reset: 'long' }],
  },
  {
    id: 'savage-attacker', name: 'Savage Attacker', category: 'origin',
    summary: 'Once per turn when you hit with a weapon, roll its damage dice twice and use either roll.',
  },
  {
    id: 'skilled', name: 'Skilled', category: 'origin',
    summary: 'Proficiency in any three skills (or tools).',
    choices: [{ key: 'skills', label: 'Three skills', count: 3, kind: 'skill', options: skillOptions }],
  },
  // General feats (level 4+)
  {
    id: 'grappler', name: 'Grappler', category: 'general', prereq: { level: 4, scores: { STR: 13, DEX: 13 }, any: true },
    summary: '+1 STR or DEX. Once per turn, when you hit with an Unarmed Strike as part of the Attack action, you can both damage and grapple. Advantage on attacks against a creature you grapple. Moving a grappled creature your size or smaller costs no extra movement.',
    ability: ['STR', 'DEX'],
  },
  // Fighting style feats
  {
    id: 'archery', name: 'Archery', category: 'fighting-style',
    summary: '+2 to attack rolls with ranged weapons.',
    effects: [{ type: 'bonus', target: 'attack.ranged', label: 'Archery', value: () => 2 }],
  },
  {
    id: 'defense', name: 'Defense', category: 'fighting-style',
    summary: '+1 AC while you wear light, medium or heavy armor.',
    effects: [{ type: 'bonus', target: 'ac', label: 'Defense', value: () => 1, when: (c) => !!c.armor }],
  },
  {
    id: 'great-weapon-fighting', name: 'Great Weapon Fighting', category: 'fighting-style',
    summary: 'With a two-handed or versatile melee weapon held in two hands, treat any 1 or 2 on a damage die as a 3.',
  },
  {
    id: 'two-weapon-fighting', name: 'Two-Weapon Fighting', category: 'fighting-style',
    summary: 'When you make the extra attack from wielding two Light weapons, add your ability modifier to its damage.',
  },
  // Epic boons (level 19)
  { id: 'boon-combat-prowess', name: 'Boon of Combat Prowess', category: 'epic', ability: 'any', summary: '+1 to one ability (max 30). When you miss with an attack roll, you can hit instead. Then not again until the start of your next turn.' },
  { id: 'boon-dimensional-travel', name: 'Boon of Dimensional Travel', category: 'epic', ability: 'any', summary: '+1 to one ability (max 30). After the Attack or Magic action, teleport up to 30 ft.' },
  { id: 'boon-fate', name: 'Boon of Fate', category: 'epic', ability: 'any', summary: '+1 to one ability (max 30). When you or a creature within 60 ft succeeds or fails a d20 test, roll 2d4 and add or subtract it. Back when you roll initiative or finish a short or long rest.' },
  { id: 'boon-irresistible-offense', name: 'Boon of Irresistible Offense', category: 'epic', ability: ['STR', 'DEX'], summary: '+1 STR or DEX (max 30). Your attacks ignore resistance to B/P/S, and a natural 20 adds damage equal to that score.' },
  { id: 'boon-spell-recall', name: 'Boon of Spell Recall', category: 'epic', ability: ['INT', 'WIS', 'CHA'], prereq: { spellcasting: true }, summary: '+1 INT, WIS or CHA (max 30). When you cast a spell with a level 1-4 slot, roll 1d4: if it equals the slot level, the slot is not spent. Needs the Spellcasting feature.' },
  { id: 'boon-night-spirit', name: 'Boon of the Night Spirit', category: 'epic', ability: 'any', summary: '+1 to one ability (max 30). Bonus action in dim light or darkness: become Invisible until you take an action, bonus action or reaction. Resist all damage but psychic and radiant while in dim light or darkness.' },
  { id: 'boon-truesight', name: 'Boon of Truesight', category: 'epic', ability: 'any', summary: '+1 to one ability (max 30). Truesight 60 ft.' },
]
/** SRD feats, then the 2024 Player's Handbook ones (mechanics in our own words). */
export const FEATS = [...SRD_FEATS, ...PHB_FEATS]
export const featById = (id) => FEATS.find((f) => f.id === id) || null
