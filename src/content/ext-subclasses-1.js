// Official subclasses from books other than the 2024 Player's Handbook, for the Barbarian, Bard and Cleric:
// the expansion books (Xanathar's, Tasha's, Sword Coast, Bigby's, Van Richten's, Heroes of Faerûn, the 2014 DMG)
// and the 2014 Player's Handbook. Rules summarised in our own words (what a feature does, its numbers, action type
// and uses); no book text. Same data model as phb-subclasses-1.js.
// Older subclasses with 2024 classes (2024 PHB rule): a feature the old subclass gave below level 3 arrives at
// level 3; every other feature keeps its level. A summary says when a feature moved.
import { SKILLS } from './basics.js'
import { FEATS } from './feats.js'
import { SPELLS } from './spells.js'

const scale = (table) => (lvl) => table.filter(([l]) => lvl >= l).at(-1)?.[1] ?? 0
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)
const dc = (ab) => (c) => 8 + c.mod[ab] + c.prof
const atLeast1 = (n) => Math.max(1, n)
const rageDamage = scale([[1, 2], [9, 3], [16, 4]])
const bardicDie = scale([[1, 'd6'], [5, 'd8'], [10, 'd10'], [15, 'd12']])
const skillOptions = (ids) => () => ids.map((id) => ({ id, name: SKILLS.find((s) => s.id === id).name }))
const cantripsOf = (filter) => () => SPELLS.filter((s) => s.level === 0 && filter(s)).map((s) => ({ id: s.id, name: s.name, summary: s.summary }))
const XGE = "Xanathar's Guide to Everything"
const TCE = "Tasha's Cauldron of Everything"
const SCAG = "Sword Coast Adventurer's Guide"
const PHB14 = "Player's Handbook 2014"
const moved = (from) => ` (Level ${from} in the original; level 3 with the 2024 class.)`

// ---------------------------------------------------------------- Barbarian (subclass features at 3, 6, 10, 14)
const barbarian = [
  {
    id: 'ancestral-guardian', name: 'Path of the Ancestral Guardian', source: XGE, expansion: true, summary: 'Ancestor spirits guard your allies and punish the foes you hit.',
    features: [
      { id: 'ancestral-protectors', level: 3, name: 'Ancestral Protectors', summary: 'While raging, the first creature you hit with an attack on your turn is hindered until the start of your next turn: it has disadvantage on attack rolls that do not target you, and anyone other than you that it hits with an attack has resistance to that damage. Ends early if your Rage ends.',
        effects: [{ type: 'action', id: 'ancestral-protectors', name: 'Ancestral Protectors', kind: 'free', summary: 'First creature you hit each turn while raging: disadvantage on attacks against others, and others resist its damage, until your next turn.' }] },
      { id: 'spirit-shield', level: 6, name: 'Spirit Shield', summary: 'While raging, reaction when a creature you can see within 30 ft takes damage: reduce that damage by 2d6 (3d6 at level 10, 4d6 at level 14).',
        effects: [{ type: 'action', id: 'spirit-shield', name: 'Spirit Shield', kind: 'reaction', summary: (c) => `While raging: reduce damage to a creature within 30 ft.${c.level >= 14 ? ' The attacker takes force damage equal to the amount prevented.' : ''}`,
          roll: { label: 'Damage prevented', expr: (c) => `${scale([[6, 2], [10, 3], [14, 4]])(c.level)}d6`, why: 'Spirit Shield: 2d6, 3d6 at level 10, 4d6 at level 14.' } }] },
      { id: 'consult-the-spirits', level: 10, name: 'Consult the Spirits', summary: 'Cast Augury or Clairvoyance without a slot or material components, using WIS. Clairvoyance cast this way sends an invisible spirit instead of a sensor. Once per short or long rest.',
        effects: [
          { type: 'resource', id: 'consult-the-spirits', name: 'Consult the Spirits', max: () => 1, reset: 'short' },
          { type: 'action', id: 'consult-the-spirits', name: 'Consult the Spirits', kind: 'action', cost: { resource: 'consult-the-spirits', amount: 1 }, summary: 'Augury or Clairvoyance, no slot or materials (WIS).' },
        ] },
      { id: 'vengeful-ancestors', level: 14, name: 'Vengeful Ancestors', summary: 'When Spirit Shield reduces damage, the attacker takes force damage equal to the amount prevented.' },
    ],
  },
  {
    id: 'storm-herald', name: 'Path of the Storm Herald', source: XGE, expansion: true, summary: 'Rage as a storm: an aura of desert heat, sea lightning or tundra cold.',
    features: [
      { id: 'storm-aura', level: 3, name: 'Storm Aura', summary: 'Pick an environment (desert, sea or tundra; you can change it when you gain a barbarian level). While raging you have a 10-ft aura; it triggers when you enter a Rage and again as a bonus action on later turns. Desert: every other creature in it takes 2 fire (3 at level 5, 4 at 10, 5 at 15, 6 at 20). Sea: one creature you can see in it makes a DEX save, 1d6 lightning, half on a success (2d6 at 10, 3d6 at 15, 4d6 at 20). Tundra: creatures of your choice in it gain 2 temp HP (3 at 5, 4 at 10, 5 at 15, 6 at 20). Save DC 8 + prof + CON.',
        choices: [{ key: 'environment', label: 'Storm environment', count: 1, options: () => [
          { id: 'desert', name: 'Desert', summary: 'Aura: fire damage to every other creature in it.' },
          { id: 'sea', name: 'Sea', summary: 'Aura: lightning damage to one creature (DEX save for half).' },
          { id: 'tundra', name: 'Tundra', summary: 'Aura: temp HP to creatures of your choice.' },
        ] }],
        effects: [
          { type: 'action', id: 'storm-aura', name: 'Storm Aura', kind: 'bonus', summary: (c) => `While raging (also free on entering a Rage), 10-ft aura. Desert: ${scale([[3, 2], [5, 3], [10, 4], [15, 5], [20, 6]])(c.level)} fire to each other creature. Tundra: ${scale([[3, 2], [5, 3], [10, 4], [15, 5], [20, 6]])(c.level)} temp HP to chosen creatures. Sea: roll below.`,
            roll: { label: 'Sea: lightning damage', expr: (c) => `${scale([[3, 1], [10, 2], [15, 3], [20, 4]])(c.level)}d6`, why: 'Sea aura: 1d6, 2d6 at level 10, 3d6 at 15, 4d6 at 20; DEX save for half.' }, save: { ability: 'DEX', dc: dc('CON') } },
        ] },
      { id: 'storm-soul', level: 6, name: 'Storm Soul', summary: 'Always on, matching your environment. Desert: resistance to fire, no harm from extreme heat, and an action to set an unattended flammable object you touch alight. Sea: resistance to lightning, breathe underwater, swim speed 30 ft. Tundra: resistance to cold, no harm from extreme cold, and an action to freeze a 5-ft cube of water you touch (no creature in it) for 1 minute.',
        choices: [{ key: 'environment', label: 'Storm Soul (same as your aura)', count: 1, options: () => [
          { id: 'desert', name: 'Desert', summary: 'Resist fire; ignite objects by touch.', effects: [{ type: 'resist', damage: 'fire' }] },
          { id: 'sea', name: 'Sea', summary: 'Resist lightning; water breathing; swim 30 ft.', effects: [{ type: 'resist', damage: 'lightning' }] },
          { id: 'tundra', name: 'Tundra', summary: 'Resist cold; freeze water by touch.', effects: [{ type: 'resist', damage: 'cold' }] },
        ] }] },
      { id: 'shielding-storm', level: 10, name: 'Shielding Storm', summary: 'Creatures of your choice in your aura have the same resistance that Storm Soul gives you.' },
      { id: 'raging-storm', level: 14, name: 'Raging Storm', summary: 'Desert: reaction when a creature in your aura hits you: DEX save or it takes fire damage equal to half your barbarian level. Sea: reaction when you hit a creature in your aura: STR save or it falls Prone. Tundra: each time the aura triggers, one creature you can see in it makes a STR save or its speed is 0 until the start of your next turn.',
        effects: [{ type: 'action', id: 'raging-storm', name: 'Raging Storm', kind: 'reaction', summary: (c) => `Desert: an attacker in the aura takes ${Math.floor(c.level / 2)} fire (DEX save). Sea: knock a creature you hit Prone (STR save). Tundra (no reaction): speed 0 (STR save).`, save: { ability: 'DEX or STR', dc: dc('CON') } }] },
    ],
  },
  {
    id: 'beast', name: 'Path of the Beast', source: TCE, expansion: true, summary: 'Rage grows bites, claws or a tail; later a fury that spreads.',
    features: [
      { id: 'form-of-the-beast', level: 3, name: 'Form of the Beast', summary: 'Each time you enter a Rage, grow one natural weapon until it ends (STR, proficient). Bite: 1d8 piercing; once per turn on a hit, if you are below half HP, regain HP equal to your proficiency bonus. Claws: 1d6 slashing each; once per turn when you attack with a claw as part of the Attack action, make one more claw attack. Tail: 1d8 piercing, reach 10 ft; reaction when a creature within 10 ft hits you: roll 1d8 and add it to your AC against that attack.',
        effects: [{ type: 'action', id: 'form-of-the-beast', name: 'Form of the Beast', kind: 'info', summary: (c) => `On entering a Rage: Bite 1d8${signed(c.mod.STR)} piercing (heal ${c.prof} below half HP), Claws 1d6${signed(c.mod.STR)} slashing (+1 claw attack), or Tail 1d8${signed(c.mod.STR)} piercing, reach 10 ft (reaction: +1d8 AC).`,
          roll: { label: 'Bite or Tail damage', expr: (c) => `1d8${signed(c.mod.STR)}`, why: 'Bite and Tail: 1d8 + STR (add your Rage Damage bonus while raging). Claws: 1d6 + STR.' } }] },
      { id: 'bestial-soul', level: 6, name: 'Bestial Soul', summary: 'Your natural weapons count as magical. Pick one, changeable on a short or long rest: swim speed equal to your speed and breathe underwater; climb speed equal to your speed and climb hard surfaces, even ceilings, with no check; or once per turn when you jump, make an Athletics check and add its total in feet to the jump.' },
      { id: 'infectious-fury', level: 10, name: 'Infectious Fury', summary: 'While raging, when you hit with a natural weapon, the target makes a WIS save or (your pick) uses its reaction to make a melee attack against another creature you can see, or takes 2d12 psychic. Uses = proficiency bonus, back on a long rest.',
        effects: [
          { type: 'resource', id: 'infectious-fury', name: 'Infectious Fury', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'infectious-fury', name: 'Infectious Fury', kind: 'free', cost: { resource: 'infectious-fury', amount: 1 }, summary: 'On a natural weapon hit while raging: the target attacks another creature with its reaction, or takes psychic damage.', roll: { label: 'Psychic damage', expr: () => '2d12' }, save: { ability: 'WIS', dc: dc('CON') } },
        ] },
      { id: 'call-the-hunt', level: 14, name: 'Call the Hunt', summary: 'When you enter a Rage, choose willing creatures within 30 ft, up to your CON modifier (min 1). You gain 5 temp HP for each one. Until the Rage ends, once on each of its turns each of them can deal an extra 1d6 damage (the weapon\'s type) when it hits with an attack roll. Uses = proficiency bonus, back on a long rest.',
        effects: [
          { type: 'resource', id: 'call-the-hunt', name: 'Call the Hunt', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'call-the-hunt', name: 'Call the Hunt', kind: 'free', cost: { resource: 'call-the-hunt', amount: 1 }, summary: (c) => `On entering a Rage: up to ${atLeast1(c.mod.CON)} allies within 30 ft get +1d6 on one hit per turn; you gain 5 temp HP per ally.` },
        ] },
    ],
  },
  {
    id: 'wild-magic', name: 'Path of Wild Magic', source: TCE, expansion: true, summary: 'Rage sets off random wild magic; sense and share magic.',
    features: [
      { id: 'magic-awareness', level: 3, name: 'Magic Awareness', summary: 'Action: until the end of your next turn, you know where every spell and magic item within 60 ft is (not behind total cover), and the school of any spell. Uses = proficiency bonus, back on a long rest.',
        effects: [
          { type: 'resource', id: 'magic-awareness', name: 'Magic Awareness', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'magic-awareness', name: 'Magic Awareness', kind: 'action', cost: { resource: 'magic-awareness', amount: 1 }, summary: 'Sense spells and magic items within 60 ft until the end of your next turn.' },
        ] },
      { id: 'wild-surge', level: 3, name: 'Wild Surge', summary: 'When you enter a Rage, roll 1d8; the effect lasts until the Rage ends unless instant. 1: each creature of your choice within 30 ft makes a CON save or takes 1d12 necrotic; you gain 1d12 temp HP. 2: teleport up to 30 ft, and again as a bonus action each turn. 3: a spirit appears within 5 ft of a creature within 30 ft and bursts at the end of your turn: DEX save or 1d6 force to each creature within 5 ft of it; bonus action each turn to summon another. 4: a weapon you hold deals force damage, gains Light and Thrown (20/60) and returns to your hand. 5: whenever a creature hits you with an attack roll, it takes 1d6 force. 6: you and chosen creatures within 10 ft get +1 AC. 7: the ground within 15 ft of you is difficult terrain for your enemies. 8: one creature within 30 ft makes a CON save or takes 1d6 radiant and is Blinded until your next turn; bonus action each turn to repeat. Save DC 8 + prof + CON.',
        effects: [
          { type: 'action', id: 'wild-surge', name: 'Wild Surge', kind: 'free', summary: 'On entering a Rage: roll on the Wild Magic table (1d8).', roll: { label: 'Wild Magic table', expr: () => '1d8' }, save: { ability: 'CON or DEX', dc: dc('CON') } },
        ] },
      { id: 'bolstering-magic', level: 6, name: 'Bolstering Magic', summary: 'Action: touch a creature (you too). Either it adds 1d3 to attack rolls and ability checks for 10 minutes, or it rolls 1d3 and regains one spent spell slot of that level or lower. Uses = proficiency bonus, back on a long rest.',
        effects: [
          { type: 'resource', id: 'bolstering-magic', name: 'Bolstering Magic', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'bolstering-magic', name: 'Bolstering Magic', kind: 'action', cost: { resource: 'bolstering-magic', amount: 1 }, summary: 'Touch: +1d3 to attacks and checks for 10 minutes, or regain a slot of level 1d3 or lower.', roll: { label: 'd3', expr: () => '1d3' } },
        ] },
      { id: 'unstable-backlash', level: 10, name: 'Unstable Backlash', summary: 'While raging, reaction when you take damage or fail a save: roll on the Wild Magic table; the new effect replaces the current one.',
        effects: [{ type: 'action', id: 'unstable-backlash', name: 'Unstable Backlash', kind: 'reaction', summary: 'Took damage or failed a save while raging: roll a new Wild Surge.', roll: { label: 'Wild Magic table', expr: () => '1d8' } }] },
      { id: 'controlled-surge', level: 14, name: 'Controlled Surge', summary: 'Roll twice on the Wild Magic table and pick either result; on doubles, pick any effect on the table.' },
    ],
  },
  {
    id: 'battlerager', name: 'Path of the Battlerager', source: SCAG, expansion: true, summary: 'Spiked armor brawler. The original book limits it to dwarves (your DM decides).',
    features: [
      { id: 'battlerager-armor', level: 3, name: 'Battlerager Armor', summary: 'While wearing spiked armor and raging: bonus action to attack a creature within 5 ft with the spikes (1d4 piercing, STR). When you grapple a creature with the Attack action, it takes 3 piercing damage if the grapple succeeds.',
        effects: [{ type: 'action', id: 'armor-spikes', name: 'Armor Spikes', kind: 'bonus', summary: 'While raging in spiked armor: one spike attack within 5 ft. A successful grapple also deals 3 piercing.', roll: { label: 'Piercing damage', expr: (c) => `1d4${signed(c.mod.STR)}`, why: 'Spikes: 1d4 + STR (add your Rage Damage bonus while raging).' } }] },
      { id: 'reckless-abandon', level: 6, name: 'Reckless Abandon', summary: 'When you use Reckless Attack while raging, gain temp HP equal to your CON modifier (min 1); they vanish when the Rage ends.',
        effects: [{ type: 'action', id: 'reckless-abandon', name: 'Reckless Abandon', kind: 'free', summary: (c) => `Reckless Attack while raging: ${atLeast1(c.mod.CON)} temp HP.` }] },
      { id: 'battlerager-charge', level: 10, name: 'Battlerager Charge', summary: 'While raging, you can Dash as a bonus action.',
        effects: [{ type: 'action', id: 'battlerager-charge', name: 'Battlerager Charge', kind: 'bonus', summary: 'Dash while raging.' }] },
      { id: 'spiked-retribution', level: 14, name: 'Spiked Retribution', summary: 'While raging in spiked armor (and not Incapacitated), a creature within 5 ft that hits you with a melee attack takes 3 piercing damage.' },
    ],
  },
  {
    id: 'giant', name: 'Path of the Giant', source: "Bigby Presents: Glory of the Giants", expansion: true, summary: 'Rage makes you giant-sized; elemental throwing weapons and hurled foes.',
    features: [
      { id: 'giants-power', level: 3, name: "Giant's Power", summary: 'You learn Giant (or another language if you know it) and the Druidcraft or Thaumaturgy cantrip, using WIS.',
        choices: [{ key: 'cantrip', label: 'Cantrip', count: 1, kind: 'pick', options: cantripsOf((s) => ['druidcraft', 'thaumaturgy'].includes(s.id)) }] },
      { id: 'giants-havoc', level: 3, name: "Giant's Havoc", summary: 'While raging: your reach grows by 5 ft and, if you are smaller than Large, you become Large (if there is room). A ranged hit with a thrown weapon using STR adds your Rage Damage bonus.',
        effects: [{ type: 'action', id: 'giants-havoc', name: "Giant's Havoc", kind: 'info', summary: (c) => `While raging: ${c.level >= 14 ? 'reach +10 ft, Large or Huge' : 'reach +5 ft, Large'}; thrown STR hits deal +${rageDamage(c.level)}.` }] },
      { id: 'elemental-cleaver', level: 6, name: 'Elemental Cleaver', summary: 'When you enter a Rage, a weapon you hold takes acid, cold, fire, lightning or thunder until the Rage ends: it deals that type, +1d6 of it on a hit (2d6 from level 14), gains Thrown (20/60) and returns to your hand right after a thrown attack. Bonus action while raging: change the type.',
        effects: [{ type: 'action', id: 'elemental-cleaver', name: 'Elemental Cleaver', kind: 'free', summary: 'Rage weapon: elemental damage, Thrown 20/60, returns. Bonus action: change the element.', roll: { label: 'Extra damage', expr: (c) => (c.level >= 14 ? '2d6' : '1d6'), why: 'Elemental Cleaver: 1d6, 2d6 from level 14 (Demiurgic Colossus).' } }] },
      { id: 'mighty-impel', level: 10, name: 'Mighty Impel', summary: 'Bonus action while raging: a Medium or smaller creature within reach (that you grapple or that is not grappled) is thrown to a space you can see within 30 ft; an unwilling one makes a STR save. If it lands in the air it falls, taking fall damage and landing Prone. From level 14, Large or smaller.',
        effects: [{ type: 'action', id: 'mighty-impel', name: 'Mighty Impel', kind: 'bonus', summary: (c) => `While raging: throw a ${c.level >= 14 ? 'Large' : 'Medium'} or smaller creature up to 30 ft.`, save: { ability: 'STR', dc: dc('STR') } }] },
      { id: 'demiurgic-colossus', level: 14, name: 'Demiurgic Colossus', summary: "Giant's Havoc: reach +10 ft instead, and you can become Large or Huge. Elemental Cleaver deals 2d6. Mighty Impel works on Large or smaller creatures." },
    ],
  },
  {
    id: 'totem-warrior', name: 'Path of the Totem Warrior', source: PHB14, expansion: true, summary: 'Animal spirit guide: bear, eagle, elk, tiger or wolf at each step.',
    features: [
      { id: 'spirit-seeker', level: 3, name: 'Spirit Seeker', summary: 'Cast Beast Sense and Speak with Animals, as rituals only.' },
      { id: 'totem-spirit', level: 3, name: 'Totem Spirit', summary: 'Pick a totem animal (Elk and Tiger come from the Sword Coast Adventurer\'s Guide). Bear: while raging, resistance to all damage except psychic. Eagle: while raging and not in heavy armor, others have disadvantage on opportunity attacks against you, and you can Dash as a bonus action. Elk: while raging and not in heavy armor, +15 ft speed. Tiger: while raging, +10 ft long jump and +3 ft high jump. Wolf: while raging, your friends have advantage on melee attacks against enemies within 5 ft of you.',
        choices: [{ key: 'totem', label: 'Totem Spirit', count: 1, options: () => [
          { id: 'bear', name: 'Bear', summary: 'Raging: resist all damage but psychic.', effects: [{ type: 'action', id: 'totem-spirit', name: 'Totem Spirit: Bear', kind: 'info', summary: 'While raging: resistance to every damage type except psychic.' }] },
          { id: 'eagle', name: 'Eagle', summary: 'Raging: opportunity attacks against you have disadvantage; Dash as a bonus action.', effects: [{ type: 'action', id: 'totem-spirit', name: 'Totem Spirit: Eagle', kind: 'bonus', summary: 'While raging, not in heavy armor: Dash. Opportunity attacks against you have disadvantage.' }] },
          { id: 'elk', name: 'Elk', summary: 'Raging, not in heavy armor: +15 ft speed.', effects: [{ type: 'action', id: 'totem-spirit', name: 'Totem Spirit: Elk', kind: 'info', summary: 'While raging, not in heavy armor: +15 ft speed.' }] },
          { id: 'tiger', name: 'Tiger', summary: 'Raging: +10 ft long jump, +3 ft high jump.', effects: [{ type: 'action', id: 'totem-spirit', name: 'Totem Spirit: Tiger', kind: 'info', summary: 'While raging: long jump +10 ft, high jump +3 ft.' }] },
          { id: 'wolf', name: 'Wolf', summary: 'Raging: friends have advantage on melee attacks against enemies next to you.', effects: [{ type: 'action', id: 'totem-spirit', name: 'Totem Spirit: Wolf', kind: 'info', summary: 'While raging: allies have advantage on melee attacks against enemies within 5 ft of you.' }] },
        ] }] },
      { id: 'aspect-of-the-beast', level: 6, name: 'Aspect of the Beast', summary: 'Pick a totem animal (it can differ from the first). Bear: double carrying capacity, advantage on STR checks to push, pull, lift or break. Eagle: see clearly up to 1 mile, and dim light gives no disadvantage on Perception. Elk: you and up to 10 companions travel at double pace. Tiger: proficiency in two of Athletics, Acrobatics, Stealth and Survival. Wolf: track at a fast pace and move stealthily at a normal pace.',
        choices: [{ key: 'aspect', label: 'Aspect of the Beast', count: 1, options: () => [
          { id: 'bear', name: 'Bear', summary: 'Double carrying capacity; advantage on STR checks to push, pull, lift or break.' },
          { id: 'eagle', name: 'Eagle', summary: 'See 1 mile clearly; no Perception disadvantage in dim light.' },
          { id: 'elk', name: 'Elk', summary: 'You and up to 10 companions travel at double pace.' },
          { id: 'tiger', name: 'Tiger', summary: 'Two skills from Athletics, Acrobatics, Stealth, Survival (pick them below).' },
          { id: 'wolf', name: 'Wolf', summary: 'Track at a fast pace; sneak at a normal pace.' },
        ] }, { key: 'tiger-skills', label: 'Tiger skills (only if you picked Tiger)', count: 2, kind: 'skill', options: skillOptions(['athletics', 'acrobatics', 'stealth', 'survival']) }] },
      { id: 'spirit-walker', level: 10, name: 'Spirit Walker', summary: 'Cast Commune with Nature, as a ritual only.' },
      { id: 'totemic-attunement', level: 14, name: 'Totemic Attunement', summary: 'Pick a totem animal. Bear: while raging, hostile creatures within 5 ft have disadvantage on attacks against anyone but you (or another with this feature). Eagle: while raging, fly speed equal to your speed, on your turn only (you fall if you end it in the air). Elk: while raging, bonus action to move through a Large or smaller creature\'s space: STR save or it falls Prone and takes 1d12 + STR bludgeoning. Tiger: while raging, after moving 20 ft straight toward a Large or smaller target, a bonus action melee weapon attack against it. Wolf: while raging, when you hit a Large or smaller creature with a melee weapon attack, bonus action to knock it Prone.',
        choices: [{ key: 'attunement', label: 'Totemic Attunement', count: 1, options: () => [
          { id: 'bear', name: 'Bear', summary: 'Raging: enemies next to you must attack you or have disadvantage.' },
          { id: 'eagle', name: 'Eagle', summary: 'Raging: fly on your turn.' },
          { id: 'elk', name: 'Elk', summary: 'Raging: trample through a creature (STR save).', effects: [{ type: 'action', id: 'totemic-attunement', name: 'Elk Trample', kind: 'bonus', summary: 'While raging: move through a Large or smaller creature; it falls Prone and takes damage on a failed save.', roll: { label: 'Bludgeoning damage', expr: (c) => `1d12${signed(c.mod.STR)}` }, save: { ability: 'STR', dc: dc('STR') } }] },
          { id: 'tiger', name: 'Tiger', summary: 'Raging: bonus attack after a 20-ft charge.', effects: [{ type: 'action', id: 'totemic-attunement', name: 'Tiger Pounce', kind: 'bonus', summary: 'While raging, after moving 20 ft straight at a Large or smaller target: one melee weapon attack.' }] },
          { id: 'wolf', name: 'Wolf', summary: 'Raging: knock a creature you hit Prone.', effects: [{ type: 'action', id: 'totemic-attunement', name: 'Wolf Takedown', kind: 'bonus', summary: 'While raging, after a melee weapon hit on a Large or smaller creature: knock it Prone.' }] },
        ] }] },
    ],
  },
]

// ---------------------------------------------------------------- Bard (subclass features at 3, 6, 14)
const bard = [
  {
    id: 'swords', name: 'College of Swords', source: XGE, expansion: true, summary: 'Blade performer: flourishes that spend inspiration for damage and tricks.',
    features: [
      { id: 'swords-proficiencies', level: 3, name: 'Bonus Proficiencies', summary: 'Training with medium armor and proficiency with the scimitar. A melee weapon you are proficient with can be your spellcasting focus.' },
      { id: 'swords-fighting-style', level: 3, name: 'Fighting Style', summary: 'Dueling or Two-Weapon Fighting (Fighting Style feats).',
        choices: [{ key: 'style', label: 'Fighting Style', count: 1, kind: 'feat', options: () => FEATS.filter((f) => ['dueling', 'two-weapon-fighting'].includes(f.id)) }] },
      { id: 'blade-flourish', level: 3, name: 'Blade Flourish', summary: 'When you take the Attack action, your speed is +10 ft until the end of the turn. Once per turn, when a weapon attack hits, spend one Bardic Inspiration and roll the die; the target takes that much extra damage, plus: Defensive (add the roll to your AC until your next turn), Slashing (another creature of your choice within 5 ft of you also takes the roll as damage) or Mobile (push the target 5 ft + the roll, then your reaction can move you up to your speed to a space within 5 ft of it).',
        effects: [{ type: 'action', id: 'blade-flourish', name: 'Blade Flourish', kind: 'free', cost: { resource: 'bardic-inspiration', amount: 1 }, summary: (c) => `Once per turn on a weapon hit: extra damage + Defensive, Slashing or Mobile.${c.level >= 14 ? ' Or roll a d6 instead of spending a die.' : ''}`, roll: { label: 'Flourish roll', expr: (c) => `1${bardicDie(c.level)}`, why: 'Blade Flourish: your Bardic Inspiration die.' } }] },
      { id: 'swords-extra-attack', level: 6, name: 'Extra Attack', summary: 'Attack twice when you take the Attack action.',
        effects: [{ type: 'attacks', value: () => 2 }] },
      { id: 'masters-flourish', level: 14, name: "Master's Flourish", summary: 'When you use a flourish, you can roll a d6 instead of spending a Bardic Inspiration die.' },
    ],
  },
  {
    id: 'whispers', name: 'College of Whispers', source: XGE, expansion: true, summary: 'Spy and blackmailer: psychic blades, fear and stolen identities.',
    features: [
      { id: 'psychic-blades', level: 3, name: 'Psychic Blades', summary: 'Once per turn, when you hit with a weapon attack, spend one Bardic Inspiration to deal extra psychic damage: 2d6 (3d6 at level 5, 5d6 at 10, 8d6 at 15).',
        effects: [{ type: 'action', id: 'psychic-blades', name: 'Psychic Blades', kind: 'free', cost: { resource: 'bardic-inspiration', amount: 1 }, summary: 'Once per turn on a weapon hit.', roll: { label: 'Psychic damage', expr: (c) => `${scale([[3, 2], [5, 3], [10, 5], [15, 8]])(c.level)}d6`, why: 'Psychic Blades: 2d6, 3d6 at level 5, 5d6 at 10, 8d6 at 15.' } }] },
      { id: 'words-of-terror', level: 3, name: 'Words of Terror', summary: 'After talking alone with a creature for at least 1 minute: WIS save or it is Frightened of you or another creature you name for 1 hour (ends if it is attacked or damaged, or sees its allies attacked). It does not know you tried if it succeeds. Once per short or long rest.',
        effects: [
          { type: 'resource', id: 'words-of-terror', name: 'Words of Terror', max: () => 1, reset: 'short' },
          { type: 'action', id: 'words-of-terror', name: 'Words of Terror', kind: 'info', cost: { resource: 'words-of-terror', amount: 1 }, summary: 'After 1 minute of private talk: Frightened for 1 hour.', save: { ability: 'WIS', dc: dc('CHA') } },
        ] },
      { id: 'mantle-of-whispers', level: 6, name: 'Mantle of Whispers', summary: 'Reaction when a Humanoid dies within 30 ft: capture its shadow. Action: take its appearance for 1 hour (bonus action to end), knowing general facts about its life but no secrets; you get +5 to Deception checks to pass as it. Once per short or long rest.',
        effects: [
          { type: 'resource', id: 'mantle-of-whispers', name: 'Mantle of Whispers', max: () => 1, reset: 'short' },
          { type: 'action', id: 'mantle-of-whispers', name: 'Mantle of Whispers', kind: 'reaction', cost: { resource: 'mantle-of-whispers', amount: 1 }, summary: 'Capture a dying Humanoid\'s shadow; later wear its face for 1 hour (+5 Deception).' },
        ] },
      { id: 'shadow-lore', level: 14, name: 'Shadow Lore', summary: 'Action: a creature within 30 ft that understands you makes a WIS save or is Charmed by you for 8 hours, believing you know its worst secret; it obeys your commands as long as they do not risk its life or bring it into combat. It does not know you tried if it succeeds. Once per long rest.',
        effects: [
          { type: 'resource', id: 'shadow-lore', name: 'Shadow Lore', max: () => 1, reset: 'long' },
          { type: 'action', id: 'shadow-lore', name: 'Shadow Lore', kind: 'action', cost: { resource: 'shadow-lore', amount: 1 }, summary: 'Charm a creature within 30 ft for 8 hours with a threatened secret.', save: { ability: 'WIS', dc: dc('CHA') } },
        ] },
    ],
  },
  {
    id: 'creation', name: 'College of Creation', source: TCE, expansion: true, summary: 'Song of creation: motes on your inspiration, conjured items and a dancing object.',
    features: [
      { id: 'mote-of-potential', level: 3, name: 'Mote of Potential', summary: 'A Bardic Inspiration die you give comes with a mote. Used on an ability check: roll the die twice and keep either. On an attack roll: the target and creatures of your choice within 5 ft of it make a CON save (your spell DC) or take thunder damage equal to a roll of the die. On a saving throw: the creature gains temp HP equal to a roll of the die + your CHA modifier (min 1).',
        effects: [{ type: 'action', id: 'mote-of-potential', name: 'Mote of Potential', kind: 'info', summary: (c) => `Check: roll twice. Attack: thunder burst (CON save). Save: temp HP = die + ${atLeast1(c.mod.CHA)}.`, roll: { label: 'Mote roll', expr: (c) => `1${bardicDie(c.level)}` }, save: { ability: 'CON', dc: dc('CHA') } }] },
      { id: 'performance-of-creation', level: 3, name: 'Performance of Creation', summary: 'Action: create one nonmagical item within 10 ft worth up to 20 GP x bard level, Medium or smaller (Large at level 6, Huge at 14). It lasts hours equal to your proficiency bonus; only one at a time. Once per long rest, or spend a level 2+ slot to use it again.',
        effects: [
          { type: 'resource', id: 'performance-of-creation', name: 'Performance of Creation', max: () => 1, reset: 'long' },
          { type: 'action', id: 'performance-of-creation', name: 'Performance of Creation', kind: 'action', cost: { resource: 'performance-of-creation', amount: 1 }, summary: (c) => `Create a nonmagical ${c.level >= 14 ? 'Huge' : c.level >= 6 ? 'Large' : 'Medium'} or smaller item${c.level >= 14 ? 's (no GP limit)' : ` worth up to ${20 * c.level} GP`} for ${c.prof} hours (or spend a level 2+ slot).` },
        ] },
      { id: 'animating-performance', level: 6, name: 'Animating Performance', summary: 'Action: animate a Large or smaller nonmagical object within 30 ft (not worn or carried) for 1 hour as a Dancing Item: AC 16, HP 10 + 5 x bard level, speed 30 ft and fly 30 ft (hover). It acts right after you and only Dodges unless you command it with a bonus action (that can be the same bonus action as Bardic Inspiration). Slam: melee spell attack with your spell attack bonus, 1d10 + proficiency bonus force. Once per long rest, or spend a level 3+ slot to use it again.',
        effects: [
          { type: 'resource', id: 'animating-performance', name: 'Animating Performance', max: () => 1, reset: 'long' },
          { type: 'action', id: 'animating-performance', name: 'Animating Performance', kind: 'action', cost: { resource: 'animating-performance', amount: 1 }, summary: (c) => `Dancing Item for 1 hour: AC 16, ${10 + 5 * c.level} HP (or spend a level 3+ slot).` },
          { type: 'action', id: 'dancing-item-slam', name: 'Dancing Item: Slam', kind: 'bonus', summary: 'Command the item to attack (melee spell attack, reach 5 ft).', roll: { label: 'Force damage', expr: (c) => `1d10+${c.prof}`, why: 'Force-Empowered Slam: 1d10 + your proficiency bonus.' } },
        ] },
      { id: 'creative-crescendo', level: 14, name: 'Creative Crescendo', summary: 'Performance of Creation makes several items at once: up to your CHA modifier (min 2). Only one can be of the maximum size; the rest are Small or Tiny. No GP limit. Making one too many makes an earlier one of your choice vanish.' },
    ],
  },
  {
    id: 'eloquence', name: 'College of Eloquence', source: TCE, expansion: true, summary: 'Master orator: reliable persuasion, words that weaken saves, inspiration that is never wasted.',
    features: [
      { id: 'silver-tongue', level: 3, name: 'Silver Tongue', summary: 'On a Persuasion or Deception check, a d20 roll of 9 or lower counts as 10.' },
      { id: 'unsettling-words', level: 3, name: 'Unsettling Words', summary: 'Bonus action, one Bardic Inspiration: roll the die; a creature within 60 ft subtracts the roll from the next saving throw it makes before the start of your next turn.',
        effects: [{ type: 'action', id: 'unsettling-words', name: 'Unsettling Words', kind: 'bonus', cost: { resource: 'bardic-inspiration', amount: 1 }, summary: 'A creature within 60 ft subtracts the roll from its next save before your next turn.', roll: { label: 'Subtract from save', expr: (c) => `1${bardicDie(c.level)}` } }] },
      { id: 'unfailing-inspiration', level: 6, name: 'Unfailing Inspiration', summary: 'A creature that adds your Bardic Inspiration die to a roll and still fails keeps the die.' },
      { id: 'universal-speech', level: 6, name: 'Universal Speech', summary: 'Action: up to CHA modifier (min 1) creatures within 60 ft understand you for 1 hour, whatever language you speak. Once per long rest, or spend a spell slot to use it again.',
        effects: [
          { type: 'resource', id: 'universal-speech', name: 'Universal Speech', max: () => 1, reset: 'long' },
          { type: 'action', id: 'universal-speech', name: 'Universal Speech', kind: 'action', cost: { resource: 'universal-speech', amount: 1 }, summary: (c) => `Up to ${atLeast1(c.mod.CHA)} creatures within 60 ft understand you for 1 hour (or spend a slot).` },
        ] },
      { id: 'infectious-inspiration', level: 14, name: 'Infectious Inspiration', summary: 'Reaction when a creature within 60 ft succeeds on a roll using your Bardic Inspiration: give a Bardic Inspiration die to another creature within 60 ft without spending a use. Uses = CHA modifier (min 1), back on a long rest.',
        effects: [
          { type: 'resource', id: 'infectious-inspiration', name: 'Infectious Inspiration', max: (c) => atLeast1(c.mod.CHA), reset: 'long' },
          { type: 'action', id: 'infectious-inspiration', name: 'Infectious Inspiration', kind: 'reaction', cost: { resource: 'infectious-inspiration', amount: 1 }, summary: 'After a success with your inspiration: a free Bardic Inspiration to another creature within 60 ft.' },
        ] },
    ],
  },
  {
    id: 'spirits', name: 'College of Spirits', source: "Van Richten's Guide to Ravenloft", expansion: true, summary: 'Medium and storyteller: spirits tell random tales that help or harm.',
    features: [
      { id: 'guiding-whispers', level: 3, name: 'Guiding Whispers', summary: 'You know the Guidance cantrip (it does not count against your cantrips); its range is 60 ft for you.',
        alwaysPrepared: { 3: ['guidance'] } },
      { id: 'spiritual-focus', level: 3, name: 'Spiritual Focus', summary: 'A candle, crystal ball, skull, spirit board or tarokka deck can be your spellcasting focus. From level 6, when a bard spell cast through it deals damage or heals, add 1d6 to one damage or healing roll of it.',
        effects: [{ type: 'action', id: 'spiritual-focus', name: 'Spiritual Focus', kind: 'free', summary: 'Level 6+: a bard spell cast through your focus adds 1d6 to one damage or healing roll.', roll: { label: 'Bonus (level 6+)', expr: () => '1d6' } }] },
      { id: 'tales-from-beyond', level: 3, name: 'Tales from Beyond', summary: 'Bonus action while holding your focus, one Bardic Inspiration: roll the die on the Spirit Tales table (BI = a roll of your Bardic Inspiration die). Action: tell the tale to a creature within 30 ft (or yourself). One tale at a time; it is lost on a short or long rest. Saves use your spell DC. 1 Clever Animal: for 10 minutes, +BI on INT, WIS and CHA checks. 2 Renowned Duelist: melee spell attack, 2 BI + CHA force. 3 Beloved Friends: the target and one creature within 5 ft gain BI + CHA temp HP. 4 Runaway: the target teleports up to 30 ft with its reaction; up to CHA (min 0) creatures within 30 ft can too. 5 Avenger: for 1 minute, a creature hitting the target in melee takes BI force. 6 Traveler: BI + bard level temp HP; while they last, +10 ft speed and +1 AC. 7 Beguiler: WIS save or 2 BI psychic and Incapacitated until the end of its next turn. 8 Phantom: Invisible until the end of its next turn or until it attacks; its first hit while invisible deals +BI necrotic and frightens the creature hit until the end of that creature\'s next turn. 9 Brute: creatures of the target\'s choice within 30 ft make a STR save: 3 BI thunder and Prone, half and no Prone on a success. 10 Dragon: 30-ft cone of fire from the target, DEX save, 4 BI fire, half on a success. 11 Angel: the target regains 2 BI + CHA HP and ends Blinded, Deafened, Paralyzed, Petrified or Poisoned. 12 Mind-Bender: INT save or 3 BI psychic and Stunned until the end of its next turn.',
        effects: [
          { type: 'action', id: 'tales-from-beyond', name: 'Tales from Beyond', kind: 'bonus', cost: { resource: 'bardic-inspiration', amount: 1 }, summary: (c) => `Roll a tale (1${bardicDie(c.level)} on the Spirit Tales table); tell it with an action to a creature within 30 ft.${c.level >= 14 ? ' Roll twice and pick; doubles = any tale.' : ''}`, roll: { label: 'Spirit Tales roll', expr: (c) => `1${bardicDie(c.level)}` }, save: { ability: 'by tale', dc: dc('CHA') } },
        ] },
      { id: 'spirit-session', level: 6, name: 'Spirit Session', summary: 'A 1-hour ritual during a short or long rest with up to your proficiency bonus willing creatures (you included): learn one Divination or Necromancy spell from any class, of a level no higher than the number of participants and one you can cast. It counts as a bard spell until your next long rest. Once per long rest.',
        effects: [{ type: 'resource', id: 'spirit-session', name: 'Spirit Session', max: () => 1, reset: 'long' }] },
      { id: 'mystical-connection', level: 14, name: 'Mystical Connection', summary: 'When you roll on the Spirit Tales table, roll twice and choose; on doubles, choose any tale.' },
    ],
  },
  {
    // A 2024-native subclass (no level shift).
    id: 'moon', name: 'College of the Moon', source: 'Heroes of Faerûn', expansion: true, summary: 'Moonshae lorekeeper: vanishing in moonlight and healing that speeds allies.',
    features: [
      { id: 'primal-lore', level: 3, name: 'Primal Lore', summary: 'You know Druidic and one Druid cantrip (a Bard spell for you, not counted against your cantrips; you can swap it when you gain a bard level). Proficiency in one of Animal Handling, Insight, Medicine, Nature, Perception or Survival.',
        choices: [
          { key: 'cantrip', label: 'Druid cantrip', count: 1, kind: 'pick', options: cantripsOf((s) => s.classes.includes('druid')) },
          { key: 'skill', label: 'Skill', count: 1, kind: 'skill', options: skillOptions(['animal-handling', 'insight', 'medicine', 'nature', 'perception', 'survival']) },
        ] },
      { id: 'moons-inspiration', level: 3, name: "Moon's Inspiration", summary: 'Inspired Eclipse: when you give Bardic Inspiration with a bonus action, you can also turn Invisible until the start of your next turn and teleport up to 30 ft to a space you can see; the invisibility ends early if you attack, deal damage or cast a spell. Lunar Vitality: once per turn, when a spell restores HP to a creature, spend one Bardic Inspiration to add the roll to the healing; that creature also gets +10 ft speed until the end of its next turn.',
        effects: [
          { type: 'action', id: 'inspired-eclipse', name: 'Inspired Eclipse', kind: 'info', summary: (c) => `With Bardic Inspiration: you turn Invisible and teleport 30 ft.${c.level >= 14 ? ' The inspired creature can do the same with its reaction.' : ''}` },
          { type: 'action', id: 'lunar-vitality', name: 'Lunar Vitality', kind: 'free', cost: { resource: 'bardic-inspiration', amount: 1 }, heal: true, summary: (c) => `Once per turn when a spell heals: extra HP and +10 ft speed.${c.level >= 14 ? ' Or roll a d6 instead of spending a die.' : ''}`, roll: { label: 'Extra healing', expr: (c) => `1${bardicDie(c.level)}` } },
        ] },
      { id: 'blessing-of-moonlight', level: 6, name: 'Blessing of Moonlight', summary: 'Moonbeam is always prepared. When you cast it, you can make yourself glow (dim light 5 ft); while you glow, each time a creature fails its save against that Moonbeam, another creature you can see within 60 ft (not you) regains 2d4 HP. The glow option is once per long rest.',
        alwaysPrepared: { 6: ['moonbeam'] },
        effects: [
          { type: 'resource', id: 'blessing-of-moonlight', name: 'Blessing of Moonlight', max: () => 1, reset: 'long' },
          { type: 'action', id: 'blessing-of-moonlight', name: 'Blessing of Moonlight', kind: 'free', cost: { resource: 'blessing-of-moonlight', amount: 1 }, heal: true, summary: 'Moonbeam with a glow: each failed save heals another creature within 60 ft.', roll: { label: 'Healing', expr: () => '2d4' } },
        ] },
      { id: 'eventides-splendor', level: 14, name: "Eventide's Splendor", summary: 'Shadow of the New Moon: with Inspired Eclipse, the creature you inspire can also turn Invisible until the start of its next turn and use its reaction to teleport up to 30 ft. Vibrance of the Full Moon: Lunar Vitality can roll a d6 instead of spending a Bardic Inspiration die.' },
    ],
  },
]

// ---------------------------------------------------------------- Cleric (subclass features at 3, 6, 17; older domains also 8)
// 2024 rule: an older domain's Divine Strike or Potent Spellcasting is replaced by the Blessed Strikes option you
// pick at level 7, and martial weapons / heavy armor from an older domain overlap the Protector Divine Order.
const oldStrike = (what) => `The original domain gives ${what} here. With the 2024 class this is covered by Blessed Strikes (level 7): use only the option you chose there.`
const heavyNote = ' (With an older domain that gives this, the 2024 rule still has you choose one Divine Order option; Thaumaturge avoids a duplicate.)'
const wizardSpells = (lvl) => () => SPELLS.filter((s) => s.level === lvl && s.classes.includes('wizard')).map((s) => ({ id: s.id, name: s.name, summary: s.summary }))
const cleric = [
  {
    id: 'forge', name: 'Forge Domain', source: XGE, expansion: true, summary: 'Smith of the gods: blessed arms and armor, fire resistance, heavy armor.',
    features: [
      { id: 'forge-proficiencies', level: 3, name: 'Bonus Proficiencies', summary: `Training with heavy armor and proficiency with smith's tools.${moved(1)}${heavyNote}` },
      { id: 'forge-domain-spells', level: 3, name: 'Forge Domain Spells', summary: `Always prepared: Identify, Searing Smite, Heat Metal, Magic Weapon (3); Elemental Weapon, Protection from Energy (5); Fabricate, Wall of Fire (7); Animate Objects, Creation (9). Elemental Weapon is not in this app's spell list: note it by hand.${moved('1 and 3')}`,
        alwaysPrepared: { 3: ['identify', 'searing-smite', 'heat-metal', 'magic-weapon'], 5: ['protection-from-energy'], 7: ['fabricate', 'wall-of-fire'], 9: ['animate-objects', 'creation'] } },
      { id: 'blessing-of-the-forge', level: 3, name: 'Blessing of the Forge', summary: `At the end of a long rest, touch a nonmagical weapon or suit of armor: it becomes magical with +1 to AC (armor) or +1 to attack and damage rolls (weapon) until your next long rest. Once per long rest.${moved(1)}`,
        effects: [
          { type: 'resource', id: 'blessing-of-the-forge', name: 'Blessing of the Forge', max: () => 1, reset: 'long' },
          { type: 'action', id: 'blessing-of-the-forge', name: 'Blessing of the Forge', kind: 'info', cost: { resource: 'blessing-of-the-forge', amount: 1 }, summary: 'End of a long rest: +1 armor or +1 weapon until the next long rest.' },
        ] },
      { id: 'artisans-blessing', level: 3, name: "Channel Divinity: Artisan's Blessing", summary: `1-hour ritual, one Channel Divinity: create a nonmagical item that is at least partly metal (a simple or martial weapon, armor, ten pieces of ammunition, a set of tools or another metal object) worth up to 100 GP, by spending metal of the same value.${moved(2)}`,
        effects: [{ type: 'action', id: 'artisans-blessing', name: "Artisan's Blessing", kind: 'info', cost: { resource: 'channel-divinity', amount: 1 }, summary: '1-hour ritual: forge a metal item worth up to 100 GP from metal of that value.' }] },
      { id: 'soul-of-the-forge', level: 6, name: 'Soul of the Forge', summary: 'Resistance to fire damage, and +1 AC while you wear heavy armor.',
        effects: [{ type: 'resist', damage: 'fire' }, { type: 'bonus', target: 'ac', label: 'Soul of the Forge (heavy armor)', value: () => 1, when: (c) => c.armor?.type === 'heavy' }] },
      { id: 'forge-divine-strike', level: 8, name: 'Divine Strike (older domain)', summary: oldStrike('Divine Strike (1d8 fire, 2d8 at level 14)') },
      { id: 'saint-of-forge-and-fire', level: 17, name: 'Saint of Forge and Fire', summary: 'Immunity to fire damage. While you wear heavy armor, resistance to bludgeoning, piercing and slashing damage from nonmagical attacks.' },
    ],
  },
  {
    id: 'grave', name: 'Grave Domain', source: XGE, expansion: true, summary: 'Guardian of the line between life and death: max healing at 0 HP, curses that double damage.',
    features: [
      { id: 'grave-domain-spells', level: 3, name: 'Grave Domain Spells', summary: `Always prepared: Bane, False Life, Gentle Repose, Ray of Enfeeblement (3); Revivify, Vampiric Touch (5); Blight, Death Ward (7); Antilife Shell, Raise Dead (9).${moved('1 and 3')}`,
        alwaysPrepared: { 3: ['bane', 'false-life', 'gentle-repose', 'ray-of-enfeeblement'], 5: ['revivify', 'vampiric-touch'], 7: ['blight', 'death-ward'], 9: ['antilife-shell', 'raise-dead'] } },
      { id: 'circle-of-mortality', level: 3, name: 'Circle of Mortality', summary: `When you heal a creature that has 0 HP, every healing die counts as its maximum. You know Spare the Dying (not counted against your cantrips); for you it has a range of 30 ft and is a bonus action.${moved(1)}`,
        alwaysPrepared: { 3: ['spare-the-dying'] } },
      { id: 'eyes-of-the-grave', level: 3, name: 'Eyes of the Grave', summary: `Action: until the end of your next turn, you know where every Undead within 60 ft is (not behind total cover or shielded from divination). Uses = WIS modifier (min 1), back on a long rest.${moved(1)}`,
        effects: [
          { type: 'resource', id: 'eyes-of-the-grave', name: 'Eyes of the Grave', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'eyes-of-the-grave', name: 'Eyes of the Grave', kind: 'action', cost: { resource: 'eyes-of-the-grave', amount: 1 }, summary: 'Sense Undead within 60 ft until the end of your next turn.' },
        ] },
      { id: 'path-to-the-grave', level: 3, name: 'Channel Divinity: Path to the Grave', summary: `Action, one Channel Divinity: curse a creature within 30 ft until the end of your next turn. The next attack by you or an ally that hits it deals double damage (vulnerability to all of that attack's damage), then the curse ends.${moved(2)}`,
        effects: [{ type: 'action', id: 'path-to-the-grave', name: 'Path to the Grave', kind: 'action', cost: { resource: 'channel-divinity', amount: 1 }, summary: 'Curse a creature within 30 ft: the next hit on it deals double damage.' }] },
      { id: 'sentinel-at-deaths-door', level: 6, name: "Sentinel at Death's Door", summary: 'Reaction when you or a creature you can see within 30 ft takes a Critical Hit: it becomes a normal hit. Uses = WIS modifier (min 1), back on a long rest.',
        effects: [
          { type: 'resource', id: 'sentinel-at-deaths-door', name: "Sentinel at Death's Door", max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'sentinel-at-deaths-door', name: "Sentinel at Death's Door", kind: 'reaction', cost: { resource: 'sentinel-at-deaths-door', amount: 1 }, summary: 'Turn a Critical Hit within 30 ft into a normal hit.' },
        ] },
      { id: 'grave-potent-spellcasting', level: 8, name: 'Potent Spellcasting (older domain)', summary: oldStrike('Potent Spellcasting (+WIS to cleric cantrip damage)') },
      { id: 'keeper-of-souls', level: 17, name: 'Keeper of Souls', summary: 'Once per turn, when an enemy you can see dies within 60 ft, you or a creature of your choice within 60 ft regains HP equal to the enemy\'s number of Hit Dice (not while you are Incapacitated).' },
    ],
  },
  {
    id: 'order', name: 'Order Domain', source: TCE, expansion: true, summary: 'Voice of law: spells that grant allies attacks, a commanding charm.',
    features: [
      { id: 'order-proficiencies', level: 3, name: 'Bonus Proficiencies', summary: `Training with heavy armor, and proficiency in Intimidation or Persuasion.${moved(1)}${heavyNote}`,
        choices: [{ key: 'skill', label: 'Intimidation or Persuasion', count: 1, kind: 'skill', options: skillOptions(['intimidation', 'persuasion']) }] },
      { id: 'order-domain-spells', level: 3, name: 'Order Domain Spells', summary: `Always prepared: Command, Heroism, Hold Person, Zone of Truth (3); Mass Healing Word, Slow (5); Compulsion, Locate Creature (7); Commune, Dominate Person (9).${moved('1 and 3')}`,
        alwaysPrepared: { 3: ['command', 'heroism', 'hold-person', 'zone-of-truth'], 5: ['mass-healing-word', 'slow'], 7: ['compulsion', 'locate-creature'], 9: ['commune', 'dominate-person'] } },
      { id: 'voice-of-authority', level: 3, name: 'Voice of Authority', summary: `When you cast a spell with a slot that targets an ally, that ally (you pick one if several) can use its reaction right after the spell to make one weapon attack against a creature of your choice that you can see.${moved(1)}`,
        effects: [{ type: 'action', id: 'voice-of-authority', name: 'Voice of Authority', kind: 'free', summary: 'Slot spell on an ally: it can attack a creature you choose with its reaction.' }] },
      { id: 'orders-demand', level: 3, name: "Channel Divinity: Order's Demand", summary: `Action, one Channel Divinity: each creature of your choice within 30 ft that can see or hear you makes a WIS save or is Charmed by you until the end of your next turn or until it takes damage. You can make any of them drop what they hold.${moved(2)}`,
        effects: [{ type: 'action', id: 'orders-demand', name: "Order's Demand", kind: 'action', cost: { resource: 'channel-divinity', amount: 1 }, summary: 'Charm chosen creatures within 30 ft until your next turn; they can drop what they hold.', save: { ability: 'WIS', dc: dc('WIS') } }] },
      { id: 'embodiment-of-the-law', level: 6, name: 'Embodiment of the Law', summary: 'When you cast an Enchantment spell of level 1+ that takes an action, you can cast it as a bonus action instead. Uses = WIS modifier (min 1), back on a long rest.',
        effects: [
          { type: 'resource', id: 'embodiment-of-the-law', name: 'Embodiment of the Law', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'embodiment-of-the-law', name: 'Embodiment of the Law', kind: 'bonus', cost: { resource: 'embodiment-of-the-law', amount: 1 }, summary: 'Cast an action Enchantment spell (level 1+) as a bonus action.' },
        ] },
      { id: 'order-divine-strike', level: 8, name: 'Divine Strike (older domain)', summary: oldStrike('Divine Strike (1d8 psychic, 2d8 at level 14)') },
      { id: 'orders-wrath', level: 17, name: "Order's Wrath", summary: 'Once per turn, when your Divine Strike damages a creature on your turn, curse it until the start of your next turn: the next time an ally hits it, it takes an extra 2d8 psychic and the curse ends. (Needs the Divine Strike option of Blessed Strikes.)',
        effects: [{ type: 'action', id: 'orders-wrath', name: "Order's Wrath", kind: 'free', summary: 'After your Divine Strike: an ally\'s next hit on that creature adds psychic damage.', roll: { label: 'Psychic damage', expr: () => '2d8' } }] },
    ],
  },
  {
    id: 'peace', name: 'Peace Domain', source: TCE, expansion: true, summary: 'Bond-maker: allies roll a bonus d4, take hits for each other, heal on the move.',
    features: [
      { id: 'implement-of-peace', level: 3, name: 'Implement of Peace', summary: `Proficiency in Insight, Performance or Persuasion.${moved(1)}`,
        choices: [{ key: 'skill', label: 'Insight, Performance or Persuasion', count: 1, kind: 'skill', options: skillOptions(['insight', 'performance', 'persuasion']) }] },
      { id: 'peace-domain-spells', level: 3, name: 'Peace Domain Spells', summary: `Always prepared: Heroism, Sanctuary, Aid, Warding Bond (3); Beacon of Hope, Sending (5); Aura of Purity, Resilient Sphere (7); Greater Restoration, Telepathic Bond (9). Aura of Purity is not in this app's spell list: note it by hand.${moved('1 and 3')}`,
        alwaysPrepared: { 3: ['heroism', 'sanctuary', 'aid', 'warding-bond'], 5: ['beacon-of-hope', 'sending'], 7: ['resilient-sphere'], 9: ['greater-restoration', 'telepathic-bond'] } },
      { id: 'emboldening-bond', level: 3, name: 'Emboldening Bond', summary: `Action: bond willing creatures within 30 ft (you can be one), up to your proficiency bonus, for 10 minutes or until you use this again. Once per turn, a bonded creature within 30 ft of another bonded creature can add 1d4 to an attack roll, ability check or saving throw. Uses = proficiency bonus, back on a long rest.${moved(1)}`,
        effects: [
          { type: 'resource', id: 'emboldening-bond', name: 'Emboldening Bond', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'emboldening-bond', name: 'Emboldening Bond', kind: 'action', cost: { resource: 'emboldening-bond', amount: 1 }, summary: (c) => `Bond up to ${c.prof} creatures for 10 minutes: once a turn, +1d4 on an attack, check or save near another bonded one.`, roll: { label: 'Bond die', expr: () => '1d4' } },
        ] },
      { id: 'balm-of-peace', level: 3, name: 'Channel Divinity: Balm of Peace', summary: `Action, one Channel Divinity: move up to your speed without provoking opportunity attacks; each creature of your choice that you pass within 5 ft regains 2d6 + WIS modifier (min 1) HP (once each).${moved(2)}`,
        effects: [{ type: 'action', id: 'balm-of-peace', name: 'Balm of Peace', kind: 'action', cost: { resource: 'channel-divinity', amount: 1 }, heal: true, summary: 'Move your speed without opportunity attacks, healing creatures you pass within 5 ft.', roll: { label: 'Healing (each)', expr: (c) => `2d6+${atLeast1(c.mod.WIS)}`, why: 'Balm of Peace: 2d6 + WIS modifier (min 1).' } }] },
      { id: 'protective-bond', level: 6, name: 'Protective Bond', summary: 'When a bonded creature is about to take damage, another bonded creature within 30 ft (60 ft from level 17) can use its reaction to teleport within 5 ft of it and take all of that damage instead.' },
      { id: 'peace-potent-spellcasting', level: 8, name: 'Potent Spellcasting (older domain)', summary: oldStrike('Potent Spellcasting (+WIS to cleric cantrip damage)') },
      { id: 'expansive-bond', level: 17, name: 'Expansive Bond', summary: 'Emboldening Bond and Protective Bond work at 60 ft, and a creature that takes damage through Protective Bond has resistance to it.' },
    ],
  },
  {
    id: 'twilight', name: 'Twilight Domain', source: TCE, expansion: true, summary: 'Guardian of the night: huge darkvision, a sanctuary of temp HP, flight in the dark.',
    features: [
      { id: 'twilight-proficiencies', level: 3, name: 'Bonus Proficiencies', summary: `Proficiency with martial weapons and training with heavy armor.${moved(1)}${heavyNote}` },
      { id: 'twilight-domain-spells', level: 3, name: 'Twilight Domain Spells', summary: `Always prepared: Faerie Fire, Sleep, Moonbeam, See Invisibility (3); Aura of Vitality, Tiny Hut (5); Aura of Life, Greater Invisibility (7); Circle of Power, Mislead (9). Aura of Vitality and Circle of Power are not in this app's spell list: note them by hand.${moved('1 and 3')}`,
        alwaysPrepared: { 3: ['faerie-fire', 'sleep', 'moonbeam', 'see-invisibility'], 5: ['tiny-hut'], 7: ['aura-of-life', 'greater-invisibility'], 9: ['mislead'] } },
      { id: 'eyes-of-night', level: 3, name: 'Eyes of Night', summary: `Darkvision 300 ft. Action: share it for 1 hour with willing creatures within 10 ft, up to WIS modifier (min 1). Sharing is once per long rest, or spend a spell slot to do it again.${moved(1)}`,
        effects: [
          { type: 'sense', name: 'Darkvision (Eyes of Night)', range: 300 },
          { type: 'resource', id: 'eyes-of-night', name: 'Eyes of Night (share)', max: () => 1, reset: 'long' },
          { type: 'action', id: 'eyes-of-night', name: 'Eyes of Night', kind: 'action', cost: { resource: 'eyes-of-night', amount: 1 }, summary: (c) => `Share 300-ft darkvision with up to ${atLeast1(c.mod.WIS)} creatures within 10 ft for 1 hour (or spend a slot).` },
        ] },
      { id: 'vigilant-blessing', level: 3, name: 'Vigilant Blessing', summary: `Action: one creature (you included) has advantage on its next Initiative roll; ends after that roll or when you use this again.${moved(1)}`,
        effects: [{ type: 'action', id: 'vigilant-blessing', name: 'Vigilant Blessing', kind: 'action', summary: 'A creature has advantage on its next Initiative roll.' }] },
      { id: 'twilight-sanctuary', level: 3, name: 'Channel Divinity: Twilight Sanctuary', summary: `Action, one Channel Divinity: a 30-ft-radius sphere of dim light around you for 1 minute (ends if you are Incapacitated or die). When a creature, you included, ends its turn in it, you can give it 1d6 + cleric level temp HP or end Charmed or Frightened on it.${moved(2)}`,
        effects: [{ type: 'action', id: 'twilight-sanctuary', name: 'Twilight Sanctuary', kind: 'action', cost: { resource: 'channel-divinity', amount: 1 }, summary: (c) => `1 minute, 30-ft sphere: creatures ending a turn in it get temp HP or lose Charmed/Frightened.${c.level >= 17 ? ' You and allies in it have half cover.' : ''}`, roll: { label: 'Temp HP', expr: (c) => `1d6+${c.level}`, why: 'Twilight Sanctuary: 1d6 + your cleric level.' } }] },
      { id: 'steps-of-night', level: 6, name: 'Steps of Night', summary: 'Bonus action while in dim light or darkness: fly speed equal to your speed for 1 minute. Uses = proficiency bonus, back on a long rest.',
        effects: [
          { type: 'resource', id: 'steps-of-night', name: 'Steps of Night', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'steps-of-night', name: 'Steps of Night', kind: 'bonus', cost: { resource: 'steps-of-night', amount: 1 }, summary: 'In dim light or darkness: fly speed for 1 minute.' },
        ] },
      { id: 'twilight-divine-strike', level: 8, name: 'Divine Strike (older domain)', summary: oldStrike('Divine Strike (1d8 radiant, 2d8 at level 14)') },
      { id: 'twilight-shroud', level: 17, name: 'Twilight Shroud', summary: 'You and your allies have half cover while in your Twilight Sanctuary.' },
    ],
  },
  {
    id: 'arcana', name: 'Arcana Domain', source: SCAG, expansion: true, summary: 'Priest of magic: wizard cantrips, banishing otherworldly creatures, ending spells.',
    features: [
      { id: 'arcane-initiate', level: 3, name: 'Arcane Initiate', summary: `Proficiency in Arcana, and two Wizard cantrips that count as Cleric cantrips for you.${moved(1)}`,
        choices: [
          { key: 'skill', label: 'Arcana', count: 1, kind: 'skill', options: skillOptions(['arcana']) },
          { key: 'cantrips', label: 'Two Wizard cantrips', count: 2, kind: 'pick', options: cantripsOf((s) => s.classes.includes('wizard')) },
        ] },
      { id: 'arcana-domain-spells', level: 3, name: 'Arcana Domain Spells', summary: `Always prepared: Detect Magic, Magic Missile, Magic Weapon, Arcanist's Magic Aura (3); Dispel Magic, Magic Circle (5); Arcane Eye, Secret Chest (7); Planar Binding, Teleportation Circle (9).${moved('1 and 3')}`,
        alwaysPrepared: { 3: ['detect-magic', 'magic-missile', 'magic-weapon', 'arcanists-magic-aura'], 5: ['dispel-magic', 'magic-circle'], 7: ['arcane-eye', 'secret-chest'], 9: ['planar-binding', 'teleportation-circle'] } },
      { id: 'arcane-abjuration', level: 3, name: 'Channel Divinity: Arcane Abjuration', summary: `Action, one Channel Divinity: a Celestial, Elemental, Fey or Fiend within 30 ft that can see or hear you makes a WIS save or is turned for 1 minute or until it takes damage (it must move away and can only Dash or Dodge). From level 5, a creature of low enough CR is banished to its home plane for 1 minute instead (CR 1/2 at level 5, 1 at 8, 2 at 11, 3 at 14, 4 at 17; the old Destroy Undead table).${moved(2)}`,
        effects: [{ type: 'action', id: 'arcane-abjuration', name: 'Arcane Abjuration', kind: 'action', cost: { resource: 'channel-divinity', amount: 1 }, summary: (c) => `Turn a Celestial, Elemental, Fey or Fiend within 30 ft for 1 minute.${c.level >= 5 ? ` Banish it instead if CR ${scale([[5, '1/2'], [8, '1'], [11, '2'], [14, '3'], [17, '4']])(c.level)} or lower.` : ''}`, save: { ability: 'WIS', dc: dc('WIS') } }] },
      { id: 'spell-breaker', level: 6, name: 'Spell Breaker', summary: 'When you restore HP to an ally with a spell of level 1+, you can also end one spell on that creature of a level no higher than the slot you used.' },
      { id: 'arcana-potent-spellcasting', level: 8, name: 'Potent Spellcasting (older domain)', summary: oldStrike('Potent Spellcasting (+WIS to cleric cantrip damage)') },
      { id: 'arcane-mastery', level: 17, name: 'Arcane Mastery', summary: 'Pick one Wizard spell each of levels 6, 7, 8 and 9: they are always prepared domain spells for you.',
        choices: [6, 7, 8, 9].map((lvl) => ({ key: `wizard-${lvl}`, label: `Level ${lvl} Wizard spell`, count: 1, kind: 'pick', options: wizardSpells(lvl) })) },
    ],
  },
  {
    id: 'death', name: 'Death Domain', source: "Dungeon Master's Guide 2014", expansion: true, summary: 'Villainous priest of death: double-target necromancy and huge necrotic touches.',
    features: [
      { id: 'death-proficiency', level: 3, name: 'Bonus Proficiency', summary: `Proficiency with martial weapons.${moved(1)}${heavyNote}` },
      { id: 'death-domain-spells', level: 3, name: 'Death Domain Spells', summary: `Always prepared: False Life, Ray of Sickness, Blindness/Deafness, Ray of Enfeeblement (3); Animate Dead, Vampiric Touch (5); Blight, Death Ward (7); Antilife Shell, Cloudkill (9).${moved('1 and 3')}`,
        alwaysPrepared: { 3: ['false-life', 'ray-of-sickness', 'blindness-deafness', 'ray-of-enfeeblement'], 5: ['animate-dead', 'vampiric-touch'], 7: ['blight', 'death-ward'], 9: ['antilife-shell', 'cloudkill'] } },
      { id: 'reaper', level: 3, name: 'Reaper', summary: `Learn one Necromancy cantrip from any class list. A Necromancy cantrip of yours that targets one creature can target two within range that are within 5 ft of each other.${moved(1)}`,
        choices: [{ key: 'cantrip', label: 'Necromancy cantrip', count: 1, kind: 'pick', options: cantripsOf((s) => s.school === 'Necromancy') }] },
      { id: 'touch-of-death', level: 3, name: 'Channel Divinity: Touch of Death', summary: `When you hit a creature with a melee attack, spend one Channel Divinity to deal extra necrotic damage equal to 5 + twice your cleric level.${moved(2)}`,
        effects: [{ type: 'action', id: 'touch-of-death', name: 'Touch of Death', kind: 'free', cost: { resource: 'channel-divinity', amount: 1 }, summary: (c) => `On a melee hit: +${5 + 2 * c.level} necrotic damage.` }] },
      { id: 'inescapable-destruction', level: 6, name: 'Inescapable Destruction', summary: 'Necrotic damage from your cleric spells and Channel Divinity ignores resistance to necrotic damage.' },
      { id: 'death-divine-strike', level: 8, name: 'Divine Strike (older domain)', summary: oldStrike('Divine Strike (1d8 necrotic, 2d8 at level 14)') },
      { id: 'improved-reaper', level: 17, name: 'Improved Reaper', summary: 'A Necromancy spell of level 1 to 5 that targets one creature can target two within range that are within 5 ft of each other (consume material components for each).' },
    ],
  },
  {
    id: 'nature', name: 'Nature Domain', source: PHB14, expansion: true, summary: 'Priest of the wild: druid cantrip, charming beasts and plants, blunting the elements.',
    features: [
      { id: 'acolyte-of-nature', level: 3, name: 'Acolyte of Nature', summary: `One Druid cantrip (counts as a Cleric cantrip) and proficiency in Animal Handling, Nature or Survival.${moved(1)}`,
        choices: [
          { key: 'cantrip', label: 'Druid cantrip', count: 1, kind: 'pick', options: cantripsOf((s) => s.classes.includes('druid')) },
          { key: 'skill', label: 'Animal Handling, Nature or Survival', count: 1, kind: 'skill', options: skillOptions(['animal-handling', 'nature', 'survival']) },
        ] },
      { id: 'nature-proficiency', level: 3, name: 'Bonus Proficiency', summary: `Training with heavy armor.${moved(1)}${heavyNote}` },
      { id: 'nature-domain-spells', level: 3, name: 'Nature Domain Spells', summary: `Always prepared: Animal Friendship, Speak with Animals, Barkskin, Spike Growth (3); Plant Growth, Wind Wall (5); Dominate Beast, Grasping Vine (7); Insect Plague, Tree Stride (9). Grasping Vine is not in this app's spell list: note it by hand.${moved('1 and 3')}`,
        alwaysPrepared: { 3: ['animal-friendship', 'speak-with-animals', 'barkskin', 'spike-growth'], 5: ['plant-growth', 'wind-wall'], 7: ['dominate-beast'], 9: ['insect-plague', 'tree-stride'] } },
      { id: 'charm-animals-and-plants', level: 3, name: 'Channel Divinity: Charm Animals and Plants', summary: `Action, one Channel Divinity: each Beast or Plant creature within 30 ft that can see you makes a WIS save or is Charmed by you for 1 minute or until it takes damage; it is friendly to you and your allies.${moved(2)}`,
        effects: [{ type: 'action', id: 'charm-animals-and-plants', name: 'Charm Animals and Plants', kind: 'action', cost: { resource: 'channel-divinity', amount: 1 }, summary: (c) => `Charm Beasts and Plants within 30 ft for 1 minute.${c.level >= 17 ? ' Bonus action: command them (Master of Nature).' : ''}`, save: { ability: 'WIS', dc: dc('WIS') } }] },
      { id: 'dampen-elements', level: 6, name: 'Dampen Elements', summary: 'Reaction when you or a creature within 30 ft takes acid, cold, fire, lightning or thunder damage: it has resistance to that instance.',
        effects: [{ type: 'action', id: 'dampen-elements', name: 'Dampen Elements', kind: 'reaction', summary: 'Resistance to one instance of acid, cold, fire, lightning or thunder damage within 30 ft.' }] },
      { id: 'nature-divine-strike', level: 8, name: 'Divine Strike (older domain)', summary: oldStrike('Divine Strike (1d8 cold, fire or lightning, 2d8 at level 14)') },
      { id: 'master-of-nature', level: 17, name: 'Master of Nature', summary: 'Bonus action: give spoken commands to creatures Charmed by your Charm Animals and Plants.' },
    ],
  },
  {
    id: 'tempest', name: 'Tempest Domain', source: PHB14, expansion: true, summary: 'Storm priest: heavy armor, lightning reprisals and maximised thunder.',
    features: [
      { id: 'tempest-proficiencies', level: 3, name: 'Bonus Proficiencies', summary: `Proficiency with martial weapons and training with heavy armor.${moved(1)}${heavyNote}` },
      { id: 'tempest-domain-spells', level: 3, name: 'Tempest Domain Spells', summary: `Always prepared: Fog Cloud, Thunderwave, Gust of Wind, Shatter (3); Call Lightning, Sleet Storm (5); Control Water, Ice Storm (7); Destructive Wave, Insect Plague (9). Destructive Wave is not in this app's spell list: note it by hand.${moved('1 and 3')}`,
        alwaysPrepared: { 3: ['fog-cloud', 'thunderwave', 'gust-of-wind', 'shatter'], 5: ['call-lightning', 'sleet-storm'], 7: ['control-water', 'ice-storm'], 9: ['insect-plague'] } },
      { id: 'wrath-of-the-storm', level: 3, name: 'Wrath of the Storm', summary: `Reaction when a creature within 5 ft that you can see hits you with an attack: it makes a DEX save, taking 2d8 lightning or thunder (your pick), half on a success. Uses = WIS modifier (min 1), back on a long rest.${moved(1)}`,
        effects: [
          { type: 'resource', id: 'wrath-of-the-storm', name: 'Wrath of the Storm', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'wrath-of-the-storm', name: 'Wrath of the Storm', kind: 'reaction', cost: { resource: 'wrath-of-the-storm', amount: 1 }, summary: 'An attacker within 5 ft that hit you takes lightning or thunder (half on a save).', roll: { label: 'Lightning or thunder', expr: () => '2d8' }, save: { ability: 'DEX', dc: dc('WIS') } },
        ] },
      { id: 'destructive-wrath', level: 3, name: 'Channel Divinity: Destructive Wrath', summary: `When you roll lightning or thunder damage, spend one Channel Divinity to deal the maximum instead of rolling.${moved(2)}`,
        effects: [{ type: 'action', id: 'destructive-wrath', name: 'Destructive Wrath', kind: 'free', cost: { resource: 'channel-divinity', amount: 1 }, summary: 'Lightning or thunder damage you roll is maximised.' }] },
      { id: 'thunderbolt-strike', level: 6, name: 'Thunderbolt Strike', summary: 'When you deal lightning damage to a Large or smaller creature, you can also push it up to 10 ft away from you.' },
      { id: 'tempest-divine-strike', level: 8, name: 'Divine Strike (older domain)', summary: oldStrike('Divine Strike (1d8 thunder, 2d8 at level 14)') },
      { id: 'stormborn', level: 17, name: 'Stormborn', summary: 'Fly speed equal to your speed whenever you are not underground or indoors.' },
    ],
  },
]

export const EXT_SUBCLASSES_1 = { barbarian, bard, cleric }
