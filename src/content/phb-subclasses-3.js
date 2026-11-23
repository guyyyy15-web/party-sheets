// Player's Handbook (2024) subclasses that are not in the SRD 5.2, for the Rogue, Sorcerer, Warlock and Wizard,
// summarised in our own words for one private table. Same data model as the subclasses in classes.js and casters.js.
// Spells that are not in spells.js (PHB-only) are named in the summary text only.

const scale = (table) => (lvl) => table.filter(([l]) => lvl >= l).at(-1)?.[1] ?? 0
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)
const dc = (ab) => (c) => 8 + c.mod[ab] + c.prof
const atLeast1 = (n) => Math.max(1, n)
const finesseMod = (c) => Math.max(c.mod.STR, c.mod.DEX)

// ---------------------------------------------------------------- Rogue

// Third-caster spell slots (Arcane Trickster, Eldritch Knight), index 0 = class level 1, spell levels 1-4.
const SLOTS_THIRD = [
  [], [], [2], [3], [3], [3], [4, 2], [4, 2], [4, 2], [4, 3],
  [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
].map((row) => [...row, ...Array(4 - row.length).fill(0)])
const thirdSlotResources = [0, 1, 2, 3].map((i) => ({
  type: 'resource', id: `slot-${i + 1}`, name: `Level ${i + 1} spell slots`, max: (c) => SLOTS_THIRD[Math.min(20, c.level) - 1][i] || 0, reset: 'long',
}))

const psionicDie = scale([[3, 'd6'], [5, 'd8'], [11, 'd10'], [17, 'd12']])
const psionicDice = scale([[3, 4], [5, 6], [9, 8], [13, 10], [17, 12]])

const ARCANE_TRICKSTER = {
  id: 'arcane-trickster', name: 'Arcane Trickster', source: 'PHB 2024', summary: 'Wizard spells for a rogue: an invisible Mage Hand, ambush magic, stolen spells.',
  // The engine reads spellcasting from the class only (for now); this is the subclass's own table, ready for it.
  spellcasting: {
    ability: 'INT', kind: 'prepared', list: 'wizard',
    cantrips: [0, 0, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    prepared: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
    slots: 'third', table: SLOTS_THIRD, focus: 'Arcane Focus',
  },
  features: [
    { id: 'arcane-trickster-spellcasting', level: 3, name: 'Spellcasting', summary: 'Cast Wizard spells with INT: Mage Hand plus two Wizard cantrips (one more at 10), and prepared spells from the Wizard list (3 at level 3, 13 at 20). Swap one prepared spell each rogue level; slots up to level 4, back on a long rest.',
      alwaysPrepared: { 3: ['mage-hand'] },
      effects: [...thirdSlotResources, { type: 'note', save: { label: 'Spell save DC', dc: dc('INT') } }] },
    { id: 'mage-hand-legerdemain', level: 3, name: 'Mage Hand Legerdemain', summary: 'Cast Mage Hand as a bonus action and make the hand invisible. Control it as a bonus action, and make Sleight of Hand checks through it.',
      effects: [{ type: 'action', id: 'mage-hand-legerdemain', name: 'Mage Hand Legerdemain', kind: 'bonus', summary: 'Cast or steer an invisible Mage Hand; Sleight of Hand through it.' }] },
    { id: 'magical-ambush', level: 9, name: 'Magical Ambush', summary: 'If you are Invisible when you cast a spell on a creature, it has disadvantage on saves against that spell this turn.' },
    { id: 'versatile-trickster', level: 13, name: 'Versatile Trickster', summary: 'When you use the Trip Cunning Strike on a creature, you can also use it on another creature within 5 ft of your Mage Hand.' },
    { id: 'spell-thief', level: 17, name: 'Spell Thief', summary: 'Reaction when a spell targets you or includes you in its area: the caster makes a save with its spellcasting ability against your spell DC. On a failure the spell has no effect on you, and if it is level 1+ and of a level you can cast, you can cast it with your slots for 8 hours while the caster cannot. Once per long rest.',
      effects: [
        { type: 'resource', id: 'spell-thief', name: 'Spell Thief', max: () => 1, reset: 'long' },
        { type: 'action', id: 'spell-thief', name: 'Spell Thief', kind: 'reaction', cost: { resource: 'spell-thief', amount: 1 }, summary: (c) => `Caster saves against DC ${dc('INT')(c)} (its own spellcasting ability) or you negate and steal the spell for 8 hours.` },
      ] },
  ],
}

const ASSASSIN = {
  id: 'assassin', name: 'Assassin', source: 'PHB 2024', summary: 'Strike first and hard: ambushes, disguises and poison.',
  features: [
    { id: 'assassinate', level: 3, name: 'Assassinate', summary: 'Advantage on initiative. In the first round of combat, advantage on attacks against any creature that has not had a turn yet, and a Sneak Attack hit that round deals extra damage equal to your rogue level.',
      effects: [
        { type: 'action', id: 'assassinate', name: 'Assassinate', kind: 'info', summary: (c) => `Round 1: advantage against creatures that haven't acted; Sneak Attack hits deal +${c.level} damage.` },
      ] },
    { id: 'assassins-tools', level: 3, name: "Assassin's Tools", summary: "Proficiency with the Disguise Kit and the Poisoner's Kit, and you gain both." },
    { id: 'infiltration-expertise', level: 9, name: 'Infiltration Expertise', summary: "Masterful Mimicry: copy a person's speech, handwriting or both after studying them for at least an hour. Roving Aim: Steady Aim no longer drops your speed to 0." },
    { id: 'envenom-weapons', level: 13, name: 'Envenom Weapons', summary: 'When you use the Poison Cunning Strike, the target also takes 2d6 poison damage on a failed save. This damage ignores poison resistance.',
      effects: [{ type: 'action', id: 'envenom-weapons', name: 'Envenom Weapons', kind: 'free', summary: 'With a Poison Cunning Strike, on a failed save.', roll: { label: 'Poison damage', expr: () => '2d6', why: 'Envenom Weapons: 2d6 poison when the target fails the Poison save; ignores resistance.' } }] },
    { id: 'death-strike', level: 17, name: 'Death Strike', summary: 'When you hit with Sneak Attack in the first round of combat, the target makes a CON save or the attack deals double damage to it.',
      effects: [{ type: 'action', id: 'death-strike', name: 'Death Strike', kind: 'free', summary: 'First round, on a Sneak Attack hit: CON save or double damage.', save: { ability: 'CON', dc: dc('DEX') } }] },
  ],
}

const SOULKNIFE = {
  id: 'soulknife', name: 'Soulknife', source: 'PHB 2024', summary: 'Blades of psychic energy, telepathy and teleporting throws.',
  features: [
    { id: 'psionic-power', level: 3, name: 'Psionic Power', summary: 'Psionic Energy dice: 4d6 at level 3, 6d8 at 5, 8d8 at 9, 8d10 at 11, 10d10 at 13, 12d12 at 17. One back on a short rest, all on a long rest. Psi-Bolstered Knack: fail a check with a skill or tool you are proficient in, roll a die and add it (spent only if you then succeed). Psychic Whispers: telepathy with up to your proficiency bonus creatures for a number of hours equal to a die roll; first use each long rest is free, then it costs a die.',
      effects: [
        { type: 'resource', id: 'psionic-energy', name: 'Psionic Energy dice', max: (c) => psionicDice(c.level), reset: 'long', short: 1 },
        { type: 'action', id: 'psi-bolstered-knack', name: 'Psi-Bolstered Knack', kind: 'free', summary: 'After failing a proficient check: add the die. Spend it only if you now succeed.', roll: { label: 'Add', expr: (c) => `1${psionicDie(c.level)}`, why: 'Psi-Bolstered Knack: roll one Psionic Energy die and add it to the failed check.' } },
        { type: 'action', id: 'psychic-whispers', name: 'Psychic Whispers', kind: 'action', summary: (c) => `Telepathy with up to ${c.prof} creatures you can see, for hours equal to the roll. First use per long rest free, then 1 die.`, roll: { label: 'Hours', expr: (c) => `1${psionicDie(c.level)}` } },
      ] },
    { id: 'psychic-blades', level: 3, name: 'Psychic Blades', summary: 'When you take the Attack action or make an opportunity attack, you can attack with a psychic blade: simple melee weapon, Finesse, Thrown (60/120 ft), 1d6 psychic, Vex mastery. After attacking with one, a bonus action attack with a second blade deals 1d4.',
      effects: [
        { type: 'action', id: 'psychic-blade', name: 'Psychic Blade', kind: 'action', summary: 'Part of the Attack action or an opportunity attack. Finesse, thrown 60/120 ft, Vex.', roll: { label: 'Psychic damage', expr: (c) => `1d6${signed(finesseMod(c))}`, parts: (c) => [{ label: 'STR or DEX modifier (Finesse)', value: finesseMod(c), kind: 'ability' }], why: 'Psychic Blade: 1d6 plus the better of STR and DEX.' } },
        { type: 'action', id: 'psychic-blade-bonus', name: 'Second Psychic Blade', kind: 'bonus', summary: 'After attacking with a psychic blade: one more blade attack.', roll: { label: 'Psychic damage', expr: (c) => `1d4${signed(finesseMod(c))}`, parts: (c) => [{ label: 'STR or DEX modifier (Finesse)', value: finesseMod(c), kind: 'ability' }], why: 'Second blade: 1d4 plus the better of STR and DEX.' } },
      ] },
    { id: 'soul-blades', level: 9, name: 'Soul Blades', summary: 'Homing Strikes: miss with a psychic blade, roll a die and add it (spent only if it now hits). Psychic Teleportation: bonus action, spend a die, throw a blade and teleport to a spot you can see up to 10 x the roll in feet.',
      effects: [
        { type: 'action', id: 'homing-strikes', name: 'Homing Strikes', kind: 'free', summary: 'After a psychic blade misses: add the die. Spend it only if it now hits.', roll: { label: 'Add', expr: (c) => `1${psionicDie(c.level)}` } },
        { type: 'action', id: 'psychic-teleportation', name: 'Psychic Teleportation', kind: 'bonus', cost: { resource: 'psionic-energy', amount: 1 }, summary: 'Teleport up to 10 ft x the roll to a space you can see.', roll: { label: 'Roll x 10 ft', expr: (c) => `1${psionicDie(c.level)}` } },
      ] },
    { id: 'psychic-veil', level: 13, name: 'Psychic Veil', summary: 'Action: Invisible for 1 hour, ending early right after you deal damage or force a save. Once per long rest, or spend a Psionic Energy die.',
      effects: [
        { type: 'resource', id: 'psychic-veil', name: 'Psychic Veil', max: () => 1, reset: 'long' },
        { type: 'action', id: 'psychic-veil', name: 'Psychic Veil', kind: 'action', cost: { resource: 'psychic-veil', amount: 1 }, summary: 'Invisible for 1 hour (or spend a Psionic Energy die).' },
      ] },
    { id: 'rend-mind', level: 17, name: 'Rend Mind', summary: 'When you deal Sneak Attack damage with a psychic blade, the target makes a WIS save or is Stunned for 1 minute, saving again at the end of each of its turns. Once per long rest, or spend 3 Psionic Energy dice.',
      effects: [
        { type: 'resource', id: 'rend-mind', name: 'Rend Mind', max: () => 1, reset: 'long' },
        { type: 'action', id: 'rend-mind', name: 'Rend Mind', kind: 'free', cost: { resource: 'rend-mind', amount: 1 }, summary: 'On a psychic blade Sneak Attack (or spend 3 Psionic Energy dice).', save: { ability: 'WIS', dc: dc('DEX') } },
      ] },
  ],
}

// ---------------------------------------------------------------- Sorcerer

const ABERRANT = {
  id: 'aberrant', name: 'Aberrant Sorcery', source: 'PHB 2024', summary: 'An alien mind in your blood: telepathy, psychic spells, a body that warps.',
  features: [
    { id: 'psionic-spells', level: 3, name: 'Psionic Spells', summary: "Always prepared: Arms of Hadar, Calm Emotions, Detect Thoughts, Dissonant Whispers, Mind Sliver; Hunger of Hadar, Sending (5); Evard's Black Tentacles, Summon Aberration (7); Rary's Telepathic Bond, Telekinesis (9).",
      alwaysPrepared: { 3: ['calm-emotions', 'detect-thoughts', 'dissonant-whispers'], 5: ['sending'], 7: ['black-tentacles'], 9: ['telepathic-bond', 'telekinesis'] } },
    { id: 'telepathic-speech', level: 3, name: 'Telepathic Speech', summary: 'Bonus action: link with a creature you can see within 30 ft. You can talk telepathically while within CHA modifier miles (min 1), for minutes equal to your sorcerer level.',
      effects: [{ type: 'action', id: 'telepathic-speech', name: 'Telepathic Speech', kind: 'bonus', summary: (c) => `Telepathy with one creature within ${atLeast1(c.mod.CHA)} mile(s), for ${c.level} minutes.` }] },
    { id: 'psionic-sorcery', level: 6, name: 'Psionic Sorcery', summary: 'Cast a level 1+ Psionic Spell by spending Sorcery Points equal to its level instead of a slot; cast that way it needs no verbal or somatic components, and no material ones unless consumed or priced.' },
    { id: 'psychic-defenses', level: 6, name: 'Psychic Defenses', summary: 'Resistance to psychic damage, and advantage on saves to avoid or end Charmed or Frightened.',
      effects: [{ type: 'resist', damage: 'psychic' }] },
    { id: 'revelation-in-flesh', level: 14, name: 'Revelation in Flesh', summary: 'Bonus action: spend 1+ Sorcery Points for 10 minutes of one benefit per point: swim speed twice your speed and water breathing; fly speed equal to your speed (hover); see Invisible creatures within 60 ft; squeeze through 1-inch gaps and spend 5 ft of movement to escape bonds or a grapple.',
      effects: [{ type: 'action', id: 'revelation-in-flesh', name: 'Revelation in Flesh', kind: 'bonus', summary: '1 Sorcery Point per benefit, 10 minutes: swim, fly, see invisible, squeeze.' }] },
    { id: 'warping-implosion', level: 18, name: 'Warping Implosion', summary: 'Action: teleport up to 120 ft to a space you can see. Each creature within 30 ft of where you left makes a STR save: 3d10 force and pulled next to that space, or half damage on a success. Once per long rest, or 5 Sorcery Points.',
      effects: [
        { type: 'resource', id: 'warping-implosion', name: 'Warping Implosion', max: () => 1, reset: 'long' },
        { type: 'action', id: 'warping-implosion', name: 'Warping Implosion', kind: 'action', cost: { resource: 'warping-implosion', amount: 1 }, summary: 'Teleport 120 ft; creatures near where you left save or are pulled in (or 5 Sorcery Points).', roll: { label: 'Force damage', expr: () => '3d10' }, save: { ability: 'STR', dc: dc('CHA') } },
      ] },
  ],
}

const CLOCKWORK = {
  id: 'clockwork', name: 'Clockwork Sorcery', source: 'PHB 2024', summary: 'The power of cosmic order: cancel luck, ward allies, impose perfect rhythm.',
  features: [
    { id: 'clockwork-spells', level: 3, name: 'Clockwork Spells', summary: 'Always prepared: Aid, Alarm, Lesser Restoration, Protection from Evil and Good; Dispel Magic, Protection from Energy (5); Freedom of Movement, Summon Construct (7); Greater Restoration, Wall of Force (9).',
      alwaysPrepared: { 3: ['aid', 'alarm', 'lesser-restoration', 'protection-from-evil-and-good'], 5: ['dispel-magic', 'protection-from-energy'], 7: ['freedom-of-movement'], 9: ['greater-restoration', 'wall-of-force'] } },
    { id: 'restore-balance', level: 3, name: 'Restore Balance', summary: 'Reaction when a creature you can see within 60 ft is about to roll a d20 with advantage or disadvantage: it rolls without either. CHA modifier uses (min 1) per long rest.',
      effects: [
        { type: 'resource', id: 'restore-balance', name: 'Restore Balance', max: (c) => atLeast1(c.mod.CHA), reset: 'long' },
        { type: 'action', id: 'restore-balance', name: 'Restore Balance', kind: 'reaction', cost: { resource: 'restore-balance', amount: 1 }, summary: 'Cancel advantage or disadvantage on a d20 roll within 60 ft.' },
      ] },
    { id: 'bastion-of-law', level: 6, name: 'Bastion of Law', summary: 'Action: spend 1-5 Sorcery Points to ward yourself or a creature within 30 ft with that many d8s. When it takes damage, it can spend any of the dice and reduce the damage by their total. Lasts until a long rest or until you use this again.',
      effects: [{ type: 'action', id: 'bastion-of-law', name: 'Bastion of Law', kind: 'action', summary: '1-5 Sorcery Points: a ward of that many d8s that soak damage.', roll: { label: 'Reduce damage (per die)', expr: () => '1d8' } }] },
    { id: 'trance-of-order', level: 14, name: 'Trance of Order', summary: 'Bonus action for 1 minute: attacks against you cannot have advantage, and a d20 roll of 9 or lower on your d20 tests counts as a 10. Once per long rest, or 5 Sorcery Points.',
      effects: [
        { type: 'resource', id: 'trance-of-order', name: 'Trance of Order', max: () => 1, reset: 'long' },
        { type: 'action', id: 'trance-of-order', name: 'Trance of Order', kind: 'bonus', cost: { resource: 'trance-of-order', amount: 1 }, summary: '1 minute: no advantage against you, your d20s count as at least 10 (or 5 Sorcery Points).' },
      ] },
    { id: 'clockwork-cavalcade', level: 18, name: 'Clockwork Cavalcade', summary: 'Action, in a 30-ft cube from you: heal up to 100 HP split among creatures of your choice, repair damaged objects, and end spells of level 6 or lower on creatures and objects you choose. Once per long rest, or 7 Sorcery Points.',
      effects: [
        { type: 'resource', id: 'clockwork-cavalcade', name: 'Clockwork Cavalcade', max: () => 1, reset: 'long' },
        { type: 'action', id: 'clockwork-cavalcade', name: 'Clockwork Cavalcade', kind: 'action', cost: { resource: 'clockwork-cavalcade', amount: 1 }, summary: '30-ft cube: 100 HP of healing, repair, end spells up to level 6 (or 7 Sorcery Points).' },
      ] },
  ],
}

// Wild Magic Surge (d100), outcomes in brief.
const SURGE_TABLE = [
  [1, 4, 'For 1 minute, roll on this table at the start of each of your turns (ignore this result on those rolls).'],
  [5, 8, 'A friendly creature (random) appears within 60 ft for 1 minute, run by the DM.'],
  [9, 12, 'For 1 minute, regain 5 HP at the start of each of your turns.'],
  [13, 16, 'Targets have disadvantage on the save against your next spell with a save in the next minute.'],
  [17, 20, 'A harmless odd effect on you for 1 minute (roll 1d8: music, growing taller, a feathery beard, shouting, butterflies, a third eye, bubbles, blue skin).'],
  [21, 24, 'For 1 minute, your action spells take only a bonus action to cast.'],
  [25, 28, 'You vanish to the Astral Plane until the end of your next turn.'],
  [29, 32, 'The next damaging spell you cast in the next minute deals maximum damage.'],
  [33, 36, 'Resistance to all damage for 1 minute.'],
  [37, 40, 'You become a potted plant until your next turn: Incapacitated, vulnerable to all damage.'],
  [41, 44, 'For 1 minute, teleport up to 20 ft as a bonus action each turn.'],
  [45, 48, 'You and up to three creatures within 30 ft turn Invisible for 1 minute (ends on attacking, dealing damage or casting).'],
  [49, 52, 'A floating shield for 1 minute: +2 AC and immune to Magic Missile.'],
  [53, 56, 'Take one extra action this turn.'],
  [57, 60, 'Cast a random spell (roll 1d10), no concentration needed: Confusion, Fireball, Fog Cloud, Fly, Grease, Levitate, Magic Missile (level 5), Mirror Image, Polymorph (you into a goat), See Invisibility.'],
  [61, 64, 'For 1 minute, flammable objects you touch that no one carries catch fire.'],
  [65, 68, 'If you die within the next hour, you come back as if by Reincarnate.'],
  [69, 72, 'You are Frightened of something the DM picks until the end of your next turn.'],
  [73, 76, 'Teleport up to 60 ft to a space you can see.'],
  [77, 80, 'A random creature within 60 ft is Poisoned for 1d4 hours.'],
  [81, 84, 'For 1 minute you shed bright light 30 ft; anyone ending a turn within 5 ft of you is Blinded until its next turn ends.'],
  [85, 88, 'Up to three creatures within 30 ft take 1d10 necrotic each; you heal the total.'],
  [89, 92, 'Up to three creatures within 30 ft take 4d10 lightning each.'],
  [93, 96, 'You and every creature within 30 ft are vulnerable to piercing damage for 1 minute.'],
  [97, 100, 'Roll 1d6: you heal 2d10; an ally within 300 ft heals 2d10; you regain your lowest spent slot; an ally does; you regain all Sorcery Points; or every 17-20 effect at once.'],
]
const pad2 = (n) => (n === 100 ? '00' : String(n).padStart(2, '0'))
const surgeText = SURGE_TABLE.map(([lo, hi, text]) => `${pad2(lo)}-${pad2(hi)}: ${text}`).join(' ')

const WILD_MAGIC = {
  id: 'wild-magic', name: 'Wild Magic Sorcery', source: 'PHB 2024', summary: 'Chaotic magic that surges unpredictably, and luck you can bend.',
  features: [
    { id: 'wild-magic-surge', level: 3, name: 'Wild Magic Surge', summary: 'Once per turn, after you cast a Sorcerer spell with a slot, roll a d20. On a 20, roll on the Wild Magic Surge table (d100). A surge that is a spell cannot be changed by Metamagic.',
      table: SURGE_TABLE,
      effects: [
        { type: 'action', id: 'wild-magic-check', name: 'Wild Magic Check', kind: 'free', summary: 'After casting a Sorcerer spell with a slot (once per turn): a 20 means a surge.', roll: { label: 'Surge on a 20', expr: () => '1d20', why: 'Wild Magic Surge: on a 20, roll d100 on the Surge table.' } },
        { type: 'action', id: 'wild-magic-surge', name: 'Wild Magic Surge', kind: 'free', summary: 'Roll d100 and read the result on the Surge table.', roll: { label: 'Surge table', expr: () => '1d100', why: surgeText } },
      ] },
    { id: 'tides-of-chaos', level: 3, name: 'Tides of Chaos', summary: 'Give yourself advantage on one d20 test before rolling. Back on a long rest, or earlier: casting a Sorcerer spell with a slot while it is spent triggers an automatic surge roll and gives it back.',
      effects: [
        { type: 'resource', id: 'tides-of-chaos', name: 'Tides of Chaos', max: () => 1, reset: 'long' },
        { type: 'action', id: 'tides-of-chaos', name: 'Tides of Chaos', kind: 'free', cost: { resource: 'tides-of-chaos', amount: 1 }, summary: 'Advantage on one d20 test.' },
      ] },
    { id: 'bend-luck', level: 6, name: 'Bend Luck', summary: 'Reaction when a creature you can see rolls a d20 test: spend 1 Sorcery Point and roll 1d4 to add to or subtract from the roll.',
      effects: [{ type: 'action', id: 'bend-luck', name: 'Bend Luck', kind: 'reaction', cost: { resource: 'sorcery-points', amount: 1 }, summary: "Add or subtract 1d4 from someone's d20 test.", roll: { label: '+ or -', expr: () => '1d4' } }] },
    { id: 'controlled-chaos', level: 14, name: 'Controlled Chaos', summary: 'When you roll on the Wild Magic Surge table, roll twice and use either result.' },
    { id: 'tamed-surge', level: 18, name: 'Tamed Surge', summary: 'Right after casting a Sorcerer spell with a slot, pick any Surge table effect instead of rolling (not the last row). Once per long rest.',
      effects: [{ type: 'resource', id: 'tamed-surge', name: 'Tamed Surge', max: () => 1, reset: 'long' }] },
  ],
}

// ---------------------------------------------------------------- Warlock

const ARCHFEY = {
  id: 'archfey', name: 'Archfey Patron', source: 'PHB 2024', summary: 'A bargain with a lord of the Feywild: teleporting, beguiling, slipping away.',
  features: [
    { id: 'archfey-spells', level: 3, name: 'Archfey Spells', summary: 'Always prepared: Calm Emotions, Faerie Fire, Misty Step, Phantasmal Force, Sleep; Blink, Plant Growth (5); Dominate Beast, Greater Invisibility (7); Dominate Person, Seeming (9).',
      alwaysPrepared: { 3: ['calm-emotions', 'faerie-fire', 'misty-step', 'phantasmal-force', 'sleep'], 5: ['blink', 'plant-growth'], 7: ['dominate-beast', 'greater-invisibility'], 9: ['dominate-person', 'seeming'] } },
    { id: 'steps-of-the-fey', level: 3, name: 'Steps of the Fey', summary: 'Cast Misty Step without a slot CHA modifier times (min 1) per long rest. Each time you cast it, pick one: Refreshing Step (you or a creature within 10 ft gets 1d10 temp HP) or Taunting Step (creatures within 5 ft of where you left make a WIS save or have disadvantage on attacks against anyone but you until your next turn).',
      effects: [
        { type: 'resource', id: 'steps-of-the-fey', name: 'Steps of the Fey', max: (c) => atLeast1(c.mod.CHA), reset: 'long' },
        { type: 'action', id: 'steps-of-the-fey', name: 'Steps of the Fey', kind: 'bonus', cost: { resource: 'steps-of-the-fey', amount: 1 }, summary: 'Misty Step without a slot, plus a Step effect.', roll: { label: 'Refreshing Step temp HP', expr: () => '1d10' }, save: { ability: 'WIS', dc: dc('CHA') } },
      ] },
    { id: 'misty-escape', level: 6, name: 'Misty Escape', summary: 'Cast Misty Step as a reaction when you take damage. New Step options: Disappearing Step (Invisible until your next turn or until you attack, deal damage or cast) and Dreadful Step (creatures within 5 ft of where you left or arrive make a WIS save or take 2d10 psychic).',
      effects: [{ type: 'action', id: 'misty-escape', name: 'Misty Escape', kind: 'reaction', summary: 'When you take damage: Misty Step. Dreadful Step damage below.', roll: { label: 'Dreadful Step psychic', expr: () => '2d10' }, save: { ability: 'WIS', dc: dc('CHA') } }] },
    { id: 'beguiling-defenses', level: 10, name: 'Beguiling Defenses', summary: 'Immune to Charmed. Reaction when a creature you can see hits you: halve the damage (round down), and it makes a WIS save or takes psychic damage equal to the damage you took. Once per long rest, or spend a Pact slot.',
      effects: [
        { type: 'resource', id: 'beguiling-defenses', name: 'Beguiling Defenses', max: () => 1, reset: 'long' },
        { type: 'action', id: 'beguiling-defenses', name: 'Beguiling Defenses', kind: 'reaction', cost: { resource: 'beguiling-defenses', amount: 1 }, summary: 'Halve the hit; attacker saves or takes the damage you took (or spend a Pact slot).', save: { ability: 'WIS', dc: dc('CHA') } },
      ] },
    { id: 'bewitching-magic', level: 14, name: 'Bewitching Magic', summary: 'Right after you cast an Enchantment or Illusion spell with an action and a slot, cast Misty Step as part of that action without a slot.' },
  ],
}

const CELESTIAL = {
  id: 'celestial', name: 'Celestial Patron', source: 'PHB 2024', summary: 'A pact with a being of the Upper Planes: healing light and radiant fire.',
  features: [
    { id: 'celestial-spells', level: 3, name: 'Celestial Spells', summary: 'Always prepared: Aid, Cure Wounds, Guiding Bolt, Lesser Restoration, Light, Sacred Flame; Daylight, Revivify (5); Guardian of Faith, Wall of Fire (7); Greater Restoration, Summon Celestial (9).',
      alwaysPrepared: { 3: ['aid', 'cure-wounds', 'guiding-bolt', 'lesser-restoration', 'light', 'sacred-flame'], 5: ['daylight', 'revivify'], 7: ['guardian-of-faith', 'wall-of-fire'], 9: ['greater-restoration'] } },
    { id: 'healing-light', level: 3, name: 'Healing Light', summary: 'A pool of d6s equal to 1 + warlock level. Bonus action: heal a creature you can see within 60 ft by spending up to CHA modifier (min 1) dice. All back on a long rest.',
      effects: [
        { type: 'resource', id: 'healing-light', name: 'Healing Light dice', max: (c) => 1 + c.level, reset: 'long' },
        { type: 'action', id: 'healing-light', name: 'Healing Light', kind: 'bonus', summary: (c) => `Spend up to ${atLeast1(c.mod.CHA)} dice from the pool; heal a creature within 60 ft.`, roll: { label: 'Heal (all dice)', expr: (c) => `${atLeast1(c.mod.CHA)}d6`, why: 'Healing Light: roll the d6s you spend (at most your CHA modifier, min 1) and add them up.' }, heal: true },
      ] },
    { id: 'radiant-soul', level: 6, name: 'Radiant Soul', summary: 'Resistance to radiant damage. Once a turn, when a spell you cast deals radiant or fire damage, add your CHA modifier to that damage against one target.',
      effects: [{ type: 'resist', damage: 'radiant' }] },
    { id: 'celestial-resilience', level: 10, name: 'Celestial Resilience', summary: 'When you use Magical Cunning or finish a short or long rest, gain warlock level + CHA temp HP, and up to five creatures you choose gain half your warlock level + CHA temp HP.',
      effects: [{ type: 'action', id: 'celestial-resilience', name: 'Celestial Resilience', kind: 'info', summary: (c) => `After a rest or Magical Cunning: you get ${c.level + c.mod.CHA} temp HP, up to five others get ${Math.floor(c.level / 2) + c.mod.CHA}.` }] },
    { id: 'searing-vengeance', level: 14, name: 'Searing Vengeance', summary: 'When you or an ally within 60 ft is about to make a death save, that creature instead regains half its HP max and can stand up; creatures of your choice within 30 ft of it take 2d8 + CHA radiant and are Blinded until the end of the turn. Once per long rest.',
      effects: [
        { type: 'resource', id: 'searing-vengeance', name: 'Searing Vengeance', max: () => 1, reset: 'long' },
        { type: 'action', id: 'searing-vengeance', name: 'Searing Vengeance', kind: 'free', cost: { resource: 'searing-vengeance', amount: 1 }, summary: 'Instead of a death save: heal half HP max; radiant burst around them.', roll: { label: 'Radiant damage', expr: (c) => `2d8${signed(c.mod.CHA)}`, parts: (c) => [{ label: 'CHA modifier', value: c.mod.CHA, kind: 'ability' }] } },
      ] },
  ],
}

const GREAT_OLD_ONE = {
  id: 'great-old-one', name: 'Great Old One Patron', source: 'PHB 2024', summary: 'A pact with an unknowable entity: telepathy, psychic magic, minds that bend.',
  features: [
    { id: 'great-old-one-spells', level: 3, name: 'Great Old One Spells', summary: "Always prepared: Detect Thoughts, Dissonant Whispers, Phantasmal Force, Tasha's Hideous Laughter; Clairvoyance, Hunger of Hadar (5); Confusion, Summon Aberration (7); Modify Memory, Telekinesis (9).",
      alwaysPrepared: { 3: ['detect-thoughts', 'dissonant-whispers', 'phantasmal-force', 'hideous-laughter'], 5: ['clairvoyance'], 7: ['confusion'], 9: ['modify-memory', 'telekinesis'] } },
    { id: 'awakened-mind', level: 3, name: 'Awakened Mind', summary: 'Bonus action: link with a creature you can see within 30 ft. You can talk telepathically while within CHA modifier miles (min 1), for minutes equal to your warlock level.',
      effects: [{ type: 'action', id: 'awakened-mind', name: 'Awakened Mind', kind: 'bonus', summary: (c) => `Telepathy with one creature within ${atLeast1(c.mod.CHA)} mile(s), for ${c.level} minutes.` }] },
    { id: 'psychic-spells', level: 3, name: 'Psychic Spells', summary: 'Your damaging Warlock spells can deal psychic damage instead. Your Enchantment and Illusion Warlock spells need no verbal or somatic components.' },
    { id: 'clairvoyant-combatant', level: 6, name: 'Clairvoyant Combatant', summary: 'When you form an Awakened Mind link, the creature makes a WIS save; on a failure, for the link it has disadvantage on attacks against you and you have advantage on attacks against it. Once per short or long rest, or spend a Pact slot.',
      effects: [
        { type: 'resource', id: 'clairvoyant-combatant', name: 'Clairvoyant Combatant', max: () => 1, reset: 'short' },
        { type: 'action', id: 'clairvoyant-combatant', name: 'Clairvoyant Combatant', kind: 'free', cost: { resource: 'clairvoyant-combatant', amount: 1 }, summary: 'With Awakened Mind: on a failed save, it has disadvantage against you and you have advantage against it (or spend a Pact slot).', save: { ability: 'WIS', dc: dc('CHA') } },
      ] },
    { id: 'eldritch-hex', level: 10, name: 'Eldritch Hex', summary: 'Hex is always prepared. When you cast it, the target also has disadvantage on saves with the ability you chose.',
      alwaysPrepared: { 10: ['hex'] } },
    { id: 'thought-shield', level: 10, name: 'Thought Shield', summary: 'No one can read your thoughts unless you allow it. Resistance to psychic damage, and a creature that deals psychic damage to you takes the same amount.',
      effects: [{ type: 'resist', damage: 'psychic' }] },
    { id: 'create-thrall', level: 14, name: 'Create Thrall', summary: 'Your Summon Aberration needs no concentration (lasts 1 minute), its creature gets warlock level + CHA temp HP, and the first time each turn it hits a creature under your Hex it adds the Hex damage.' },
  ],
}

// ---------------------------------------------------------------- Wizard

const savant = (school) => ({ level: 3, summary: `Two free ${school} spells (level 2 or lower) in your spellbook, plus one free ${school} spell each time you gain a new spell level.` })

const ABJURER = {
  id: 'abjurer', name: 'Abjurer', source: 'PHB 2024', summary: 'Master of wards and counters: a shield of magic and broken spells.',
  features: [
    { id: 'abjuration-savant', name: 'Abjuration Savant', ...savant('Abjuration') },
    { id: 'arcane-ward', level: 3, name: 'Arcane Ward', summary: 'When you cast an Abjuration spell with a slot, create a ward on yourself (once per long rest) with HP max = twice your wizard level + INT. It takes damage before you. Casting another Abjuration spell with a slot heals it by twice the slot level; or spend a slot as a bonus action to heal it the same way.',
      effects: [
        { type: 'action', id: 'arcane-ward', name: 'Arcane Ward', kind: 'info', summary: (c) => `Ward HP max ${2 * c.level + c.mod.INT}. Heals 2 x slot level on each Abjuration spell.` },
        { type: 'action', id: 'arcane-ward-recharge', name: 'Recharge Ward', kind: 'bonus', summary: 'Spend a spell slot: the ward heals 2 x its level.' },
      ] },
    { id: 'projected-ward', level: 6, name: 'Projected Ward', summary: 'Reaction when a creature you can see within 30 ft takes damage: your Arcane Ward absorbs it instead.',
      effects: [{ type: 'action', id: 'projected-ward', name: 'Projected Ward', kind: 'reaction', summary: 'Your ward takes the damage for a creature within 30 ft.' }] },
    { id: 'spell-breaker', level: 10, name: 'Spell Breaker', summary: 'Counterspell and Dispel Magic are always prepared. Cast Dispel Magic as a bonus action and add your proficiency bonus to its check. If either fails to stop a spell, the slot is not spent.',
      alwaysPrepared: { 10: ['counterspell', 'dispel-magic'] } },
    { id: 'spell-resistance', level: 14, name: 'Spell Resistance', summary: 'Advantage on saves against spells, and resistance to the damage of spells.' },
  ],
}

const DIVINER = {
  id: 'diviner', name: 'Diviner', source: 'PHB 2024', summary: 'Sees the future: replace rolls with omens, regain slots, a third eye.',
  features: [
    { id: 'divination-savant', name: 'Divination Savant', ...savant('Divination') },
    { id: 'portent', level: 3, name: 'Portent', summary: 'After a long rest, roll two d20s (three at level 14) and write them down. Replace any d20 test by you or a creature you can see with one of them, before the roll, once per turn. Unused ones vanish on a long rest.',
      effects: [
        { type: 'resource', id: 'portent', name: 'Portent dice', max: (c) => (c.level >= 14 ? 3 : 2), reset: 'long' },
        { type: 'action', id: 'portent', name: 'Portent', kind: 'free', summary: 'After a long rest: roll and record. Use one in place of a d20 test, once per turn.', roll: { label: 'Portent', expr: (c) => (c.level >= 14 ? '3d20' : '2d20'), why: 'Portent: write down each d20 separately; do not add them.' } },
      ] },
    { id: 'expert-divination', level: 6, name: 'Expert Divination', summary: 'When you cast a Divination spell of level 2+ with a slot, regain one spent slot of a lower level (level 5 at most).' },
    { id: 'the-third-eye', level: 10, name: 'The Third Eye', summary: 'Bonus action, until your next short or long rest, one of: Darkvision 120 ft; read any language; or cast See Invisibility without a slot. Once per short or long rest.',
      effects: [
        { type: 'resource', id: 'the-third-eye', name: 'The Third Eye', max: () => 1, reset: 'short' },
        { type: 'action', id: 'the-third-eye', name: 'The Third Eye', kind: 'bonus', cost: { resource: 'the-third-eye', amount: 1 }, summary: 'Darkvision 120 ft, read any language, or See Invisibility.' },
      ] },
    { id: 'greater-portent', level: 14, name: 'Greater Portent', summary: 'Roll three d20s for Portent instead of two.' },
  ],
}

const ILLUSIONIST = {
  id: 'illusionist', name: 'Illusionist', source: 'PHB 2024', summary: 'Master of illusions that fool the senses and, at the end, become real.',
  features: [
    { id: 'illusion-savant', name: 'Illusion Savant', ...savant('Illusion') },
    { id: 'improved-illusions', level: 3, name: 'Improved Illusions', summary: 'Illusion spells need no verbal components, and those with a range of 10+ ft reach 60 ft farther. You know Minor Illusion (or another Wizard cantrip if you have it); it makes sound and image together and can be cast as a bonus action.',
      alwaysPrepared: { 3: ['minor-illusion'] } },
    { id: 'phantasmal-creatures', level: 6, name: 'Phantasmal Creatures', summary: 'Summon Beast and Summon Fey are always prepared. You can make either an Illusion spell (a spectral creature), and cast each that way once per long rest without a slot; the creature then has half HP.',
      effects: [{ type: 'resource', id: 'phantasmal-creatures', name: 'Phantasmal Creatures (each spell)', max: () => 2, reset: 'long' }] },
    { id: 'illusory-self', level: 10, name: 'Illusory Self', summary: 'Reaction when a creature makes an attack roll against you: an illusory double makes it miss. Once per short or long rest, or spend a level 2+ slot.',
      effects: [
        { type: 'resource', id: 'illusory-self', name: 'Illusory Self', max: () => 1, reset: 'short' },
        { type: 'action', id: 'illusory-self', name: 'Illusory Self', kind: 'reaction', cost: { resource: 'illusory-self', amount: 1 }, summary: 'An attack against you misses (or spend a level 2+ slot).' },
      ] },
    { id: 'illusory-reality', level: 14, name: 'Illusory Reality', summary: 'When you cast an Illusion spell with a slot, make one inanimate, nonmagical object in it real (bonus action on each turn while it lasts), for 1 minute. It cannot deal damage or give conditions.',
      effects: [{ type: 'action', id: 'illusory-reality', name: 'Illusory Reality', kind: 'bonus', summary: 'One harmless object in your illusion becomes real for 1 minute.' }] },
  ],
}

export const PHB_SUBCLASSES_3 = {
  rogue: [ARCANE_TRICKSTER, ASSASSIN, SOULKNIFE],
  sorcerer: [ABERRANT, CLOCKWORK, WILD_MAGIC],
  warlock: [ARCHFEY, CELESTIAL, GREAT_OLD_ONE],
  wizard: [ABJURER, DIVINER, ILLUSIONIST],
}
