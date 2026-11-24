// Feats from the 2024 Player's Handbook that are not in the SRD 5.2 (feats.js has those).
// Private table use: every summary is our own short paraphrase of what the feat does, never the book's text.
// Same shape as feats.js. Extra prereq keys used here: armor ('light'|'medium'|'heavy'|'shield' training needed),
// fightingStyle (needs the Fighting Style feature). spellcasting: true means Spellcasting or Pact Magic.
import { SKILLS, ABILITIES, ABILITY_NAMES, WEAPONS } from './basics.js'

import { spellChoice } from './feat-spells.js'

const SRC = 'PHB 2024'
const skillOpts = (ids) => SKILLS.filter((s) => !ids || ids.includes(s.id)).map((s) => ({ id: s.id, name: s.name }))
const opts = (list) => list.map(([id, name]) => ({ id, name }))
const STR_DEX = ['STR', 'DEX']
const MENTAL = ['INT', 'WIS', 'CHA']
const ARTISAN_TOOLS = opts([
  ['carpenters-tools', "Carpenter's Tools"], ['leatherworkers-tools', "Leatherworker's Tools"], ['masons-tools', "Mason's Tools"],
  ['potters-tools', "Potter's Tools"], ['smiths-tools', "Smith's Tools"], ['tinkers-tools', "Tinker's Tools"],
  ['weavers-tools', "Weaver's Tools"], ['woodcarvers-tools', "Woodcarver's Tools"], ['alchemists-supplies', "Alchemist's Supplies"],
  ['brewers-supplies', "Brewer's Supplies"], ['calligraphers-supplies', "Calligrapher's Supplies"], ['cartographers-tools', "Cartographer's Tools"],
  ['cobblers-tools', "Cobbler's Tools"], ['cooks-utensils', "Cook's Utensils"], ['glassblowers-tools', "Glassblower's Tools"],
  ['jewelers-tools', "Jeweler's Tools"], ['painters-supplies', "Painter's Supplies"],
])
const INSTRUMENTS = opts([
  ['bagpipes', 'Bagpipes'], ['drum', 'Drum'], ['dulcimer', 'Dulcimer'], ['flute', 'Flute'], ['horn', 'Horn'], ['lute', 'Lute'],
  ['lyre', 'Lyre'], ['pan-flute', 'Pan Flute'], ['shawm', 'Shawm'], ['viol', 'Viol'],
])
const DAMAGE_TYPES = ['acid', 'cold', 'fire', 'lightning', 'necrotic', 'poison', 'psychic', 'radiant', 'thunder']
const cap = (s) => s[0].toUpperCase() + s.slice(1)
const boon = (extra) => ({ category: 'epic', prereq: { level: 19 }, ability: 'any', source: SRC, ...extra })
const general = (extra) => ({ category: 'general', source: SRC, ...extra, prereq: { level: 4, ...(extra.prereq || {}) } })
const style = (extra) => ({ category: 'fighting-style', prereq: { fightingStyle: true }, source: SRC, ...extra })

export const PHB_FEATS = [
  // Origin feats (no ability increase)
  {
    id: 'crafter', name: 'Crafter', category: 'origin', source: SRC,
    summary: 'Proficiency with three Artisan\'s Tools. 20% off nonmagical items you buy. After a long rest, with the right tools, you can make one piece of gear from the Fast Crafting list; it falls apart at the end of your next long rest.',
    choices: [{ key: 'tools', label: "Three Artisan's Tools", count: 3, kind: 'pick', options: () => ARTISAN_TOOLS }],
  },
  {
    id: 'healer', name: 'Healer', category: 'origin', source: SRC,
    summary: 'Battle Medic: with a Healer\'s Kit, Utilize action and one use of the kit; a creature within 5 ft can spend one Hit Die, you roll it and it heals that roll + your proficiency bonus. Reroll any 1 on a healing die from a spell or this feat.',
    effects: [{ type: 'action', id: 'battle-medic', name: 'Battle Medic', kind: 'action', summary: (c) => `Healer's Kit (1 use): a creature within 5 ft spends one of its Hit Dice; roll it and it heals the roll + ${c.prof}. Reroll 1s.` }],
  },
  {
    id: 'lucky', name: 'Lucky', category: 'origin', source: SRC,
    summary: 'Luck Points equal to your proficiency bonus, back on a long rest. Spend one to give yourself advantage on a d20 test, or to give disadvantage to an attack roll against you.',
    effects: [
      { type: 'resource', id: 'luck-points', name: 'Luck Points', max: (c) => c.prof, reset: 'long' },
      { type: 'action', id: 'lucky', name: 'Lucky', kind: 'free', cost: { resource: 'luck-points', amount: 1 }, summary: 'Advantage on your d20 test, or disadvantage on an attack roll against you.' },
    ],
  },
  {
    id: 'musician', name: 'Musician', category: 'origin', source: SRC,
    summary: 'Proficiency with three musical instruments. When you finish a short or long rest, play a song: allies who hear it gain Heroic Inspiration, up to your proficiency bonus in number.',
    choices: [{ key: 'instruments', label: 'Three instruments', count: 3, kind: 'pick', options: () => INSTRUMENTS }],
  },
  {
    id: 'tavern-brawler', name: 'Tavern Brawler', category: 'origin', source: SRC,
    summary: 'Your Unarmed Strike can deal 1d4 + STR bludgeoning, and you reroll 1s on its damage dice. Proficient with improvised weapons. Once per turn, an Unarmed Strike hit in the Attack action can also push the target 5 ft.',
  },
  {
    id: 'tough', name: 'Tough', category: 'origin', source: SRC,
    summary: 'Your hit point maximum goes up by twice your character level (so +2 for every later level too).',
    effects: [{ type: 'hp', label: 'Tough', value: (c) => 2 * c.level }],
  },

  // General feats (level 4+)
  general({
    id: 'actor', name: 'Actor', prereq: { scores: { CHA: 13 } }, ability: ['CHA'],
    summary: '+1 CHA. In disguise, advantage on Deception and Performance checks to pass as someone else. You can mimic voices and sounds; a listener sees through it with a WIS (Insight) check against 8 + CHA mod + proficiency bonus.',
  }),
  general({
    id: 'athlete', name: 'Athlete', prereq: { scores: { STR: 13, DEX: 13 }, any: true }, ability: STR_DEX,
    summary: '+1 STR or DEX. Climb speed equal to your speed. Standing up from Prone costs only 5 ft. A running jump needs only 5 ft of run-up.',
  }),
  general({
    id: 'charger', name: 'Charger', prereq: { scores: { STR: 13, DEX: 13 }, any: true }, ability: STR_DEX,
    summary: '+1 STR or DEX. Dashing adds 10 ft to your speed for that action. Once per turn, after moving 10+ ft straight at a target and hitting it with a melee attack in the Attack action: +1d8 damage, or push it 10 ft (if no more than one size larger).',
    effects: [{ type: 'action', id: 'charge-attack', name: 'Charge Attack', kind: 'free', summary: 'After 10+ ft straight at the target: +1d8 damage or a 10 ft push (once per turn).', roll: { label: 'Extra damage', expr: () => '1d8', why: 'Charger: 1d8 extra on the charging hit.' } }],
  }),
  general({
    id: 'chef', name: 'Chef', ability: ['CON', 'WIS'],
    summary: "+1 CON or WIS. Proficiency with Cook's Utensils. On a short rest, cook for 4 + proficiency bonus creatures: each who spends Hit Dice heals an extra 1d8. After a long rest (or an hour's work) make treats equal to your proficiency bonus; eating one is a bonus action for temp HP equal to your proficiency bonus. Treats last 8 hours.",
    effects: [{ type: 'action', id: 'chef-treat', name: 'Bolstering Treat', kind: 'bonus', summary: (c) => `Eat a treat: ${c.prof} temporary hit points.` }],
  }),
  general({
    id: 'crossbow-expert', name: 'Crossbow Expert', prereq: { scores: { DEX: 13 } }, ability: ['DEX'],
    summary: '+1 DEX. Ignore the Loading property of crossbows. No disadvantage for a crossbow attack with an enemy within 5 ft. The extra Light-weapon attack with a Light crossbow adds your ability modifier to damage.',
  }),
  general({
    id: 'crusher', name: 'Crusher', prereq: { scores: { STR: 13, CON: 13 }, any: true }, ability: ['STR', 'CON'],
    summary: '+1 STR or CON. Once per turn, a hit that deals bludgeoning damage can move the target 5 ft (if no more than one size larger). A critical hit with bludgeoning damage gives attacks against that target advantage until your next turn.',
  }),
  general({
    id: 'defensive-duelist', name: 'Defensive Duelist', prereq: { scores: { DEX: 13 } }, ability: ['DEX'],
    summary: '+1 DEX. Holding a Finesse weapon, when a melee attack hits you, use your reaction to add your proficiency bonus to AC until the start of your next turn (this can turn the hit into a miss).',
    effects: [{ type: 'action', id: 'parry', name: 'Parry', kind: 'reaction', summary: (c) => `With a Finesse weapon: +${c.prof} AC against the melee hit and until your next turn.` }],
  }),
  general({
    id: 'dual-wielder', name: 'Dual Wielder', prereq: { scores: { STR: 13, DEX: 13 }, any: true }, ability: STR_DEX,
    summary: '+1 STR or DEX. After attacking with a Light weapon in the Attack action, a bonus action attack with a different melee weapon that is not Two-Handed (it need not be Light; no ability modifier to damage unless negative). Draw or stow two such weapons at once.',
  }),
  general({
    id: 'durable', name: 'Durable', ability: ['CON'],
    summary: '+1 CON. Advantage on death saving throws. Bonus action: spend one Hit Die and heal the roll.',
    effects: [{ type: 'action', id: 'speedy-recovery', name: 'Speedy Recovery', kind: 'bonus', cost: { resource: 'hit-dice', amount: 1 }, summary: 'Spend one Hit Die and heal its roll.' }],
  }),
  general({
    id: 'elemental-adept', name: 'Elemental Adept', prereq: { spellcasting: true }, ability: MENTAL,
    summary: '+1 INT, WIS or CHA. Pick acid, cold, fire, lightning or thunder: your spells ignore resistance to it, and on their damage dice of that type a 1 counts as a 2. Can be taken again for another type.',
    repeatable: true,
    choices: [{ key: 'element', label: 'Damage type', count: 1, kind: 'pick', options: () => ['acid', 'cold', 'fire', 'lightning', 'thunder'].map((d) => ({ id: d, name: cap(d) })) }],
  }),
  general({
    id: 'fey-touched', name: 'Fey Touched', ability: MENTAL,
    summary: '+1 INT, WIS or CHA. Misty Step and one level 1 Divination or Enchantment spell, always prepared. Cast each once per long rest without a slot (or with slots). They use the ability you raised.',
    choices: [spellChoice('spell', 'A level 1 Divination or Enchantment spell', 1, (s) => s.level === 1 && ['Divination', 'Enchantment'].includes(s.school))],
    spellGrant: { ability: 'raised', fixed: [['misty-step', 'fey-touched-misty-step']], picks: [['spell', 'fey-touched-spell']] },
    effects: [
      { type: 'resource', id: 'fey-touched-misty-step', name: 'Misty Step (Fey Touched)', max: () => 1, reset: 'long' },
      { type: 'resource', id: 'fey-touched-spell', name: 'Fey Touched spell', max: () => 1, reset: 'long' },
    ],
  }),
  general({
    id: 'great-weapon-master', name: 'Great Weapon Master', prereq: { scores: { STR: 13 } }, ability: ['STR'],
    summary: '+1 STR. A hit with a Heavy weapon in the Attack action deals extra damage equal to your proficiency bonus. After a melee weapon critical hit or dropping a creature to 0 HP, attack again with that weapon as a bonus action.',
    effects: [{ type: 'action', id: 'hew', name: 'Hew', kind: 'bonus', summary: 'After a melee crit or a kill with a weapon: one more attack with it.' }],
  }),
  general({
    id: 'heavily-armored', name: 'Heavily Armored', prereq: { armor: 'medium' }, ability: ['STR', 'CON'],
    summary: '+1 STR or CON. Training with heavy armor.',
  }),
  general({
    id: 'heavy-armor-master', name: 'Heavy Armor Master', prereq: { armor: 'heavy' }, ability: ['STR', 'CON'],
    summary: '+1 STR or CON. In heavy armor, bludgeoning, piercing and slashing damage from an attack that hits you is reduced by your proficiency bonus.',
  }),
  general({
    id: 'inspiring-leader', name: 'Inspiring Leader', prereq: { scores: { WIS: 13, CHA: 13 }, any: true }, ability: ['WIS', 'CHA'],
    summary: '+1 WIS or CHA. When you finish a short or long rest, up to six creatures within 30 ft (you too) gain temp HP equal to your character level + the modifier of the ability you raised.',
  }),
  general({
    id: 'keen-mind', name: 'Keen Mind', prereq: { scores: { INT: 13 } }, ability: ['INT'],
    summary: '+1 INT. Proficiency in Arcana, History, Investigation, Nature or Religion (Expertise instead if you already have it). Study as a bonus action.',
    choices: [{ key: 'skill', label: 'Lore skill', count: 1, kind: 'skill', options: () => skillOpts(['arcana', 'history', 'investigation', 'nature', 'religion']) }],
    effects: [{ type: 'action', id: 'quick-study', name: 'Quick Study', kind: 'bonus', summary: 'Take the Study action.' }],
  }),
  general({
    id: 'lightly-armored', name: 'Lightly Armored', ability: STR_DEX,
    summary: '+1 STR or DEX. Training with light armor and shields.',
  }),
  general({
    id: 'mage-slayer', name: 'Mage Slayer', ability: STR_DEX,
    summary: '+1 STR or DEX. A creature you damage has disadvantage on its save to keep Concentration. Once per short or long rest, turn a failed INT, WIS or CHA save into a success.',
    effects: [
      { type: 'resource', id: 'guarded-mind', name: 'Guarded Mind', max: () => 1, reset: 'short' },
      { type: 'action', id: 'guarded-mind', name: 'Guarded Mind', kind: 'free', cost: { resource: 'guarded-mind', amount: 1 }, summary: 'A failed INT, WIS or CHA save succeeds instead.' },
    ],
  }),
  general({
    id: 'martial-weapon-training', name: 'Martial Weapon Training', ability: STR_DEX,
    summary: '+1 STR or DEX. Proficiency with martial weapons.',
  }),
  general({
    id: 'medium-armor-master', name: 'Medium Armor Master', prereq: { armor: 'medium' }, ability: STR_DEX,
    summary: '+1 STR or DEX. In medium armor, add up to 3 (not 2) from DEX to AC if your DEX is 16 or more.',
    effects: [{ type: 'bonus', target: 'ac', label: 'Medium Armor Master', value: () => 1, when: (c) => c.armor?.type === 'medium' && c.score.DEX >= 16 }],
  }),
  general({
    id: 'moderately-armored', name: 'Moderately Armored', prereq: { armor: 'light' }, ability: STR_DEX,
    summary: '+1 STR or DEX. Training with medium armor and shields.',
  }),
  general({
    id: 'mounted-combatant', name: 'Mounted Combatant', ability: ['STR', 'DEX', 'WIS'],
    summary: '+1 STR, DEX or WIS. Mounted, advantage on attacks against unmounted creatures within 5 ft of your mount that are at least one size smaller than it. Your mount takes no damage on a successful DEX save for half (half on a fail). You can make an attack that hits your mount hit you instead.',
  }),
  general({
    id: 'observant', name: 'Observant', prereq: { scores: { INT: 13, WIS: 13 }, any: true }, ability: ['INT', 'WIS'],
    summary: '+1 INT or WIS. Proficiency in Insight, Investigation or Perception (Expertise instead if you already have it). Search as a bonus action.',
    choices: [{ key: 'skill', label: 'Skill', count: 1, kind: 'skill', options: () => skillOpts(['insight', 'investigation', 'perception']) }],
    effects: [{ type: 'action', id: 'quick-search', name: 'Quick Search', kind: 'bonus', summary: 'Take the Search action.' }],
  }),
  general({
    id: 'piercer', name: 'Piercer', prereq: { scores: { STR: 13, DEX: 13 }, any: true }, ability: STR_DEX,
    summary: '+1 STR or DEX. Once per turn, on a hit with piercing damage, reroll one damage die and use the new roll. A critical hit with piercing damage rolls one extra damage die.',
  }),
  general({
    id: 'poisoner', name: 'Poisoner', prereq: { level: 4 }, ability: ['DEX', 'INT'],
    summary: "+1 DEX or INT. Your poison damage ignores resistance to poison. Proficiency with the Poisoner's Kit: 1 hour and 50 gp of materials make doses equal to your proficiency bonus. Bonus action to coat a weapon or ammunition; on a hit the target makes a CON save or takes 2d8 poison and is Poisoned until the end of your next turn.",
    choices: [{ key: 'ability', label: 'Ability you raised (sets the DC)', count: 1, kind: 'pick', options: () => [{ id: 'DEX', name: 'Dexterity' }, { id: 'INT', name: 'Intelligence' }] }],
    effects: [{ type: 'action', id: 'poisoner-dose', name: 'Apply poison', kind: 'bonus', summary: 'Coat a weapon or ammunition: on a hit, CON save or 2d8 poison damage and Poisoned until the end of your next turn.',
      roll: { label: 'Poison damage', expr: () => '2d8' }, save: { ability: 'CON', dc: (c) => 8 + c.prof + (c.mod[c.pick('poisoner', 'ability')] ?? Math.max(c.mod.DEX, c.mod.INT)) } }],
  }),
  general({
    id: 'polearm-master', name: 'Polearm Master', prereq: { scores: { STR: 13, DEX: 13 }, any: true }, ability: STR_DEX,
    summary: '+1 STR or DEX. After the Attack action with a Quarterstaff, Spear or a Heavy Reach weapon, a bonus action attack with its butt end (1d4 bludgeoning). Holding one, you get a reaction attack when a creature enters its reach.',
    effects: [
      { type: 'action', id: 'pole-strike', name: 'Pole Strike', kind: 'bonus', summary: 'Butt-end attack after the Attack action.', roll: { label: 'Damage', expr: () => '1d4', why: 'Pole Strike: 1d4 bludgeoning + the same ability modifier as the weapon.' } },
      { type: 'action', id: 'reactive-strike', name: 'Reactive Strike', kind: 'reaction', summary: 'A creature enters your reach: one melee attack with the polearm.' },
    ],
  }),
  general({
    id: 'resilient', name: 'Resilient', ability: 'any',
    summary: 'Pick an ability whose saving throw you lack: +1 to it and proficiency in its saves. (Take the +1 in that same ability.)',
    choices: [{ key: 'save', label: 'Saving throw', count: 1, kind: 'pick', options: () => ABILITIES.map((a) => ({ id: a, name: ABILITY_NAMES[a], effects: [{ type: 'prof', saves: [a] }] })) }],
  }),
  general({
    id: 'ritual-caster', name: 'Ritual Caster', prereq: { scores: { INT: 13, WIS: 13, CHA: 13 }, any: true }, ability: MENTAL,
    summary: '+1 INT, WIS or CHA. Level 1 Ritual spells, as many as your proficiency bonus (one more each time it rises), always prepared; they use the ability you raised. Once per long rest, cast one of them at its normal casting time without a slot.',
    choices: [spellChoice('rituals', 'Level 1 ritual spells (one per proficiency bonus)', (c) => c.prof, (s) => s.level === 1 && s.ritual)],
    spellGrant: { ability: 'raised', picks: [['rituals', 'quick-ritual']], ritual: true },
    effects: [{ type: 'resource', id: 'quick-ritual', name: 'Quick Ritual', max: () => 1, reset: 'long' }],
  }),
  general({
    id: 'sentinel', name: 'Sentinel', prereq: { scores: { STR: 13, DEX: 13 }, any: true }, ability: STR_DEX,
    summary: '+1 STR or DEX. Opportunity attack when a creature within 5 ft Disengages or hits someone other than you. Your opportunity attack hit drops its speed to 0 for the rest of the turn.',
  }),
  general({
    id: 'shadow-touched', name: 'Shadow Touched', ability: MENTAL,
    summary: '+1 INT, WIS or CHA. Invisibility and one level 1 Illusion or Necromancy spell, always prepared. Cast each once per long rest without a slot (or with slots). They use the ability you raised.',
    choices: [spellChoice('spell', 'A level 1 Illusion or Necromancy spell', 1, (s) => s.level === 1 && ['Illusion', 'Necromancy'].includes(s.school))],
    spellGrant: { ability: 'raised', fixed: [['invisibility', 'shadow-touched-invisibility']], picks: [['spell', 'shadow-touched-spell']] },
    effects: [
      { type: 'resource', id: 'shadow-touched-invisibility', name: 'Invisibility (Shadow Touched)', max: () => 1, reset: 'long' },
      { type: 'resource', id: 'shadow-touched-spell', name: 'Shadow Touched spell', max: () => 1, reset: 'long' },
    ],
  }),
  general({
    id: 'sharpshooter', name: 'Sharpshooter', prereq: { scores: { DEX: 13 } }, ability: ['DEX'],
    summary: '+1 DEX. Ranged weapon attacks ignore half and three-quarters cover, take no disadvantage at long range or with an enemy within 5 ft.',
  }),
  general({
    id: 'shield-master', name: 'Shield Master', prereq: { armor: 'shield' }, ability: ['STR'],
    summary: '+1 STR. Once per turn, after a melee weapon hit in the Attack action, bash with your shield: STR save or the target is pushed 5 ft or knocked Prone (your pick). Holding a shield, use your reaction to take no damage on a successful DEX save for half.',
    effects: [
      { type: 'action', id: 'shield-bash', name: 'Shield Bash', kind: 'free', summary: 'After a melee hit (once per turn): push 5 ft or knock Prone.', save: { ability: 'STR', dc: (c) => 8 + c.mod.STR + c.prof }, when: (c) => c.shield },
      { type: 'action', id: 'interpose-shield', name: 'Interpose Shield', kind: 'reaction', summary: 'Succeed on a DEX save for half damage: take none.', when: (c) => c.shield },
    ],
  }),
  general({
    id: 'skill-expert', name: 'Skill Expert', ability: 'any',
    summary: '+1 to one ability. Proficiency in one skill, and Expertise in one skill you are proficient in.',
    choices: [
      { key: 'skill', label: 'Skill', count: 1, kind: 'skill', options: () => skillOpts() },
      { key: 'expertise', label: 'Expertise', count: 1, kind: 'expertise', options: (c) => c.proficientSkills() },
    ],
  }),
  general({
    id: 'skulker', name: 'Skulker', prereq: { scores: { DEX: 13 } }, ability: ['DEX'],
    summary: '+1 DEX. Blindsight 10 ft. In combat, advantage on the Stealth check of the Hide action. Missing an attack while hidden does not give away where you are.',
    effects: [{ type: 'sense', name: 'Blindsight', range: 10 }],
  }),
  general({
    id: 'slasher', name: 'Slasher', prereq: { scores: { STR: 13, DEX: 13 }, any: true }, ability: STR_DEX,
    summary: '+1 STR or DEX. Once per turn, a hit with slashing damage cuts the target\'s speed by 10 ft until your next turn. A critical hit with slashing damage gives the target disadvantage on its attacks until your next turn.',
  }),
  general({
    id: 'speedy', name: 'Speedy', prereq: { scores: { DEX: 13, CON: 13 }, any: true }, ability: ['DEX', 'CON'],
    summary: '+1 DEX or CON. Speed +10 ft. When you Dash, difficult terrain costs no extra movement this turn. Opportunity attacks against you have disadvantage.',
    effects: [{ type: 'bonus', target: 'speed', label: 'Speedy', value: () => 10 }],
  }),
  general({
    id: 'spell-sniper', name: 'Spell Sniper', prereq: { spellcasting: true }, ability: MENTAL,
    summary: '+1 INT, WIS or CHA. Spell attacks ignore half and three-quarters cover and take no disadvantage with an enemy within 5 ft. Attack-roll spells with a range of 10 ft or more reach 60 ft farther.',
  }),
  general({
    id: 'telekinetic', name: 'Telekinetic', ability: MENTAL,
    summary: '+1 INT, WIS or CHA. You learn Mage Hand (no Verbal or Somatic components, can be invisible; +30 ft range if you knew it). Bonus action: shove a creature within 30 ft 5 ft toward or away from you unless it passes a STR save.',
    choices: [{ key: 'ability', label: 'Ability you raised (sets the DC)', count: 1, kind: 'pick', options: () => MENTAL.map((a) => ({ id: a, name: ABILITY_NAMES[a] })) }],
    spellGrant: { ability: 'ability', fixed: [['mage-hand', null]] },
    effects: [{ type: 'action', id: 'telekinetic-shove', name: 'Telekinetic Shove', kind: 'bonus', summary: 'A creature within 30 ft: STR save or move 5 ft toward or away from you.',
      save: { ability: 'STR', dc: (c) => 8 + c.prof + (c.mod[c.pick('telekinetic', 'ability')] ?? Math.max(c.mod.INT, c.mod.WIS, c.mod.CHA)) } }],
  }),
  general({
    id: 'telepathic', name: 'Telepathic', ability: MENTAL,
    summary: '+1 INT, WIS or CHA. Speak telepathically to a creature you can see within 60 ft (in a language you know; it cannot answer that way). Detect Thoughts always prepared: once per long rest without a slot or components (or with slots), using the ability you raised.',
    spellGrant: { ability: 'raised', fixed: [['detect-thoughts', 'telepathic-detect-thoughts']] },
    effects: [
      { type: 'sense', name: 'Telepathy (one-way)', range: 60 },
      { type: 'resource', id: 'telepathic-detect-thoughts', name: 'Detect Thoughts (Telepathic)', max: () => 1, reset: 'long' },
    ],
  }),
  general({
    id: 'war-caster', name: 'War Caster', prereq: { spellcasting: true }, ability: MENTAL,
    summary: '+1 INT, WIS or CHA. Advantage on CON saves to keep Concentration. Instead of an opportunity attack, cast a one-action spell at that creature alone. Somatic components work with weapons or a shield in your hands.',
  }),
  general({
    id: 'weapon-master', name: 'Weapon Master', ability: STR_DEX,
    summary: '+1 STR or DEX. Use the mastery property of one simple or martial weapon you are proficient with. You can swap it after a long rest.',
    choices: [{ key: 'weapons', label: 'Weapon Mastery', count: 1, kind: 'weapon', options: () => WEAPONS.filter((wp) => wp.mastery).map((wp) => ({ id: wp.id, name: wp.name, summary: `${wp.mastery} mastery` })) }],
  }),

  // Fighting style feats (need the Fighting Style feature)
  style({
    id: 'blind-fighting', name: 'Blind Fighting',
    summary: 'Blindsight 10 ft.',
    effects: [{ type: 'sense', name: 'Blindsight', range: 10 }],
  }),
  style({
    id: 'dueling', name: 'Dueling',
    summary: '+2 damage with a melee weapon held in one hand while you hold no other weapon.',
  }),
  style({
    id: 'interception', name: 'Interception',
    summary: 'Holding a shield or a simple or martial weapon: when a creature you can see hits someone else within 5 ft of you, use your reaction to cut the damage by 1d10 + your proficiency bonus.',
    effects: [{ type: 'action', id: 'interception', name: 'Interception', kind: 'reaction', summary: 'Reduce the damage an ally within 5 ft takes.', roll: { label: 'Damage reduced', expr: (c) => `1d10+${c.prof}`, parts: (c) => [{ label: 'Proficiency bonus', value: c.prof, kind: 'prof' }], why: 'Interception: 1d10 + your proficiency bonus.' } }],
  }),
  style({
    id: 'protection', name: 'Protection',
    summary: 'Holding a shield: when a creature attacks someone else within 5 ft of you, use your reaction to give disadvantage on that attack and on every attack against them until your next turn, while you stay within 5 ft.',
    effects: [{ type: 'action', id: 'protection', name: 'Protection', kind: 'reaction', summary: 'Shield an ally within 5 ft: attacks against them have disadvantage until your next turn.', when: (c) => c.shield }],
  }),
  style({
    id: 'thrown-weapon-fighting', name: 'Thrown Weapon Fighting',
    summary: '+2 damage when you hit with a ranged attack using a Thrown weapon.',
  }),
  style({
    id: 'unarmed-fighting', name: 'Unarmed Fighting',
    summary: 'Your Unarmed Strike can deal 1d6 + STR bludgeoning, or 1d8 + STR with no weapon or shield in your hands. At the start of each of your turns, deal 1d4 bludgeoning to one creature you are grappling.',
  }),

  // Epic boons (level 19, +1 up to 30)
  boon({
    id: 'boon-energy-resistance', name: 'Boon of Energy Resistance',
    summary: '+1 to one ability (max 30). Resistance to two damage types (acid, cold, fire, lightning, necrotic, poison, psychic, radiant, thunder); change them after a long rest. When you take damage of one of them, reaction: a creature within 60 ft makes a DEX save or takes 2d12 + CON of that type.',
    choices: [{ key: 'types', label: 'Two resistances', count: 2, kind: 'pick', options: () => DAMAGE_TYPES.map((d) => ({ id: d, name: cap(d), effects: [{ type: 'resist', damage: d }] })) }],
    effects: [{ type: 'action', id: 'energy-redirection', name: 'Energy Redirection', kind: 'reaction', summary: 'After taking damage of a chosen type: send it at a creature within 60 ft.',
      roll: { label: 'Damage', expr: (c) => `2d12${c.mod.CON >= 0 ? '+' : ''}${c.mod.CON}` }, save: { ability: 'DEX', dc: (c) => 8 + c.mod.CON + c.prof } }],
  }),
  boon({
    id: 'boon-fortitude', name: 'Boon of Fortitude',
    summary: '+1 to one ability (max 30). Hit point maximum +40. When you regain hit points, add your CON modifier once (then not again until your next turn).',
    effects: [{ type: 'hp', label: 'Boon of Fortitude', value: () => 40 }],
  }),
  boon({
    id: 'boon-recovery', name: 'Boon of Recovery',
    summary: '+1 to one ability (max 30). Once per long rest, when you would drop to 0 HP, drop to 1 and heal half your hit point maximum. A pool of ten d10s, back on a long rest: bonus action to spend some and heal their total.',
    effects: [
      { type: 'resource', id: 'last-stand', name: 'Last Stand', max: () => 1, reset: 'long' },
      { type: 'resource', id: 'recover-vitality', name: 'Recover Vitality (d10s)', max: () => 10, reset: 'long' },
      { type: 'action', id: 'recover-vitality', name: 'Recover Vitality', kind: 'bonus', cost: { resource: 'recover-vitality', amount: 1 }, summary: 'Spend d10s from the pool and heal their total.', roll: { label: 'Heal (per die)', expr: () => '1d10' }, heal: true },
    ],
  }),
  boon({
    id: 'boon-skill', name: 'Boon of Skill',
    summary: '+1 to one ability (max 30). Proficiency in every skill, and Expertise in one of them.',
    choices: [{ key: 'expertise', label: 'Expertise', count: 1, kind: 'expertise', options: () => skillOpts() }],
  }),
  boon({
    id: 'boon-speed', name: 'Boon of Speed',
    summary: '+1 to one ability (max 30). Speed +30 ft. Bonus action: Disengage, which also ends the Grappled condition on you.',
    effects: [
      { type: 'bonus', target: 'speed', label: 'Boon of Speed', value: () => 30 },
      { type: 'action', id: 'escape-artist', name: 'Escape Artist', kind: 'bonus', summary: 'Disengage and end Grappled on yourself.' },
    ],
  }),
]
export const phbFeatById = (id) => PHB_FEATS.find((f) => f.id === id) || null
