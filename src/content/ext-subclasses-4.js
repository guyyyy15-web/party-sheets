// Official subclasses from outside the 2024 Player's Handbook for the Sorcerer, Warlock and Wizard: expansion books and
// the 2014 Player's Handbook. Summarised in our own words for one private table (numbers and rules only, no book text).
// Same data model as phb-subclasses-3.js. Older (2014-era) subclasses follow the 2024 rule for older subclasses: a
// feature the old subclass gave below level 3 arrives at level 3; the summary names its original level.
// 2014 expanded spell lists (patron or origin) are always prepared here at class levels 3/5/7/9 for spell levels 1-2/3/4/5.
// Spells that are not in spells.js are named in the summary text only.
// Not repeated: Aberrant Mind and Clockwork Soul (PHB 2024 versions in the app); Tasha's Bladesinging is replaced by the
// Heroes of Faerûn Bladesinger (written for the 2024 rules).

const scale = (table) => (lvl) => table.filter(([l]) => lvl >= l).at(-1)?.[1] ?? 0
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)
const dc = (ab) => (c) => 8 + c.mod[ab] + c.prof
const atLeast1 = (n) => Math.max(1, n)
const half = (n) => Math.floor(n / 2)
const picked = (c, key) => c.ch?.choices?.[key]?.[0]
const was = (lvl) => ` (Level ${lvl} in the original; arrives at level 3.)`

const XGE = "Xanathar's Guide to Everything"
const TCE = "Tasha's Cauldron of Everything"
const SCAG = 'Sword Coast Adventurer\'s Guide'
const VRGR = "Van Richten's Guide to Ravenloft"
const EGW = "Explorer's Guide to Wildemount"
const DSDQ = 'Dragonlance: Shadow of the Dragon Queen'
const HOF = 'Forgotten Realms: Heroes of Faerûn'
const PHB14 = "Player's Handbook (2014)"

// ---------------------------------------------------------------- Sorcerer

const AFFINITIES = [
  ['good', 'Good', 'cure-wounds', 'Cure Wounds'],
  ['evil', 'Evil', 'inflict-wounds', 'Inflict Wounds'],
  ['law', 'Law', 'bless', 'Bless'],
  ['chaos', 'Chaos', 'bane', 'Bane'],
  ['neutrality', 'Neutrality', 'protection-from-evil-and-good', 'Protection from Evil and Good'],
]

const DIVINE_SOUL = {
  id: 'divine-soul', name: 'Divine Soul', source: XGE, expansion: true, summary: 'Divine blood: Cleric spells, a lucky nudge from the gods, healing and wings.',
  features: [
    { id: 'divine-magic', level: 3, name: 'Divine Magic', summary: `Your Sorcerer spells can also come from the Cleric list (they count as Sorcerer spells). Pick an affinity for one extra always-prepared spell: Good (Cure Wounds), Evil (Inflict Wounds), Law (Bless), Chaos (Bane) or Neutrality (Protection from Evil and Good).${was(1)}`,
      choices: [{ key: 'affinity', label: 'Divine affinity', count: 1, options: () => AFFINITIES.map(([id, name, spell, spellName]) => ({ id, name, summary: spellName, alwaysPrepared: { 3: [spell] } })) }] },
    { id: 'favored-by-the-gods', level: 3, name: 'Favored by the Gods', summary: `When you fail a saving throw or miss with an attack roll, add 2d4 to the total, possibly changing the result. Once per short or long rest.${was(1)}`,
      effects: [
        { type: 'resource', id: 'favored-by-the-gods', name: 'Favored by the Gods', max: () => 1, reset: 'short' },
        { type: 'action', id: 'favored-by-the-gods', name: 'Favored by the Gods', kind: 'free', cost: { resource: 'favored-by-the-gods', amount: 1 }, summary: 'After a failed save or a missed attack: add 2d4.', roll: { label: 'Add', expr: () => '2d4' } },
      ] },
    { id: 'empowered-healing', level: 6, name: 'Empowered Healing', summary: 'When you or an ally within 5 ft rolls dice to heal with a spell, spend 1 Sorcery Point to reroll any number of those dice once. Once per turn, not while Incapacitated.',
      effects: [{ type: 'action', id: 'empowered-healing', name: 'Empowered Healing', kind: 'free', cost: { resource: 'sorcery-points', amount: 1 }, summary: 'Reroll any of the healing dice (once per turn).' }] },
    { id: 'otherworldly-wings', level: 14, name: 'Otherworldly Wings', summary: 'Bonus action: spectral wings give you a fly speed of 30 ft until you dismiss them (bonus action), are Incapacitated or die. Eagle wings for Good or Law, bat wings for Evil or Chaos, dragonfly wings for Neutrality.',
      effects: [{ type: 'action', id: 'otherworldly-wings', name: 'Otherworldly Wings', kind: 'bonus', summary: 'Fly speed 30 ft until dismissed.' }] },
    { id: 'unearthly-recovery', level: 18, name: 'Unearthly Recovery', summary: 'Bonus action while below half your HP maximum: regain HP equal to half your HP maximum. Once per long rest.',
      effects: [
        { type: 'resource', id: 'unearthly-recovery', name: 'Unearthly Recovery', max: () => 1, reset: 'long' },
        { type: 'action', id: 'unearthly-recovery', name: 'Unearthly Recovery', kind: 'bonus', cost: { resource: 'unearthly-recovery', amount: 1 }, summary: 'Below half HP: heal half your HP maximum.', heal: true },
      ] },
  ],
}

const SHADOW_MAGIC = {
  id: 'shadow-magic', name: 'Shadow Magic', source: XGE, expansion: true, summary: 'Power of the Shadowfell: darkness you see through, a hound of ill omen, death delayed.',
  features: [
    { id: 'eyes-of-the-dark', level: 3, name: 'Eyes of the Dark', summary: `Darkvision 120 ft (level 1 in the original). Darkness is always prepared (level 3 in the original); cast it with a slot or with 2 Sorcery Points, and when cast with points you can see through it.`,
      alwaysPrepared: { 3: ['darkness'] },
      effects: [
        { type: 'sense', name: 'Darkvision', range: 120 },
        { type: 'action', id: 'eyes-of-the-dark', name: 'Darkness (Sorcery Points)', kind: 'action', cost: { resource: 'sorcery-points', amount: 2 }, summary: 'Cast Darkness with 2 Sorcery Points; you see through it.' },
      ] },
    { id: 'strength-of-the-grave', level: 3, name: 'Strength of the Grave', summary: `When damage drops you to 0 HP, make a CHA save (DC 5 + the damage taken); on a success you drop to 1 HP instead. Not against radiant damage or a critical hit. After a success, not again until a long rest.${was(1)}`,
      effects: [
        { type: 'resource', id: 'strength-of-the-grave', name: 'Strength of the Grave', max: () => 1, reset: 'long' },
        { type: 'action', id: 'strength-of-the-grave', name: 'Strength of the Grave', kind: 'free', summary: 'At 0 HP: CHA save, DC 5 + damage taken. Spend the use only on a success.' },
      ] },
    { id: 'hound-of-ill-omen', level: 6, name: 'Hound of Ill Omen', summary: 'Bonus action, 3 Sorcery Points: pick a creature you can see within 120 ft. A hound (Dire Wolf, Medium monstrosity, temp HP = half your sorcerer level, moves through creatures and objects) appears within 30 ft of it and only hunts that target. While the hound is within 5 ft of it, the target has disadvantage on saves against your spells. Lasts 5 minutes, or until the hound or the target drops to 0 HP.',
      effects: [{ type: 'action', id: 'hound-of-ill-omen', name: 'Hound of Ill Omen', kind: 'bonus', cost: { resource: 'sorcery-points', amount: 3 }, summary: (c) => `Hound with ${half(c.level)} temp HP; target has disadvantage on saves against your spells near it.` }] },
    { id: 'shadow-walk', level: 14, name: 'Shadow Walk', summary: 'Bonus action while in dim light or darkness: teleport up to 120 ft to an unoccupied space you can see that is also in dim light or darkness.',
      effects: [{ type: 'action', id: 'shadow-walk', name: 'Shadow Walk', kind: 'bonus', summary: 'Teleport 120 ft from shadow to shadow.' }] },
    { id: 'umbral-form', level: 18, name: 'Umbral Form', summary: 'Bonus action, 6 Sorcery Points, 1 minute: resistance to all damage except force and radiant, and you move through creatures and objects as difficult terrain (5 force damage if you end a turn inside an object). Ends early if you are Incapacitated, die, or dismiss it (bonus action).',
      effects: [{ type: 'action', id: 'umbral-form', name: 'Umbral Form', kind: 'bonus', cost: { resource: 'sorcery-points', amount: 6 }, summary: '1 minute: resist all but force and radiant; pass through things.' }] },
  ],
}

const STORM = {
  id: 'storm-sorcery', name: 'Storm Sorcery', source: XGE, expansion: true, summary: 'Magic of the storm: short flights, lightning and thunder around you, wind at your command.',
  features: [
    { id: 'wind-speaker', level: 3, name: 'Wind Speaker', summary: `You speak, read and write Primordial, and so understand its dialects (Aquan, Auran, Ignan, Terran).${was(1)}` },
    { id: 'tempestuous-magic', level: 3, name: 'Tempestuous Magic', summary: `Bonus action right before or after you cast a level 1+ spell: fly up to 10 ft without provoking opportunity attacks.${was(1)}`,
      effects: [{ type: 'action', id: 'tempestuous-magic', name: 'Tempestuous Magic', kind: 'bonus', summary: 'Before or after a level 1+ spell: fly 10 ft, no opportunity attacks.' }] },
    { id: 'heart-of-the-storm', level: 6, name: 'Heart of the Storm', summary: 'Resistance to lightning and thunder. When you start casting a level 1+ spell that deals lightning or thunder damage, creatures of your choice you can see within 10 ft take lightning or thunder damage (your choice) equal to half your sorcerer level.',
      effects: [
        { type: 'immune', damage: 'lightning' }, { type: 'immune', damage: 'thunder' },
        { type: 'action', id: 'heart-of-the-storm', name: 'Heart of the Storm', kind: 'info', summary: (c) => `With a level 1+ lightning or thunder spell: ${half(c.level)} damage to chosen creatures within 10 ft.` },
      ] },
    { id: 'storm-guide', level: 6, name: 'Storm Guide', summary: 'If it is raining, an action stops the rain in a 20-ft radius around you (bonus action to let it fall again). If it is windy, a bonus action each round sets the wind direction in a 100-ft radius around you until the end of your next turn.' },
    { id: 'storms-fury', level: 14, name: "Storm's Fury", summary: 'Reaction when a creature hits you with a melee attack: it takes lightning damage equal to your sorcerer level and makes a STR save or is pushed up to 20 ft straight away from you.',
      effects: [{ type: 'action', id: 'storms-fury', name: "Storm's Fury", kind: 'reaction', summary: (c) => `Melee attacker takes ${c.level} lightning; STR save or pushed 20 ft.`, save: { ability: 'STR', dc: dc('CHA') } }] },
    { id: 'wind-soul', level: 18, name: 'Wind Soul', summary: 'Immunity to lightning and thunder, and a magical fly speed of 60 ft. Action: drop your fly speed to 30 ft for 1 hour and give 3 + CHA modifier creatures within 30 ft a fly speed of 30 ft for 1 hour. Sharing it: once per short or long rest.',
      effects: [
        { type: 'resist', damage: 'lightning' }, { type: 'resist', damage: 'thunder' },
        { type: 'resource', id: 'wind-soul', name: 'Wind Soul (share flight)', max: () => 1, reset: 'short' },
        { type: 'action', id: 'wind-soul', name: 'Wind Soul', kind: 'action', cost: { resource: 'wind-soul', amount: 1 }, summary: (c) => `1 hour: ${Math.max(0, 3 + c.mod.CHA)} creatures within 30 ft fly 30 ft; your fly speed drops to 30 ft.` },
      ] },
  ],
}

const LUNAR = {
  id: 'lunar', name: 'Lunar Sorcery', source: DSDQ, expansion: true, summary: 'Moon-touched magic in three phases: full, new and crescent, each with its own spells and boons.',
  features: [
    { id: 'lunar-embodiment', level: 3, name: 'Lunar Embodiment', summary: `Always prepared: Shield, Ray of Sickness, Color Spray, Lesser Restoration, Blindness/Deafness, Alter Self (3); Dispel Magic, Vampiric Touch, Phantom Steed (5); Death Ward, Confusion, Hallucinatory Terrain (7); Rary's Telepathic Bond, Hold Monster, Mislead (9). After each long rest pick a phase: Full Moon, New Moon or Crescent Moon. While in it, cast that phase's level 1 spell (Shield, Ray of Sickness or Color Spray) once without a slot, back on a long rest.${was(1)}`,
      alwaysPrepared: { 3: ['shield', 'ray-of-sickness', 'color-spray', 'lesser-restoration', 'blindness-deafness', 'alter-self'], 5: ['dispel-magic', 'vampiric-touch', 'phantom-steed'], 7: ['death-ward', 'confusion', 'hallucinatory-terrain'], 9: ['telepathic-bond', 'hold-monster', 'mislead'] },
      effects: [{ type: 'resource', id: 'lunar-embodiment', name: 'Free phase spell', max: (c) => (c.level >= 6 ? 3 : 1), reset: 'long' }] },
    { id: 'moon-fire', level: 3, name: 'Moon Fire', summary: `You know Sacred Flame (a Sorcerer cantrip for you). When you cast it, you can target two creatures within range that are within 5 ft of each other instead of one.${was(1)}`,
      alwaysPrepared: { 3: ['sacred-flame'] } },
    { id: 'lunar-boons', level: 6, name: 'Lunar Boons', summary: 'Metamagic on a spell of your current phase\'s schools costs 1 Sorcery Point less (min 0): Full Moon Abjuration and Divination, New Moon Enchantment and Necromancy, Crescent Moon Illusion and Transmutation. Proficiency bonus uses per long rest.',
      effects: [{ type: 'resource', id: 'lunar-boons', name: 'Lunar Boons', max: (c) => c.prof, reset: 'long' }] },
    { id: 'waxing-and-waning', level: 6, name: 'Waxing and Waning', summary: 'Bonus action, 1 Sorcery Point: switch to another lunar phase. Each phase\'s free level 1 spell can then be used once per long rest while in that phase.',
      effects: [{ type: 'action', id: 'waxing-and-waning', name: 'Waxing and Waning', kind: 'bonus', cost: { resource: 'sorcery-points', amount: 1 }, summary: 'Change your lunar phase.' }] },
    { id: 'lunar-empowerment', level: 14, name: 'Lunar Empowerment', summary: 'By phase. Full Moon: bonus action to shed bright light 10 ft and dim light 10 ft more (or put it out); you and creatures you choose in that bright light have advantage on Investigation and Perception checks. New Moon: advantage on Stealth checks, and attacks against you have disadvantage while you are entirely in darkness. Crescent Moon: resistance to necrotic and radiant damage.' },
    { id: 'lunar-phenomenon', level: 18, name: 'Lunar Phenomenon', summary: 'Bonus action (or as part of Waxing and Waning, for the new phase). Full Moon: chosen creatures within 30 ft make a CON save or are Blinded until the end of their next turn, and one creature you choose there regains 3d8 HP. New Moon: chosen creatures within 30 ft make a DEX save or take 3d10 necrotic and have speed 0 until the end of their next turn; you are Invisible until the end of your next turn or until you attack or cast. Crescent Moon: teleport up to 60 ft with one willing creature within 5 ft; both resist all damage until the start of your next turn. Once per long rest, or 5 Sorcery Points.',
      effects: [
        { type: 'resource', id: 'lunar-phenomenon', name: 'Lunar Phenomenon', max: () => 1, reset: 'long' },
        { type: 'action', id: 'lunar-phenomenon-full', name: 'Lunar Phenomenon: Full Moon', kind: 'bonus', cost: { resource: 'lunar-phenomenon', amount: 1 }, summary: 'Blind chosen creatures within 30 ft; heal one 3d8 (or 5 Sorcery Points).', roll: { label: 'Healing', expr: () => '3d8' }, heal: true, save: { ability: 'CON', dc: dc('CHA') } },
        { type: 'action', id: 'lunar-phenomenon-new', name: 'Lunar Phenomenon: New Moon', kind: 'bonus', cost: { resource: 'lunar-phenomenon', amount: 1 }, summary: 'Necrotic burst within 30 ft, speed 0; you turn Invisible (or 5 Sorcery Points).', roll: { label: 'Necrotic damage', expr: () => '3d10' }, save: { ability: 'DEX', dc: dc('CHA') } },
        { type: 'action', id: 'lunar-phenomenon-crescent', name: 'Lunar Phenomenon: Crescent Moon', kind: 'bonus', cost: { resource: 'lunar-phenomenon', amount: 1 }, summary: 'Teleport 60 ft with an ally; both resist all damage for a round (or 5 Sorcery Points).' },
      ] },
  ],
}

const SPELLFIRE = {
  id: 'spellfire', name: 'Spellfire Sorcery', source: HOF, expansion: true, summary: 'Raw magic as flame: spending Sorcery Points sparks shields of fire or bursts of radiant flame.',
  features: [
    { id: 'spellfire-burst', level: 3, name: 'Spellfire Burst', summary: 'Once per turn, when you spend at least 1 Sorcery Point as part of a Magic action or a Bonus Action, add one: Bolstering Flames (you or a creature you can see within 30 ft gains 1d4 + CHA temp HP) or Radiant Fire (a creature you can see within 30 ft takes 1d4 fire or radiant damage, your choice). At level 14: temp HP + sorcerer level, damage 1d8.',
      effects: [
        { type: 'action', id: 'bolstering-flames', name: 'Bolstering Flames', kind: 'free', summary: 'With a Sorcery Point spent on your turn: temp HP to you or a creature within 30 ft.',
          roll: { label: 'Temp HP', expr: (c) => `1d4${signed(c.mod.CHA + (c.level >= 14 ? c.level : 0))}`, parts: (c) => [{ label: 'CHA modifier', value: c.mod.CHA, kind: 'ability' }, ...(c.level >= 14 ? [{ label: 'Honed Spellfire: sorcerer level', value: c.level, kind: 'bonus' }] : [])] } },
        { type: 'action', id: 'radiant-fire', name: 'Radiant Fire', kind: 'free', summary: 'With a Sorcery Point spent on your turn: fire or radiant damage to a creature within 30 ft.', roll: { label: 'Damage', expr: (c) => (c.level >= 14 ? '1d8' : '1d4') } },
      ] },
    { id: 'spellfire-spells', level: 3, name: 'Spellfire Spells', summary: 'Always prepared: Cure Wounds, Guiding Bolt, Lesser Restoration, Scorching Ray; Aura of Vitality, Dispel Magic (5); Fire Shield, Wall of Fire (7); Flame Strike, Greater Restoration (9).',
      alwaysPrepared: { 3: ['cure-wounds', 'guiding-bolt', 'lesser-restoration', 'scorching-ray'], 5: ['dispel-magic'], 7: ['fire-shield', 'wall-of-fire'], 9: ['flame-strike', 'greater-restoration'] } },
    { id: 'absorb-spells', level: 6, name: 'Absorb Spells', summary: 'Counterspell is always prepared. When a target fails its save against your Counterspell, regain 1d4 Sorcery Points.',
      alwaysPrepared: { 6: ['counterspell'] },
      effects: [{ type: 'action', id: 'absorb-spells', name: 'Absorb Spells', kind: 'info', summary: 'Counterspell succeeds: regain Sorcery Points.', roll: { label: 'Sorcery Points back', expr: () => '1d4' } }] },
    { id: 'honed-spellfire', level: 14, name: 'Honed Spellfire', summary: 'Bolstering Flames adds your sorcerer level to its temp HP, and Radiant Fire deals 1d8 instead of 1d4.' },
    { id: 'crown-of-spellfire', level: 18, name: 'Crown of Spellfire', summary: 'When you use Innate Sorcery, you can also crown yourself in spellfire while it lasts: once per turn when an attack hits you, spend Hit Dice (up to CHA modifier, min 1) and reduce the damage by their roll; fly speed 60 ft (hover); against damage a save halves, take none on a success and half on a failure (not while Incapacitated). Once per long rest, or 5 Sorcery Points.',
      effects: [
        { type: 'resource', id: 'crown-of-spellfire', name: 'Crown of Spellfire', max: () => 1, reset: 'long' },
        { type: 'action', id: 'crown-of-spellfire', name: 'Crown of Spellfire', kind: 'free', cost: { resource: 'crown-of-spellfire', amount: 1 }, summary: 'With Innate Sorcery: fly 60 ft, Hit Dice soak hits, better saves against damage (or 5 Sorcery Points).' },
      ] },
  ],
}

// ---------------------------------------------------------------- Warlock

const HEXBLADE = {
  id: 'hexblade', name: 'Hexblade Patron', source: XGE, expansion: true, summary: 'A pact with a living weapon from the Shadowfell: a curse to mark a foe, CHA for your blade.',
  features: [
    { id: 'hexblade-spells', level: 3, name: 'Hexblade Spells', summary: 'Always prepared: Shield, Wrathful Smite, Blur, Branding Smite; Blink, Elemental Weapon (5); Phantasmal Killer, Staggering Smite (7); Banishing Smite, Cone of Cold (9).',
      alwaysPrepared: { 3: ['shield', 'blur'], 5: ['blink'], 7: ['phantasmal-killer'], 9: ['cone-of-cold'] } },
    { id: 'hexblades-curse', level: 3, name: "Hexblade's Curse", summary: `Bonus action: curse a creature you can see within 30 ft for 1 minute (ends if it dies, you die or you are Incapacitated). Against it: + proficiency bonus to your damage rolls, and your attacks score a critical hit on 19-20. If it dies, regain warlock level + CHA HP (min 1). Once per short or long rest.${was(1)}`,
      effects: [
        { type: 'resource', id: 'hexblades-curse', name: "Hexblade's Curse", max: () => 1, reset: 'short' },
        { type: 'action', id: 'hexblades-curse', name: "Hexblade's Curse", kind: 'bonus', cost: { resource: 'hexblades-curse', amount: 1 }, summary: (c) => `1 minute: +${c.prof} damage against it, crit on 19-20; heal ${atLeast1(c.level + c.mod.CHA)} if it dies.` },
      ] },
    { id: 'hex-warrior', level: 3, name: 'Hex Warrior', summary: `Training with medium armor and shields, and proficiency with martial weapons. After a long rest, touch one weapon you are proficient with that lacks the Two-Handed property: until your next long rest, its attack and damage rolls can use CHA instead of STR or DEX. With Pact of the Blade, this works with every pact weapon of any kind.${was(1)}` },
    { id: 'accursed-specter', level: 6, name: 'Accursed Specter', summary: 'When you slay a Humanoid, its spirit can rise as a Specter under your command until the end of your next long rest. It has temp HP equal to half your warlock level and adds your CHA modifier (min +0) to its attack rolls. Once per long rest.',
      effects: [
        { type: 'resource', id: 'accursed-specter', name: 'Accursed Specter', max: () => 1, reset: 'long' },
        { type: 'action', id: 'accursed-specter', name: 'Accursed Specter', kind: 'free', cost: { resource: 'accursed-specter', amount: 1 }, summary: (c) => `After you slay a Humanoid: a Specter with ${half(c.level)} temp HP, +${Math.max(0, c.mod.CHA)} to its attacks.` },
      ] },
    { id: 'armor-of-hexes', level: 10, name: 'Armor of Hexes', summary: "Reaction when the target of your Hexblade's Curse hits you: roll a d6; on 4 or more the attack misses.",
      effects: [{ type: 'action', id: 'armor-of-hexes', name: 'Armor of Hexes', kind: 'reaction', summary: 'Cursed attacker hits you: on 4+ it misses.', roll: { label: 'Miss on 4+', expr: () => '1d6' } }] },
    { id: 'master-of-hexes', level: 14, name: 'Master of Hexes', summary: "When the creature under your Hexblade's Curse dies, you can move the curse to another creature you can see within 30 ft (not while Incapacitated). You do not regain HP from that death." },
  ],
}

const FATHOMLESS = {
  id: 'fathomless', name: 'Fathomless Patron', source: TCE, expansion: true, summary: 'A pact with a power of the deep sea: a spectral tentacle, water breathing, cold resistance.',
  features: [
    { id: 'fathomless-spells', level: 3, name: 'Fathomless Spells', summary: "Always prepared: Create or Destroy Water, Thunderwave, Gust of Wind, Silence; Lightning Bolt, Sleet Storm (5); Control Water, Summon Elemental (water only) (7); Bigby's Hand (as a tentacle), Cone of Cold (9).",
      alwaysPrepared: { 3: ['create-or-destroy-water', 'thunderwave', 'gust-of-wind', 'silence'], 5: ['lightning-bolt', 'sleet-storm'], 7: ['control-water'], 9: ['arcane-hand', 'cone-of-cold'] } },
    { id: 'tentacle-of-the-deeps', level: 3, name: 'Tentacle of the Deeps', summary: `Bonus action: a 10-ft spectral tentacle appears at a point you can see within 60 ft for 1 minute (or until you make another). Make a melee spell attack against a creature within 10 ft of it: 1d8 cold damage (2d8 from level 10) and its speed drops by 10 ft until the start of your next turn. Later, a bonus action moves it up to 30 ft and repeats the attack. Proficiency bonus uses per long rest.${was(1)}`,
      effects: [
        { type: 'resource', id: 'tentacle-of-the-deeps', name: 'Tentacle of the Deeps', max: (c) => c.prof, reset: 'long' },
        { type: 'action', id: 'tentacle-of-the-deeps', name: 'Tentacle of the Deeps', kind: 'bonus', cost: { resource: 'tentacle-of-the-deeps', amount: 1 }, summary: 'Summon the tentacle and attack; later bonus actions move it 30 ft and attack again.', roll: { label: 'Cold damage', expr: (c) => (c.level >= 10 ? '2d8' : '1d8'), why: 'Tentacle of the Deeps: 1d8, 2d8 from level 10. Speed -10 ft on a hit.' } },
      ] },
    { id: 'gift-of-the-sea', level: 3, name: 'Gift of the Sea', summary: `Swim speed 40 ft, and you can breathe underwater.${was(1)}` },
    { id: 'oceanic-soul', level: 6, name: 'Oceanic Soul', summary: 'Resistance to cold damage. While fully underwater, you and other fully submerged creatures understand each other\'s speech.',
      effects: [{ type: 'resist', damage: 'cold' }] },
    { id: 'guardian-coil', level: 6, name: 'Guardian Coil', summary: 'Reaction when you or a creature you can see takes damage within 10 ft of your tentacle: reduce the damage by 1d8 (2d8 from level 10).',
      effects: [{ type: 'action', id: 'guardian-coil', name: 'Guardian Coil', kind: 'reaction', summary: 'Reduce damage taken near the tentacle.', roll: { label: 'Reduce damage', expr: (c) => (c.level >= 10 ? '2d8' : '1d8') } }] },
    { id: 'grasping-tentacles', level: 10, name: 'Grasping Tentacles', summary: "Evard's Black Tentacles is always prepared; cast it once per long rest without a slot. Whenever you cast it, gain temp HP equal to your warlock level, and damage cannot break your concentration on it.",
      alwaysPrepared: { 10: ['black-tentacles'] },
      effects: [
        { type: 'resource', id: 'grasping-tentacles', name: 'Free Black Tentacles', max: () => 1, reset: 'long' },
        { type: 'action', id: 'grasping-tentacles', name: 'Grasping Tentacles', kind: 'info', summary: (c) => `Casting Black Tentacles: ${c.level} temp HP; damage cannot break its concentration.` },
      ] },
    { id: 'fathomless-plunge', level: 14, name: 'Fathomless Plunge', summary: 'Action: you and up to five willing creatures you can see within 30 ft teleport up to 1 mile to a body of water you have seen (pond size or bigger) or within 30 ft of it, landing within 30 ft of each other. Once per short or long rest.',
      effects: [
        { type: 'resource', id: 'fathomless-plunge', name: 'Fathomless Plunge', max: () => 1, reset: 'short' },
        { type: 'action', id: 'fathomless-plunge', name: 'Fathomless Plunge', kind: 'action', cost: { resource: 'fathomless-plunge', amount: 1 }, summary: 'Teleport you and 5 allies up to 1 mile to known water.' },
      ] },
  ],
}

const GENIE_KINDS = [
  ['dao', 'Dao (earth)', 'bludgeoning', { 3: ['sanctuary', 'spike-growth'], 5: ['meld-into-stone'], 7: ['stone-shape'], 9: ['wall-of-stone'] }, 'Sanctuary, Spike Growth; Meld into Stone (5); Stone Shape (7); Wall of Stone (9)'],
  ['djinni', 'Djinni (air)', 'thunder', { 3: ['thunderwave', 'gust-of-wind'], 5: ['wind-wall'], 7: ['greater-invisibility'], 9: ['seeming'] }, 'Thunderwave, Gust of Wind; Wind Wall (5); Greater Invisibility (7); Seeming (9)'],
  ['efreeti', 'Efreeti (fire)', 'fire', { 3: ['burning-hands', 'scorching-ray'], 5: ['fireball'], 7: ['fire-shield'], 9: ['flame-strike'] }, 'Burning Hands, Scorching Ray; Fireball (5); Fire Shield (7); Flame Strike (9)'],
  ['marid', 'Marid (water)', 'cold', { 3: ['fog-cloud', 'blur'], 5: ['sleet-storm'], 7: ['control-water'], 9: ['cone-of-cold'] }, 'Fog Cloud, Blur; Sleet Storm (5); Control Water (7); Cone of Cold (9)'],
]
const genieType = (c) => GENIE_KINDS.find(([id]) => id === picked(c, 'genies-vessel.kind'))?.[2] || 'your genie\'s'

const GENIE = {
  id: 'genie', name: 'Genie Patron', source: TCE, expansion: true, summary: 'A pact with a noble genie: a magic vessel to rest in, elemental damage, flight, at last a wish.',
  features: [
    { id: 'genie-spells', level: 3, name: 'Genie Spells', summary: 'Always prepared: Detect Evil and Good, Phantasmal Force; Create Food and Water (5); Phantasmal Killer (7); Creation (9); plus your genie kind\'s spells. Wish can be your level 9 Mystic Arcanum.',
      alwaysPrepared: { 3: ['detect-evil-and-good', 'phantasmal-force'], 5: ['create-food-and-water'], 7: ['phantasmal-killer'], 9: ['creation'] } },
    { id: 'genies-vessel', level: 3, name: "Genie's Vessel", summary: `Pick your genie kind. A Tiny vessel is your spellcasting focus (AC = your spell save DC, HP = warlock level + proficiency bonus, immune to poison and psychic; a new one after a 1-hour ceremony). Bottled Respite: action, enter the vessel (a 20-ft-radius, 20-ft-high space) for up to twice your proficiency bonus in hours; leave with a bonus action; once per long rest. Genie's Wrath: once per turn on an attack hit, + proficiency bonus damage of your genie's type (Dao bludgeoning, Djinni thunder, Efreeti fire, Marid cold).${was(1)}`,
      choices: [{ key: 'kind', label: 'Genie kind', count: 1,
        options: () => GENIE_KINDS.map(([id, name, dmg, spells, list]) => ({ id, name, summary: `${dmg[0].toUpperCase()}${dmg.slice(1)}. Spells: ${list}.`, alwaysPrepared: spells, effects: [{ type: 'resist', damage: dmg, when: (c) => c.level >= 6 }] })) }],
      effects: [
        { type: 'resource', id: 'bottled-respite', name: 'Bottled Respite', max: () => 1, reset: 'long' },
        { type: 'action', id: 'bottled-respite', name: 'Bottled Respite', kind: 'action', cost: { resource: 'bottled-respite', amount: 1 }, summary: (c) => `Rest inside your vessel for up to ${2 * c.prof} hours.` },
        { type: 'action', id: 'genies-wrath', name: "Genie's Wrath", kind: 'info', summary: (c) => `Once per turn on an attack hit: +${c.prof} ${genieType(c)} damage.` },
        { type: 'action', id: 'genies-vessel', name: "Genie's Vessel", kind: 'info', summary: (c) => `Vessel AC ${8 + c.mod.CHA + c.prof}, HP ${c.level + c.prof}.` },
      ] },
    { id: 'elemental-gift', level: 6, name: 'Elemental Gift', summary: 'Resistance to your genie\'s damage type. Bonus action: fly speed 30 ft (hover) for 10 minutes, proficiency bonus times per long rest.',
      effects: [
        { type: 'resource', id: 'elemental-gift', name: 'Elemental Gift (flight)', max: (c) => c.prof, reset: 'long' },
        { type: 'action', id: 'elemental-gift', name: 'Elemental Gift', kind: 'bonus', cost: { resource: 'elemental-gift', amount: 1 }, summary: 'Fly 30 ft (hover) for 10 minutes.' },
      ] },
    { id: 'sanctuary-vessel', level: 10, name: 'Sanctuary Vessel', summary: 'Bottled Respite can bring up to five willing creatures within 30 ft into the vessel (bonus action to eject any). Anyone inside for 10 minutes gets the benefits of a short rest and adds your proficiency bonus to the HP each Hit Die restores there.' },
    { id: 'limited-wish', level: 14, name: 'Limited Wish', summary: 'Action: gain the effect of one spell of level 6 or lower with a casting time of one action, from any class list, ignoring its components. Then not again until you finish 1d4 long rests.',
      effects: [
        { type: 'resource', id: 'limited-wish', name: 'Limited Wish', max: () => 1, reset: 'long' },
        { type: 'action', id: 'limited-wish', name: 'Limited Wish', kind: 'action', cost: { resource: 'limited-wish', amount: 1 }, summary: 'Any 1-action spell of level 6 or lower. Roll how many long rests until it returns (only mark it back after that many).', roll: { label: 'Long rests to recharge', expr: () => '1d4' } },
      ] },
  ],
}

const UNDEAD = {
  id: 'undead', name: 'Undead Patron', source: VRGR, expansion: true, summary: 'A pact with a deathless being: a dread form that frightens, necrotic touch, a spirit that walks.',
  features: [
    { id: 'undead-spells', level: 3, name: 'Undead Spells', summary: 'Always prepared: Bane, False Life, Blindness/Deafness, Phantasmal Force; Phantom Steed, Speak with Dead (5); Death Ward, Greater Invisibility (7); Antilife Shell, Cloudkill (9).',
      alwaysPrepared: { 3: ['bane', 'false-life', 'blindness-deafness', 'phantasmal-force'], 5: ['phantom-steed', 'speak-with-dead'], 7: ['death-ward', 'greater-invisibility'], 9: ['antilife-shell', 'cloudkill'] } },
    { id: 'form-of-dread', level: 3, name: 'Form of Dread', summary: `Bonus action, 1 minute: gain 1d10 + warlock level temp HP, immunity to Frightened, and once per turn when you hit with an attack roll, the target makes a WIS save or is Frightened of you until the end of your next turn. Proficiency bonus uses per long rest.${was(1)}`,
      effects: [
        { type: 'resource', id: 'form-of-dread', name: 'Form of Dread', max: (c) => c.prof, reset: 'long' },
        { type: 'action', id: 'form-of-dread', name: 'Form of Dread', kind: 'bonus', cost: { resource: 'form-of-dread', amount: 1 }, summary: '1 minute: temp HP, no fear, hits can frighten.', roll: { label: 'Temp HP', expr: (c) => `1d10+${c.level}`, parts: (c) => [{ label: 'Warlock level', value: c.level, kind: 'bonus' }] }, save: { ability: 'WIS', dc: dc('CHA') } },
      ] },
    { id: 'grave-touched', level: 6, name: 'Grave Touched', summary: 'You need no food, drink or air. Once per turn, when you hit with an attack and roll damage, you can make it necrotic; in Form of Dread, roll one extra damage die then.' },
    { id: 'necrotic-husk', level: 10, name: 'Necrotic Husk', summary: 'Resistance to necrotic damage (immunity in Form of Dread). When you drop to 0 HP, you can drop to 1 HP instead and creatures of your choice within 30 ft take 2d10 + warlock level necrotic; you gain 1 Exhaustion level. Then not again until you finish 1d4 long rests.',
      effects: [
        { type: 'resist', damage: 'necrotic' },
        { type: 'resource', id: 'necrotic-husk', name: 'Necrotic Husk', max: () => 1, reset: 'long' },
        { type: 'action', id: 'necrotic-husk', name: 'Necrotic Husk', kind: 'reaction', cost: { resource: 'necrotic-husk', amount: 1 }, summary: 'At 0 HP: stay at 1 HP and burst (1 Exhaustion). Recharges after 1d4 long rests.', roll: { label: 'Necrotic damage', expr: (c) => `2d10+${c.level}`, parts: (c) => [{ label: 'Warlock level', value: c.level, kind: 'bonus' }] } },
      ] },
    { id: 'spirit-projection', level: 14, name: 'Spirit Projection', summary: 'Action: your spirit leaves your body (which is Unconscious) for up to 1 hour (Concentration); harm to one affects the other. Body and spirit resist bludgeoning, piercing and slashing; Conjuration and Necromancy spells need no verbal, somatic or unpriced material components; you fly at your walking speed (hover) and pass through creatures and objects (1d10 force if you end a turn inside); in Form of Dread, once per turn when you deal necrotic damage you heal half of it. At the end you return to your body or it appears at your spirit. Once per long rest.',
      effects: [
        { type: 'resource', id: 'spirit-projection', name: 'Spirit Projection', max: () => 1, reset: 'long' },
        { type: 'action', id: 'spirit-projection', name: 'Spirit Projection', kind: 'action', cost: { resource: 'spirit-projection', amount: 1 }, summary: 'Project your spirit for up to 1 hour (Concentration).' },
      ] },
  ],
}

const UNDYING = {
  id: 'undying', name: 'Undying Patron', source: SCAG, expansion: true, summary: 'A pact with a being that cheated death: undead shy away, you defy dying and barely age.',
  features: [
    { id: 'undying-spells', level: 3, name: 'Undying Spells', summary: 'Always prepared: False Life, Ray of Sickness, Blindness/Deafness, Silence; Feign Death, Speak with Dead (5); Aura of Life, Death Ward (7); Contagion, Legend Lore (9).',
      alwaysPrepared: { 3: ['false-life', 'ray-of-sickness', 'blindness-deafness', 'silence'], 5: ['speak-with-dead'], 7: ['aura-of-life', 'death-ward'], 9: ['contagion', 'legend-lore'] } },
    { id: 'among-the-dead', level: 3, name: 'Among the Dead', summary: `You know Spare the Dying (a Warlock cantrip for you) and have advantage on saves against disease. An Undead that targets you directly with an attack or harmful spell makes a WIS save: on a failure it must pick another target or lose the attack or spell; on a success it is immune for 24 hours. An Undead you attack or harm with a spell becomes immune for 24 hours.${was(1)}`,
      alwaysPrepared: { 3: ['spare-the-dying'] },
      effects: [{ type: 'note', save: { label: 'Among the Dead (Undead, WIS save):', dc: dc('CHA') } }] },
    { id: 'defy-death', level: 6, name: 'Defy Death', summary: 'When you succeed on a death save, or stabilize a creature with Spare the Dying, regain 1d8 + CON modifier HP (min 1). Once per long rest.',
      effects: [
        { type: 'resource', id: 'defy-death', name: 'Defy Death', max: () => 1, reset: 'long' },
        { type: 'action', id: 'defy-death', name: 'Defy Death', kind: 'free', cost: { resource: 'defy-death', amount: 1 }, summary: 'After a successful death save or Spare the Dying: heal.', roll: { label: 'Healing (min 1)', expr: (c) => `1d8${signed(c.mod.CON)}`, parts: (c) => [{ label: 'CON modifier', value: c.mod.CON, kind: 'ability' }] }, heal: true, min: 1 },
      ] },
    { id: 'undying-nature', level: 10, name: 'Undying Nature', summary: 'You can hold your breath indefinitely and need no food, water or sleep (you still rest to benefit from rests and reduce Exhaustion). You age 1 year per 10 and are immune to magical aging.' },
    { id: 'indestructible-life', level: 14, name: 'Indestructible Life', summary: 'Bonus action: regain 1d8 + warlock level HP, and you can reattach a severed body part held in place. Once per short or long rest.',
      effects: [
        { type: 'resource', id: 'indestructible-life', name: 'Indestructible Life', max: () => 1, reset: 'short' },
        { type: 'action', id: 'indestructible-life', name: 'Indestructible Life', kind: 'bonus', cost: { resource: 'indestructible-life', amount: 1 }, summary: 'Heal yourself; reattach a severed part.', roll: { label: 'Healing', expr: (c) => `1d8+${c.level}`, parts: (c) => [{ label: 'Warlock level', value: c.level, kind: 'bonus' }] }, heal: true },
      ] },
  ],
}

// ---------------------------------------------------------------- Wizard

// The 2014 schools' Savant: copying spells of that school costs half the gold and time.
const oldSavant = (school) => ({ level: 3, summary: `Copying ${school} spells into your spellbook takes half the gold and time.${was(2)}` })

const CONJURER = {
  id: 'conjurer', name: 'Conjurer', source: PHB14, expansion: true, summary: 'Master of summoning: objects from nowhere, short teleports, hardy summons.',
  features: [
    { id: 'conjuration-savant', name: 'Conjuration Savant', ...oldSavant('Conjuration') },
    { id: 'minor-conjuration', level: 3, name: 'Minor Conjuration', summary: `Action: conjure a nonmagical object you have seen, up to 3 ft on a side and 10 lb, in your hand or on the ground within 10 ft. It sheds dim light 5 ft and vanishes after 1 hour, when you use this again, or when it takes or deals damage.${was(2)}`,
      effects: [{ type: 'action', id: 'minor-conjuration', name: 'Minor Conjuration', kind: 'action', summary: 'Conjure a small object for 1 hour.' }] },
    { id: 'benign-transposition', level: 6, name: 'Benign Transposition', summary: 'Action: teleport up to 30 ft to an unoccupied space you can see, or swap places with a willing Small or Medium creature within 30 ft. Back after a long rest or when you cast a level 1+ Conjuration spell.',
      effects: [
        { type: 'resource', id: 'benign-transposition', name: 'Benign Transposition', max: () => 1, reset: 'long' },
        { type: 'action', id: 'benign-transposition', name: 'Benign Transposition', kind: 'action', cost: { resource: 'benign-transposition', amount: 1 }, summary: 'Teleport 30 ft or swap with an ally (back on a level 1+ Conjuration spell).' },
      ] },
    { id: 'focused-conjuration', level: 10, name: 'Focused Conjuration', summary: 'Taking damage cannot break your concentration on a Conjuration spell.' },
    { id: 'durable-summons', level: 14, name: 'Durable Summons', summary: 'Every creature you summon or create with a Conjuration spell has 30 temp HP.' },
  ],
}

const ENCHANTER = {
  id: 'enchanter', name: 'Enchanter', source: PHB14, expansion: true, summary: 'Master of charm: a hypnotic stare, attacks turned aside, two targets for one spell.',
  features: [
    { id: 'enchantment-savant', name: 'Enchantment Savant', ...oldSavant('Enchantment') },
    { id: 'hypnotic-gaze', level: 3, name: 'Hypnotic Gaze', summary: `Action: a creature you can see within 5 ft that can see or hear you makes a WIS save or is Charmed until the end of your next turn (speed 0, Incapacitated). Your action on later turns extends it. Ends if you move more than 5 ft away, it can neither see nor hear you, or it takes damage. After it ends or the creature saves, not on that creature again until a long rest.${was(2)}`,
      effects: [{ type: 'action', id: 'hypnotic-gaze', name: 'Hypnotic Gaze', kind: 'action', summary: 'Charm a creature within 5 ft (speed 0, Incapacitated).', save: { ability: 'WIS', dc: dc('INT') } }] },
    { id: 'instinctive-charm', level: 6, name: 'Instinctive Charm', summary: 'Reaction when a creature you can see within 30 ft attacks you, before the result is known: it makes a WIS save or must attack the creature closest to it (not you or itself) if one is in range. On a success, not on it again until a long rest. No effect on creatures immune to Charmed.',
      effects: [{ type: 'action', id: 'instinctive-charm', name: 'Instinctive Charm', kind: 'reaction', summary: 'Redirect an attack against you to the nearest other creature.', save: { ability: 'WIS', dc: dc('INT') } }] },
    { id: 'split-enchantment', level: 10, name: 'Split Enchantment', summary: 'A level 1+ Enchantment spell that targets only one creature can target a second creature.' },
    { id: 'alter-memories', level: 14, name: 'Alter Memories', summary: 'When you charm creatures with an Enchantment spell, one of them can be left unaware it was charmed. Once before the spell ends, use an action: that creature makes an INT save or forgets up to 1 + CHA modifier hours (min 1) of its charmed time (no more than the spell\'s duration).',
      effects: [{ type: 'action', id: 'alter-memories', name: 'Alter Memories', kind: 'action', summary: (c) => `Erase up to ${atLeast1(1 + c.mod.CHA)} hour(s) of charmed memory.`, save: { ability: 'INT', dc: dc('INT') } }] },
  ],
}

const NECROMANCER = {
  id: 'necromancer', name: 'Necromancer', source: PHB14, expansion: true, summary: 'Master of death: healing from kills, stronger undead servants, commanding the dead.',
  features: [
    { id: 'necromancy-savant', name: 'Necromancy Savant', ...oldSavant('Necromancy') },
    { id: 'grim-harvest', level: 3, name: 'Grim Harvest', summary: `Once per turn, when a level 1+ spell of yours kills one or more creatures (not Constructs or Undead), regain HP equal to twice the spell's level, or three times for a Necromancy spell.${was(2)}`,
      effects: [{ type: 'action', id: 'grim-harvest', name: 'Grim Harvest', kind: 'info', summary: 'A spell kill heals 2 x spell level (3 x for Necromancy).' }] },
    { id: 'undead-thralls', level: 6, name: 'Undead Thralls', summary: 'Animate Dead goes into your spellbook if it is not there, and it can raise one extra corpse or pile of bones. Undead you create with Necromancy spells add your wizard level to their HP maximum and your proficiency bonus to their weapon damage rolls.',
      effects: [{ type: 'action', id: 'undead-thralls', name: 'Undead Thralls', kind: 'info', summary: (c) => `Your undead: +${c.level} HP max, +${c.prof} weapon damage.` }] },
    { id: 'inured-to-undeath', level: 10, name: 'Inured to Undeath', summary: 'Resistance to necrotic damage, and your HP maximum cannot be reduced.',
      effects: [{ type: 'resist', damage: 'necrotic' }] },
    { id: 'command-undead', level: 14, name: 'Command Undead', summary: 'Action: an Undead you can see within 60 ft makes a CHA save (advantage if its INT is 8+). On a failure it is friendly and obeys you until you use this on it again; on a success it is immune to this feature forever. One with INT 12+ repeats the save every hour until it breaks free.',
      effects: [{ type: 'action', id: 'command-undead', name: 'Command Undead', kind: 'action', summary: 'Take control of an Undead within 60 ft.', save: { ability: 'CHA', dc: dc('INT') } }] },
  ],
}

const TRANSMUTER = {
  id: 'transmuter', name: 'Transmuter', source: PHB14, expansion: true, summary: 'Master of change: alchemy, a stone that grants gifts, turning into a beast.',
  features: [
    { id: 'transmutation-savant', name: 'Transmutation Savant', ...oldSavant('Transmutation') },
    { id: 'minor-alchemy', level: 3, name: 'Minor Alchemy', summary: `Turn a nonmagical object of wood, stone (not gems), iron, copper or silver into another of those materials: 1 cubic foot per 10 minutes of work. It reverts after 1 hour or when you lose concentration (as on a spell).${was(2)}` },
    { id: 'transmuters-stone', level: 6, name: "Transmuter's Stone", summary: "8 hours of work make a stone that gives whoever carries it one benefit you choose: Darkvision 60 ft; +10 ft speed while unencumbered; proficiency in CON saves; or resistance to acid, cold, fire, lightning or thunder (pick one). When you cast a level 1+ Transmutation spell with the stone on you, you can change its benefit. Making a new stone ends the old one." },
    { id: 'shapechanger', level: 10, name: 'Shapechanger', summary: 'Polymorph goes into your spellbook if it is not there. Cast it on yourself without a slot, into a Beast of CR 1 or lower. Once per short or long rest.',
      effects: [
        { type: 'resource', id: 'shapechanger', name: 'Shapechanger', max: () => 1, reset: 'short' },
        { type: 'action', id: 'shapechanger', name: 'Shapechanger', kind: 'action', cost: { resource: 'shapechanger', amount: 1 }, summary: 'Polymorph yourself into a Beast of CR 1 or lower, no slot.' },
      ] },
    { id: 'master-transmuter', level: 14, name: 'Master Transmuter', summary: "Action: destroy your Transmuter's Stone for one effect (no new stone until a long rest). Major Transformation: turn a nonmagical object up to a 5-ft cube into another of similar size and mass and equal or lower value (10 minutes of handling). Panacea: a touched creature loses all curses, diseases and poisons and regains all HP. Restore Life: cast Raise Dead without a slot. Restore Youth: a willing creature looks 3d10 years younger (min 13); its lifespan is unchanged.",
      effects: [{ type: 'action', id: 'master-transmuter', name: 'Master Transmuter', kind: 'action', summary: 'Destroy the stone: transform, cure fully, raise the dead, or restore youth.', roll: { label: 'Restore Youth (years)', expr: () => '3d10' } }] },
  ],
}

const WAR_MAGIC = {
  id: 'war-magic', name: 'War Magic', source: XGE, expansion: true, summary: 'Battle wizard: deflect hits, act first, surges of force damage, steady concentration.',
  features: [
    { id: 'arcane-deflection', level: 3, name: 'Arcane Deflection', summary: `Reaction when an attack hits you or you fail a save: +2 AC against that attack or +4 to that save. Until the end of your next turn you can cast only cantrips.${was(2)}`,
      effects: [{ type: 'action', id: 'arcane-deflection', name: 'Arcane Deflection', kind: 'reaction', summary: '+2 AC against the hit or +4 to the failed save; only cantrips until the end of your next turn.' }] },
    { id: 'tactical-wit', level: 3, name: 'Tactical Wit', summary: `Add your INT modifier to initiative.${was(2)}`,
      effects: [{ type: 'bonus', target: 'initiative', label: 'Tactical Wit (INT)', value: (c) => c.mod.INT }] },
    { id: 'power-surge', level: 6, name: 'Power Surge', summary: 'You store Power Surges, up to your INT modifier (min 1). After a long rest you have one. Gain one each time you end a spell with Dispel Magic or Counterspell, and one when you finish a short rest with none. Once per turn, when a Wizard spell damages a creature or object, spend one for extra force damage equal to half your wizard level.',
      effects: [{ type: 'action', id: 'power-surge', name: 'Power Surge', kind: 'free', summary: (c) => `Once per turn with a damaging Wizard spell: +${half(c.level)} force. Store up to ${atLeast1(c.mod.INT)} (one after a long rest).` }] },
    { id: 'durable-magic', level: 10, name: 'Durable Magic', summary: 'While you concentrate on a spell: +2 AC and +2 to all saving throws.',
      effects: [{ type: 'action', id: 'durable-magic', name: 'Durable Magic', kind: 'info', summary: 'While concentrating: +2 AC and +2 to all saves.' }] },
    { id: 'deflecting-shroud', level: 14, name: 'Deflecting Shroud', summary: 'When you use Arcane Deflection, up to three creatures of your choice within 60 ft take force damage equal to half your wizard level.',
      effects: [{ type: 'action', id: 'deflecting-shroud', name: 'Deflecting Shroud', kind: 'info', summary: (c) => `With Arcane Deflection: up to 3 creatures within 60 ft take ${half(c.level)} force.` }] },
  ],
}

const BLADESINGER = {
  id: 'bladesinger', name: 'Bladesinger', source: HOF, expansion: true, summary: 'Elven sword-and-spell art: a magical dance that guards you and guides your blade with INT.',
  features: [
    { id: 'training-in-war-and-song', level: 3, name: 'Training in War and Song', summary: 'Proficiency with melee martial weapons that lack the Two-Handed and Heavy properties; a melee weapon you are proficient with can be your spellcasting focus for Wizard spells. One skill: Acrobatics, Athletics, Performance or Persuasion.',
      choices: [{ key: 'skill', label: 'Bladesinger skill', count: 1, kind: 'skill', options: () => [['acrobatics', 'Acrobatics'], ['athletics', 'Athletics'], ['performance', 'Performance'], ['persuasion', 'Persuasion']].map(([id, name]) => ({ id, name })) }] },
    { id: 'bladesong', level: 3, name: 'Bladesong', summary: 'Bonus action, while wearing no armor and using no shield: 1 minute of Bladesong. AC + INT modifier (min +1), speed +10 ft, advantage on Acrobatics checks; weapon attacks and damage with weapons you are proficient with can use INT; add INT modifier to CON saves to keep concentration. Ends early if you are Incapacitated, don armor or a shield, or attack with a weapon in two hands. Uses: INT modifier (min 1) per long rest; Arcane Recovery restores one.',
      effects: [
        { type: 'resource', id: 'bladesong', name: 'Bladesong', max: (c) => atLeast1(c.mod.INT), reset: 'long' },
        { type: 'action', id: 'bladesong', name: 'Bladesong', kind: 'bonus', cost: { resource: 'bladesong', amount: 1 }, summary: (c) => `1 minute: AC +${atLeast1(c.mod.INT)}, speed +10 ft, INT for weapon attacks, +${c.mod.INT} to concentration saves.` },
      ] },
    { id: 'bladesinger-extra-attack', level: 6, name: 'Extra Attack', summary: 'Attack twice when you take the Attack action; one of the attacks can be a Wizard cantrip with a casting time of an action.',
      effects: [{ type: 'attacks', value: () => 2 }] },
    { id: 'song-of-defense', level: 10, name: 'Song of Defense', summary: 'Reaction when you take damage while Bladesong is active: spend a spell slot to reduce the damage by 5 x the slot\'s level.',
      effects: [{ type: 'action', id: 'song-of-defense', name: 'Song of Defense', kind: 'reaction', summary: 'In Bladesong: spend a slot, reduce the damage by 5 per slot level.' }] },
    { id: 'song-of-victory', level: 14, name: 'Song of Victory', summary: 'After you cast a spell with a casting time of an action, you can make one weapon attack as a bonus action.',
      effects: [{ type: 'action', id: 'song-of-victory', name: 'Song of Victory', kind: 'bonus', summary: 'After casting an action spell: one weapon attack.' }] },
  ],
}

const SCRIBES = {
  id: 'scribes', name: 'Order of Scribes', source: TCE, expansion: true, summary: 'Your spellbook is awake: a magic quill, swapped damage types, spells cast from afar.',
  features: [
    { id: 'wizardly-quill', level: 3, name: 'Wizardly Quill', summary: `Bonus action: a magic quill appears in your hand (no ink needed). Copying a spell with it takes 2 minutes per spell level. Bonus action: erase writing within 5 ft by waving it.${was(2)}` },
    { id: 'awakened-spellbook', level: 3, name: 'Awakened Spellbook', summary: `Your spellbook is a spellcasting focus. When you cast a Wizard spell with a slot, you can swap its damage type for one used by another spell in your book of the same level as the slot. Once per long rest, cast a spell as a ritual in its normal casting time.${was(2)}`,
      effects: [{ type: 'resource', id: 'awakened-spellbook', name: 'Quick ritual', max: () => 1, reset: 'long' }] },
    { id: 'manifest-mind', level: 6, name: 'Manifest Mind', summary: 'Bonus action: the spellbook\'s mind appears as a Tiny spectral object within 60 ft (dim light 10 ft, Darkvision 60 ft, you see and hear through it). Move it 30 ft as a bonus action; it ends beyond 300 ft. On your turn you can cast a Wizard spell as if from its space, proficiency bonus times per long rest. Summon it once per long rest, or again by spending a slot of any level.',
      effects: [
        { type: 'resource', id: 'manifest-mind', name: 'Manifest Mind', max: () => 1, reset: 'long' },
        { type: 'resource', id: 'manifest-mind-casts', name: 'Cast through the Mind', max: (c) => c.prof, reset: 'long' },
        { type: 'action', id: 'manifest-mind', name: 'Manifest Mind', kind: 'bonus', cost: { resource: 'manifest-mind', amount: 1 }, summary: 'Summon the spectral mind within 60 ft (or spend a slot).' },
      ] },
    { id: 'master-scrivener', level: 10, name: 'Master Scrivener', summary: 'After a long rest, make one scroll of a level 1 or 2 spell from your book with a casting time of an action; it casts one level higher, only you can use it, and it fades when cast or at your next long rest. Making spell scrolls with your quill takes half the gold and time.' },
    { id: 'one-with-the-word', level: 14, name: 'One with the Word', summary: 'Advantage on Arcana checks while your spellbook is on you. Reaction when you take damage while the Manifest Mind is present: dismiss it and take no damage, then roll 3d6; your book loses spells of your choice of that many total levels or more (if not enough, you drop to 0 HP) for 1d6 long rests. Once per long rest.',
      effects: [
        { type: 'resource', id: 'one-with-the-word', name: 'One with the Word', max: () => 1, reset: 'long' },
        { type: 'action', id: 'one-with-the-word', name: 'One with the Word', kind: 'reaction', cost: { resource: 'one-with-the-word', amount: 1 }, summary: 'Prevent all the damage; lose spell levels from your book.', roll: { label: 'Spell levels lost', expr: () => '3d6' } },
      ] },
  ],
}

const CHRONURGY = {
  id: 'chronurgy', name: 'Chronurgy Magic', source: EGW, expansion: true, summary: 'Dunamancy of time: forced rerolls, frozen foes, spells stored for later.',
  features: [
    { id: 'chronal-shift', level: 3, name: 'Chronal Shift', summary: `Reaction after you or a creature you can see within 30 ft makes an attack roll, ability check or save: it rerolls and must use the new roll. Twice per long rest. (The book also opens the Dunamancy spells to you; they are not in this app.)${was(2)}`,
      effects: [
        { type: 'resource', id: 'chronal-shift', name: 'Chronal Shift', max: () => 2, reset: 'long' },
        { type: 'action', id: 'chronal-shift', name: 'Chronal Shift', kind: 'reaction', cost: { resource: 'chronal-shift', amount: 1 }, summary: 'Force a reroll within 30 ft.' },
      ] },
    { id: 'temporal-awareness', level: 3, name: 'Temporal Awareness', summary: `Add your INT modifier to initiative.${was(2)}`,
      effects: [{ type: 'bonus', target: 'initiative', label: 'Temporal Awareness (INT)', value: (c) => c.mod.INT }] },
    { id: 'momentary-stasis', level: 6, name: 'Momentary Stasis', summary: 'Action: a Large or smaller creature you can see within 60 ft makes a CON save or is Incapacitated with speed 0 until the end of your next turn or until it takes damage. INT modifier uses (min 1) per long rest.',
      effects: [
        { type: 'resource', id: 'momentary-stasis', name: 'Momentary Stasis', max: (c) => atLeast1(c.mod.INT), reset: 'long' },
        { type: 'action', id: 'momentary-stasis', name: 'Momentary Stasis', kind: 'action', cost: { resource: 'momentary-stasis', amount: 1 }, summary: 'Freeze a creature within 60 ft until your next turn ends.', save: { ability: 'CON', dc: dc('INT') } },
      ] },
    { id: 'arcane-abeyance', level: 10, name: 'Arcane Abeyance', summary: 'When you cast a spell with a slot of level 4 or lower, store it in a Tiny bead (AC 15, 1 HP) for 1 hour instead. Whoever holds it can release the spell with an action, using your attack bonus and DC. Once per short or long rest.',
      effects: [
        { type: 'resource', id: 'arcane-abeyance', name: 'Arcane Abeyance', max: () => 1, reset: 'short' },
        { type: 'action', id: 'arcane-abeyance', name: 'Arcane Abeyance', kind: 'free', cost: { resource: 'arcane-abeyance', amount: 1 }, summary: 'Store a spell of level 4 or lower in a bead for 1 hour.' },
      ] },
    { id: 'convergent-future', level: 14, name: 'Convergent Future', summary: 'Reaction when you or a creature you can see within 60 ft makes an attack roll, ability check or save: ignore the die and decide it succeeds or fails (the lowest total to succeed, or one less). Each use gives you 1 Exhaustion level that only a long rest removes.',
      effects: [{ type: 'action', id: 'convergent-future', name: 'Convergent Future', kind: 'reaction', summary: 'Decide a roll within 60 ft succeeds or fails; gain 1 Exhaustion.' }] },
  ],
}

const GRAVITURGY = {
  id: 'graviturgy', name: 'Graviturgy Magic', source: EGW, expansion: true, summary: 'Dunamancy of gravity: lighter or heavier targets, pushes with every spell, crushing fields.',
  features: [
    { id: 'adjust-density', level: 3, name: 'Adjust Density', summary: `Action: halve or double the weight of a Large or smaller creature or object you can see within 30 ft (Huge or smaller from level 10), for 1 minute with concentration. Halved: +10 ft speed, double jump distance, disadvantage on STR checks and saves. Doubled: -10 ft speed, advantage on STR checks and saves. (The book also opens the Dunamancy spells to you; they are not in this app.)${was(2)}`,
      effects: [{ type: 'action', id: 'adjust-density', name: 'Adjust Density', kind: 'action', summary: (c) => `${c.level >= 10 ? 'Huge' : 'Large'} or smaller target within 30 ft: half or double weight (concentration, 1 minute).` }] },
    { id: 'gravity-well', level: 6, name: 'Gravity Well', summary: 'When you cast a spell on a creature, you can move it 5 ft to an unoccupied space of your choice if it is willing, your spell attack hits it, or it fails a save against the spell.' },
    { id: 'violent-attraction', level: 10, name: 'Violent Attraction', summary: 'Reaction when a creature you can see within 60 ft hits with a weapon attack: +1d10 damage of the weapon\'s type. Or when a creature within 60 ft takes falling damage: +2d10 bludgeoning. INT modifier uses (min 1) per long rest.',
      effects: [
        { type: 'resource', id: 'violent-attraction', name: 'Violent Attraction', max: (c) => atLeast1(c.mod.INT), reset: 'long' },
        { type: 'action', id: 'violent-attraction', name: 'Violent Attraction', kind: 'reaction', cost: { resource: 'violent-attraction', amount: 1 }, summary: '+1d10 to a weapon hit, or +2d10 to falling damage.', roll: { label: 'Weapon hit', expr: () => '1d10', why: 'Violent Attraction: 1d10 on a weapon hit, 2d10 bludgeoning on falling damage.' } },
      ] },
    { id: 'event-horizon', level: 14, name: 'Event Horizon', summary: 'Action: a 30-ft field around you for 1 minute (concentration). A hostile creature that starts its turn there makes a STR save: on a failure 2d10 force and speed 0 until the start of its next turn; on a success half damage and each foot of movement costs 2 extra feet that turn. Once per long rest, or spend a level 3+ slot.',
      effects: [
        { type: 'resource', id: 'event-horizon', name: 'Event Horizon', max: () => 1, reset: 'long' },
        { type: 'action', id: 'event-horizon', name: 'Event Horizon', kind: 'action', cost: { resource: 'event-horizon', amount: 1 }, summary: '30-ft crushing field, 1 minute (or spend a level 3+ slot).', roll: { label: 'Force damage', expr: () => '2d10' }, save: { ability: 'STR', dc: dc('INT') } },
      ] },
  ],
}

export const EXT_SUBCLASSES_4 = {
  sorcerer: [DIVINE_SOUL, SHADOW_MAGIC, STORM, LUNAR, SPELLFIRE],
  warlock: [HEXBLADE, FATHOMLESS, GENIE, UNDEAD, UNDYING],
  wizard: [CONJURER, ENCHANTER, NECROMANCER, TRANSMUTER, WAR_MAGIC, BLADESINGER, SCRIBES, CHRONURGY, GRAVITURGY],
}
