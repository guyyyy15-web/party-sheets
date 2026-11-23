// Official subclasses outside the 2024 Player's Handbook for the Paladin, Ranger and Rogue: Xanathar's Guide,
// Tasha's Cauldron, Sword Coast Adventurer's Guide, the 2014 DMG, Fizban's Treasury and Heroes of Faerûn.
// For one gaming group's private use. Summarised in our own words, short and functional; the book wins.
// Older (2014) subclasses follow the 2024 PHB rule for them: anything below level 3 arrives at 3, the rest keeps
// its level. None of the subclasses here had a feature below level 3, so every level is the book's own.
// Same data model as phb-subclasses-2.js / -3.js. `c.level` is the class level.
import { SKILLS } from './basics.js'

const XGE = "Xanathar's Guide to Everything"
const TCE = "Tasha's Cauldron of Everything"
const SCAG = "Sword Coast Adventurer's Guide"
const DMG = "Dungeon Master's Guide (2014)"
const FTD = "Fizban's Treasury of Dragons"
const HOF = 'Forgotten Realms: Heroes of Faerûn'

const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)
const atLeast1 = (n) => Math.max(1, n)
const dc = (ab) => (c) => 8 + c.mod[ab] + c.prof
const skillOpts = (ids) => () => SKILLS.filter((s) => ids.includes(s.id)).map((s) => ({ id: s.id, name: s.name }))
const cd = (n = 1) => ({ resource: 'channel-divinity', amount: n })
const auraRange = (c) => (c.level >= 18 ? 30 : 10)
const ELEMENTS = ['acid', 'cold', 'fire', 'lightning', 'thunder']
const cap = (s) => s[0].toUpperCase() + s.slice(1)

// ---------------------------------------------------------------- Paladin

const PALADIN_SUBS = [
  {
    id: 'conquest', name: 'Oath of Conquest', source: XGE, expansion: true, summary: 'Iron-fisted conqueror: fear that pins foes in place and hurts them.',
    features: [
      { id: 'conquest-spells', level: 3, name: 'Oath of Conquest Spells', summary: 'Always prepared: Armor of Agathys, Command; Hold Person, Spiritual Weapon (5); Bestow Curse, Fear (9); Dominate Beast, Stoneskin (13); Cloudkill, Dominate Person (17).',
        alwaysPrepared: { 3: ['command'], 5: ['hold-person', 'spiritual-weapon'], 9: ['bestow-curse', 'fear'], 13: ['dominate-beast', 'stoneskin'], 17: ['cloudkill', 'dominate-person'] } },
      { id: 'conquering-presence', level: 3, name: 'Conquering Presence', summary: 'Action, Channel Divinity: each creature you choose within 30 ft makes a WIS save or is Frightened of you for 1 minute, saving again at the end of each of its turns.',
        effects: [{ type: 'action', id: 'conquering-presence', name: 'Conquering Presence', kind: 'action', cost: cd(), summary: 'Creatures you choose within 30 ft: Frightened for 1 minute on a failed save.', save: { ability: 'WIS', dc: dc('CHA') } }] },
      { id: 'conquest-guided-strike', level: 3, name: 'Guided Strike', summary: 'Channel Divinity after you see your attack roll but before you know the result: +10 to that roll.',
        effects: [{ type: 'action', id: 'conquest-guided-strike', name: 'Guided Strike', kind: 'free', cost: cd(), summary: '+10 to one attack roll you just made.' }] },
      { id: 'aura-of-conquest', level: 7, name: 'Aura of Conquest', summary: 'A creature Frightened of you that is within 10 ft (30 ft at 18) has speed 0 there, and takes psychic damage equal to half your paladin level when it starts its turn there.',
        effects: [{ type: 'action', id: 'aura-of-conquest', name: 'Aura of Conquest', kind: 'info', summary: (c) => `Frightened foes within ${auraRange(c)} ft: speed 0, and ${Math.floor(c.level / 2)} psychic at the start of their turns.` }] },
      { id: 'scornful-rebuke', level: 15, name: 'Scornful Rebuke', summary: 'When a creature hits you with an attack, it takes psychic damage equal to your CHA modifier (min 1), unless you are Incapacitated.',
        effects: [{ type: 'action', id: 'scornful-rebuke', name: 'Scornful Rebuke', kind: 'info', summary: (c) => `A creature that hits you takes ${atLeast1(c.mod.CHA)} psychic.` }] },
      { id: 'invincible-conqueror', level: 20, name: 'Invincible Conqueror', summary: 'Action for 1 minute: resistance to all damage, one extra attack when you take the Attack action, and your melee weapon attacks score a critical hit on 19-20. Once per long rest.',
        effects: [
          { type: 'resource', id: 'invincible-conqueror', name: 'Invincible Conqueror', max: () => 1, reset: 'long' },
          { type: 'action', id: 'invincible-conqueror', name: 'Invincible Conqueror', kind: 'action', cost: { resource: 'invincible-conqueror', amount: 1 }, summary: '1 minute: resist all damage, +1 attack, melee crits on 19-20.' },
        ] },
    ],
  },
  {
    id: 'redemption', name: 'Oath of Redemption', source: XGE, expansion: true, summary: 'Peacemaker: talks first, shields others, punishes the violent.',
    features: [
      { id: 'redemption-spells', level: 3, name: 'Oath of Redemption Spells', summary: "Always prepared: Sanctuary, Sleep; Calm Emotions, Hold Person (5); Counterspell, Hypnotic Pattern (9); Otiluke's Resilient Sphere, Stoneskin (13); Hold Monster, Wall of Force (17).",
        alwaysPrepared: { 3: ['sanctuary', 'sleep'], 5: ['calm-emotions', 'hold-person'], 9: ['counterspell', 'hypnotic-pattern'], 13: ['resilient-sphere', 'stoneskin'], 17: ['hold-monster', 'wall-of-force'] } },
      { id: 'emissary-of-peace', level: 3, name: 'Emissary of Peace', summary: 'Bonus action, Channel Divinity: +5 to Persuasion checks for 10 minutes.',
        effects: [{ type: 'action', id: 'emissary-of-peace', name: 'Emissary of Peace', kind: 'bonus', cost: cd(), summary: '+5 to Persuasion for 10 minutes.' }] },
      { id: 'rebuke-the-violent', level: 3, name: 'Rebuke the Violent', summary: 'Reaction, Channel Divinity, right after a creature within 30 ft damages someone other than you: it makes a WIS save, taking radiant damage equal to the damage it just dealt, or half on a success.',
        effects: [{ type: 'action', id: 'rebuke-the-violent', name: 'Rebuke the Violent', kind: 'reaction', cost: cd(), summary: 'Radiant damage equal to what the attacker dealt (half on a save).', save: { ability: 'WIS', dc: dc('CHA') } }] },
      { id: 'aura-of-the-guardian', level: 7, name: 'Aura of the Guardian', summary: 'Reaction when a creature within 10 ft (30 ft at 18) takes damage: you take that damage instead. It cannot be reduced or transferred.',
        effects: [{ type: 'action', id: 'aura-of-the-guardian', name: 'Aura of the Guardian', kind: 'reaction', summary: (c) => `Take the damage meant for a creature within ${auraRange(c)} ft.` }] },
      { id: 'protective-spirit', level: 15, name: 'Protective Spirit', summary: 'At the end of each of your turns, if you are below half your HP and not Incapacitated, regain 1d6 + half your paladin level.',
        effects: [{ type: 'action', id: 'protective-spirit', name: 'Protective Spirit', kind: 'free', summary: 'End of your turn, below half HP.', roll: { label: 'Healing', expr: (c) => `1d6+${Math.floor(c.level / 2)}`, parts: (c) => [{ label: 'Half paladin level', value: Math.floor(c.level / 2), kind: 'level' }], why: 'Protective Spirit: 1d6 + half your paladin level.' } }] },
      { id: 'emissary-of-redemption', level: 20, name: 'Emissary of Redemption', summary: 'Resistance to all damage other creatures deal, and a creature that hits you takes radiant damage equal to half the damage you take. Both stop working against a creature you attack, damage or target with a spell, until your next long rest.' },
    ],
  },
  {
    id: 'watchers', name: 'Oath of the Watchers', source: TCE, expansion: true, summary: 'Guard against other planes: steels minds, drives off outsiders.',
    features: [
      { id: 'watchers-spells', level: 3, name: 'Oath of the Watchers Spells', summary: 'Always prepared: Alarm, Detect Magic; Moonbeam, See Invisibility (5); Counterspell, Nondetection (9); Aura of Purity, Banishment (13); Hold Monster, Scrying (17).',
        alwaysPrepared: { 3: ['alarm', 'detect-magic'], 5: ['moonbeam', 'see-invisibility'], 9: ['counterspell', 'nondetection'], 13: ['banishment'], 17: ['hold-monster', 'scrying'] } },
      { id: 'watchers-will', level: 3, name: "Watcher's Will", summary: 'Action, Channel Divinity: up to CHA modifier (min 1) creatures you can see within 30 ft have advantage on INT, WIS and CHA saves for 1 minute.',
        effects: [{ type: 'action', id: 'watchers-will', name: "Watcher's Will", kind: 'action', cost: cd(), summary: (c) => `Up to ${atLeast1(c.mod.CHA)} creatures within 30 ft: advantage on INT, WIS and CHA saves for 1 minute.` }] },
      { id: 'abjure-the-extraplanar', level: 3, name: 'Abjure the Extraplanar', summary: 'Action, Channel Divinity: each Aberration, Celestial, Elemental, Fey or Fiend within 30 ft that can hear you makes a WIS save or is turned for 1 minute or until it takes damage (it must move away and cannot take reactions).',
        effects: [{ type: 'action', id: 'abjure-the-extraplanar', name: 'Abjure the Extraplanar', kind: 'action', cost: cd(), summary: 'Outsiders within 30 ft flee for 1 minute on a failed save.', save: { ability: 'WIS', dc: dc('CHA') } }] },
      { id: 'aura-of-the-sentinel', level: 7, name: 'Aura of the Sentinel', summary: 'You and creatures you choose within 10 ft (30 ft at 18) add your proficiency bonus to initiative.',
        effects: [{ type: 'bonus', target: 'initiative', label: 'Aura of the Sentinel', value: (c) => c.prof }] },
      { id: 'vigilant-rebuke', level: 15, name: 'Vigilant Rebuke', summary: 'Reaction when you or a creature you can see within 30 ft succeeds on an INT, WIS or CHA save: the creature that forced it takes 2d8 + CHA modifier force damage.',
        effects: [{ type: 'action', id: 'vigilant-rebuke', name: 'Vigilant Rebuke', kind: 'reaction', summary: 'After a successful INT, WIS or CHA save nearby.', roll: { label: 'Force damage', expr: (c) => `2d8${signed(c.mod.CHA)}`, parts: (c) => [{ label: 'CHA modifier', value: c.mod.CHA, kind: 'ability' }], why: 'Vigilant Rebuke: 2d8 + your CHA modifier.' } }] },
      { id: 'mortal-bulwark', level: 20, name: 'Mortal Bulwark', summary: 'Bonus action for 1 minute: Truesight 120 ft, advantage on attacks against Aberrations, Celestials, Elementals, Fey and Fiends, and when you hit one of them it makes a CHA save or is sent back to its home plane. Once per long rest or a level 5 slot.',
        effects: [
          { type: 'resource', id: 'mortal-bulwark', name: 'Mortal Bulwark', max: () => 1, reset: 'long' },
          { type: 'action', id: 'mortal-bulwark', name: 'Mortal Bulwark', kind: 'bonus', cost: { resource: 'mortal-bulwark', amount: 1 }, summary: '1 minute: Truesight 120 ft, advantage vs outsiders, banish on a hit.', save: { ability: 'CHA', dc: dc('CHA') } },
        ] },
    ],
  },
  {
    id: 'crown', name: 'Oath of the Crown', source: SCAG, expansion: true, summary: 'Loyal champion of law: challenges foes, rallies and shields allies.',
    features: [
      { id: 'crown-spells', level: 3, name: 'Oath of the Crown Spells', summary: 'Always prepared: Command, Compelled Duel; Warding Bond, Zone of Truth (5); Aura of Vitality, Spirit Guardians (9); Banishment, Guardian of Faith (13); Circle of Power, Geas (17).',
        alwaysPrepared: { 3: ['command'], 5: ['warding-bond', 'zone-of-truth'], 9: ['spirit-guardians'], 13: ['banishment', 'guardian-of-faith'], 17: ['geas'] } },
      { id: 'champion-challenge', level: 3, name: 'Champion Challenge', summary: "Bonus action, Channel Divinity: each creature you choose within 30 ft makes a WIS save or can't willingly move more than 30 ft away from you. Ends if you are Incapacitated or die, or the creature ends up more than 30 ft away.",
        effects: [{ type: 'action', id: 'champion-challenge', name: 'Champion Challenge', kind: 'bonus', cost: cd(), summary: 'Creatures within 30 ft cannot willingly move away beyond 30 ft.', save: { ability: 'WIS', dc: dc('CHA') } }] },
      { id: 'turn-the-tide', level: 3, name: 'Turn the Tide', summary: 'Bonus action, Channel Divinity: each creature you choose within 30 ft that can hear you and has half its HP or fewer regains 1d6 + CHA modifier (min 1) HP.',
        effects: [{ type: 'action', id: 'turn-the-tide', name: 'Turn the Tide', kind: 'bonus', cost: cd(), summary: 'Heal each bloodied ally within 30 ft.', roll: { label: 'Healing (each)', expr: (c) => `1d6+${atLeast1(c.mod.CHA)}`, parts: (c) => [{ label: 'CHA modifier (min 1)', value: atLeast1(c.mod.CHA), kind: 'ability' }], why: 'Turn the Tide: 1d6 + your CHA modifier (min 1).' } }] },
      { id: 'divine-allegiance', level: 7, name: 'Divine Allegiance', summary: 'Reaction when a creature within 5 ft of you takes damage: you take it instead. It cannot be reduced or transferred.',
        effects: [{ type: 'action', id: 'divine-allegiance', name: 'Divine Allegiance', kind: 'reaction', summary: 'Take the damage meant for a creature within 5 ft.' }] },
      { id: 'unyielding-spirit', level: 15, name: 'Unyielding Spirit', summary: 'Advantage on saves to avoid being Paralyzed or Stunned.' },
      { id: 'exalted-champion', level: 20, name: 'Exalted Champion', summary: 'Action for 1 hour: resistance to bludgeoning, piercing and slashing from nonmagical weapons; allies within 30 ft have advantage on death saves; you and allies within 30 ft have advantage on WIS saves. Once per long rest.',
        effects: [
          { type: 'resource', id: 'exalted-champion', name: 'Exalted Champion', max: () => 1, reset: 'long' },
          { type: 'action', id: 'exalted-champion', name: 'Exalted Champion', kind: 'action', cost: { resource: 'exalted-champion', amount: 1 }, summary: '1 hour: weapon resistance, advantage on WIS and death saves nearby.' },
        ] },
    ],
  },
  {
    id: 'oathbreaker', name: 'Oathbreaker', source: DMG, expansion: true, summary: 'A fallen paladin: commands undead, spreads dread, fuels allies with hate.',
    features: [
      { id: 'oathbreaker-spells', level: 3, name: 'Oathbreaker Spells', summary: 'Always prepared: Hellish Rebuke, Inflict Wounds; Crown of Madness, Darkness (5); Animate Dead, Bestow Curse (9); Blight, Confusion (13); Contagion, Dominate Person (17).',
        alwaysPrepared: { 3: ['hellish-rebuke', 'inflict-wounds'], 5: ['darkness'], 9: ['animate-dead', 'bestow-curse'], 13: ['blight', 'confusion'], 17: ['contagion', 'dominate-person'] } },
      { id: 'control-undead', level: 3, name: 'Control Undead', summary: 'Action, Channel Divinity: one Undead within 30 ft makes a WIS save or obeys you for 24 hours or until you use this again. Undead with a CR equal to or above your paladin level are immune.',
        effects: [{ type: 'action', id: 'control-undead', name: 'Control Undead', kind: 'action', cost: cd(), summary: (c) => `One Undead within 30 ft (CR below ${c.level}) obeys you for 24 hours on a failed save.`, save: { ability: 'WIS', dc: dc('CHA') } }] },
      { id: 'dreadful-aspect', level: 3, name: 'Dreadful Aspect', summary: 'Action, Channel Divinity: each creature you choose within 30 ft makes a WIS save or is Frightened of you for 1 minute. It saves again when it ends a turn more than 30 ft from you.',
        effects: [{ type: 'action', id: 'dreadful-aspect', name: 'Dreadful Aspect', kind: 'action', cost: cd(), summary: 'Creatures you choose within 30 ft: Frightened for 1 minute on a failed save.', save: { ability: 'WIS', dc: dc('CHA') } }] },
      { id: 'aura-of-hate', level: 7, name: 'Aura of Hate', summary: 'You, and any Fiends and Undead within 10 ft (30 ft at 18), add your CHA modifier (min +1) to melee weapon damage rolls. A creature gets this from only one such aura.',
        effects: [{ type: 'action', id: 'aura-of-hate', name: 'Aura of Hate', kind: 'info', summary: (c) => `+${atLeast1(c.mod.CHA)} to melee weapon damage (you, and Fiends/Undead within ${auraRange(c)} ft).` }] },
      { id: 'supernatural-resistance', level: 15, name: 'Supernatural Resistance', summary: 'Resistance to bludgeoning, piercing and slashing damage from nonmagical weapons.' },
      { id: 'dread-lord', level: 20, name: 'Dread Lord', summary: 'Action for 1 minute: a 30-ft aura dims bright light; Frightened enemies starting a turn in it take 4d10 psychic; attacks that rely on sight against you and creatures you choose in it have disadvantage; bonus action, a melee spell attack on a creature in the aura for 3d10 + CHA necrotic. Once per long rest.',
        effects: [
          { type: 'resource', id: 'dread-lord', name: 'Dread Lord', max: () => 1, reset: 'long' },
          { type: 'action', id: 'dread-lord', name: 'Dread Lord', kind: 'action', cost: { resource: 'dread-lord', amount: 1 }, summary: '1 minute: aura of gloom; Frightened enemies starting there take 4d10 psychic.', roll: { label: 'Psychic damage', expr: () => '4d10' } },
          { type: 'action', id: 'dread-lord-strike', name: 'Dread Lord: shadow strike', kind: 'bonus', summary: 'While Dread Lord lasts: melee spell attack on a creature in the aura.', roll: { label: 'Necrotic damage', expr: (c) => `3d10${signed(c.mod.CHA)}`, parts: (c) => [{ label: 'CHA modifier', value: c.mod.CHA, kind: 'ability' }], why: 'Dread Lord: 3d10 + your CHA modifier.' } },
        ] },
    ],
  },
  {
    id: 'noble-genies', name: 'Oath of the Noble Genies', source: HOF, expansion: true, summary: 'Elemental grace of the genie lords: smites that grip, burn, sweep or vanish.',
    features: [
      { id: 'noble-genies-spells', level: 3, name: 'Oath of the Noble Genies Spells', summary: 'Always prepared: Chromatic Orb, Elementalism, Thunderous Smite; Mirror Image, Phantasmal Force (5); Fly, Gaseous Form (9); Conjure Minor Elementals, Summon Elemental (13); Banishing Smite, Contact Other Plane (17).',
        alwaysPrepared: { 3: ['chromatic-orb', 'elementalism'], 5: ['mirror-image', 'phantasmal-force'], 9: ['fly', 'gaseous-form'], 13: ['conjure-minor-elementals'], 17: ['contact-other-plane'] } },
      { id: 'elemental-smite', level: 3, name: 'Elemental Smite', summary: "Right after you cast Divine Smite, Channel Divinity for one effect. Dao's Crush: the target is Grappled (escape DC = spell save DC) and Restrained while grappled. Djinni's Escape: teleport 30 ft to a space you can see, and until the end of your next turn resist bludgeoning, piercing and slashing and can't be Grappled, Prone or Restrained. Efreeti's Fury: the target takes 2d4 fire, and another creature you can see within 30 ft takes 2d4 fire. Marid's Surge: the target and creatures you choose within 10 ft make a STR save or are pushed 15 ft and knocked Prone.",
        effects: [{ type: 'action', id: 'elemental-smite', name: 'Elemental Smite', kind: 'free', cost: cd(), summary: "After Divine Smite: Dao's Crush, Djinni's Escape, Efreeti's Fury (2d4 fire to the target and one more) or Marid's Surge.",
          roll: { label: "Efreeti's Fury (fire, each)", expr: () => '2d4', why: "Efreeti's Fury: 2d4 fire to the target and 2d4 to a second creature within 30 ft." }, save: { ability: 'STR', dc: dc('CHA') } }] },
      { id: 'genies-splendor', level: 3, name: "Genie's Splendor", summary: 'While you wear no armor, your base AC is 10 + DEX + CHA (a shield still counts). Proficiency in Acrobatics, Intimidation, Performance or Persuasion.',
        effects: [{ type: 'ac', label: "Genie's Splendor (10 + DEX + CHA)", value: (c) => 10 + c.mod.DEX + c.mod.CHA, when: (c) => !c.armor }],
        choices: [{ key: 'skill', label: "Genie's Splendor skill", count: 1, kind: 'skill', options: skillOpts(['acrobatics', 'intimidation', 'performance', 'persuasion']) }] },
      { id: 'aura-of-elemental-shielding', level: 7, name: 'Aura of Elemental Shielding', summary: 'Pick acid, cold, fire, lightning or thunder: you and allies in your Aura of Protection resist it. You may switch type at the start of each of your turns (no action).',
        choices: [{ key: 'element', label: 'Shielding element (starting pick)', count: 1, options: () => ELEMENTS.map((d) => ({ id: d, name: cap(d), summary: `Resistance to ${d} damage in your aura.`, effects: [{ type: 'resist', damage: d }] })) }] },
      { id: 'elemental-rebuke', level: 15, name: 'Elemental Rebuke', summary: 'Reaction when an attack roll hits you: halve the damage (round down). The attacker makes a DEX save, taking 2d10 + CHA modifier acid, cold, fire, lightning or thunder damage (your pick), half on a success. CHA modifier (min 1) uses per long rest.',
        effects: [
          { type: 'resource', id: 'elemental-rebuke', name: 'Elemental Rebuke', max: (c) => atLeast1(c.mod.CHA), reset: 'long' },
          { type: 'action', id: 'elemental-rebuke', name: 'Elemental Rebuke', kind: 'reaction', cost: { resource: 'elemental-rebuke', amount: 1 }, summary: 'Halve the hit, then hurt the attacker (half on a save).',
            roll: { label: 'Elemental damage', expr: (c) => `2d10${signed(c.mod.CHA)}`, parts: (c) => [{ label: 'CHA modifier', value: c.mod.CHA, kind: 'ability' }], why: 'Elemental Rebuke: 2d10 + your CHA modifier.' }, save: { ability: 'DEX', dc: dc('CHA') } },
        ] },
      { id: 'noble-scion', level: 20, name: 'Noble Scion', summary: 'Bonus action for 10 minutes: fly 60 ft (hover), and when you or an ally in your Aura of Protection fails a d20 test, you can use your reaction to turn it into a success. Once per long rest or a level 5 slot.',
        effects: [
          { type: 'resource', id: 'noble-scion', name: 'Noble Scion', max: () => 1, reset: 'long' },
          { type: 'action', id: 'noble-scion', name: 'Noble Scion', kind: 'bonus', cost: { resource: 'noble-scion', amount: 1 }, summary: '10 minutes: fly 60 ft; reaction turns a failed d20 test in your aura into a success.' },
        ] },
    ],
  },
]

// ---------------------------------------------------------------- Ranger

const DRAKE_ESSENCE = ['acid', 'cold', 'fire', 'lightning', 'poison']

const RANGER_SUBS = [
  {
    id: 'horizon-walker', name: 'Horizon Walker', source: XGE, expansion: true, summary: 'Planar guardian: finds portals, steps through the Ethereal, strikes with force.',
    features: [
      { id: 'horizon-walker-spells', level: 3, name: 'Horizon Walker Magic', summary: 'Always prepared: Protection from Evil and Good; Misty Step (5); Haste (9); Banishment (13); Teleportation Circle (17).',
        alwaysPrepared: { 3: ['protection-from-evil-and-good'], 5: ['misty-step'], 9: ['haste'], 13: ['banishment'], 17: ['teleportation-circle'] } },
      { id: 'detect-portal', level: 3, name: 'Detect Portal', summary: 'Action: learn the distance and direction to the nearest planar portal within 1 mile. Once per short or long rest.',
        effects: [
          { type: 'resource', id: 'detect-portal', name: 'Detect Portal', max: () => 1, reset: 'short' },
          { type: 'action', id: 'detect-portal', name: 'Detect Portal', kind: 'action', cost: { resource: 'detect-portal', amount: 1 }, summary: 'Nearest planar portal within 1 mile.' },
        ] },
      { id: 'planar-warrior', level: 3, name: 'Planar Warrior', summary: 'Bonus action: pick a creature within 30 ft. Your next weapon hit on it this turn deals force damage instead, plus 1d8 force (2d8 at 11).',
        effects: [{ type: 'action', id: 'planar-warrior', name: 'Planar Warrior', kind: 'bonus', summary: 'Next hit this turn on a creature within 30 ft: all force, plus extra.', roll: { label: 'Extra force damage', expr: (c) => (c.level >= 11 ? '2d8' : '1d8'), why: 'Planar Warrior: 1d8 force (2d8 from ranger level 11).' } }] },
      { id: 'ethereal-step', level: 7, name: 'Ethereal Step', summary: 'Bonus action: step into the Ethereal Plane (as Etherealness) until the end of this turn. Once per short or long rest.',
        effects: [
          { type: 'resource', id: 'ethereal-step', name: 'Ethereal Step', max: () => 1, reset: 'short' },
          { type: 'action', id: 'ethereal-step', name: 'Ethereal Step', kind: 'bonus', cost: { resource: 'ethereal-step', amount: 1 }, summary: 'Ethereal until the end of your turn.' },
        ] },
      { id: 'distant-strike', level: 11, name: 'Distant Strike', summary: 'When you take the Attack action, teleport up to 10 ft to a space you can see before each attack. If you attack at least two different creatures with the action, make one more attack against a third creature.' },
      { id: 'spectral-defense', level: 15, name: 'Spectral Defense', summary: 'Reaction when an attack damages you: resistance to all of that attack\'s damage this turn.',
        effects: [{ type: 'action', id: 'spectral-defense', name: 'Spectral Defense', kind: 'reaction', summary: "Resistance to one attack's damage." }] },
    ],
  },
  {
    id: 'monster-slayer', name: 'Monster Slayer', source: XGE, expansion: true, summary: 'Hunter of magical horrors: reads weaknesses, counters spells, dogs one prey.',
    features: [
      { id: 'monster-slayer-spells', level: 3, name: 'Monster Slayer Magic', summary: 'Always prepared: Protection from Evil and Good; Zone of Truth (5); Magic Circle (9); Banishment (13); Hold Monster (17).',
        alwaysPrepared: { 3: ['protection-from-evil-and-good'], 5: ['zone-of-truth'], 9: ['magic-circle'], 13: ['banishment'], 17: ['hold-monster'] } },
      { id: 'hunters-sense', level: 3, name: "Hunter's Sense", summary: 'Action: learn the damage immunities, resistances and vulnerabilities of one creature you can see within 60 ft (nothing if it is shielded from divination). WIS modifier (min 1) uses per long rest.',
        effects: [
          { type: 'resource', id: 'hunters-sense', name: "Hunter's Sense", max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'hunters-sense', name: "Hunter's Sense", kind: 'action', cost: { resource: 'hunters-sense', amount: 1 }, summary: 'Immunities, resistances and vulnerabilities of a creature within 60 ft.' },
        ] },
      { id: 'slayers-prey', level: 3, name: "Slayer's Prey", summary: 'Bonus action: mark a creature you can see within 60 ft. The first time each turn you hit it with a weapon, +1d6 damage. Lasts until a short or long rest or until you pick another.',
        effects: [{ type: 'action', id: 'slayers-prey', name: "Slayer's Prey", kind: 'bonus', summary: 'Mark a creature within 60 ft: first weapon hit each turn deals extra damage.', roll: { label: 'Extra damage', expr: () => '1d6', why: "Slayer's Prey: 1d6 on the first weapon hit each turn." } }] },
      { id: 'supernatural-defense', level: 7, name: 'Supernatural Defense', summary: 'When your Slayer\'s Prey forces you to save, or you check to escape its grapple, add 1d6.',
        effects: [{ type: 'action', id: 'supernatural-defense', name: 'Supernatural Defense', kind: 'free', summary: "Save forced by your prey, or escaping its grapple.", roll: { label: 'Add', expr: () => '1d6' } }] },
      { id: 'magic-users-nemesis', level: 11, name: "Magic-User's Nemesis", summary: 'Reaction when you see a creature within 60 ft cast a spell or teleport: it makes a WIS save or the spell or teleport fails and is wasted. Once per short or long rest.',
        effects: [
          { type: 'resource', id: 'magic-users-nemesis', name: "Magic-User's Nemesis", max: () => 1, reset: 'short' },
          { type: 'action', id: 'magic-users-nemesis', name: "Magic-User's Nemesis", kind: 'reaction', cost: { resource: 'magic-users-nemesis', amount: 1 }, summary: 'Foil a spell or teleport within 60 ft on a failed save.', save: { ability: 'WIS', dc: dc('WIS') } },
        ] },
      { id: 'slayers-counter', level: 15, name: "Slayer's Counter", summary: 'Reaction when your Slayer\'s Prey forces you to save: make one weapon attack against it first. On a hit, you also succeed on the save.',
        effects: [{ type: 'action', id: 'slayers-counter', name: "Slayer's Counter", kind: 'reaction', summary: 'Attack your prey before its save; a hit means you succeed.' }] },
    ],
  },
  {
    id: 'swarmkeeper', name: 'Swarmkeeper', source: TCE, expansion: true, summary: 'Bonded to a swarm of nature spirits that stings, shoves and carries you.',
    features: [
      { id: 'swarmkeeper-spells', level: 3, name: 'Swarmkeeper Magic', summary: 'Always prepared: Faerie Fire, Mage Hand (cantrip); Web (5); Gaseous Form (9); Arcane Eye (13); Insect Plague (17).',
        alwaysPrepared: { 3: ['faerie-fire', 'mage-hand'], 5: ['web'], 9: ['gaseous-form'], 13: ['arcane-eye'], 17: ['insect-plague'] } },
      { id: 'gathered-swarm', level: 3, name: 'Gathered Swarm', summary: 'Once on each of your turns, when you hit a creature with an attack, pick one: it takes 1d6 piercing (1d8 at 11); it makes a STR save or is moved up to 15 ft horizontally (from 11 also Prone if Large or smaller); or you move 5 ft horizontally (from 11 with half cover until your next turn).',
        effects: [{ type: 'action', id: 'gathered-swarm', name: 'Gathered Swarm', kind: 'free', summary: 'Once a turn on a hit: damage, push the target 15 ft (STR save), or move yourself 5 ft.',
          roll: { label: 'Piercing damage', expr: (c) => (c.level >= 11 ? '1d8' : '1d6'), why: 'Gathered Swarm: 1d6 piercing (1d8 from ranger level 11).' }, save: { ability: 'STR', dc: dc('WIS') } }] },
      { id: 'writhing-tide', level: 7, name: 'Writhing Tide', summary: 'Bonus action: fly 10 ft and hover for 1 minute. Proficiency bonus uses per long rest, or spend a level 1+ slot.',
        effects: [
          { type: 'resource', id: 'writhing-tide', name: 'Writhing Tide', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'writhing-tide', name: 'Writhing Tide', kind: 'bonus', cost: { resource: 'writhing-tide', amount: 1 }, summary: 'Fly 10 ft (hover) for 1 minute (or a level 1+ slot).' },
        ] },
      { id: 'mighty-swarm', level: 11, name: 'Mighty Swarm', summary: 'Gathered Swarm deals 1d8, a pushed Large or smaller creature also falls Prone, and when the swarm moves you, you have half cover until the start of your next turn.' },
      { id: 'swarming-dispersal', level: 15, name: 'Swarming Dispersal', summary: 'Reaction when you take damage: resistance to it, then teleport up to 30 ft to a space you can see. Proficiency bonus uses per long rest, or spend a level 1+ slot.',
        effects: [
          { type: 'resource', id: 'swarming-dispersal', name: 'Swarming Dispersal', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'swarming-dispersal', name: 'Swarming Dispersal', kind: 'reaction', cost: { resource: 'swarming-dispersal', amount: 1 }, summary: 'Resist the damage and teleport 30 ft (or a level 1+ slot).' },
        ] },
    ],
  },
  {
    id: 'drakewarden', name: 'Drakewarden', source: FTD, expansion: true, summary: 'A drake companion that grows from a small biter into a winged mount.',
    features: [
      { id: 'draconic-gift', level: 3, name: 'Draconic Gift', summary: 'You learn Thaumaturgy (a Ranger cantrip for you) and Draconic or one other language.',
        alwaysPrepared: { 3: ['thaumaturgy'] } },
      { id: 'drake-companion', level: 3, name: 'Drake Companion', summary: 'Action: summon a Small drake within 30 ft, picking its essence (acid, cold, fire, lightning or poison; it is immune to that type). Free once per long rest, or spend a level 1+ slot. AC 14 + PB, HP 5 + 5 x ranger level, speed 40 ft, darkvision 60 ft. It acts right after you and only Dodges unless you command it with a bonus action. Bite: +3 + PB to hit, 1d6 + PB piercing. Infused Strikes (its reaction): when a creature within 30 ft of it hits with a weapon, the target takes 1d6 of the essence type. Lasts until it drops to 0 HP, you summon it again, or you die.',
        effects: [
          { type: 'resource', id: 'drake-companion', name: 'Free drake summon', max: () => 1, reset: 'long' },
          { type: 'action', id: 'drake-companion', name: 'Summon drake', kind: 'action', cost: { resource: 'drake-companion', amount: 1 }, summary: (c) => `Drake: AC ${14 + c.prof}, HP ${5 + 5 * c.level}, speed 40 ft${c.level >= 7 ? ', fly 40 ft' : ''} (or a level 1+ slot).` },
          { type: 'action', id: 'drake-bite', name: 'Drake: Bite', kind: 'bonus', summary: (c) => `Command the drake. +${3 + c.prof} to hit, reach 5 ft.${c.level >= 7 ? ` Plus ${c.level >= 15 ? '2d6' : '1d6'} of its essence type.` : ''}`,
            roll: { label: 'Piercing damage', expr: (c) => `1d6+${c.prof}`, parts: (c) => [{ label: 'Proficiency bonus', value: c.prof, kind: 'prof' }], why: 'Drake bite: 1d6 + your proficiency bonus piercing (essence damage on top from level 7).' } },
          { type: 'action', id: 'drake-infused-strikes', name: 'Drake: Infused Strikes', kind: 'reaction', summary: 'A creature within 30 ft of the drake hits with a weapon: extra essence damage to the target.', roll: { label: 'Essence damage', expr: () => '1d6' } },
        ],
        choices: [{ key: 'essence', label: 'Draconic Essence', count: 1, options: () => DRAKE_ESSENCE.map((d) => ({ id: d, name: cap(d), summary: `The drake deals and is immune to ${d}; from level 7 you resist it while it is summoned.` })) }] },
      { id: 'bond-of-fang-and-scale', level: 7, name: 'Bond of Fang and Scale', summary: 'The drake becomes Medium, gains wings (fly speed equal to its walking speed) and can carry you if you are Medium or smaller (no flying while ridden). Its Bite deals an extra 1d6 of its essence type. You resist its essence type while it is summoned.' },
      { id: 'drakes-breath', level: 11, name: "Drake's Breath", summary: 'Action: you or the drake exhale a 30-ft cone of acid, cold, fire, lightning or poison (your pick). DEX save: 8d6 (10d6 at 15), half on a success. Once per long rest, or spend a level 3+ slot.',
        effects: [
          { type: 'resource', id: 'drakes-breath', name: "Drake's Breath", max: () => 1, reset: 'long' },
          { type: 'action', id: 'drakes-breath', name: "Drake's Breath", kind: 'action', cost: { resource: 'drakes-breath', amount: 1 }, summary: '30-ft cone, half on a save (or a level 3+ slot).',
            roll: { label: 'Damage', expr: (c) => (c.level >= 15 ? '10d6' : '8d6'), why: "Drake's Breath: 8d6 (10d6 from ranger level 15)." }, save: { ability: 'DEX', dc: dc('WIS') } },
        ] },
      { id: 'perfected-bond', level: 15, name: 'Perfected Bond', summary: "The drake becomes Large and can fly while you ride it. Its Bite deals another 1d6 of its essence type (2d6 in all). Drake's Breath deals 10d6. Reflexive Resistance: reaction when you or the drake take damage while within 30 ft of each other, give resistance to that damage; proficiency bonus uses per long rest.",
        effects: [
          { type: 'resource', id: 'reflexive-resistance', name: 'Reflexive Resistance', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'reflexive-resistance', name: 'Reflexive Resistance', kind: 'reaction', cost: { resource: 'reflexive-resistance', amount: 1 }, summary: 'You or the drake resist one instance of damage.' },
        ] },
    ],
  },
  {
    id: 'winter-walker', name: 'Winter Walker', source: HOF, expansion: true, summary: 'Hunter of the frozen north: cold strikes, icy grit, a blizzard form.',
    features: [
      { id: 'winter-walker-spells', level: 3, name: 'Winter Walker Spells', summary: 'Always prepared: Ice Knife; Hold Person (5); Remove Curse (9); Ice Storm (13); Cone of Cold (17).',
        alwaysPrepared: { 3: ['ice-knife'], 5: ['hold-person'], 9: ['remove-curse'], 13: ['ice-storm'], 17: ['cone-of-cold'] } },
      { id: 'frigid-explorer', level: 3, name: 'Frigid Explorer', summary: 'Resistance to cold. Your weapon attacks, Ranger spells and Ranger features ignore cold resistance. Polar Strikes: once a turn, a weapon hit deals +1d4 cold (1d6 at 11).',
        effects: [
          { type: 'resist', damage: 'cold' },
          { type: 'action', id: 'polar-strikes', name: 'Polar Strikes', kind: 'free', summary: 'Once a turn, on a weapon hit.', roll: { label: 'Cold damage', expr: (c) => (c.level >= 11 ? '1d6' : '1d4'), why: 'Polar Strikes: 1d4 cold (1d6 from ranger level 11).' } },
        ] },
      { id: 'hunters-rime', level: 3, name: "Hunter's Rime", summary: "When you cast Hunter's Mark, gain 1d10 + ranger level temp HP. The marked creature can't take the Disengage action.",
        effects: [{ type: 'action', id: 'hunters-rime', name: "Hunter's Rime", kind: 'free', summary: "When you cast Hunter's Mark.", roll: { label: 'Temp HP', expr: (c) => `1d10+${c.level}`, parts: (c) => [{ label: 'Ranger level', value: c.level, kind: 'level' }], why: "Hunter's Rime: 1d10 + your ranger level." } }] },
      { id: 'fortifying-soul', level: 7, name: 'Fortifying Soul', summary: 'Magic action: up to WIS modifier (min 1) creatures you can see each regain 1d10 + ranger level HP and have advantage on saves to avoid or end Frightened for 1 hour. Once per long rest.',
        effects: [
          { type: 'resource', id: 'fortifying-soul', name: 'Fortifying Soul', max: () => 1, reset: 'long' },
          { type: 'action', id: 'fortifying-soul', name: 'Fortifying Soul', kind: 'action', cost: { resource: 'fortifying-soul', amount: 1 }, summary: (c) => `Up to ${atLeast1(c.mod.WIS)} creatures heal and resist fear for 1 hour.`,
            roll: { label: 'Healing (each)', expr: (c) => `1d10+${c.level}`, parts: (c) => [{ label: 'Ranger level', value: c.level, kind: 'level' }], why: 'Fortifying Soul: 1d10 + your ranger level.' } },
        ] },
      { id: 'chilling-retribution', level: 11, name: 'Chilling Retribution', summary: 'Reaction when a creature hits you with an attack roll: it makes a WIS save or is Stunned until the end of your next turn (speed 0). WIS modifier (min 1) uses per long rest.',
        effects: [
          { type: 'resource', id: 'chilling-retribution', name: 'Chilling Retribution', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'chilling-retribution', name: 'Chilling Retribution', kind: 'reaction', cost: { resource: 'chilling-retribution', amount: 1 }, summary: 'The attacker is Stunned until the end of your next turn on a failed save.', save: { ability: 'WIS', dc: dc('WIS') } },
        ] },
      { id: 'frozen-haunt', level: 15, name: 'Frozen Haunt', summary: "When you cast Hunter's Mark, take a ghostly snow form until the spell ends: immune to cold and to Grappled, Prone and Restrained; move through creatures and objects as difficult terrain (1d10 force if you end a turn inside one); when you take the form and at the start of each of your turns, creatures you choose within 15 ft take 2d4 cold. Once per long rest, or spend a level 4+ slot.",
        effects: [
          { type: 'resource', id: 'frozen-haunt', name: 'Frozen Haunt', max: () => 1, reset: 'long' },
          { type: 'action', id: 'frozen-haunt', name: 'Frozen Haunt', kind: 'free', cost: { resource: 'frozen-haunt', amount: 1 }, summary: "With Hunter's Mark: snow form, cold aura 15 ft (or a level 4+ slot).", roll: { label: 'Cold damage (each)', expr: () => '2d4' } },
        ] },
    ],
  },
]

// ---------------------------------------------------------------- Rogue

const DEAD_THREE = [
  { id: 'bane', name: 'Bane', damage: 'psychic', cantrip: 'Minor Illusion' },
  { id: 'bhaal', name: 'Bhaal', damage: 'poison', cantrip: 'Blade Ward' },
  { id: 'myrkul', name: 'Myrkul', damage: 'necrotic', cantrip: 'Chill Touch' },
]

const ROGUE_SUBS = [
  {
    id: 'inquisitive', name: 'Inquisitive', source: XGE, expansion: true, summary: 'Detective: spots lies and clues, reads a foe to Sneak Attack it.',
    features: [
      { id: 'ear-for-deceit', level: 3, name: 'Ear for Deceit', summary: 'On an Insight check to tell whether a creature is lying, a d20 roll of 7 or lower counts as 8.' },
      { id: 'eye-for-detail', level: 3, name: 'Eye for Detail', summary: 'Bonus action: a Perception check to spot a hidden creature or object, or an Investigation check to find or decipher clues.',
        effects: [{ type: 'action', id: 'eye-for-detail', name: 'Eye for Detail', kind: 'bonus', summary: 'Perception to spot, or Investigation for clues.' }] },
      { id: 'insightful-fighting', level: 3, name: 'Insightful Fighting', summary: "Bonus action: your Insight check against the Deception check of a creature you can see that isn't Incapacitated. On a success, for 1 minute or until you use this again, you can Sneak Attack it without advantage (but not with disadvantage).",
        effects: [{ type: 'action', id: 'insightful-fighting', name: 'Insightful Fighting', kind: 'bonus', summary: 'Insight vs its Deception: Sneak Attack it without advantage for 1 minute.' }] },
      { id: 'steady-eye', level: 9, name: 'Steady Eye', summary: 'Advantage on Perception and Investigation checks if you move no more than half your speed that turn.' },
      { id: 'unerring-eye', level: 13, name: 'Unerring Eye', summary: 'Action: sense illusions, shapechangers out of their true form and other deceiving magic within 30 ft (not what exactly). WIS modifier (min 1) uses per long rest.',
        effects: [
          { type: 'resource', id: 'unerring-eye', name: 'Unerring Eye', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'unerring-eye', name: 'Unerring Eye', kind: 'action', cost: { resource: 'unerring-eye', amount: 1 }, summary: 'Sense illusions and shapechangers within 30 ft.' },
        ] },
      { id: 'eye-for-weakness', level: 17, name: 'Eye for Weakness', summary: 'While Insightful Fighting applies to a creature, your Sneak Attack against it deals +3d6.',
        effects: [{ type: 'action', id: 'eye-for-weakness', name: 'Eye for Weakness', kind: 'free', summary: 'Sneak Attack on your Insightful Fighting target.', roll: { label: 'Extra damage', expr: () => '3d6' } }] },
    ],
  },
  {
    id: 'mastermind', name: 'Mastermind', source: `${XGE} (also ${SCAG})`, expansion: true, summary: 'Schemer: disguises, helping from afar, reading people, unreadable mind.',
    features: [
      { id: 'master-of-intrigue', level: 3, name: 'Master of Intrigue', summary: 'Proficiency with the Disguise Kit, Forgery Kit and one gaming set; two languages; mimic the speech and accent of a creature you heard for at least 1 minute.' },
      { id: 'master-of-tactics', level: 3, name: 'Master of Tactics', summary: 'Help as a bonus action. When you Help an ally attack, the target can be up to 30 ft away from you (not 5 ft) if it can see or hear you.',
        effects: [{ type: 'action', id: 'master-of-tactics', name: 'Master of Tactics', kind: 'bonus', summary: 'Help action; aid an attack on a creature up to 30 ft away.' }] },
      { id: 'insightful-manipulator', level: 9, name: 'Insightful Manipulator', summary: 'After 1 minute watching or talking with a creature outside combat, learn whether it is equal, better or worse than you in two of: INT, WIS, CHA, class levels (if any).' },
      { id: 'misdirection', level: 13, name: 'Misdirection', summary: 'Reaction when you are targeted by an attack while a creature within 5 ft gives you cover against it: the attack targets that creature instead.',
        effects: [{ type: 'action', id: 'misdirection', name: 'Misdirection', kind: 'reaction', summary: 'Redirect an attack to the creature giving you cover.' }] },
      { id: 'soul-of-deceit', level: 17, name: 'Soul of Deceit', summary: 'Telepathy cannot read your thoughts unless you allow it; you can feed false thoughts (Deception vs Insight). Magic cannot tell whether you are lying, and you cannot be magically compelled to tell the truth.' },
    ],
  },
  {
    id: 'scout', name: 'Scout', source: XGE, expansion: true, summary: 'Skirmisher of the wilds: slips away, ambushes, strikes twice.',
    features: [
      { id: 'skirmisher', level: 3, name: 'Skirmisher', summary: 'Reaction when an enemy ends its turn within 5 ft of you: move up to half your speed without provoking opportunity attacks.',
        effects: [{ type: 'action', id: 'skirmisher', name: 'Skirmisher', kind: 'reaction', summary: 'Move half your speed, no opportunity attacks.' }] },
      { id: 'survivalist', level: 3, name: 'Survivalist', summary: 'Proficiency and expertise in Nature and Survival.',
        choices: [
          { key: 'skills', label: 'Survivalist proficiency (pick both)', count: 2, kind: 'skill', options: skillOpts(['nature', 'survival']) },
          { key: 'expertise', label: 'Survivalist expertise (pick both)', count: 2, kind: 'expertise', options: skillOpts(['nature', 'survival']) },
        ] },
      { id: 'superior-mobility', level: 9, name: 'Superior Mobility', summary: '+10 ft walking speed (and climb and swim speeds, if you have them).',
        effects: [{ type: 'bonus', target: 'speed', label: 'Superior Mobility', value: () => 10 }] },
      { id: 'ambush-master', level: 13, name: 'Ambush Master', summary: 'Advantage on initiative. The first creature you hit in the first round: attacks against it have advantage until the start of your next turn.' },
      { id: 'sudden-strike', level: 17, name: 'Sudden Strike', summary: 'When you take the Attack action, bonus action: one more attack. It can use Sneak Attack even if you already did this turn, but not on the same target twice in a turn.',
        effects: [{ type: 'action', id: 'sudden-strike', name: 'Sudden Strike', kind: 'bonus', summary: 'One more attack; a second Sneak Attack on a different target.' }] },
    ],
  },
  {
    id: 'swashbuckler', name: 'Swashbuckler', source: `${XGE} (also ${SCAG})`, expansion: true, summary: 'Duelist: in and out of melee, charm or taunt, never misses twice.',
    features: [
      { id: 'fancy-footwork', level: 3, name: 'Fancy Footwork', summary: 'On your turn, a creature you make a melee attack against cannot make opportunity attacks against you for the rest of that turn.' },
      { id: 'rakish-audacity', level: 3, name: 'Rakish Audacity', summary: 'Add your CHA modifier to initiative. You can Sneak Attack without advantage if the target is within 5 ft, no other creature is within 5 ft of you, and you do not have disadvantage.',
        effects: [{ type: 'bonus', target: 'initiative', label: 'Rakish Audacity (CHA)', value: (c) => c.mod.CHA }] },
      { id: 'panache', level: 9, name: 'Panache', summary: 'Action: your Persuasion against the Insight of a creature that hears and understands you. A hostile target has disadvantage on attacks against anyone but you and cannot make opportunity attacks against others, for 1 minute (ends if your allies attack it or target it with spells, or you are 60+ ft apart). A non-hostile target is Charmed by you for 1 minute (ends if you or your allies harm it).',
        effects: [{ type: 'action', id: 'panache', name: 'Panache', kind: 'action', summary: 'Persuasion vs Insight: taunt a foe or charm a non-hostile creature for 1 minute.' }] },
      { id: 'elegant-maneuver', level: 13, name: 'Elegant Maneuver', summary: 'Bonus action: advantage on your next Acrobatics or Athletics check this turn.',
        effects: [{ type: 'action', id: 'elegant-maneuver', name: 'Elegant Maneuver', kind: 'bonus', summary: 'Advantage on the next Acrobatics or Athletics check this turn.' }] },
      { id: 'master-duelist', level: 17, name: 'Master Duelist', summary: 'When you miss with an attack roll, roll it again with advantage. Once per short or long rest.',
        effects: [
          { type: 'resource', id: 'master-duelist', name: 'Master Duelist', max: () => 1, reset: 'short' },
          { type: 'action', id: 'master-duelist', name: 'Master Duelist', kind: 'free', cost: { resource: 'master-duelist', amount: 1 }, summary: 'Reroll a missed attack with advantage.' },
        ] },
    ],
  },
  {
    id: 'phantom', name: 'Phantom', source: TCE, expansion: true, summary: 'Walks with the dead: borrowed skills, wailing echoes of Sneak Attack, soul trinkets.',
    features: [
      { id: 'whispers-of-the-dead', level: 3, name: 'Whispers of the Dead', summary: 'After a short or long rest, gain proficiency in one skill or tool of your choice, until you pick another with this feature.' },
      { id: 'wails-from-the-grave', level: 3, name: 'Wails from the Grave', summary: 'Right after you deal Sneak Attack damage on your turn, a second creature within 30 ft of the first takes necrotic damage equal to half your Sneak Attack dice (round up). Proficiency bonus uses per long rest.',
        effects: [
          { type: 'resource', id: 'wails-from-the-grave', name: 'Wails from the Grave', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'wails-from-the-grave', name: 'Wails from the Grave', kind: 'free', cost: { resource: 'wails-from-the-grave', amount: 1 }, summary: 'After Sneak Attack: necrotic to a second creature within 30 ft of the first.',
            roll: { label: 'Necrotic damage', expr: (c) => `${Math.ceil(Math.ceil(c.level / 2) / 2)}d6`, why: 'Wails from the Grave: half your Sneak Attack dice, rounded up.' } },
        ] },
      { id: 'tokens-of-the-departed', level: 9, name: 'Tokens of the Departed', summary: 'Reaction when a creature you can see dies within 30 ft: a Tiny soul trinket forms in your free hand. Hold up to proficiency bonus trinkets. While you carry one: advantage on death saves and CON saves. On a Sneak Attack, destroy one to use Wails from the Grave without spending a use. Action: destroy one to ask its spirit one question.',
        effects: [{ type: 'action', id: 'tokens-of-the-departed', name: 'Soul trinket', kind: 'reaction', summary: (c) => `A creature dies within 30 ft: gain a soul trinket (max ${c.prof}).` }] },
      { id: 'ghost-walk', level: 13, name: 'Ghost Walk', summary: 'Bonus action for 10 minutes (end it as a bonus action): fly 10 ft (hover), attacks against you have disadvantage, and you move through creatures and objects as difficult terrain (1d10 force if you end a turn inside one). Once per long rest, or destroy a soul trinket.',
        effects: [
          { type: 'resource', id: 'ghost-walk', name: 'Ghost Walk', max: () => 1, reset: 'long' },
          { type: 'action', id: 'ghost-walk', name: 'Ghost Walk', kind: 'bonus', cost: { resource: 'ghost-walk', amount: 1 }, summary: '10 minutes spectral: fly 10 ft, attacks against you at disadvantage (or a soul trinket).' },
        ] },
      { id: 'deaths-friend', level: 17, name: "Death's Friend", summary: 'Wails from the Grave also deals its necrotic damage to the first creature. After a long rest, a soul trinket appears in your hand if you have none.' },
    ],
  },
  {
    id: 'scion-of-the-three', name: 'Scion of the Three', source: HOF, expansion: true, summary: 'Sworn to Bane, Bhaal or Myrkul: blinks to bloodied foes and spreads terror.',
    features: [
      { id: 'bloodthirst', level: 3, name: 'Bloodthirst', summary: 'Reaction when an enemy you can see within 30 ft takes damage and becomes Bloodied without dying: teleport to a space within 5 ft of it and make one melee attack. INT modifier (min 1) uses per long rest.',
        effects: [
          { type: 'resource', id: 'bloodthirst', name: 'Bloodthirst', max: (c) => atLeast1(c.mod.INT), reset: 'long' },
          { type: 'action', id: 'bloodthirst', name: 'Bloodthirst', kind: 'reaction', cost: { resource: 'bloodthirst', amount: 1 }, summary: 'Teleport next to a newly Bloodied enemy within 30 ft and attack it.' },
        ] },
      { id: 'dread-allegiance', level: 3, name: 'Dread Allegiance', summary: 'Choose one of the Dead Three (change on a long rest): Bane gives psychic resistance and Minor Illusion; Bhaal, poison resistance and Blade Ward; Myrkul, necrotic resistance and Chill Touch. The cantrip uses INT.',
        choices: [{ key: 'patron', label: 'Dead Three', count: 1, options: () => DEAD_THREE.map((g) => ({ id: g.id, name: g.name, summary: `Resistance to ${g.damage} damage; the ${g.cantrip} cantrip (INT).`, effects: [{ type: 'resist', damage: g.damage }] })) }] },
      { id: 'strike-fear', level: 9, name: 'Strike Fear', summary: 'New Cunning Strike, Terrify (cost 1d6): the target makes a WIS save or is Frightened for 1 minute, saving again at the end of each of its turns. You have advantage on attacks against it while it is Frightened this way.',
        effects: [{ type: 'action', id: 'strike-fear', name: 'Terrify (Cunning Strike)', kind: 'free', summary: 'Costs 1d6 Sneak Attack: Frightened for 1 minute on a failed save.', save: { ability: 'WIS', dc: dc('DEX') } }] },
      { id: 'aura-of-malevolence', level: 13, name: 'Aura of Malevolence', summary: 'When Bloodthirst teleports you, creatures you choose within 10 ft of where you left or where you arrive (pick one) take damage equal to your INT modifier, of your Dread Allegiance type. It ignores resistance.',
        effects: [{ type: 'action', id: 'aura-of-malevolence', name: 'Aura of Malevolence', kind: 'info', summary: (c) => `On a Bloodthirst teleport: ${Math.max(0, c.mod.INT)} damage to creatures you choose within 10 ft.` }] },
      { id: 'dread-incarnate', level: 17, name: 'Dread Incarnate', summary: 'Regain one Bloodthirst use when you finish a short rest. When you roll Sneak Attack damage, a 1 or 2 on a die counts as 3.' },
    ],
  },
]

export const EXT_SUBCLASSES_3 = { paladin: PALADIN_SUBS, ranger: RANGER_SUBS, rogue: ROGUE_SUBS }
