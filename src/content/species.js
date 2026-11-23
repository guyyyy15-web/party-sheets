// The nine species of the SRD 5.2 (CC-BY-4.0), summarised. Spells they grant are listed as notes until phase 2.
import { FEATS } from './feats.js'

const darkvision = (range) => ({ type: 'sense', name: 'Darkvision', range })
const opts = (list) => () => list
const giant = (kind, extra) => ({ type: 'action', id: 'giant-ancestry', name: extra.name, kind, cost: { resource: 'giant-ancestry', amount: 1 }, summary: extra.summary, ...(extra.roll ? { roll: extra.roll } : {}), ...(extra.save ? { save: extra.save } : {}) })
/** A spell a lineage gives at `level`: cast once per long rest without a slot (more with slots from phase 2). */
const lineageSpell = (id, name, level, abilityNote) => ([
  { type: 'resource', id: `spell-${id}`, name, max: () => 1, reset: 'long', when: (c) => c.total >= level },
  { type: 'action', id: `spell-${id}`, name, kind: 'action', cost: { resource: `spell-${id}`, amount: 1 }, summary: `Cast ${name} without a spell slot (${abilityNote}).`, when: (c) => c.total >= level },
])
const lineageAbility = 'INT, WIS or CHA, chosen with the lineage'

export const SPECIES = [
  {
    id: 'dragonborn', name: 'Dragonborn', size: 'Medium', speed: 30, blurb: 'Draconic ancestry: breathe energy and shrug it off.',
    features: [
      {
        id: 'draconic-ancestry', name: 'Draconic Ancestry', summary: 'Pick a dragon type: it sets your breath weapon and resistance.',
        choices: [{ key: 'ancestry', label: 'Dragon', count: 1, options: opts([
          ['black', 'Black', 'acid'], ['blue', 'Blue', 'lightning'], ['brass', 'Brass', 'fire'], ['bronze', 'Bronze', 'lightning'], ['copper', 'Copper', 'acid'],
          ['gold', 'Gold', 'fire'], ['green', 'Green', 'poison'], ['red', 'Red', 'fire'], ['silver', 'Silver', 'cold'], ['white', 'White', 'cold'],
        ].map(([id, name, dmg]) => ({ id, name: `${name} (${dmg})`, damage: dmg, effects: [{ type: 'resist', damage: dmg }] }))) }],
      },
      {
        id: 'breath-weapon', name: 'Breath Weapon', summary: 'Replace one attack: a 15 ft cone or 30 ft line. DEX save, half on a success.',
        effects: [
          { type: 'resource', id: 'breath-weapon', name: 'Breath Weapon', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'breath-weapon', name: 'Breath Weapon', kind: 'action', cost: { resource: 'breath-weapon', amount: 1 },
            summary: 'Replaces one attack of the Attack action.', roll: { label: 'Damage', expr: (c) => `${c.total >= 17 ? 4 : c.total >= 11 ? 3 : c.total >= 5 ? 2 : 1}d10` },
            save: { ability: 'DEX', dc: (c) => 8 + c.mod.CON + c.prof } },
        ],
      },
      { id: 'dragonborn-darkvision', name: 'Darkvision', summary: '60 ft.', effects: [darkvision(60)] },
      { id: 'draconic-flight', name: 'Draconic Flight', level: 5, summary: 'Bonus action: spectral wings, fly speed equal to your speed for 10 minutes. Once per long rest.',
        effects: [
          { type: 'resource', id: 'draconic-flight', name: 'Draconic Flight', max: () => 1, reset: 'long' },
          { type: 'action', id: 'draconic-flight', name: 'Draconic Flight', kind: 'bonus', cost: { resource: 'draconic-flight', amount: 1 }, summary: 'Fly speed equal to your speed for 10 minutes.' },
        ] },
    ],
  },
  {
    id: 'dwarf', name: 'Dwarf', size: 'Medium', speed: 30, blurb: 'Tough as stone, sees far in the dark.',
    features: [
      { id: 'dwarf-darkvision', name: 'Darkvision', summary: '120 ft.', effects: [darkvision(120)] },
      { id: 'dwarven-resilience', name: 'Dwarven Resilience', summary: 'Resistance to poison damage, advantage on saves against being poisoned.', effects: [{ type: 'resist', damage: 'poison' }] },
      { id: 'dwarven-toughness', name: 'Dwarven Toughness', summary: '+1 HP per level.', effects: [{ type: 'bonus', target: 'hpMax', label: 'Dwarven Toughness', value: (c) => c.total }] },
      { id: 'stonecunning', name: 'Stonecunning', summary: 'Bonus action: tremorsense 60 ft for 10 minutes while on stone.',
        effects: [
          { type: 'resource', id: 'stonecunning', name: 'Stonecunning', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'stonecunning', name: 'Stonecunning', kind: 'bonus', cost: { resource: 'stonecunning', amount: 1 }, summary: 'Tremorsense 60 ft for 10 minutes, on or touching stone.' },
        ] },
    ],
  },
  {
    id: 'elf', name: 'Elf', size: 'Medium', speed: 30, blurb: 'Keen senses, fey blood, magic in the family line.',
    features: [
      { id: 'elf-darkvision', name: 'Darkvision', summary: '60 ft (120 ft for Drow).', effects: [{ type: 'sense', name: 'Darkvision', range: 60, when: (c) => c.pick('elven-lineage', 'lineage') !== 'drow' }, { type: 'sense', name: 'Darkvision', range: 120, when: (c) => c.pick('elven-lineage', 'lineage') === 'drow' }] },
      {
        id: 'elven-lineage', name: 'Elven Lineage', summary: 'Your lineage gives you a cantrip, and more spells at levels 3 and 5.',
        choices: [{ key: 'lineage', label: 'Lineage', count: 1, options: opts([
          { id: 'drow', name: 'Drow', summary: 'Dancing Lights cantrip; Faerie Fire at 3, Darkness at 5.', effects: [...lineageSpell('faerie-fire', 'Faerie Fire', 3, lineageAbility), ...lineageSpell('darkness', 'Darkness', 5, lineageAbility)] },
          { id: 'high', name: 'High Elf', summary: 'Prestidigitation cantrip (swap on a long rest); Detect Magic at 3, Misty Step at 5.', effects: [...lineageSpell('detect-magic', 'Detect Magic', 3, lineageAbility), ...lineageSpell('misty-step', 'Misty Step', 5, lineageAbility)] },
          { id: 'wood', name: 'Wood Elf', summary: 'Druidcraft cantrip, speed 35 ft; Longstrider at 3, Pass without Trace at 5.', effects: [{ type: 'speed', value: 35 }, ...lineageSpell('longstrider', 'Longstrider', 3, lineageAbility), ...lineageSpell('pass-without-trace', 'Pass without Trace', 5, lineageAbility)] },
        ]) }, { key: 'spellAbility', label: 'Spellcasting ability', count: 1, options: () => [{ id: 'INT', name: 'Intelligence' }, { id: 'WIS', name: 'Wisdom' }, { id: 'CHA', name: 'Charisma' }] }],
      },
      { id: 'fey-ancestry', name: 'Fey Ancestry', summary: 'Advantage on saves to avoid or end being charmed.' },
      { id: 'keen-senses', name: 'Keen Senses', summary: 'Proficiency in Insight, Perception or Survival.',
        choices: [{ key: 'skill', label: 'Skill', count: 1, kind: 'skill', options: opts(['insight', 'perception', 'survival'].map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1) }))) }] },
      { id: 'trance', name: 'Trance', summary: 'A long rest takes 4 hours of meditation, and you can\'t be put to sleep by magic.' },
    ],
  },
  {
    id: 'gnome', name: 'Gnome', size: 'Small', speed: 30, blurb: 'Clever, curious and hard to fool.',
    features: [
      { id: 'gnome-darkvision', name: 'Darkvision', summary: '60 ft.', effects: [darkvision(60)] },
      { id: 'gnomish-cunning', name: 'Gnomish Cunning', summary: 'Advantage on INT, WIS and CHA saving throws.' },
      {
        id: 'gnomish-lineage', name: 'Gnomish Lineage', summary: 'Forest gnomes speak with animals, rock gnomes tinker.',
        choices: [{ key: 'lineage', label: 'Lineage', count: 1, options: opts([
          { id: 'forest', name: 'Forest Gnome', summary: 'Minor Illusion cantrip; Speak with Animals without a slot, prof bonus times per long rest.', effects: [
            { type: 'resource', id: 'speak-with-animals', name: 'Speak with Animals', max: (c) => c.prof, reset: 'long' },
            { type: 'action', id: 'speak-with-animals', name: 'Speak with Animals', kind: 'action', cost: { resource: 'speak-with-animals', amount: 1 }, summary: 'Cast it without a spell slot.' },
          ] },
          { id: 'rock', name: 'Rock Gnome', summary: 'Mending and Prestidigitation cantrips; build tiny clockwork devices.' },
        ]) }, { key: 'spellAbility', label: 'Spellcasting ability', count: 1, options: () => [{ id: 'INT', name: 'Intelligence' }, { id: 'WIS', name: 'Wisdom' }, { id: 'CHA', name: 'Charisma' }] }],
      },
    ],
  },
  {
    id: 'goliath', name: 'Goliath', size: 'Medium', speed: 35, blurb: 'Giant blood: big, strong, and a gift from a giant kin.',
    features: [
      {
        id: 'giant-ancestry', name: 'Giant Ancestry', summary: 'A supernatural boon from your giant kin, prof bonus times per long rest.',
        choices: [{ key: 'ancestry', label: 'Giant', count: 1, options: opts([
          { id: 'cloud', name: 'Cloud\'s Jaunt', summary: 'Bonus action: teleport 30 ft.', effects: [giant('bonus', { name: "Cloud's Jaunt", summary: 'Teleport up to 30 ft to a space you can see.' })] },
          { id: 'fire', name: 'Fire\'s Burn', summary: 'On a hit, deal an extra 1d10 fire damage.', effects: [giant('free', { name: "Fire's Burn", summary: 'On a hit: extra fire damage.', roll: { label: 'Fire damage', expr: () => '1d10' } })] },
          { id: 'frost', name: 'Frost\'s Chill', summary: 'On a hit, an extra 1d6 cold damage and the target\'s speed drops 10 ft.', effects: [giant('free', { name: "Frost's Chill", summary: "On a hit: extra cold damage, the target's speed -10 ft until your next turn.", roll: { label: 'Cold damage', expr: () => '1d6' } })] },
          { id: 'hill', name: 'Hill\'s Tumble', summary: 'On a hit, knock a Large or smaller target Prone.', effects: [giant('free', { name: "Hill's Tumble", summary: 'On a hit: a Large or smaller target falls Prone.' })] },
          { id: 'stone', name: 'Stone\'s Endurance', summary: 'Reaction when damaged: reduce it by 1d12 + CON.', effects: [giant('reaction', { name: "Stone's Endurance", summary: 'When you take damage: reduce it.', roll: { label: 'Reduce by', expr: (c) => `1d12${c.mod.CON >= 0 ? '+' : ''}${c.mod.CON}`, parts: (c) => [{ label: 'CON modifier', value: c.mod.CON, kind: 'ability' }], why: "Stone's Endurance: roll 1d12, add CON, and take that much less damage." } })] },
          { id: 'storm', name: 'Storm\'s Thunder', summary: 'Reaction when damaged by a creature within 60 ft: 1d8 thunder damage to it.', effects: [giant('reaction', { name: "Storm's Thunder", summary: 'When a creature within 60 ft damages you: thunder damage to it.', roll: { label: 'Thunder damage', expr: () => '1d8' } })] },
        ]) }],
        effects: [{ type: 'resource', id: 'giant-ancestry', name: 'Giant Ancestry', max: (c) => c.prof, reset: 'long' }],
      },
      { id: 'large-form', name: 'Large Form', level: 5, summary: 'Bonus action: become Large for 10 minutes, +10 ft speed and advantage on STR checks. Once per long rest.',
        effects: [
          { type: 'resource', id: 'large-form', name: 'Large Form', max: () => 1, reset: 'long' },
          { type: 'action', id: 'large-form', name: 'Large Form', kind: 'bonus', cost: { resource: 'large-form', amount: 1 }, summary: 'Large for 10 minutes: +10 ft speed, advantage on STR checks.' },
        ] },
      { id: 'powerful-build', name: 'Powerful Build', summary: 'Advantage on checks to end being grappled; count as one size larger for carrying.' },
    ],
  },
  {
    id: 'halfling', name: 'Halfling', size: 'Small', speed: 30, blurb: 'Small, brave and lucky.',
    features: [
      { id: 'brave', name: 'Brave', summary: 'Advantage on saves to avoid or end being frightened.' },
      { id: 'halfling-nimbleness', name: 'Halfling Nimbleness', summary: 'Move through the space of any creature larger than you.' },
      { id: 'luck', name: 'Luck', summary: 'When you roll a 1 on a d20 test, reroll it and use the new roll.' },
      { id: 'naturally-stealthy', name: 'Naturally Stealthy', summary: 'You can hide behind a creature at least one size larger than you.' },
    ],
  },
  {
    id: 'human', name: 'Human', size: 'Medium or Small', speed: 30, blurb: 'Versatile: an extra skill and an extra feat.',
    features: [
      { id: 'human-size', name: 'Size', summary: 'Medium or Small, your choice.', choices: [{ key: 'size', label: 'Size', count: 1, options: () => [{ id: 'medium', name: 'Medium' }, { id: 'small', name: 'Small' }] }] },
      { id: 'resourceful', name: 'Resourceful', summary: 'You gain Heroic Inspiration whenever you finish a long rest.' },
      { id: 'skillful', name: 'Skillful', summary: 'Proficiency in one skill of your choice.',
        choices: [{ key: 'skill', label: 'Skill', count: 1, kind: 'skill', options: (c) => c.skillOptions() }] },
      { id: 'versatile', name: 'Versatile', summary: 'An Origin feat of your choice.',
        choices: [{ key: 'feat', label: 'Origin feat', count: 1, kind: 'feat', options: () => FEATS.filter((f) => f.category === 'origin') }] },
    ],
  },
  {
    id: 'orc', name: 'Orc', size: 'Medium', speed: 30, blurb: 'Relentless: dash in, refuse to fall.',
    features: [
      { id: 'orc-darkvision', name: 'Darkvision', summary: '120 ft.', effects: [darkvision(120)] },
      { id: 'adrenaline-rush', name: 'Adrenaline Rush', summary: 'Bonus action Dash, and gain temporary HP equal to your proficiency bonus.',
        effects: [
          { type: 'resource', id: 'adrenaline-rush', name: 'Adrenaline Rush', max: (c) => c.prof, reset: 'short' },
          { type: 'action', id: 'adrenaline-rush', name: 'Adrenaline Rush', kind: 'bonus', cost: { resource: 'adrenaline-rush', amount: 1 }, summary: (c) => `Dash, and gain ${c.prof} temporary HP.` },
        ] },
      { id: 'relentless-endurance', name: 'Relentless Endurance', summary: 'When you drop to 0 HP but aren\'t killed outright, drop to 1 HP instead. Once per long rest.',
        effects: [
          { type: 'resource', id: 'relentless-endurance', name: 'Relentless Endurance', max: () => 1, reset: 'long' },
          { type: 'action', id: 'relentless-endurance', name: 'Relentless Endurance', kind: 'free', cost: { resource: 'relentless-endurance', amount: 1 }, summary: 'Dropped to 0 HP but not killed outright: drop to 1 HP instead.', setHp: 1 },
        ] },
    ],
  },
  {
    id: 'tiefling', name: 'Tiefling', size: 'Medium or Small', speed: 30, blurb: 'Fiendish legacy: resistances and a touch of magic.',
    features: [
      { id: 'tiefling-darkvision', name: 'Darkvision', summary: '60 ft.', effects: [darkvision(60)] },
      { id: 'tiefling-size', name: 'Size', summary: 'Medium or Small, your choice.', choices: [{ key: 'size', label: 'Size', count: 1, options: () => [{ id: 'medium', name: 'Medium' }, { id: 'small', name: 'Small' }] }] },
      {
        id: 'fiendish-legacy', name: 'Fiendish Legacy', summary: 'A resistance and a cantrip from your legacy, more spells at levels 3 and 5.',
        choices: [{ key: 'legacy', label: 'Legacy', count: 1, options: opts([
          { id: 'abyssal', name: 'Abyssal', summary: 'Poison resistance, Poison Spray; Ray of Sickness at 3, Hold Person at 5.', effects: [{ type: 'resist', damage: 'poison' }, ...lineageSpell('ray-of-sickness', 'Ray of Sickness', 3, lineageAbility), ...lineageSpell('hold-person', 'Hold Person', 5, lineageAbility)] },
          { id: 'chthonic', name: 'Chthonic', summary: 'Necrotic resistance, Chill Touch; False Life at 3, Ray of Enfeeblement at 5.', effects: [{ type: 'resist', damage: 'necrotic' }, ...lineageSpell('false-life', 'False Life', 3, lineageAbility), ...lineageSpell('ray-of-enfeeblement', 'Ray of Enfeeblement', 5, lineageAbility)] },
          { id: 'infernal', name: 'Infernal', summary: 'Fire resistance, Fire Bolt; Hellish Rebuke at 3, Darkness at 5.', effects: [{ type: 'resist', damage: 'fire' }, ...lineageSpell('hellish-rebuke', 'Hellish Rebuke', 3, lineageAbility), ...lineageSpell('darkness-tiefling', 'Darkness', 5, lineageAbility)] },
        ]) }, { key: 'spellAbility', label: 'Spellcasting ability', count: 1, options: () => [{ id: 'INT', name: 'Intelligence' }, { id: 'WIS', name: 'Wisdom' }, { id: 'CHA', name: 'Charisma' }] }],
      },
      { id: 'otherworldly-presence', name: 'Otherworldly Presence', summary: 'You know the Thaumaturgy cantrip.' },
    ],
  },
]
export const speciesById = (id) => SPECIES.find((s) => s.id === id) || null
