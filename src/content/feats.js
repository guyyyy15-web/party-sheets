// Feats from the SRD 5.2 (CC-BY-4.0), summarised. A feat is a feature: effects + choices.
import { SKILLS } from './basics.js'

const skillOptions = () => SKILLS.map((s) => ({ id: s.id, name: s.name }))

export const FEATS = [
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
    summary: '+1 STR or DEX. When you hit with an Unarmed Strike on your turn you can both damage and grapple. Advantage on attacks against a creature you grapple. Moving a grappled creature costs no extra movement.',
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
  { id: 'boon-combat-prowess', name: 'Boon of Combat Prowess', category: 'epic', ability: 'any', summary: '+1 to one ability (max 30). Once per turn, turn a missed attack into a hit.' },
  { id: 'boon-dimensional-travel', name: 'Boon of Dimensional Travel', category: 'epic', ability: 'any', summary: '+1 to one ability (max 30). After the Attack or Magic action, teleport up to 30 ft.' },
  { id: 'boon-fate', name: 'Boon of Fate', category: 'epic', ability: 'any', summary: '+1 to one ability (max 30). Once per short rest, add or subtract 2d4 from a d20 test you can see.' },
  { id: 'boon-irresistible-offense', name: 'Boon of Irresistible Offense', category: 'epic', ability: ['STR', 'DEX'], summary: '+1 STR or DEX (max 30). Your attacks ignore resistance to B/P/S, and a natural 20 adds damage equal to that score.' },
  { id: 'boon-spell-recall', name: 'Boon of Spell Recall', category: 'epic', ability: ['INT', 'WIS', 'CHA'], summary: '+1 INT, WIS or CHA (max 30). Once per long rest, cast a level 1-4 spell without a slot.' },
  { id: 'boon-night-spirit', name: 'Boon of the Night Spirit', category: 'epic', ability: 'any', summary: '+1 to one ability (max 30). Become invisible in dim light or darkness, and resist all damage but psychic and radiant there.' },
  { id: 'boon-truesight', name: 'Boon of Truesight', category: 'epic', ability: 'any', summary: '+1 to one ability (max 30). Truesight 60 ft.' },
]
export const featById = (id) => FEATS.find((f) => f.id === id) || null
