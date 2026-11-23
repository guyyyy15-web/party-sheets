// Official subclasses from the expansion books (and the 2014 Player's Handbook) for the Druid, Fighter and Monk,
// for one gaming group's private use. Summarised in our own words, short and functional; the book wins.
// Same data model as phb-subclasses-2.js. `c.level` is the class level. `expansion: true` lets a group turn them off.
// Older (2014) subclasses follow the 2024 rule: a feature the old subclass gave below level 3 arrives at level 3,
// every other feature at its old level. Ki costs become Focus Points 1:1.
import { SKILLS } from './basics.js'

const XGE = "Xanathar's Guide to Everything"
const TCE = "Tasha's Cauldron of Everything"
const SCAG = "Sword Coast Adventurer's Guide"
const EGW = "Explorer's Guide to Wildemount"
const FTD = "Fizban's Treasury of Dragons"
const PHB14 = "Player's Handbook (2014)"
const HOF = 'Forgotten Realms: Heroes of Faerûn'

const scale = (table) => (lvl) => table.filter(([l]) => lvl >= l).at(-1)?.[1] ?? 0
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)
const atLeast1 = (n) => Math.max(1, n)
const dc = (ab) => (c) => 8 + c.mod[ab] + c.prof
const skillOpts = (ids) => () => SKILLS.filter((s) => ids.includes(s.id)).map((s) => ({ id: s.id, name: s.name }))
const ws = (n = 1) => ({ resource: 'wild-shape', amount: n })
const focus = (n = 1) => ({ resource: 'focus', amount: n })

// ---------------------------------------------------------------- Druid (subclass features at 3, 6, 10, 14)

const halo = scale([[3, '1d4'], [6, '1d6'], [10, '1d8'], [14, '1d10']])

const DRUID_SUBS = [
  {
    id: 'dreams', name: 'Circle of Dreams', source: XGE, expansion: true, summary: 'Feywild healer: a pool of healing dice, safe camps and short teleports.',
    features: [
      { id: 'balm-of-the-summer-court', level: 3, name: 'Balm of the Summer Court', summary: 'A pool of d6s equal to your druid level, back on a long rest. Bonus action: an ally you can see within 120 ft; spend up to half your druid level (round down) in dice. It heals the total and gains 1 temp HP per die spent. (Level 2 in the old book.)',
        effects: [
          { type: 'resource', id: 'balm-dice', name: 'Balm of the Summer Court (d6s)', max: (c) => c.level, reset: 'long' },
          { type: 'action', id: 'balm-of-the-summer-court', name: 'Balm of the Summer Court', kind: 'bonus', summary: (c) => `Spend up to ${Math.floor(c.level / 2)} dice from the pool (tick them off): heal that many d6, +1 temp HP per die.`,
            roll: { label: 'Healing (all dice)', expr: (c) => `${atLeast1(Math.floor(c.level / 2))}d6`, why: 'Balm of the Summer Court: up to half your druid level in d6s; roll fewer if you spend fewer.' } },
        ] },
      { id: 'hearth-of-moonlight-and-shadow', level: 6, name: 'Hearth of Moonlight and Shadow', summary: 'At the start of a short or long rest, a 30-ft-radius sphere around a point you touch: you and allies inside get +5 to Stealth and Perception checks, and open-flame light inside is not visible from outside. Ends when the rest ends or you leave.' },
      { id: 'hidden-paths', level: 10, name: 'Hidden Paths', summary: 'Bonus action: teleport up to 60 ft to a space you can see. Or an action: teleport a willing creature you touch up to 30 ft. Uses = WIS modifier (min 1), back on a long rest.',
        effects: [
          { type: 'resource', id: 'hidden-paths', name: 'Hidden Paths', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'hidden-paths', name: 'Hidden Paths', kind: 'bonus', cost: { resource: 'hidden-paths', amount: 1 }, summary: 'Teleport yourself 60 ft (bonus action), or a willing creature you touch 30 ft (action).' },
        ] },
      { id: 'walker-in-dreams', level: 14, name: 'Walker in Dreams', summary: 'After a short rest, cast Dream (you are the messenger), Scrying or Teleportation Circle without a slot or material components. The circle leads to where you last finished a long rest on this plane (if none, it fails and the use is kept). Once per long rest.',
        effects: [
          { type: 'resource', id: 'walker-in-dreams', name: 'Walker in Dreams', max: () => 1, reset: 'long' },
          { type: 'action', id: 'walker-in-dreams', name: 'Walker in Dreams', kind: 'action', cost: { resource: 'walker-in-dreams', amount: 1 }, summary: 'After a short rest: Dream, Scrying or Teleportation Circle, no slot, no materials.' },
        ] },
    ],
  },
  {
    id: 'shepherd', name: 'Circle of the Shepherd', source: XGE, expansion: true, summary: 'Summoner: a spirit totem aura, tougher summoned beasts and fey.',
    features: [
      { id: 'speech-of-the-woods', level: 3, name: 'Speech of the Woods', summary: 'You know Sylvan. Beasts understand what you say, and you can read their sounds and movements. (Level 2 in the old book.)' },
      { id: 'spirit-totem', level: 3, name: 'Spirit Totem', summary: 'Bonus action: a spirit at a point within 60 ft makes a 30-ft-radius aura for 1 minute (bonus action to move it 60 ft). Once per short or long rest. Bear: creatures you choose in it gain 5 + druid level temp HP when it appears; you and allies have advantage on STR checks and saves in it. Hawk: reaction to give advantage to an attack against a target in it; advantage on Perception in it. Unicorn: advantage on checks to detect creatures in it; when you heal with a slot spell, creatures you choose in it regain HP = druid level. (Level 2 in the old book.)',
        effects: [
          { type: 'resource', id: 'spirit-totem', name: 'Spirit Totem', max: () => 1, reset: 'short' },
          { type: 'action', id: 'spirit-totem', name: 'Spirit Totem', kind: 'bonus', cost: { resource: 'spirit-totem', amount: 1 }, summary: (c) => `30-ft aura for 1 minute. Bear: ${5 + c.level} temp HP each. Hawk: reaction advantage. Unicorn: +${c.level} HP to each when you heal with a slot.` },
        ] },
      { id: 'mighty-summoner', level: 6, name: 'Mighty Summoner', summary: 'Beasts and fey you summon or create with a spell get 2 extra HP per Hit Die, and their natural weapons count as magical.' },
      { id: 'guardian-spirit', level: 10, name: 'Guardian Spirit', summary: 'A beast or fey you summoned or created with a spell that ends its turn in your Spirit Totem aura regains HP equal to half your druid level.' },
      { id: 'faithful-summons', level: 14, name: 'Faithful Summons', summary: 'When you drop to 0 HP or are Incapacitated against your will: four beasts of CR 2 or lower appear within 20 ft (as Conjure Animals at level 9) and defend you for 1 hour, no Concentration. Once per long rest.',
        effects: [{ type: 'resource', id: 'faithful-summons', name: 'Faithful Summons', max: () => 1, reset: 'long' }] },
    ],
  },
  {
    id: 'spores', name: 'Circle of Spores', source: TCE, expansion: true, summary: 'Fungal druid: a necrotic halo, a symbiotic armour of temp HP, zombies.',
    features: [
      { id: 'spores-circle-spells', level: 3, name: 'Circle Spells', summary: 'Always prepared: Chill Touch, Blindness/Deafness, Gentle Repose; Animate Dead, Gaseous Form (5); Blight, Confusion (7); Cloudkill, Contagion (9). (Chill Touch was level 2 in the old book.)',
        alwaysPrepared: { 3: ['chill-touch', 'blindness-deafness', 'gentle-repose'], 5: ['animate-dead', 'gaseous-form'], 7: ['blight', 'confusion'], 9: ['cloudkill', 'contagion'] } },
      { id: 'halo-of-spores', level: 3, name: 'Halo of Spores', summary: 'Reaction when a creature you can see moves into a space within 10 ft of you or starts its turn there: CON save or necrotic damage, 1d4 (1d6 at 6, 1d8 at 10, 1d10 at 14). (Level 2 in the old book.)',
        effects: [{ type: 'action', id: 'halo-of-spores', name: 'Halo of Spores', kind: 'reaction', summary: (c) => `A creature within 10 ft: CON save or necrotic damage.${c.level >= 10 ? ' Not while Spreading Spores is out.' : ''}`,
          roll: { label: 'Necrotic damage', expr: (c) => halo(c.level), why: 'Halo of Spores: 1d4, 1d6 at druid level 6, 1d8 at 10, 1d10 at 14. Roll the die twice while Symbiotic Entity is active.' }, save: { ability: 'CON', dc: dc('WIS') } }] },
      { id: 'symbiotic-entity', level: 3, name: 'Symbiotic Entity', summary: 'Action, one Wild Shape use: gain 4 temp HP per druid level. For 10 minutes, until those temp HP are gone or you Wild Shape again: Halo of Spores rolls its die twice and adds them, and your melee weapon hits deal an extra 1d6 necrotic. (Level 2 in the old book.)',
        effects: [
          { type: 'action', id: 'symbiotic-entity', name: 'Symbiotic Entity', kind: 'action', cost: ws(), summary: (c) => `Gain ${4 * c.level} temp HP; doubled halo and +1d6 necrotic on melee weapon hits for 10 minutes.` },
          { type: 'action', id: 'symbiotic-strike', name: 'Symbiotic Entity: melee hit', kind: 'free', summary: 'While active, each melee weapon hit.', roll: { label: 'Necrotic damage', expr: () => '1d6', why: 'Symbiotic Entity: +1d6 necrotic on a melee weapon hit.' } },
        ] },
      { id: 'fungal-infestation', level: 6, name: 'Fungal Infestation', summary: 'Reaction when a Small or Medium beast or humanoid dies within 10 ft: it rises as a zombie with 1 HP, obeys your mental commands, acts right after you and can only make one melee attack (Attack action). It collapses after 1 hour. Uses = WIS modifier (min 1), back on a long rest.',
        effects: [
          { type: 'resource', id: 'fungal-infestation', name: 'Fungal Infestation', max: (c) => atLeast1(c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'fungal-infestation', name: 'Fungal Infestation', kind: 'reaction', cost: { resource: 'fungal-infestation', amount: 1 }, summary: 'A Small/Medium beast or humanoid dies within 10 ft: it becomes a 1-HP zombie for 1 hour.' },
        ] },
      { id: 'spreading-spores', level: 10, name: 'Spreading Spores', summary: 'Bonus action while Symbiotic Entity is active: a 10-ft cube of spores within 30 ft for 1 minute (ends if you use it again, dismiss it as a bonus action, or the entity ends). A creature that enters it or starts its turn there makes a CON save or takes your Halo of Spores damage (once per turn). While it lasts you cannot use the Halo of Spores reaction.',
        effects: [{ type: 'action', id: 'spreading-spores', name: 'Spreading Spores', kind: 'bonus', summary: '10-ft cube within 30 ft, 1 minute; Halo damage to creatures in it.',
          roll: { label: 'Necrotic damage', expr: (c) => halo(c.level), why: 'Spreading Spores: your Halo of Spores damage (rolled twice while Symbiotic Entity is active).' }, save: { ability: 'CON', dc: dc('WIS') } }] },
      { id: 'fungal-body', level: 14, name: 'Fungal Body', summary: 'You cannot be Blinded, Deafened, Frightened or Poisoned, and critical hits against you count as normal hits unless you are Incapacitated.' },
    ],
  },
  {
    id: 'wildfire', name: 'Circle of Wildfire', source: TCE, expansion: true, summary: 'Fire and renewal: a wildfire spirit companion, burning and healing magic.',
    features: [
      { id: 'wildfire-circle-spells', level: 3, name: 'Circle Spells', summary: 'Always prepared: Burning Hands, Cure Wounds, Flaming Sphere, Scorching Ray; Plant Growth, Revivify (5); Aura of Life, Fire Shield (7); Flame Strike, Mass Cure Wounds (9). (Burning Hands and Cure Wounds were level 2 in the old book.)',
        alwaysPrepared: { 3: ['burning-hands', 'cure-wounds', 'flaming-sphere', 'scorching-ray'], 5: ['plant-growth', 'revivify'], 7: ['aura-of-life', 'fire-shield'], 9: ['flame-strike', 'mass-cure-wounds'] } },
      { id: 'summon-wildfire-spirit', level: 3, name: 'Summon Wildfire Spirit', summary: 'Action, one Wild Shape use: a Small elemental spirit appears within 30 ft; creatures within 10 ft of it (not you) make a DEX save or take 2d6 fire. It stays 1 hour, until 0 HP, until you summon it again or you die. AC 13, HP 5 + 5 x druid level, speed 30 ft, fly 30 ft (hover), immune to fire and to Charmed, Frightened, Grappled, Prone and Restrained. It acts after you and only Dodges unless you command it (bonus action): Flame Seed (ranged spell attack, 60 ft, 1d6 + prof fire) or Fiery Teleportation (it and willing creatures within 5 ft teleport 15 ft; creatures within 5 ft of where it was make a DEX save or take 1d6 + prof fire). (Level 2 in the old book.)',
        effects: [
          { type: 'action', id: 'summon-wildfire-spirit', name: 'Summon Wildfire Spirit', kind: 'action', cost: ws(), summary: (c) => `Spirit with ${5 + 5 * c.level} HP, AC 13. Creatures within 10 ft of it: DEX save or fire damage.`,
            roll: { label: 'Fire damage', expr: () => '2d6', why: 'Summon Wildfire Spirit: 2d6 fire on arrival (DEX save negates).' }, save: { ability: 'DEX', dc: dc('WIS') } },
          { type: 'action', id: 'flame-seed', name: 'Wildfire Spirit: Flame Seed', kind: 'bonus', summary: 'Command the spirit: ranged spell attack, 60 ft (your spell attack bonus).',
            roll: { label: 'Fire damage', expr: (c) => `1d6+${c.prof}`, why: 'Flame Seed: 1d6 + your proficiency bonus.' } },
          { type: 'action', id: 'fiery-teleportation', name: 'Wildfire Spirit: Fiery Teleportation', kind: 'bonus', summary: 'Command the spirit: it and willing creatures within 5 ft teleport 15 ft; creatures near where it was save or burn.',
            roll: { label: 'Fire damage', expr: (c) => `1d6+${c.prof}`, why: 'Fiery Teleportation: 1d6 + your proficiency bonus (DEX save negates).' }, save: { ability: 'DEX', dc: dc('WIS') } },
        ] },
      { id: 'enhanced-bond', level: 6, name: 'Enhanced Bond', summary: 'While the spirit is summoned: a spell of yours that deals fire damage or heals adds 1d8 to one damage or healing roll, and a spell with a range other than Self can start from you or the spirit.',
        effects: [{ type: 'action', id: 'enhanced-bond', name: 'Enhanced Bond', kind: 'free', summary: 'Fire or healing spell while the spirit is out: add to one roll.', roll: { label: 'Add', expr: () => '1d8', why: 'Enhanced Bond: +1d8 to one fire damage or healing roll.' } }] },
      { id: 'cauterizing-flames', level: 10, name: 'Cauterizing Flames', summary: 'When a Small or larger creature dies within 30 ft of you or the spirit, a harmless flame fills its space for 1 minute. Reaction when a creature you can see enters it: put it out to heal that creature or deal it fire damage, 2d10 + WIS. Uses = proficiency bonus, back on a long rest.',
        effects: [
          { type: 'resource', id: 'cauterizing-flames', name: 'Cauterizing Flames', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'cauterizing-flames', name: 'Cauterizing Flames', kind: 'reaction', cost: { resource: 'cauterizing-flames', amount: 1 }, summary: 'A creature enters a spectral flame: heal it or burn it.',
            roll: { label: 'Heal or fire damage', expr: (c) => `2d10${signed(c.mod.WIS)}`, why: 'Cauterizing Flames: 2d10 + WIS.' } },
        ] },
      { id: 'blazing-revival', level: 14, name: 'Blazing Revival', summary: 'When you drop to 0 HP with the spirit within 120 ft, it drops to 0 HP instead and you regain half your HP maximum and stand up. Once per long rest.',
        effects: [
          { type: 'resource', id: 'blazing-revival', name: 'Blazing Revival', max: () => 1, reset: 'long' },
          { type: 'action', id: 'blazing-revival', name: 'Blazing Revival', kind: 'free', cost: { resource: 'blazing-revival', amount: 1 }, summary: 'At 0 HP: the spirit falls instead; regain half your HP maximum and stand up.' },
        ] },
    ],
  },
]

// ---------------------------------------------------------------- Fighter (subclass features at 3, 7, 10, 15, 18)

// Arcane Archer: [id, name, summary, damage at 3 / at 18 (null = none), save ability or null]
const ARCANE_SHOTS = [
  ['banishing', 'Banishing Arrow', 'CHA save or the target is banished to the Feywild (speed 0, Incapacitated) until the end of its next turn. From level 18 it also takes 2d6 force.', (c) => (c.level >= 18 ? '2d6' : null), 'CHA', 'Force damage'],
  ['beguiling', 'Beguiling Arrow', '+2d6 psychic (4d6 at 18). Pick an ally within 30 ft of the target: WIS save or the target is Charmed by that ally until the start of your next turn (ends if the ally harms it).', (c) => (c.level >= 18 ? '4d6' : '2d6'), 'WIS', 'Psychic damage'],
  ['bursting', 'Bursting Arrow', 'The target and each creature within 10 ft of it take 2d6 force (4d6 at 18). No save.', (c) => (c.level >= 18 ? '4d6' : '2d6'), null, 'Force damage'],
  ['enfeebling', 'Enfeebling Arrow', '+2d6 necrotic (4d6 at 18). CON save or its weapon attacks deal half damage until the start of your next turn.', (c) => (c.level >= 18 ? '4d6' : '2d6'), 'CON', 'Necrotic damage'],
  ['grasping', 'Grasping Arrow', '+2d6 poison (4d6 at 18). For 1 minute its speed drops by 10 ft and it takes 2d6 slashing (4d6 at 18) the first time each turn it moves 1+ ft without teleporting. An action and a STR (Athletics) check against your DC pulls the brambles off.', (c) => (c.level >= 18 ? '4d6' : '2d6'), null, 'Poison damage'],
  ['piercing', 'Piercing Arrow', 'No attack roll: the arrow flies in a 1-ft-wide, 30-ft line through objects and cover. Each creature in it makes a DEX save: arrow damage + 1d6 piercing (2d6 at 18), half on a success.', (c) => (c.level >= 18 ? '2d6' : '1d6'), 'DEX', 'Extra piercing (plus the arrow)'],
  ['seeking', 'Seeking Arrow', 'No attack roll: target a creature you have seen in the last minute; the arrow ignores half and three-quarters cover. DEX save: arrow damage + 1d6 force (2d6 at 18) and you learn where it is; half damage on a success.', (c) => (c.level >= 18 ? '2d6' : '1d6'), 'DEX', 'Extra force (plus the arrow)'],
  ['shadow', 'Shadow Arrow', '+2d6 psychic (4d6 at 18). WIS save or it cannot see farther than 5 ft until the start of your next turn.', (c) => (c.level >= 18 ? '4d6' : '2d6'), 'WIS', 'Psychic damage'],
]
const arcaneShotDc = dc('INT')
const arcaneShotOptions = (c) => ARCANE_SHOTS.map(([id, name, summary, dmg, save, label]) => ({
  id: `as-${id}`, name, summary,
  effects: [{
    type: 'action', id: `as-${id}`, name, kind: 'free', cost: { resource: 'arcane-shot', amount: 1 }, summary,
    ...(dmg(c ?? { level: 1 }) ? { roll: { label, expr: (cc) => dmg(cc) || '1d6', why: `${name}: the dice grow at fighter level 18.` } } : {}),
    ...(save ? { save: { ability: save, dc: arcaneShotDc } } : {}),
  }],
}))

// Rune Knight: [id, name, min level, passive, invoked, action kind, roll, save]
const RUNES = [
  ['cloud', 'Cloud Rune', 3, 'Advantage on Sleight of Hand and Deception checks.', 'Reaction when you or a creature you can see within 30 ft is hit: the attack hits another creature within 30 ft (not the attacker) instead, with the same roll.', 'reaction'],
  ['fire', 'Fire Rune', 3, 'Your proficiency bonus is doubled for checks with tools you are proficient in.', 'When you hit with a weapon: +2d6 fire, and STR save or Restrained for 1 minute, taking 2d6 fire at the start of each of its turns (save again at the end of each turn).', 'free', { label: 'Fire damage', expr: () => '2d6' }, 'STR'],
  ['frost', 'Frost Rune', 3, 'Advantage on Animal Handling and Intimidation checks.', 'Bonus action: +2 to STR and CON checks and saves for 10 minutes.', 'bonus'],
  ['stone', 'Stone Rune', 3, 'Advantage on Insight checks; Darkvision 120 ft.', 'Reaction when a creature you can see ends its turn within 30 ft: WIS save or Charmed for 1 minute (speed 0, Incapacitated); it saves again at the end of each of its turns.', 'reaction', null, 'WIS'],
  ['hill', 'Hill Rune', 7, 'Advantage on saves against being Poisoned; resistance to poison damage.', 'Bonus action: resistance to bludgeoning, piercing and slashing damage for 1 minute.', 'bonus'],
  ['storm', 'Storm Rune', 7, 'Advantage on Arcana checks; you cannot be surprised while not Incapacitated.', 'Bonus action: for 1 minute, as a reaction, give advantage or disadvantage to an attack, save or check by you or a creature you can see within 60 ft.', 'bonus'],
]
const runeDc = dc('CON')
const runeOptions = (c) => RUNES.filter(([, , lvl]) => (c?.level ?? 20) >= lvl).map(([id, name, lvl, passive, invoked, kind, roll, save]) => ({
  id: `rune-${id}`, name, summary: `${lvl > 3 ? `Fighter level ${lvl}+. ` : ''}Passive: ${passive} Invoke (once per short or long rest, twice from level 15): ${invoked}`,
  effects: [
    { type: 'resource', id: `rune-${id}`, name: `${name} (invoke)`, max: (cc) => (cc.level >= 15 ? 2 : 1), reset: 'short' },
    { type: 'action', id: `rune-${id}`, name, kind, cost: { resource: `rune-${id}`, amount: 1 }, summary: invoked,
      ...(roll ? { roll: { ...roll, why: `${name}: 2d6 fire on the hit and at the start of each of its turns while Restrained.` } } : {}),
      ...(save ? { save: { ability: save, dc: runeDc } } : {}) },
    ...(id === 'stone' ? [{ type: 'sense', name: 'Darkvision', range: 120 }] : []),
    ...(id === 'hill' ? [{ type: 'resist', damage: 'poison' }] : []),
  ],
}))
const giantsMightDie = scale([[3, 'd6'], [10, 'd8'], [18, 'd10']])

const FIGHTER_SUBS = [
  {
    id: 'arcane-archer', name: 'Arcane Archer', source: XGE, expansion: true, summary: 'Elven archery magic: arrows that banish, burst, seek and curve.',
    features: [
      { id: 'arcane-archer-lore', level: 3, name: 'Arcane Archer Lore', summary: 'Proficiency in Arcana or Nature, and the Prestidigitation or Druidcraft cantrip.',
        choices: [{ key: 'skill', label: 'Arcane Archer Lore skill', count: 1, kind: 'skill', options: skillOpts(['arcana', 'nature']) }] },
      { id: 'arcane-shot', level: 3, name: 'Arcane Shot', summary: 'Once a turn, when you shoot an arrow from a Shortbow or Longbow as part of the Attack action, apply one Arcane Shot option you know (on a hit, unless the option has no attack roll). 2 uses, back on a short or long rest. You know 2 options, 1 more at 7, 10, 15 and 18; the options get stronger at 18. Save DC = 8 + prof + INT.',
        effects: [
          { type: 'resource', id: 'arcane-shot', name: 'Arcane Shot', max: () => 2, reset: 'short' },
          { type: 'note', save: { label: 'Arcane Shot save DC (8 + prof + INT):', dc: arcaneShotDc } },
        ],
        choices: [{ key: 'shots', label: 'Arcane Shot options', count: (c) => scale([[3, 2], [7, 3], [10, 4], [15, 5], [18, 6]])(c.level), kind: 'pick', options: arcaneShotOptions }] },
      { id: 'magic-arrow', level: 7, name: 'Magic Arrow', summary: 'A nonmagical arrow you shoot from a Shortbow or Longbow can count as magical for that shot.' },
      { id: 'curving-shot', level: 7, name: 'Curving Shot', summary: 'Bonus action when an attack with a magic arrow misses: reroll it against a different target within 60 ft of the first.',
        effects: [{ type: 'action', id: 'curving-shot', name: 'Curving Shot', kind: 'bonus', summary: 'After a miss with a magic arrow: reroll against another target within 60 ft.' }] },
      { id: 'ever-ready-shot', level: 15, name: 'Ever-Ready Shot', summary: 'When you roll initiative with no Arcane Shot uses left, regain one.' },
    ],
  },
  {
    id: 'cavalier', name: 'Cavalier', source: XGE, expansion: true, summary: 'Mounted defender: marks foes, wards allies, holds the line.',
    features: [
      { id: 'cavalier-proficiency', level: 3, name: 'Bonus Proficiency', summary: 'Proficiency in one of Animal Handling, History, Insight, Performance or Persuasion, or one language instead.',
        choices: [{ key: 'skill', label: 'Cavalier skill', count: 1, kind: 'skill', options: skillOpts(['animal-handling', 'history', 'insight', 'performance', 'persuasion']) }] },
      { id: 'born-to-the-saddle', level: 3, name: 'Born to the Saddle', summary: 'Advantage on saves against falling off your mount. Falling off 10 ft or less, you land on your feet if not Incapacitated. Mounting or dismounting costs only 5 ft of movement.' },
      { id: 'unwavering-mark', level: 3, name: 'Unwavering Mark', summary: 'A creature you hit with a melee weapon is marked until the end of your next turn. While within 5 ft of you it has disadvantage on attacks against anyone else. If it damages anyone but you, on your next turn you can make a bonus action melee weapon attack against it with advantage, adding half your fighter level to the damage. Bonus attacks = STR modifier (min 1), back on a long rest.',
        effects: [
          { type: 'resource', id: 'unwavering-mark', name: 'Unwavering Mark attack', max: (c) => atLeast1(c.mod.STR), reset: 'long' },
          { type: 'action', id: 'unwavering-mark', name: 'Unwavering Mark attack', kind: 'bonus', cost: { resource: 'unwavering-mark', amount: 1 }, summary: (c) => `Melee weapon attack with advantage on your marked foe; +${Math.floor(c.level / 2)} damage on a hit.` },
        ] },
      { id: 'warding-maneuver', level: 7, name: 'Warding Maneuver', summary: 'Reaction when you or a creature you can see within 5 ft is hit (you wield a melee weapon or shield): add 1d8 to its AC against that attack; if it still hits, the target has resistance to its damage. Uses = CON modifier (min 1), back on a long rest.',
        effects: [
          { type: 'resource', id: 'warding-maneuver', name: 'Warding Maneuver', max: (c) => atLeast1(c.mod.CON), reset: 'long' },
          { type: 'action', id: 'warding-maneuver', name: 'Warding Maneuver', kind: 'reaction', cost: { resource: 'warding-maneuver', amount: 1 }, summary: 'Add to AC against one attack; resistance if it still hits.', roll: { label: 'AC bonus', expr: () => '1d8', why: 'Warding Maneuver: +1d8 AC against that attack.' } },
        ] },
      { id: 'hold-the-line', level: 10, name: 'Hold the Line', summary: 'A creature provokes an opportunity attack from you when it moves 5+ ft while within your reach. If you hit it, its speed is 0 for the rest of the turn.' },
      { id: 'ferocious-charger', level: 15, name: 'Ferocious Charger', summary: 'Once a turn, if you move 10+ ft in a straight line toward a creature and then hit it: STR save (DC 8 + prof + STR) or Prone.',
        effects: [{ type: 'note', save: { label: 'Ferocious Charger (STR save, 8 + prof + STR):', dc: dc('STR') } }] },
      { id: 'vigilant-defender', level: 18, name: 'Vigilant Defender', summary: 'Once on every other creature\'s turn you get a special reaction used only for an opportunity attack (not on your own turn).' },
    ],
  },
  {
    id: 'samurai', name: 'Samurai', source: XGE, expansion: true, summary: 'Resolute warrior: bursts of fighting spirit, a courtier\'s poise.',
    features: [
      { id: 'samurai-proficiency', level: 3, name: 'Bonus Proficiency', summary: 'Proficiency in one of History, Insight, Performance or Persuasion, or one language instead.',
        choices: [{ key: 'skill', label: 'Samurai skill', count: 1, kind: 'skill', options: skillOpts(['history', 'insight', 'performance', 'persuasion']) }] },
      { id: 'fighting-spirit', level: 3, name: 'Fighting Spirit', summary: 'Bonus action: advantage on weapon attack rolls until the end of the turn, and 5 temp HP (10 at 10, 15 at 15). 3 uses, back on a long rest.',
        effects: [
          { type: 'resource', id: 'fighting-spirit', name: 'Fighting Spirit', max: () => 3, reset: 'long' },
          { type: 'action', id: 'fighting-spirit', name: 'Fighting Spirit', kind: 'bonus', cost: { resource: 'fighting-spirit', amount: 1 }, summary: (c) => `Advantage on weapon attacks this turn and ${scale([[3, 5], [10, 10], [15, 15]])(c.level)} temp HP.` },
        ] },
      { id: 'elegant-courtier', level: 7, name: 'Elegant Courtier', summary: 'Add your WIS modifier to Persuasion checks. Proficiency in WIS saves (if you have it, INT or CHA instead).',
        effects: [{ type: 'prof', saves: ['WIS'] }] },
      { id: 'tireless-spirit', level: 10, name: 'Tireless Spirit', summary: 'When you roll initiative with no Fighting Spirit uses left, regain one.' },
      { id: 'rapid-strike', level: 15, name: 'Rapid Strike', summary: 'Once a turn during the Attack action, give up advantage on one attack to make one extra weapon attack against that target.' },
      { id: 'strength-before-death', level: 18, name: 'Strength before Death', summary: 'Reaction when damage drops you to 0 HP without killing you: take an extra turn right away before falling unconscious. Damage during it causes death save failures as usual. Once per long rest.',
        effects: [
          { type: 'resource', id: 'strength-before-death', name: 'Strength before Death', max: () => 1, reset: 'long' },
          { type: 'action', id: 'strength-before-death', name: 'Strength before Death', kind: 'reaction', cost: { resource: 'strength-before-death', amount: 1 }, summary: 'Dropped to 0 HP: take one extra turn now.' },
        ] },
    ],
  },
  {
    id: 'rune-knight', name: 'Rune Knight', source: TCE, expansion: true, summary: 'Giant magic: runes on your gear, growing to Large size.',
    features: [
      { id: 'rune-knight-proficiencies', level: 3, name: 'Bonus Proficiencies', summary: "Proficiency with Smith's Tools, and you learn Giant." },
      { id: 'rune-carver', level: 3, name: 'Rune Carver', summary: 'You know 2 runes (3 at 7, 4 at 10, 5 at 15; Hill and Storm need level 7), carved on gear after a long rest. Each gives a passive benefit while carved, and can be invoked once per short or long rest (twice from 15). Save DC = 8 + prof + CON. Swap one rune when you gain a fighter level.',
        effects: [{ type: 'note', save: { label: 'Rune save DC (8 + prof + CON):', dc: runeDc } }],
        choices: [{ key: 'runes', label: 'Runes', count: (c) => scale([[3, 2], [7, 3], [10, 4], [15, 5]])(c.level), kind: 'pick', options: runeOptions }] },
      { id: 'giants-might', level: 3, name: "Giant's Might", summary: "Bonus action for 1 minute: become Large (if there's room), advantage on STR checks and saves, and once a turn one weapon or Unarmed Strike hit deals an extra 1d6 (1d8 at 10, 1d10 at 18). Uses = proficiency bonus, back on a long rest.",
        effects: [
          { type: 'resource', id: 'giants-might', name: "Giant's Might", max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'giants-might', name: "Giant's Might", kind: 'bonus', cost: { resource: 'giants-might', amount: 1 }, summary: (c) => `1 minute: ${c.level >= 18 ? 'Large or Huge (+5 ft reach when Huge)' : 'Large'}, advantage on STR checks and saves.` },
          { type: 'action', id: 'giants-might-hit', name: "Giant's Might: extra damage", kind: 'free', summary: "While Giant's Might lasts, once a turn on a weapon or Unarmed Strike hit.", roll: { label: 'Extra damage', expr: (c) => `1${giantsMightDie(c.level)}`, why: "Giant's Might: 1d6, 1d8 at fighter level 10, 1d10 at 18." } },
        ] },
      { id: 'runic-shield', level: 7, name: 'Runic Shield', summary: 'Reaction when a creature you can see within 60 ft is hit by an attack roll: the attacker rerolls the d20 and must use the new roll. Uses = proficiency bonus, back on a long rest.',
        effects: [
          { type: 'resource', id: 'runic-shield', name: 'Runic Shield', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'runic-shield', name: 'Runic Shield', kind: 'reaction', cost: { resource: 'runic-shield', amount: 1 }, summary: 'An ally within 60 ft is hit: the attacker rerolls.' },
        ] },
      { id: 'great-stature', level: 10, name: 'Great Stature', summary: "You grow 3d4 inches taller (once). Giant's Might extra damage becomes 1d8." },
      { id: 'master-of-runes', level: 15, name: 'Master of Runes', summary: 'Invoke each rune twice per short or long rest.' },
      { id: 'runic-juggernaut', level: 18, name: 'Runic Juggernaut', summary: "Giant's Might extra damage becomes 1d10, and it can make you Huge; while Huge, your reach is 5 ft longer." },
    ],
  },
  {
    id: 'echo-knight', name: 'Echo Knight', source: EGW, expansion: true, summary: 'Fights beside a shadowy echo of itself: strike from two places, swap.',
    features: [
      { id: 'manifest-echo', level: 3, name: 'Manifest Echo', summary: 'Bonus action: an echo of you appears within 15 ft. AC 14 + prof, 1 HP, immune to all conditions, uses your save bonuses. It lasts until destroyed, dismissed (bonus action), replaced, or you are Incapacitated; it is destroyed if more than 30 ft from you at the end of your turn. On your turn move it up to 30 ft (no action). Bonus action: swap places with it (costs 15 ft of movement). Any attack of your Attack action can come from its space. Opportunity attacks can come from it too.',
        effects: [
          { type: 'action', id: 'manifest-echo', name: 'Manifest Echo', kind: 'bonus', summary: (c) => `Echo within 15 ft: AC ${14 + c.prof}, 1 HP. Bonus action to swap places (15 ft of movement).` },
          { type: 'note', save: { label: 'Echo AC (14 + prof):', dc: (c) => 14 + c.prof } },
        ] },
      { id: 'unleash-incarnation', level: 3, name: 'Unleash Incarnation', summary: 'When you take the Attack action, make one extra melee attack from the echo\'s space. Uses = CON modifier (min 1), back on a long rest.',
        effects: [
          { type: 'resource', id: 'unleash-incarnation', name: 'Unleash Incarnation', max: (c) => atLeast1(c.mod.CON), reset: 'long' },
          { type: 'action', id: 'unleash-incarnation', name: 'Unleash Incarnation', kind: 'free', cost: { resource: 'unleash-incarnation', amount: 1 }, summary: 'One extra melee attack from the echo during the Attack action.' },
        ] },
      { id: 'echo-avatar', level: 7, name: 'Echo Avatar', summary: 'Action: see and hear through the echo for up to 10 minutes (you are Blinded and Deafened meanwhile). It can then be up to 1,000 ft away without being destroyed.',
        effects: [{ type: 'action', id: 'echo-avatar', name: 'Echo Avatar', kind: 'action', summary: 'Sense through the echo up to 10 minutes; it can roam 1,000 ft.' }] },
      { id: 'shadow-martyr', level: 10, name: 'Shadow Martyr', summary: 'Reaction before a creature makes an attack roll against another creature you can see: teleport the echo within 5 ft of the target; the attack targets the echo instead. Once per short or long rest.',
        effects: [
          { type: 'resource', id: 'shadow-martyr', name: 'Shadow Martyr', max: () => 1, reset: 'short' },
          { type: 'action', id: 'shadow-martyr', name: 'Shadow Martyr', kind: 'reaction', cost: { resource: 'shadow-martyr', amount: 1 }, summary: 'The echo takes an attack aimed at an ally.' },
        ] },
      { id: 'reclaim-potential', level: 15, name: 'Reclaim Potential', summary: 'When an echo is destroyed by damage and you have no temp HP, gain 2d6 + CON temp HP. Uses = CON modifier (min 1), back on a long rest.',
        effects: [
          { type: 'resource', id: 'reclaim-potential', name: 'Reclaim Potential', max: (c) => atLeast1(c.mod.CON), reset: 'long' },
          { type: 'action', id: 'reclaim-potential', name: 'Reclaim Potential', kind: 'free', cost: { resource: 'reclaim-potential', amount: 1 }, summary: 'An echo is destroyed by damage: temp HP.', roll: { label: 'Temp HP', expr: (c) => `2d6${signed(c.mod.CON)}`, why: 'Reclaim Potential: 2d6 + CON.' } },
        ] },
      { id: 'legion-of-one', level: 18, name: 'Legion of One', summary: 'Manifest Echo can make two echoes at once (a third destroys both); anything you can do from one, you can do from the other. When you roll initiative with no Unleash Incarnation uses, regain one.' },
    ],
  },
  {
    id: 'purple-dragon-knight', name: 'Purple Dragon Knight (legacy)', source: SCAG, expansion: true, summary: 'Older banneret: Second Wind heals allies, Action Surge lends them attacks.',
    features: [
      { id: 'rallying-cry', level: 3, name: 'Rallying Cry', summary: 'When you use Second Wind, up to three allies within 60 ft who can see or hear you regain HP equal to your fighter level.',
        effects: [{ type: 'action', id: 'rallying-cry', name: 'Rallying Cry', kind: 'free', summary: (c) => `With Second Wind: up to 3 allies within 60 ft regain ${c.level} HP each.` }] },
      { id: 'royal-envoy', level: 7, name: 'Royal Envoy', summary: 'Proficiency in Persuasion (if you have it, one of Animal Handling, Insight, Intimidation or Performance instead). Your proficiency bonus is doubled for Persuasion checks.',
        choices: [{ key: 'skill', label: 'Royal Envoy skill', count: 1, kind: 'skill', options: skillOpts(['persuasion', 'animal-handling', 'insight', 'intimidation', 'performance']) }] },
      { id: 'inspiring-surge', level: 10, name: 'Inspiring Surge', summary: 'When you use Action Surge, one ally within 60 ft who can see or hear you can make one melee or ranged weapon attack with its reaction (two allies from level 18).',
        effects: [{ type: 'action', id: 'inspiring-surge', name: 'Inspiring Surge', kind: 'free', summary: (c) => `With Action Surge: ${c.level >= 18 ? 'two allies' : 'one ally'} within 60 ft attack with a reaction.` }] },
      { id: 'pdk-bulwark', level: 15, name: 'Bulwark', summary: 'When you use Indomitable to reroll an INT, WIS or CHA save and are not Incapacitated, one ally within 60 ft that failed its save against the same effect also rerolls.' },
      { id: 'improved-inspiring-surge', level: 18, name: 'Inspiring Surge (improved)', summary: 'Inspiring Surge lets two allies attack.' },
    ],
  },
  {
    id: 'banneret', name: 'Banneret', source: HOF, expansion: true, summary: 'Knight and leader: Second Wind heals the squad, Action Surge moves it.',
    features: [
      { id: 'knightly-envoy', level: 3, name: 'Knightly Envoy', summary: 'Comprehend Languages as a ritual only (CHA). One extra language; after a long rest you can swap it for one you heard, saw signed or read in the last 24 hours. Proficiency in Insight, Intimidation, Performance or Persuasion.',
        choices: [{ key: 'skill', label: 'Knightly Envoy skill', count: 1, kind: 'skill', options: skillOpts(['insight', 'intimidation', 'performance', 'persuasion']) }] },
      { id: 'group-recovery', level: 3, name: 'Group Recovery', summary: 'When you heal with Second Wind, up to CHA modifier (min 1) allies in a 30-ft emanation (60 ft from 18) each regain 1d4 + fighter level HP. Once per short or long rest.',
        effects: [
          { type: 'resource', id: 'group-recovery', name: 'Group Recovery', max: () => 1, reset: 'short' },
          { type: 'action', id: 'group-recovery', name: 'Group Recovery', kind: 'free', cost: { resource: 'group-recovery', amount: 1 }, summary: (c) => `With Second Wind: up to ${atLeast1(c.mod.CHA)} allies within ${c.level >= 18 ? 60 : 30} ft heal (roll once per ally).${c.level >= 7 ? ' They have advantage on D20 Tests until the start of your next turn.' : ''}`,
            roll: { label: 'Ally heals', expr: (c) => `1d4+${c.level}`, parts: (c) => [{ label: 'Fighter level', value: c.level, kind: 'level' }], why: 'Group Recovery: 1d4 + your fighter level, for each chosen ally.' } },
        ] },
      { id: 'team-tactics', level: 7, name: 'Team Tactics', summary: 'Allies you heal with Group Recovery have advantage on D20 Tests until the start of your next turn.' },
      { id: 'rallying-surge', level: 10, name: 'Rallying Surge', summary: 'When you use Action Surge, up to CHA modifier (min 1) allies in a 30-ft emanation (60 ft from 18) can each use a reaction to make one weapon attack or Unarmed Strike, or move up to half their speed without provoking opportunity attacks.',
        effects: [{ type: 'action', id: 'rallying-surge', name: 'Rallying Surge', kind: 'free', summary: (c) => `With Action Surge: up to ${atLeast1(c.mod.CHA)} allies within ${c.level >= 18 ? 60 : 30} ft attack once or move half speed (reaction).` }] },
      { id: 'shared-resilience', level: 15, name: 'Shared Resilience', summary: 'Reaction when an ally you can see within 60 ft fails a save: spend one Indomitable use; it rerolls with a bonus equal to your fighter level and must use the new roll.',
        effects: [{ type: 'action', id: 'shared-resilience', name: 'Shared Resilience', kind: 'reaction', cost: { resource: 'indomitable', amount: 1 }, summary: (c) => `An ally within 60 ft rerolls a failed save at +${c.level}.` }] },
      { id: 'inspiring-commander', level: 18, name: 'Inspiring Commander', summary: 'Group Recovery and Rallying Surge reach 60 ft. You are immune to Charmed and Frightened.' },
    ],
  },
]

// ---------------------------------------------------------------- Monk (subclass features at 3, 6, 11, 17)

const martialArts = scale([[1, 'd6'], [5, 'd8'], [11, 'd10'], [17, 'd12']])
const focusDc = (c) => 8 + c.mod.WIS + c.prof
const DRAGON_TYPES = 'Acid, Cold, Fire, Lightning or Poison'
const maxFocusPerSpell = scale([[3, 2], [5, 3], [9, 4], [13, 5], [17, 6]])

// Four Elements disciplines: [id, name, min level, focus cost, kind, summary, roll, save]
const DISCIPLINES = [
  ['fangs-of-the-fire-snake', 'Fangs of the Fire Snake', 3, 1, 'free', 'When you take the Attack action, 1 Focus: your Unarmed Strikes reach 10 ft farther this turn and can deal fire damage. 1 more Focus on a hit: +1d10 fire.', { label: 'Extra fire (1 more Focus)', expr: () => '1d10' }],
  ['fist-of-four-thunders', 'Fist of Four Thunders', 3, 2, 'action', 'Cast Thunderwave (2 Focus).', { label: 'Thunder damage', expr: () => '2d8' }, 'CON'],
  ['fist-of-unbroken-air', 'Fist of Unbroken Air', 3, 2, 'action', 'Action, 2 Focus: a creature within 30 ft makes a STR save or takes 3d10 bludgeoning (+1d10 per extra Focus), is pushed up to 20 ft and falls Prone; half damage only on a success.', { label: 'Bludgeoning damage', expr: () => '3d10' }, 'STR'],
  ['rush-of-the-gale-spirits', 'Rush of the Gale Spirits', 3, 2, 'action', 'Cast Gust of Wind (2 Focus).', null, 'STR'],
  ['shape-the-flowing-river', 'Shape the Flowing River', 3, 1, 'action', 'Action, 1 Focus: reshape water or ice in a 30-ft cube within 120 ft (turn water to ice and back, raise or lower it, dig or fill trenches in ice). It cannot trap or hurt creatures.'],
  ['sweeping-cinder-strike', 'Sweeping Cinder Strike', 3, 2, 'action', 'Cast Burning Hands (2 Focus).', { label: 'Fire damage', expr: () => '3d6' }, 'DEX'],
  ['water-whip', 'Water Whip', 3, 2, 'bonus', 'Bonus action (per errata), 2 Focus: a creature within 30 ft makes a DEX save or takes 3d10 bludgeoning (+1d10 per extra Focus) and you either knock it Prone or pull it up to 25 ft closer; half damage only on a success.', { label: 'Bludgeoning damage', expr: () => '3d10' }, 'DEX'],
  ['clench-of-the-north-wind', 'Clench of the North Wind', 6, 3, 'action', 'Cast Hold Person (3 Focus).', null, 'WIS'],
  ['gong-of-the-summit', 'Gong of the Summit', 6, 3, 'action', 'Cast Shatter (3 Focus).', { label: 'Thunder damage', expr: () => '3d8' }, 'CON'],
  ['flames-of-the-phoenix', 'Flames of the Phoenix', 11, 4, 'action', 'Cast Fireball (4 Focus).', { label: 'Fire damage', expr: () => '8d6' }, 'DEX'],
  ['mist-stance', 'Mist Stance', 11, 4, 'action', 'Cast Gaseous Form on yourself (4 Focus).'],
  ['ride-the-wind', 'Ride the Wind', 11, 4, 'action', 'Cast Fly on yourself (4 Focus).'],
  ['breath-of-winter', 'Breath of Winter', 17, 6, 'action', 'Cast Cone of Cold (6 Focus).', { label: 'Cold damage', expr: () => '8d8' }, 'CON'],
  ['eternal-mountain-defense', 'Eternal Mountain Defense', 17, 5, 'action', 'Cast Stoneskin on yourself (5 Focus).'],
  ['river-of-hungry-flame', 'River of Hungry Flame', 17, 5, 'action', 'Cast Wall of Fire (5 Focus).', { label: 'Fire damage', expr: () => '5d8' }, 'DEX'],
  ['wave-of-rolling-earth', 'Wave of Rolling Earth', 17, 6, 'action', 'Cast Wall of Stone (6 Focus).', null, 'DEX'],
]
const disciplineOptions = (c) => DISCIPLINES.filter(([, , lvl]) => (c?.level ?? 20) >= lvl).map(([id, name, lvl, cost, kind, summary, roll, save]) => ({
  id: `disc-${id}`, name, summary: `${lvl > 3 ? `Monk level ${lvl}+. ` : ''}${summary}`,
  effects: [{
    type: 'action', id: `disc-${id}`, name, kind, cost: focus(cost), summary,
    ...(roll ? { roll: { ...roll, why: `${name}: base damage; extra Focus raises it (up to your maximum Focus per spell).` } } : {}),
    ...(save ? { save: { ability: save, dc: focusDc } } : {}),
  }],
}))

const MONK_SUBS = [
  {
    id: 'drunken-master', name: 'Way of the Drunken Master', source: XGE, expansion: true, summary: 'Staggering, unpredictable fighter: slips away and turns misses on others.',
    features: [
      { id: 'drunken-proficiencies', level: 3, name: 'Bonus Proficiencies', summary: "Proficiency in Performance and Brewer's Supplies.",
        choices: [{ key: 'skill', label: 'Drunken Master skill', count: 1, kind: 'skill', options: skillOpts(['performance']) }] },
      { id: 'drunken-technique', level: 3, name: 'Drunken Technique', summary: 'When you use Flurry of Blows, you also Disengage and get +10 ft speed until the end of the turn.' },
      { id: 'tipsy-sway', level: 6, name: 'Tipsy Sway', summary: 'Standing up from Prone costs only 5 ft of movement. Reaction when a creature misses you with a melee attack, 1 Focus: the attack hits another creature of your choice within 5 ft of you instead.',
        effects: [{ type: 'action', id: 'redirect-attack', name: 'Redirect Attack', kind: 'reaction', cost: focus(1), summary: 'A melee attack misses you: it hits another creature within 5 ft of you.' }] },
      { id: 'drunkards-luck', level: 11, name: "Drunkard's Luck", summary: 'When you make a D20 Test with disadvantage, spend 2 Focus to cancel the disadvantage.',
        effects: [{ type: 'action', id: 'drunkards-luck', name: "Drunkard's Luck", kind: 'free', cost: focus(2), summary: 'Cancel disadvantage on one check, attack or save.' }] },
      { id: 'intoxicated-frenzy', level: 17, name: 'Intoxicated Frenzy', summary: 'Flurry of Blows can make up to three extra strikes, as long as each strike of the Flurry hits a different creature this turn.' },
    ],
  },
  {
    id: 'kensei', name: 'Way of the Kensei', source: XGE, expansion: true, summary: 'Weapon master: chosen kensei weapons become monk weapons, honed to an edge.',
    features: [
      { id: 'path-of-the-kensei', level: 3, name: 'Path of the Kensei', summary: "Choose 2 kensei weapons (one melee, one ranged; simple or martial, no Heavy, Longbow allowed); 1 more at 6, 11 and 17. You are proficient with them and they count as monk weapons. Agile Parry: after an Unarmed Strike in the Attack action while holding a kensei weapon, +2 AC until the start of your next turn. Kensei's Shot: bonus action, ranged kensei attacks deal +1d4 this turn. Way of the Brush: Calligrapher's or Painter's Supplies.",
        effects: [
          { type: 'action', id: 'agile-parry', name: 'Agile Parry', kind: 'free', summary: '+2 AC until your next turn after an Unarmed Strike in the Attack action, holding a kensei weapon.' },
          { type: 'action', id: 'kenseis-shot', name: "Kensei's Shot", kind: 'bonus', summary: 'This turn, ranged attacks with a kensei weapon deal extra damage.', roll: { label: 'Extra damage', expr: () => '1d4', why: "Kensei's Shot: +1d4 on each ranged kensei weapon hit this turn." } },
        ] },
      { id: 'one-with-the-blade', level: 6, name: 'One with the Blade', summary: 'Kensei weapons count as magical. Deft Strike: once a turn on a kensei weapon hit, 1 Focus for extra damage equal to a Martial Arts die.',
        effects: [{ type: 'action', id: 'deft-strike', name: 'Deft Strike', kind: 'free', cost: focus(1), summary: 'Once a turn, on a kensei weapon hit.', roll: { label: 'Extra damage', expr: (c) => `1${martialArts(c.level)}`, why: 'Deft Strike: one Martial Arts die.' } }] },
      { id: 'sharpen-the-blade', level: 11, name: 'Sharpen the Blade', summary: 'Bonus action, up to 3 Focus: a kensei weapon you touch gets +1 to attack and damage per Focus spent, for 1 minute (not on a magic weapon that already has a bonus).',
        effects: [{ type: 'action', id: 'sharpen-the-blade', name: 'Sharpen the Blade', kind: 'bonus', cost: focus(1), summary: '+1 attack and damage per Focus (up to 3; spend the extra by hand), 1 minute.' }] },
      { id: 'unerring-accuracy', level: 17, name: 'Unerring Accuracy', summary: 'Once on each of your turns, reroll a missed attack with a monk weapon.' },
    ],
  },
  {
    id: 'sun-soul', name: 'Way of the Sun Soul', source: XGE, expansion: true, summary: 'Radiant monk: bolts of sunlight, burning arcs and a blazing burst.',
    features: [
      { id: 'radiant-sun-bolt', level: 3, name: 'Radiant Sun Bolt', summary: 'Ranged spell attack, 30 ft, using DEX + prof: radiant damage = Martial Arts die + DEX. Any attack of your Attack action can be a bolt. If you used one in the Attack action, 1 Focus: two bolts as a bonus action.',
        effects: [
          { type: 'action', id: 'radiant-sun-bolt', name: 'Radiant Sun Bolt', kind: 'action', summary: (c) => `Ranged attack, 30 ft, ${signed(c.mod.DEX + c.prof)} to hit; replaces any attack of the Attack action.`,
            roll: { label: 'Radiant damage', expr: (c) => `1${martialArts(c.level)}${signed(c.mod.DEX)}`, why: 'Radiant Sun Bolt: Martial Arts die + DEX.' } },
          { type: 'action', id: 'radiant-sun-bolt-bonus', name: 'Radiant Sun Bolt (two more)', kind: 'bonus', cost: focus(1), summary: 'After using a bolt in the Attack action: two more bolts.' },
        ] },
      { id: 'searing-arc-strike', level: 6, name: 'Searing Arc Strike', summary: 'Right after the Attack action, 2 Focus: cast Burning Hands as a bonus action; each extra Focus raises its level by 1. Total Focus at most half your monk level.',
        effects: [{ type: 'action', id: 'searing-arc-strike', name: 'Searing Arc Strike', kind: 'bonus', cost: focus(2), summary: (c) => `Burning Hands (15-ft cone); +1d6 per extra Focus, up to ${Math.floor(c.level / 2)} Focus in total.`,
          roll: { label: 'Fire damage', expr: () => '3d6', why: 'Burning Hands at level 1: 3d6 fire, half on a save.' }, save: { ability: 'DEX', dc: focusDc } }] },
      { id: 'searing-sunburst', level: 11, name: 'Searing Sunburst', summary: 'Action: a 20-ft-radius burst at a point within 150 ft. Each creature in it makes a CON save or takes 2d6 radiant (no damage on a success; total cover protects). Spend 1 to 3 Focus for +2d6 each.',
        effects: [{ type: 'action', id: 'searing-sunburst', name: 'Searing Sunburst', kind: 'action', summary: '20-ft radius within 150 ft; up to 3 Focus for +2d6 each (spend by hand).',
          roll: { label: 'Radiant damage', expr: () => '2d6', why: 'Searing Sunburst: 2d6, +2d6 per Focus spent (up to 3).' }, save: { ability: 'CON', dc: focusDc } }] },
      { id: 'sun-shield', level: 17, name: 'Sun Shield', summary: 'You shed bright light 30 ft and dim light 30 ft more (bonus action to turn it on or off). While it shines, reaction when a creature hits you with a melee attack: it takes 5 + WIS radiant.',
        effects: [{ type: 'action', id: 'sun-shield', name: 'Sun Shield', kind: 'reaction', summary: (c) => `A melee attack hits you: the attacker takes ${5 + c.mod.WIS} radiant.` }] },
    ],
  },
  {
    id: 'astral-self', name: 'Way of the Astral Self', source: TCE, expansion: true, summary: 'Summons spectral arms and a mask of its true self; fights with WIS.',
    features: [
      { id: 'arms-of-the-astral-self', level: 3, name: 'Arms of the Astral Self', summary: 'Bonus action, 1 Focus: spectral arms for 10 minutes (end if Incapacitated). When they appear, creatures you choose within 10 ft make a DEX save or take two Martial Arts dice of force. While they last: use WIS for STR checks and saves; Unarmed Strikes with the arms have +5 ft reach on your turn, can use WIS for attack and damage, and deal force.',
        effects: [{ type: 'action', id: 'arms-of-the-astral-self', name: 'Arms of the Astral Self', kind: 'bonus', cost: focus(1), summary: (c) => `10 minutes. Arm strikes: +5 ft reach, ${signed(c.mod.WIS + c.prof)} to hit with WIS, force damage.`,
          roll: { label: 'Force damage', expr: (c) => `2${martialArts(c.level)}`, why: 'Arms of the Astral Self: two Martial Arts dice to creatures within 10 ft (DEX save negates).' }, save: { ability: 'DEX', dc: focusDc } }] },
      { id: 'visage-of-the-astral-self', level: 6, name: 'Visage of the Astral Self', summary: 'Bonus action (or with the arms), 1 Focus: an astral visage for 10 minutes. See normally in magical and normal darkness to 120 ft; advantage on Insight and Intimidation; speak so only one creature within 60 ft hears, or be heard 600 ft away.',
        effects: [{ type: 'action', id: 'visage-of-the-astral-self', name: 'Visage of the Astral Self', kind: 'bonus', cost: focus(1), summary: '10 minutes: see in any darkness 120 ft, advantage on Insight and Intimidation.' }] },
      { id: 'body-of-the-astral-self', level: 11, name: 'Body of the Astral Self', summary: 'While arms and visage are both out: reaction when you take acid, cold, fire, force, lightning or thunder damage, reduce it by 1d10 + WIS (min 1); once a turn, an arm hit deals an extra Martial Arts die.',
        effects: [
          { type: 'action', id: 'deflect-energy', name: 'Deflect Energy', kind: 'reaction', summary: 'Arms and visage out: reduce acid, cold, fire, force, lightning or thunder damage.', roll: { label: 'Reduce by', expr: (c) => `1d10${signed(c.mod.WIS)}`, why: 'Deflect Energy: 1d10 + WIS (at least 1).' } },
          { type: 'action', id: 'empowered-arms', name: 'Empowered Arms', kind: 'free', summary: 'Once a turn on an arm hit.', roll: { label: 'Extra damage', expr: (c) => `1${martialArts(c.level)}`, why: 'Empowered Arms: one Martial Arts die.' } },
        ] },
      { id: 'awakened-astral-self', level: 17, name: 'Awakened Astral Self', summary: 'Bonus action, 5 Focus: arms, visage and body for 10 minutes. +2 AC, and when Extra Attack gives you two attacks you make three if all use the arms.',
        effects: [{ type: 'action', id: 'awakened-astral-self', name: 'Awakened Astral Self', kind: 'bonus', cost: focus(5), summary: 'Arms, visage and body for 10 minutes: +2 AC, three arm attacks per Attack action.' }] },
    ],
  },
  {
    id: 'long-death', name: 'Way of the Long Death', source: SCAG, expansion: true, summary: 'Student of death: feeds on kills, terrifies, refuses to fall.',
    features: [
      { id: 'touch-of-death', level: 3, name: 'Touch of Death', summary: 'When you drop a creature within 5 ft to 0 HP, gain temp HP = WIS + monk level (min 1).',
        effects: [{ type: 'action', id: 'touch-of-death', name: 'Touch of Death', kind: 'free', summary: (c) => `A creature within 5 ft drops to 0 HP: gain ${atLeast1(c.mod.WIS + c.level)} temp HP.` }] },
      { id: 'hour-of-reaping', level: 6, name: 'Hour of Reaping', summary: 'Action: each creature within 30 ft that can see you makes a WIS save or is Frightened of you until the end of your next turn.',
        effects: [{ type: 'action', id: 'hour-of-reaping', name: 'Hour of Reaping', kind: 'action', summary: 'Creatures within 30 ft that see you: Frightened on a failed save.', save: { ability: 'WIS', dc: focusDc } }] },
      { id: 'mastery-of-death', level: 11, name: 'Mastery of Death', summary: 'When you drop to 0 HP, spend 1 Focus to have 1 HP instead.',
        effects: [{ type: 'action', id: 'mastery-of-death', name: 'Mastery of Death', kind: 'free', cost: focus(1), summary: 'Dropped to 0 HP: stay at 1 HP.', setHp: 1 }] },
      { id: 'touch-of-the-long-death', level: 17, name: 'Touch of the Long Death', summary: 'Action: touch a creature and spend 1 to 10 Focus. CON save: 2d10 necrotic per Focus, half on a success.',
        effects: [{ type: 'action', id: 'touch-of-the-long-death', name: 'Touch of the Long Death', kind: 'action', summary: 'Spend 1-10 Focus (by hand); roll 2d10 per Focus.',
          roll: { label: 'Necrotic per Focus', expr: () => '2d10', why: 'Touch of the Long Death: 2d10 necrotic for each Focus Point spent, half on a CON save.' }, save: { ability: 'CON', dc: focusDc } }] },
    ],
  },
  {
    id: 'ascendant-dragon', name: 'Way of the Ascendant Dragon', source: FTD, expansion: true, summary: 'Draconic monk: elemental breath, spectral wings, a dragon aura.',
    features: [
      { id: 'draconic-disciple', level: 3, name: 'Draconic Disciple', summary: `Unarmed Strikes can deal ${DRAGON_TYPES} instead. Reaction to reroll a failed Intimidation or Persuasion check (once per long rest, used up only if it succeeds). You learn Draconic or another language.`,
        effects: [{ type: 'resource', id: 'draconic-presence', name: 'Draconic Presence', max: () => 1, reset: 'long' }] },
      { id: 'breath-of-the-dragon', level: 3, name: 'Breath of the Dragon', summary: `Replace one attack of the Attack action with a 20-ft cone or 30-ft line (5 ft wide) of ${DRAGON_TYPES}: DEX save, two Martial Arts dice (three from 11), half on a success. Uses = proficiency bonus per long rest, then 2 Focus each.`,
        effects: [
          { type: 'resource', id: 'breath-of-the-dragon', name: 'Breath of the Dragon', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'breath-of-the-dragon', name: 'Breath of the Dragon', kind: 'free', cost: { resource: 'breath-of-the-dragon', amount: 1 }, summary: (c) => `${c.level >= 17 ? 'With 1 Focus: 60-ft cone or 90-ft line, four dice. ' : ''}20-ft cone or 30-ft line; half on a save.`,
            roll: { label: 'Damage', expr: (c) => `${c.level >= 11 ? 3 : 2}${martialArts(c.level)}`, why: 'Breath of the Dragon: two Martial Arts dice, three from monk level 11 (four with Augment Breath at 17).' }, save: { ability: 'DEX', dc: focusDc } },
          { type: 'action', id: 'breath-of-the-dragon-focus', name: 'Breath of the Dragon (Focus)', kind: 'free', cost: focus(2), summary: 'No uses left: breathe again for 2 Focus.',
            roll: { label: 'Damage', expr: (c) => `${c.level >= 11 ? 3 : 2}${martialArts(c.level)}`, why: 'Breath of the Dragon: two Martial Arts dice, three from monk level 11.' }, save: { ability: 'DEX', dc: focusDc } },
        ] },
      { id: 'wings-unfurled', level: 6, name: 'Wings Unfurled', summary: 'When you use Step of the Wind, grow spectral wings: fly speed equal to your speed until the end of the turn. Uses = proficiency bonus, back on a long rest.',
        effects: [
          { type: 'resource', id: 'wings-unfurled', name: 'Wings Unfurled', max: (c) => c.prof, reset: 'long' },
          { type: 'action', id: 'wings-unfurled', name: 'Wings Unfurled', kind: 'free', cost: { resource: 'wings-unfurled', amount: 1 }, summary: 'With Step of the Wind: fly speed this turn.' },
        ] },
      { id: 'aspect-of-the-wyrm', level: 11, name: 'Aspect of the Wyrm', summary: `Bonus action: a 10-ft aura for 1 minute. Pick one: Frightful Presence (now and as a bonus action later, one creature in it makes a WIS save or is Frightened of you for 1 minute, saving again each turn) or Resistance (you and allies in it resist one of ${DRAGON_TYPES}). Once per long rest, or 3 Focus.`,
        effects: [
          { type: 'resource', id: 'aspect-of-the-wyrm', name: 'Aspect of the Wyrm', max: () => 1, reset: 'long' },
          { type: 'action', id: 'aspect-of-the-wyrm', name: 'Aspect of the Wyrm', kind: 'bonus', cost: { resource: 'aspect-of-the-wyrm', amount: 1 }, summary: 'Draconic aura, 10 ft, 1 minute: fear or resistance (again for 3 Focus).', save: { ability: 'WIS', dc: focusDc } },
        ] },
      { id: 'ascendant-aspect', level: 17, name: 'Ascendant Aspect', summary: `Augment Breath: 1 Focus makes Breath of the Dragon a 60-ft cone or 90-ft line and four Martial Arts dice. Blindsight 10 ft. Explosive Fury: when you start Aspect of the Wyrm, creatures you choose in the aura make a DEX save or take 3d10 ${DRAGON_TYPES}.`,
        effects: [
          { type: 'sense', name: 'Blindsight', range: 10 },
          { type: 'action', id: 'augment-breath', name: 'Augment Breath', kind: 'free', cost: focus(1), summary: '60-ft cone or 90-ft line, four Martial Arts dice.', roll: { label: 'Damage', expr: (c) => `4${martialArts(c.level)}`, why: 'Augment Breath: four Martial Arts dice, half on a DEX save.' }, save: { ability: 'DEX', dc: focusDc } },
          { type: 'action', id: 'explosive-fury', name: 'Explosive Fury', kind: 'free', summary: 'When you start Aspect of the Wyrm: creatures you choose in the aura.', roll: { label: 'Damage', expr: () => '3d10', why: 'Explosive Fury: 3d10, none on a DEX save.' }, save: { ability: 'DEX', dc: focusDc } },
        ] },
    ],
  },
  {
    id: 'four-elements', name: 'Way of the Four Elements (legacy)', source: PHB14, expansion: true, summary: 'Older elemental monk: spends Focus on disciplines that cast elemental spells.',
    features: [
      { id: 'disciple-of-the-elements', level: 3, name: 'Disciple of the Elements', summary: 'You know Elemental Attunement (minor tricks: a harmless sensory effect, light or snuff a small flame, chill or warm 1 lb of matter for an hour, shape a 1-ft cube of earth, fire, water or mist for a minute) and one more discipline; another at 6, 11 and 17 (you may swap one when you learn a new one). Discipline spells use your Focus save DC, need no components, and from level 5 extra Focus raises their level. Most Focus per spell: 2 (3 at 5, 4 at 9, 5 at 13, 6 at 17).',
        effects: [{ type: 'action', id: 'four-elements-max', name: 'Most Focus per discipline spell', kind: 'info', summary: (c) => `${maxFocusPerSpell(c.level)} Focus at most per spell.`, save: { ability: 'WIS', dc: focusDc } }],
        choices: [{ key: 'disciplines', label: 'Elemental disciplines', count: (c) => scale([[3, 1], [6, 2], [11, 3], [17, 4]])(c.level), kind: 'pick', options: disciplineOptions }] },
      { id: 'four-elements-6', level: 6, name: 'Extra Discipline', summary: 'Learn one more elemental discipline.' },
      { id: 'four-elements-11', level: 11, name: 'Extra Discipline', summary: 'Learn one more elemental discipline.' },
      { id: 'four-elements-17', level: 17, name: 'Extra Discipline', summary: 'Learn one more elemental discipline.' },
    ],
  },
]

export const EXT_SUBCLASSES_2 = { druid: DRUID_SUBS, fighter: FIGHTER_SUBS, monk: MONK_SUBS }
