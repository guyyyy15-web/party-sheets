// Player's Handbook (2024) subclasses that are not in the SRD, for the Barbarian, Bard, Cleric and Druid.
// Rules summarised in our own words (what a feature does, its numbers, action type and uses); no book text.
// Same data model as the SRD subclasses in casters.js. Spells missing from spells.js stay in the summary text only.
import { SKILLS } from './basics.js'

const scale = (table) => (lvl) => table.filter(([l]) => lvl >= l).at(-1)?.[1] ?? 0
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)
const dc = (ab) => (c) => 8 + c.mod[ab] + c.prof
const atLeast1 = (n) => Math.max(1, n)
const rageDamage = scale([[1, 2], [9, 3], [16, 4]])
const bardicDie = scale([[1, 'd6'], [5, 'd8'], [10, 'd10'], [15, 'd12']])
const SRC = 'PHB 2024'

// ---------------------------------------------------------------- Barbarian (subclass features at 3, 6, 10, 14)
const barbarian = [
  {
    id: 'wild-heart', name: 'Path of the Wild Heart', source: SRC, summary: 'Kin to beasts: animal aspects that change with each Rage.',
    features: [
      { id: 'animal-speaker', level: 3, name: 'Animal Speaker', summary: 'Cast Beast Sense and Speak with Animals, as rituals only, using WIS.' },
      { id: 'rage-of-the-wilds', level: 3, name: 'Rage of the Wilds', summary: 'Each time you enter a Rage pick one for that Rage. Bear: resistance to every damage type except force, necrotic, psychic and radiant. Eagle: Dash and/or Disengage as part of the Rage bonus action, and while raging a bonus action does both. Wolf: allies have advantage on attacks against enemies within 5 ft of you.',
        effects: [{ type: 'action', id: 'rage-of-the-wilds', name: 'Rage of the Wilds', kind: 'info', summary: 'On entering a Rage: Bear (resist all but force, necrotic, psychic, radiant), Eagle (Dash + Disengage) or Wolf (allies get advantage near you).' }] },
      { id: 'aspect-of-the-wilds', level: 6, name: 'Aspect of the Wilds', summary: 'One option, changeable on a long rest. Owl: darkvision 60 ft (or +60 ft if you already have it). Panther: climb speed equal to your speed. Salmon: swim speed equal to your speed.',
        choices: [{ key: 'aspect', label: 'Aspect of the Wilds', count: 1, options: () => [
          { id: 'owl', name: 'Owl', summary: 'Darkvision 60 ft, or 60 ft more if you already have it.', effects: [{ type: 'sense', name: 'Darkvision (Owl)', range: 60 }] },
          { id: 'panther', name: 'Panther', summary: 'Climb speed equal to your speed.' },
          { id: 'salmon', name: 'Salmon', summary: 'Swim speed equal to your speed.' },
        ] }] },
      { id: 'nature-speaker', level: 10, name: 'Nature Speaker', summary: 'Cast Commune with Nature, as a ritual only, using WIS.' },
      { id: 'power-of-the-wilds', level: 14, name: 'Power of the Wilds', summary: 'Each time you enter a Rage pick one for that Rage. Falcon: fly speed equal to your speed while wearing no armor. Lion: enemies within 5 ft have disadvantage on attacks against anyone but you (or another barbarian using Lion). Ram: a melee hit on a Large or smaller creature can knock it Prone.',
        effects: [{ type: 'action', id: 'power-of-the-wilds', name: 'Power of the Wilds', kind: 'info', summary: 'On entering a Rage: Falcon (fly, no armor), Lion (enemies near you must attack you) or Ram (melee hits knock Large or smaller Prone).' }] },
    ],
  },
  {
    id: 'world-tree', name: 'Path of the World Tree', source: SRC, summary: 'Rage drawn from the cosmic tree: temp HP, pulling foes, teleporting.',
    features: [
      { id: 'vitality-of-the-tree', level: 3, name: 'Vitality of the Tree', summary: 'Entering a Rage gives you temp HP equal to your barbarian level. At the start of each of your turns while raging, another creature within 10 ft gains temp HP: d6s equal to your Rage Damage bonus (lost when the Rage ends).',
        effects: [
          { type: 'action', id: 'vitality-surge', name: 'Vitality Surge', kind: 'info', summary: (c) => `When you enter a Rage: ${c.level} temp HP.` },
          { type: 'action', id: 'life-giving-force', name: 'Life-Giving Force', kind: 'free', summary: 'Start of your turn while raging: temp HP to another creature within 10 ft (gone when the Rage ends).', roll: { label: 'Temp HP', expr: (c) => `${rageDamage(c.level)}d6`, why: 'Life-Giving Force: one d6 for each point of your Rage Damage bonus.' } },
        ] },
      { id: 'branches-of-the-tree', level: 6, name: 'Branches of the Tree', summary: 'While raging, reaction when a creature you can see starts its turn within 30 ft: STR save or it teleports to a space within 5 ft of you, and you can set its speed to 0 until the end of that turn.',
        effects: [{ type: 'action', id: 'branches-of-the-tree', name: 'Branches of the Tree', kind: 'reaction', summary: 'A creature starting its turn within 30 ft is pulled next to you; its speed can drop to 0 this turn.', save: { ability: 'STR', dc: dc('STR') } }] },
      { id: 'battering-roots', level: 10, name: 'Battering Roots', summary: 'On your turn, +10 ft reach with Heavy or Versatile melee weapons. A hit with one can also apply Push or Topple on top of the mastery you use.' },
      { id: 'travel-along-the-tree', level: 14, name: 'Travel along the Tree', summary: 'When you enter a Rage, and as a bonus action while raging: teleport up to 60 ft. Once per Rage, make it 150 ft and bring up to six willing creatures within 10 ft (they land within 10 ft of you).',
        effects: [{ type: 'action', id: 'travel-along-the-tree', name: 'Travel along the Tree', kind: 'bonus', summary: 'While raging: teleport 60 ft (once per Rage: 150 ft with up to six allies).' }] },
    ],
  },
  {
    id: 'zealot', name: 'Path of the Zealot', source: SRC, summary: 'A god\'s warrior: divine damage, self-healing, hard to kill.',
    features: [
      { id: 'divine-fury', level: 3, name: 'Divine Fury', summary: 'While raging, the first creature you hit on each of your turns with a weapon or Unarmed Strike takes extra necrotic or radiant damage: 1d6 + half your barbarian level.',
        effects: [{ type: 'action', id: 'divine-fury', name: 'Divine Fury', kind: 'free', summary: 'First hit on each of your turns while raging (necrotic or radiant).', roll: { label: 'Extra damage', expr: (c) => `1d6+${Math.floor(c.level / 2)}`, why: 'Divine Fury: 1d6 + half your barbarian level (round down).' } }] },
      { id: 'warrior-of-the-gods', level: 3, name: 'Warrior of the Gods', summary: 'A pool of d12s for healing (4; 5 at level 6, 6 at 12, 7 at 17). Bonus action: spend any number, roll them and heal that much. All back on a long rest.',
        effects: [
          { type: 'resource', id: 'warrior-of-the-gods', name: 'Warrior of the Gods (d12s)', max: (c) => scale([[3, 4], [6, 5], [12, 6], [17, 7]])(c.level), reset: 'long' },
          { type: 'action', id: 'warrior-of-the-gods', name: 'Warrior of the Gods', kind: 'bonus', heal: true, cost: { resource: 'warrior-of-the-gods', amount: 1, variable: true }, summary: 'Spend d12s from the pool and heal the total.', roll: { label: 'Healing (per die)', expr: () => '1d12', why: 'Warrior of the Gods: one d12 for each die spent.' } },
        ] },
      { id: 'fanatical-focus', level: 6, name: 'Fanatical Focus', summary: 'Once per Rage, reroll a failed save with a bonus equal to your Rage Damage bonus; you must keep the new roll.',
        effects: [{ type: 'action', id: 'fanatical-focus', name: 'Fanatical Focus', kind: 'free', summary: (c) => `Once per Rage: reroll a failed save at +${rageDamage(c.level)}.` }] },
      { id: 'zealous-presence', level: 10, name: 'Zealous Presence', summary: 'Bonus action: up to ten other creatures within 60 ft have advantage on attacks and saves until the start of your next turn. Once per long rest, or spend a Rage use to do it again.',
        effects: [
          { type: 'resource', id: 'zealous-presence', name: 'Zealous Presence', max: () => 1, reset: 'long' },
          { type: 'action', id: 'zealous-presence', name: 'Zealous Presence', kind: 'bonus', cost: { resource: 'zealous-presence', amount: 1 }, summary: 'Up to 10 allies within 60 ft: advantage on attacks and saves until your next turn (or spend a Rage use).' },
        ] },
      { id: 'rage-of-the-gods', level: 14, name: 'Rage of the Gods', summary: 'Once per long rest when you enter a Rage, take a divine form for 1 minute (or until 0 HP): fly speed equal to your speed and hover, resistance to necrotic, psychic and radiant. Reaction: spend a Rage use so a creature within 30 ft that would drop to 0 HP goes to HP equal to your barbarian level instead.',
        effects: [
          { type: 'resource', id: 'rage-of-the-gods', name: 'Rage of the Gods', max: () => 1, reset: 'long' },
          { type: 'action', id: 'rage-of-the-gods', name: 'Rage of the Gods', kind: 'free', cost: { resource: 'rage-of-the-gods', amount: 1 }, summary: 'On entering a Rage, 1 minute: fly and hover, resist necrotic, psychic, radiant.' },
          { type: 'action', id: 'revivification', name: 'Revivification', kind: 'reaction', cost: { resource: 'rage', amount: 1 }, summary: (c) => `In divine form: a creature within 30 ft that would drop to 0 HP goes to ${c.level} HP instead.` },
        ] },
    ],
  },
]

// ---------------------------------------------------------------- Bard (subclass features at 3, 6, 14)
const noArmorNoShield = (c) => !c.armor && !c.shield
const bard = [
  {
    id: 'dance', name: 'College of Dance', source: SRC, summary: 'Dancer-fighter: unarmored, nimble, unarmed strikes powered by inspiration.',
    features: [
      { id: 'dazzling-footwork', level: 3, name: 'Dazzling Footwork', summary: 'Without armor or a shield: advantage on Performance checks that involve dancing; AC = 10 + DEX + CHA; when you spend Bardic Inspiration as part of an action, bonus action or reaction, you can make one Unarmed Strike as part of it; Unarmed Strikes can use DEX and deal bludgeoning damage equal to a roll of your Bardic Inspiration die + DEX (the die is not spent).',
        effects: [
          { type: 'ac', label: 'Dazzling Footwork (10 + DEX + CHA)', value: (c) => 10 + c.mod.DEX + c.mod.CHA, when: noArmorNoShield },
          { type: 'action', id: 'bardic-damage', name: 'Dance Unarmed Strike', kind: 'info', summary: 'Without armor or shield: Unarmed Strike with DEX to hit; damage replaces the usual 1 + STR. Agile Strikes: one free Unarmed Strike whenever you spend Bardic Inspiration on an action, bonus action or reaction.', roll: { label: 'Bludgeoning damage', expr: (c) => `1${bardicDie(c.level)}${signed(c.mod.DEX)}`, why: 'Bardic Damage: your Bardic Inspiration die + DEX; the die is not spent.' } },
        ] },
      { id: 'inspiring-movement', level: 6, name: 'Inspiring Movement', summary: 'Reaction when an enemy you can see ends its turn within 5 ft of you: spend Bardic Inspiration, move up to half your speed, then one ally within 30 ft can use its reaction to do the same. No opportunity attacks.',
        effects: [{ type: 'action', id: 'inspiring-movement', name: 'Inspiring Movement', kind: 'reaction', cost: { resource: 'bardic-inspiration', amount: 1 }, summary: 'You and one ally within 30 ft move half speed without provoking.' }] },
      { id: 'tandem-footwork', level: 6, name: 'Tandem Footwork', summary: 'When you roll initiative (not Incapacitated), spend Bardic Inspiration and roll the die: you and allies within 30 ft who can see or hear you add it to initiative.',
        effects: [{ type: 'action', id: 'tandem-footwork', name: 'Tandem Footwork', kind: 'free', cost: { resource: 'bardic-inspiration', amount: 1 }, summary: 'On initiative: you and allies within 30 ft add the roll.', roll: { label: 'Initiative bonus', expr: (c) => `1${bardicDie(c.level)}` } }] },
      { id: 'leading-evasion', level: 14, name: 'Leading Evasion', summary: 'DEX save for half damage: no damage on a success, half on a failure. Creatures within 5 ft making the same save get this too. Not while Incapacitated.' },
    ],
  },
  {
    id: 'glamour', name: 'College of Glamour', source: SRC, summary: 'Fey charm: beguiling magic, temp HP for friends and a majestic presence.',
    features: [
      { id: 'beguiling-magic', level: 3, name: 'Beguiling Magic', summary: 'Charm Person and Mirror Image are always prepared. Right after you cast an Enchantment or Illusion spell with a slot, one creature within 60 ft makes a WIS save or is Charmed or Frightened (your pick) for 1 minute, saving again at the end of each of its turns. Once per long rest, or spend Bardic Inspiration to use it again.',
        alwaysPrepared: { 3: ['charm-person', 'mirror-image'] },
        effects: [
          { type: 'resource', id: 'beguiling-magic', name: 'Beguiling Magic', max: () => 1, reset: 'long' },
          { type: 'action', id: 'beguiling-magic', name: 'Beguiling Magic', kind: 'free', cost: { resource: 'beguiling-magic', amount: 1 }, summary: 'After an Enchantment or Illusion slot spell: Charm or Frighten a creature within 60 ft for 1 minute (or spend Bardic Inspiration).', save: { ability: 'WIS', dc: dc('CHA') } },
        ] },
      { id: 'mantle-of-inspiration', level: 3, name: 'Mantle of Inspiration', summary: 'Bonus action, one Bardic Inspiration: roll the die; up to CHA modifier (min 1) creatures within 60 ft each gain twice the roll in temp HP and can use their reaction to move up to their speed without provoking opportunity attacks.',
        effects: [{ type: 'action', id: 'mantle-of-inspiration', name: 'Mantle of Inspiration', kind: 'bonus', cost: { resource: 'bardic-inspiration', amount: 1 }, summary: (c) => `Up to ${atLeast1(c.mod.CHA)} creatures within 60 ft: temp HP = twice the roll, and a free move with their reaction.`, roll: { label: 'Roll (temp HP = x2)', expr: (c) => `1${bardicDie(c.level)}`, why: 'Mantle of Inspiration: each creature gains twice this roll as temp HP.' } }] },
      { id: 'mantle-of-majesty', level: 6, name: 'Mantle of Majesty', summary: 'Command is always prepared. Bonus action: cast Command without a slot and keep a fey appearance for 1 minute (Concentration); meanwhile cast Command as a bonus action without a slot each turn. Creatures Charmed by you fail the save. Once per long rest, or spend a level 3+ slot to do it again.',
        alwaysPrepared: { 6: ['command'] },
        effects: [
          { type: 'resource', id: 'mantle-of-majesty', name: 'Mantle of Majesty', max: () => 1, reset: 'long' },
          { type: 'action', id: 'mantle-of-majesty', name: 'Mantle of Majesty', kind: 'bonus', cost: { resource: 'mantle-of-majesty', amount: 1 }, summary: '1 minute (Concentration): Command as a bonus action, no slot (or spend a level 3+ slot to use again).', save: { ability: 'WIS', dc: dc('CHA') } },
        ] },
      { id: 'unbreakable-majesty', level: 14, name: 'Unbreakable Majesty', summary: 'Bonus action: for 1 minute (or until Incapacitated), the first time each turn a creature hits you with an attack roll, it makes a CHA save or the attack misses. Once per short or long rest.',
        effects: [
          { type: 'resource', id: 'unbreakable-majesty', name: 'Unbreakable Majesty', max: () => 1, reset: 'short' },
          { type: 'action', id: 'unbreakable-majesty', name: 'Unbreakable Majesty', kind: 'bonus', cost: { resource: 'unbreakable-majesty', amount: 1 }, summary: '1 minute: first hit on you each turn misses unless the attacker saves.', save: { ability: 'CHA', dc: dc('CHA') } },
        ] },
    ],
  },
  {
    id: 'valor', name: 'College of Valor', source: SRC, summary: 'Battle bard: armor, martial weapons and inspiration that hits or blocks.',
    features: [
      { id: 'combat-inspiration', level: 3, name: 'Combat Inspiration', summary: 'A creature holding your Bardic Inspiration die can also use it to defend (reaction when hit: add the roll to AC against that attack) or to hurt (right after it hits: add the roll to the damage).' },
      { id: 'martial-training', level: 3, name: 'Martial Training', summary: 'Proficiency with martial weapons and training with medium armor and shields. A simple or martial weapon can be your spellcasting focus.' },
      { id: 'valor-extra-attack', level: 6, name: 'Extra Attack', summary: 'Attack twice when you take the Attack action. One attack can be replaced by casting a cantrip that takes an action.',
        effects: [{ type: 'attacks', value: () => 2 }] },
      { id: 'battle-magic', level: 14, name: 'Battle Magic', summary: 'After you cast a spell that takes an action, make one weapon attack as a bonus action.',
        effects: [{ type: 'action', id: 'battle-magic', name: 'Battle Magic', kind: 'bonus', summary: 'One weapon attack after casting an action spell.' }] },
    ],
  },
]

// ---------------------------------------------------------------- Cleric (subclass features at 3, 6, 17)
const knowledgeSkills = ['arcana', 'history', 'nature', 'religion']
const cleric = [
  {
    // Not in the 2024 PHB: the 2024 version of this domain is in Forgotten Realms: Heroes of Faerun (2025).
    id: 'knowledge', name: 'Knowledge Domain', source: 'Heroes of Faerûn', expansion: true, summary: 'Seeker of lore: expert in knowledge skills, divination and telepathy.',
    features: [
      { id: 'blessings-of-knowledge', level: 3, name: 'Blessings of Knowledge', summary: "Proficiency with one Artisan's Tools of your choice, and proficiency with expertise in two of Arcana, History, Nature and Religion.",
        choices: [
          { key: 'skills', label: 'Two knowledge skills', count: 2, kind: 'skill', options: () => knowledgeSkills.map((id) => ({ id, name: SKILLS.find((s) => s.id === id).name })) },
          { key: 'expertise', label: 'Expertise (the same two skills)', count: 2, kind: 'expertise', options: (c) => c.proficientSkills().filter((s) => knowledgeSkills.includes(s.id)) },
        ] },
      { id: 'knowledge-domain-spells', level: 3, name: 'Knowledge Domain Spells', summary: 'Always prepared: Command, Comprehend Languages, Detect Magic, Detect Thoughts, Identify, Mind Spike; Dispel Magic, Nondetection, Tongues (5); Arcane Eye, Banishment, Confusion (7); Legend Lore, Scrying, Synaptic Static (9).',
        alwaysPrepared: { 3: ['command', 'comprehend-languages', 'detect-magic', 'detect-thoughts', 'identify', 'mind-spike'], 5: ['dispel-magic', 'nondetection', 'tongues'], 7: ['arcane-eye', 'banishment', 'confusion'], 9: ['legend-lore', 'scrying'] } },
      { id: 'mind-magic', level: 3, name: 'Mind Magic', summary: 'Magic action, one Channel Divinity: cast a Divination spell from your domain list that you have prepared, without a slot or material components.',
        effects: [{ type: 'action', id: 'mind-magic', name: 'Mind Magic', kind: 'action', cost: { resource: 'channel-divinity', amount: 1 }, summary: 'Cast a prepared Divination domain spell with no slot or materials.' }] },
      { id: 'unfettered-mind', level: 6, name: 'Unfettered Mind', summary: 'Telepathy 60 ft with up to WIS modifier (min 1) creatures at once. Proficiency in INT saving throws (or another save if you already have it).',
        effects: [{ type: 'prof', saves: ['INT'] }, { type: 'sense', name: 'Telepathy', range: 60 }] },
      { id: 'divine-foreknowledge', level: 17, name: 'Divine Foreknowledge', summary: 'Bonus action: advantage on D20 Tests for 1 hour. Once per long rest, or spend a level 6+ slot to use it again.',
        effects: [
          { type: 'resource', id: 'divine-foreknowledge', name: 'Divine Foreknowledge', max: () => 1, reset: 'long' },
          { type: 'action', id: 'divine-foreknowledge', name: 'Divine Foreknowledge', kind: 'bonus', cost: { resource: 'divine-foreknowledge', amount: 1 }, summary: 'Advantage on D20 Tests for 1 hour (or spend a level 6+ slot).' },
        ] },
    ],
  },
  {
    id: 'light', name: 'Light Domain', source: SRC, summary: 'Bringer of fire and dawn: radiant blasts and blinding flares.',
    features: [
      { id: 'light-domain-spells', level: 3, name: 'Light Domain Spells', summary: 'Always prepared: Burning Hands, Faerie Fire, Scorching Ray, See Invisibility; Daylight, Fireball (5); Arcane Eye, Wall of Fire (7); Flame Strike, Scrying (9).',
        alwaysPrepared: { 3: ['burning-hands', 'faerie-fire', 'scorching-ray', 'see-invisibility'], 5: ['daylight', 'fireball'], 7: ['arcane-eye', 'wall-of-fire'], 9: ['flame-strike', 'scrying'] } },
      { id: 'radiance-of-the-dawn', level: 3, name: 'Radiance of the Dawn', summary: 'Magic action, one Channel Divinity: magical Darkness within 30 ft of you is dispelled, and creatures you choose there make a CON save: 2d10 + cleric level radiant damage, half on a success.',
        effects: [{ type: 'action', id: 'radiance-of-the-dawn', name: 'Radiance of the Dawn', kind: 'action', cost: { resource: 'channel-divinity', amount: 1 }, summary: 'Ends magical Darkness within 30 ft; chosen creatures take radiant damage (half on a save).', roll: { label: 'Radiant damage', expr: (c) => `2d10+${c.level}`, why: 'Radiance of the Dawn: 2d10 + your cleric level.' }, save: { ability: 'CON', dc: dc('WIS') } }] },
      { id: 'warding-flare', level: 3, name: 'Warding Flare', summary: 'Reaction when a creature you can see within 30 ft makes an attack roll: give it disadvantage. Uses = WIS modifier (min 1), back on a long rest.',
        effects: [
          { type: 'resource', id: 'warding-flare', name: 'Warding Flare', max: (c) => atLeast1(c.mod.WIS), reset: 'long', when: (c) => c.level < 6 },
          { type: 'resource', id: 'warding-flare', name: 'Warding Flare', max: (c) => atLeast1(c.mod.WIS), reset: 'short', when: (c) => c.level >= 6 },
          { type: 'action', id: 'warding-flare', name: 'Warding Flare', kind: 'reaction', cost: { resource: 'warding-flare', amount: 1 }, summary: (c) => `Disadvantage on an attack roll within 30 ft.${c.level >= 6 ? ' Its target gains temp HP.' : ''}`,
            roll: { label: 'Temp HP (level 6+)', expr: (c) => `2d6${signed(c.mod.WIS)}`, why: 'Improved Warding Flare (level 6): the target of the attack gains 2d6 + WIS temp HP.' } },
        ] },
      { id: 'improved-warding-flare', level: 6, name: 'Improved Warding Flare', summary: 'Warding Flare comes back on a short or long rest, and the target of the attack gains 2d6 + WIS modifier temp HP.' },
      { id: 'corona-of-light', level: 17, name: 'Corona of Light', summary: 'Magic action: for 1 minute you shed bright light 60 ft (dim 30 ft more); enemies in the bright light have disadvantage on saves against Radiance of the Dawn and against spells that deal fire or radiant damage. Uses = WIS modifier (min 1), back on a long rest.',
        effects: [
          { type: 'resource', id: 'corona-of-light', name: 'Corona of Light', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'corona-of-light', name: 'Corona of Light', kind: 'action', cost: { resource: 'corona-of-light', amount: 1 }, summary: '1 minute: enemies in your light have disadvantage on saves vs fire and radiant.' },
        ] },
    ],
  },
  {
    id: 'trickery', name: 'Trickery Domain', source: SRC, summary: 'Trickster priest: stealth blessings and an illusory double.',
    features: [
      { id: 'blessing-of-the-trickster', level: 3, name: 'Blessing of the Trickster', summary: 'Magic action: you or a willing creature within 30 ft has advantage on Stealth checks until your next long rest or until you use it again.',
        effects: [{ type: 'action', id: 'blessing-of-the-trickster', name: 'Blessing of the Trickster', kind: 'action', summary: 'Advantage on Stealth for you or a willing creature within 30 ft.' }] },
      { id: 'trickery-domain-spells', level: 3, name: 'Trickery Domain Spells', summary: 'Always prepared: Charm Person, Disguise Self, Invisibility, Pass without Trace; Hypnotic Pattern, Nondetection (5); Confusion, Dimension Door (7); Dominate Person, Modify Memory (9).',
        alwaysPrepared: { 3: ['charm-person', 'disguise-self', 'invisibility', 'pass-without-trace'], 5: ['hypnotic-pattern', 'nondetection'], 7: ['confusion', 'dimension-door'], 9: ['dominate-person', 'modify-memory'] } },
      { id: 'invoke-duplicity', level: 3, name: 'Invoke Duplicity', summary: 'Bonus action, one Channel Divinity: an illusion of you appears within 30 ft for 1 minute (ends if you dismiss it or are Incapacitated). You can cast spells as if from its space; you have advantage on attacks against a creature when you and the illusion are both within 5 ft of it; bonus action: move it up to 30 ft (staying within 120 ft of you).',
        effects: [
          { type: 'action', id: 'invoke-duplicity', name: 'Invoke Duplicity', kind: 'bonus', cost: { resource: 'channel-divinity', amount: 1 }, summary: 'Illusory double within 30 ft for 1 minute: cast from its space, advantage when flanking with it.' },
          { type: 'action', id: 'move-duplicate', name: 'Move Duplicate', kind: 'bonus', summary: 'Move your illusion up to 30 ft (within 120 ft of you).' },
        ] },
      { id: 'tricksters-transposition', level: 6, name: "Trickster's Transposition", summary: 'When you use the bonus action to create or move the illusion, you can teleport, swapping places with it.' },
      { id: 'improved-duplicity', level: 17, name: 'Improved Duplicity', summary: 'You and your allies have advantage on attacks against a creature within 5 ft of the illusion. When the illusion ends, you or a creature within 5 ft of it regains HP equal to your cleric level.' },
    ],
  },
  {
    id: 'war', name: 'War Domain', source: SRC, summary: 'Battle priest: extra attacks, guided strikes and divine resilience.',
    features: [
      { id: 'guided-strike', level: 3, name: 'Guided Strike', summary: 'One Channel Divinity when you or a creature within 30 ft misses with an attack roll: +10 to that roll (for another creature it takes your reaction).',
        effects: [{ type: 'action', id: 'guided-strike', name: 'Guided Strike', kind: 'free', cost: { resource: 'channel-divinity', amount: 1 }, summary: '+10 to a missed attack roll (yours, or an ally within 30 ft with your reaction).' }] },
      { id: 'war-domain-spells', level: 3, name: 'War Domain Spells', summary: "Always prepared: Guiding Bolt, Magic Weapon, Shield of Faith, Spiritual Weapon; Crusader's Mantle, Spirit Guardians (5); Fire Shield, Freedom of Movement (7); Hold Monster, Steel Wind Strike (9).",
        alwaysPrepared: { 3: ['guiding-bolt', 'magic-weapon', 'shield-of-faith', 'spiritual-weapon'], 5: ['spirit-guardians'], 7: ['fire-shield', 'freedom-of-movement'], 9: ['hold-monster'] } },
      { id: 'war-priest', level: 3, name: 'War Priest', summary: 'Bonus action: one attack with a weapon or Unarmed Strike. Uses = WIS modifier (min 1), back on a short or long rest.',
        effects: [
          { type: 'resource', id: 'war-priest', name: 'War Priest', max: (c) => atLeast1(c.mod.WIS), reset: 'short' },
          { type: 'action', id: 'war-priest', name: 'War Priest', kind: 'bonus', cost: { resource: 'war-priest', amount: 1 }, summary: 'One weapon or Unarmed Strike attack.' },
        ] },
      { id: 'war-gods-blessing', level: 6, name: "War God's Blessing", summary: 'One Channel Divinity: cast Shield of Faith or Spiritual Weapon without a slot. Cast this way it needs no Concentration and lasts 1 minute (ends early if you cast it again, are Incapacitated or die).',
        effects: [{ type: 'action', id: 'war-gods-blessing', name: "War God's Blessing", kind: 'bonus', cost: { resource: 'channel-divinity', amount: 1 }, summary: 'Shield of Faith or Spiritual Weapon, no slot, no Concentration, 1 minute.' }] },
      { id: 'avatar-of-battle', level: 17, name: 'Avatar of Battle', summary: 'Resistance to bludgeoning, piercing and slashing damage.',
        effects: [{ type: 'resist', damage: 'bludgeoning' }, { type: 'resist', damage: 'piercing' }, { type: 'resist', damage: 'slashing' }] },
    ],
  },
]

// ---------------------------------------------------------------- Druid (subclass features at 3, 6, 10, 14)
const druid = [
  {
    id: 'moon', name: 'Circle of the Moon', source: SRC, summary: 'Shapeshifter: tougher beast forms, moonlight magic and teleport.',
    features: [
      { id: 'circle-forms', level: 3, name: 'Circle Forms', summary: 'Wild Shape: max CR = druid level / 3 (round down); AC is at least 13 + WIS modifier; temp HP = 3 x druid level.',
        effects: [{ type: 'action', id: 'circle-forms', name: 'Circle Forms', kind: 'info', summary: (c) => `Wild Shape: CR up to ${Math.max(1, Math.floor(c.level / 3))}, AC at least ${13 + c.mod.WIS}, ${3 * c.level} temp HP.` }] },
      { id: 'moon-circle-spells', level: 3, name: 'Circle of the Moon Spells', summary: 'Always prepared, and castable in Wild Shape: Cure Wounds, Moonbeam, Starry Wisp; Conjure Animals (5); Fount of Moonlight (7); Mass Cure Wounds (9).',
        alwaysPrepared: { 3: ['cure-wounds', 'moonbeam', 'starry-wisp'], 5: ['conjure-animals'], 9: ['mass-cure-wounds'] } },
      { id: 'improved-circle-forms', level: 6, name: 'Improved Circle Forms', summary: 'In Wild Shape: each hit can deal radiant damage instead of its normal type, and you add your WIS modifier to CON saves.' },
      { id: 'moonlight-step', level: 10, name: 'Moonlight Step', summary: 'Bonus action: teleport up to 30 ft and gain advantage on your next attack roll this turn. Uses = WIS modifier (min 1), back on a long rest; spend a level 2+ slot to regain one.',
        effects: [
          { type: 'resource', id: 'moonlight-step', name: 'Moonlight Step', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'moonlight-step', name: 'Moonlight Step', kind: 'bonus', cost: { resource: 'moonlight-step', amount: 1 }, summary: (c) => `Teleport 30 ft, advantage on your next attack this turn.${c.level >= 14 ? ' Bring a willing creature within 10 ft.' : ''}` },
        ] },
      { id: 'lunar-form', level: 14, name: 'Lunar Form', summary: 'Once per turn, a Wild Shape attack hit deals an extra 2d10 radiant. Moonlight Step can bring one willing creature within 10 ft (it lands within 10 ft of you).',
        effects: [{ type: 'action', id: 'lunar-form', name: 'Lunar Radiance', kind: 'free', summary: 'Once per turn, on a Wild Shape hit.', roll: { label: 'Radiant damage', expr: () => '2d10' } }] },
    ],
  },
  {
    id: 'sea', name: 'Circle of the Sea', source: SRC, summary: 'Storm and tide: an aura of ocean spray that freezes and shoves.',
    features: [
      { id: 'sea-circle-spells', level: 3, name: 'Circle of the Sea Spells', summary: 'Always prepared: Fog Cloud, Gust of Wind, Ray of Frost, Shatter, Thunderwave; Lightning Bolt, Water Breathing (5); Control Water, Ice Storm (7); Conjure Elemental, Hold Monster (9).',
        alwaysPrepared: { 3: ['fog-cloud', 'gust-of-wind', 'ray-of-frost', 'shatter', 'thunderwave'], 5: ['lightning-bolt', 'water-breathing'], 7: ['control-water', 'ice-storm'], 9: ['conjure-elemental', 'hold-monster'] } },
      { id: 'wrath-of-the-sea', level: 3, name: 'Wrath of the Sea', summary: 'Bonus action, one Wild Shape use: a 5-ft emanation of spray for 10 minutes (ends if dismissed, used again or you are Incapacitated). When it appears, and as a bonus action on later turns, one creature in it makes a CON save or takes cold damage (d6s = WIS modifier, min 1) and, if Large or smaller, is pushed up to 15 ft.',
        effects: [
          { type: 'action', id: 'wrath-of-the-sea', name: 'Wrath of the Sea', kind: 'bonus', cost: { resource: 'wild-shape', amount: 1 }, summary: (c) => `${c.level >= 6 ? 10 : 5}-ft emanation for 10 minutes; strike one creature in it now.${c.level >= 10 ? ' While active: fly speed, resist cold, lightning, thunder.' : ''}` },
          { type: 'action', id: 'wrath-of-the-sea-strike', name: 'Wrath of the Sea: strike', kind: 'bonus', summary: 'One creature in the emanation: cold damage and pushed 15 ft on a failed save.', roll: { label: 'Cold damage', expr: (c) => `${atLeast1(c.mod.WIS)}d6`, why: 'Wrath of the Sea: one d6 per point of WIS modifier (at least 1d6).' }, save: { ability: 'CON', dc: dc('WIS') } },
        ] },
      { id: 'aquatic-affinity', level: 6, name: 'Aquatic Affinity', summary: 'The Wrath of the Sea emanation grows to 10 ft, and you have a swim speed equal to your speed.' },
      { id: 'stormborn', level: 10, name: 'Stormborn', summary: 'While Wrath of the Sea is active: fly speed equal to your speed, and resistance to cold, lightning and thunder damage.' },
      { id: 'oceanic-gift', level: 14, name: 'Oceanic Gift', summary: 'You can center Wrath of the Sea on a willing creature within 60 ft instead (it uses your save DC and WIS); spend two Wild Shape uses to have it on both of you.' },
    ],
  },
  {
    id: 'stars', name: 'Circle of the Stars', source: SRC, summary: 'Star reader: a star map, glowing constellation forms and omens.',
    features: [
      { id: 'star-map', level: 3, name: 'Star Map', summary: 'A star map that is your spellcasting focus. Guidance and Guiding Bolt are prepared while you hold it, and you can cast Guiding Bolt without a slot WIS modifier (min 1) times per long rest.',
        alwaysPrepared: { 3: ['guidance', 'guiding-bolt'] },
        effects: [{ type: 'resource', id: 'star-map', name: 'Free Guiding Bolt', max: (c) => atLeast1(c.mod.WIS), reset: 'long' }] },
      { id: 'starry-form', level: 3, name: 'Starry Form', summary: 'Bonus action, one Wild Shape use: glow (bright light 10 ft, dim 10 ft more) for 10 minutes in a constellation. Archer: then and as a bonus action on later turns, a ranged spell attack at 60 ft for 1d8 + WIS radiant. Chalice: when a slot spell of yours heals, you or a creature within 30 ft also regains 1d8 + WIS. Dragon: on INT or WIS checks and CON saves to keep Concentration, a d20 roll of 9 or lower counts as 10. Dice become 2d8 at level 10.',
        effects: [
          { type: 'action', id: 'starry-form', name: 'Starry Form', kind: 'bonus', cost: { resource: 'wild-shape', amount: 1 }, summary: '10 minutes as Archer, Chalice or Dragon.' },
          { type: 'action', id: 'starry-archer', name: 'Archer', kind: 'bonus', summary: 'Ranged spell attack, 60 ft (your spell attack bonus).', roll: { label: 'Radiant damage', expr: (c) => `${c.level >= 10 ? 2 : 1}d8${signed(c.mod.WIS)}`, why: 'Archer: 1d8 + WIS (2d8 from level 10).' } },
          { type: 'action', id: 'starry-chalice', name: 'Chalice', kind: 'free', heal: true, summary: 'When a slot spell of yours heals: you or a creature within 30 ft heals too.', roll: { label: 'Healing', expr: (c) => `${c.level >= 10 ? 2 : 1}d8${signed(c.mod.WIS)}`, why: 'Chalice: 1d8 + WIS (2d8 from level 10).' } },
        ] },
      { id: 'cosmic-omen', level: 6, name: 'Cosmic Omen', summary: 'After each long rest roll a die: even = Weal, odd = Woe. Reaction when a creature within 30 ft is about to make a D20 Test: add 1d6 (Weal) or subtract 1d6 (Woe). Uses = WIS modifier (min 1), back on a long rest.',
        effects: [
          { type: 'resource', id: 'cosmic-omen', name: 'Cosmic Omen', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'cosmic-omen', name: 'Cosmic Omen', kind: 'reaction', cost: { resource: 'cosmic-omen', amount: 1 }, summary: 'A creature within 30 ft about to make a D20 Test: Weal adds, Woe subtracts.', roll: { label: 'Add or subtract', expr: () => '1d6' } },
        ] },
      { id: 'twinkling-constellations', level: 10, name: 'Twinkling Constellations', summary: 'Archer and Chalice deal or heal 2d8. Dragon gives a fly speed of 20 ft and hover. At the start of each of your turns in Starry Form you can change constellation.' },
      { id: 'full-of-stars', level: 14, name: 'Full of Stars', summary: 'In Starry Form you have resistance to bludgeoning, piercing and slashing damage.' },
    ],
  },
]

export const PHB_SUBCLASSES_1 = { barbarian, bard, cleric, druid }
