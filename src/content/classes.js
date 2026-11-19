// Fighter, Rogue and Monk from the SRD 5.2 (CC-BY-4.0), levels 1-20, with the SRD subclass of each, summarised.
import { FEATS } from './feats.js'
import { WEAPONS } from './basics.js'

const ASI_LEVELS = [4, 8, 12, 16]
const asi = (level) => ({ id: `asi-${level}`, level, name: 'Ability Score Improvement', summary: '+2 to one ability, +1 to two, or a feat you qualify for.', asi: true })
const epicBoon = { id: 'epic-boon', level: 19, name: 'Epic Boon', summary: 'An Epic Boon feat (or another feat you qualify for).', asi: 'epic' }
const scale = (table) => (lvl) => table.filter(([l]) => lvl >= l).at(-1)?.[1] ?? 0

const masteryChoice = (count, filter) => ({
  key: 'weapons', label: 'Weapon Mastery', count, kind: 'weapon',
  options: () => WEAPONS.filter(filter).map((wp) => ({ id: wp.id, name: wp.name, summary: `${wp.mastery} mastery` })),
})
const fightingStyles = () => FEATS.filter((f) => f.category === 'fighting-style')

export const FIGHTER = {
  id: 'fighter', name: 'Fighter', hitDie: 10, primary: ['STR', 'DEX'], blurb: 'Master of weapons and armor. Simple to play, hard to put down.',
  difficulty: 'Easy', saves: ['STR', 'CON'], armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'],
  skills: { count: 2, from: ['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'] },
  packs: [
    { id: 'a', name: 'Heavy fighter', items: 'Chain Mail, Greatsword, Flail, 8 Javelins, Dungeoneer\'s Pack, 4 GP', armor: 'chain-mail', weapons: ['greatsword', 'flail', 'javelin'], gp: 4 },
    { id: 'b', name: 'Nimble fighter', items: 'Studded Leather, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Dungeoneer\'s Pack, 11 GP', armor: 'studded-leather', weapons: ['scimitar', 'shortsword', 'longbow'], gp: 11 },
    { id: 'c', name: 'Gold', items: '155 GP to buy your own', gp: 155 },
  ],
  subclassLevel: 3,
  features: [
    { id: 'fighting-style', level: 1, name: 'Fighting Style', summary: 'A Fighting Style feat.',
      choices: [{ key: 'style', label: 'Fighting Style', count: 1, kind: 'feat', options: fightingStyles }] },
    { id: 'second-wind', level: 1, name: 'Second Wind', summary: 'Bonus action: regain 1d10 + fighter level HP. One use back on a short rest, all on a long rest.',
      effects: [
        { type: 'resource', id: 'second-wind', name: 'Second Wind', max: (c) => scale([[1, 2], [4, 3], [10, 4]])(c.level), reset: 'long', short: 1 },
        { type: 'action', id: 'second-wind', name: 'Second Wind', kind: 'bonus', cost: { resource: 'second-wind', amount: 1 }, summary: 'Regain hit points.', roll: { label: 'Heal', expr: (c) => `1d10+${c.level}` }, heal: true },
      ] },
    { id: 'fighter-mastery', level: 1, name: 'Weapon Mastery', summary: 'Use the mastery property of weapons you choose. Swap one on a long rest.',
      choices: [masteryChoice((c) => scale([[1, 3], [4, 4], [10, 5], [16, 6]])(c.level), (wp) => true)] },
    { id: 'action-surge', level: 2, name: 'Action Surge', summary: 'On your turn, take one extra action (not Magic). Back on a short or long rest.',
      effects: [
        { type: 'resource', id: 'action-surge', name: 'Action Surge', max: (c) => (c.level >= 17 ? 2 : 1), reset: 'short' },
        { type: 'action', id: 'action-surge', name: 'Action Surge', kind: 'free', cost: { resource: 'action-surge', amount: 1 }, summary: 'Take one more action this turn.' },
      ] },
    { id: 'tactical-mind', level: 2, name: 'Tactical Mind', summary: 'When you fail an ability check, spend a Second Wind use to add 1d10. If it still fails, the use isn\'t spent.' },
    asi(4),
    { id: 'fighter-extra-attack', level: 5, name: 'Extra Attack', summary: 'Attack twice when you take the Attack action (three times at 11, four at 20).',
      effects: [{ type: 'attacks', value: (c) => scale([[5, 2], [11, 3], [20, 4]])(c.level) }] },
    { id: 'tactical-shift', level: 5, name: 'Tactical Shift', summary: 'When you use Second Wind, move up to half your speed without provoking opportunity attacks.' },
    { id: 'asi-6', level: 6, name: 'Ability Score Improvement', summary: '+2 to one ability, +1 to two, or a feat you qualify for.', asi: true },
    asi(8),
    { id: 'indomitable', level: 9, name: 'Indomitable', summary: 'Reroll a failed saving throw with a bonus equal to your fighter level. Back on a long rest.',
      effects: [{ type: 'resource', id: 'indomitable', name: 'Indomitable', max: (c) => scale([[9, 1], [13, 2], [17, 3]])(c.level), reset: 'long' }] },
    { id: 'tactical-master', level: 9, name: 'Tactical Master', summary: 'When you attack with a weapon whose mastery you can use, you may use Push, Sap or Slow instead of its own.' },
    { id: 'two-extra-attacks', level: 11, name: 'Two Extra Attacks', summary: 'Attack three times with the Attack action.' },
    asi(12),
    { id: 'studied-attacks', level: 13, name: 'Studied Attacks', summary: 'Miss a creature, and you have advantage on your next attack against it before the end of your next turn.' },
    { id: 'asi-14', level: 14, name: 'Ability Score Improvement', summary: '+2 to one ability, +1 to two, or a feat you qualify for.', asi: true },
    asi(16),
    epicBoon,
    { id: 'three-extra-attacks', level: 20, name: 'Three Extra Attacks', summary: 'Attack four times with the Attack action.' },
  ],
  subclasses: [{
    id: 'champion', name: 'Champion', summary: 'Raw physical power: more criticals, more grit.',
    features: [
      { id: 'improved-critical', level: 3, name: 'Improved Critical', summary: 'Your weapon and unarmed attacks score a critical hit on a 19 or 20.', effects: [{ type: 'crit', value: (c) => (c.level >= 15 ? 18 : 19) }] },
      { id: 'remarkable-athlete', level: 3, name: 'Remarkable Athlete', summary: 'Advantage on initiative and Athletics checks. After a critical hit, move half your speed without provoking.' },
      { id: 'additional-fighting-style', level: 7, name: 'Additional Fighting Style', summary: 'Another Fighting Style feat.',
        choices: [{ key: 'style', label: 'Fighting Style', count: 1, kind: 'feat', options: fightingStyles }] },
      { id: 'heroic-warrior', level: 10, name: 'Heroic Warrior', summary: 'At the start of each of your turns in combat, gain Heroic Inspiration if you don\'t have it.' },
      { id: 'superior-critical', level: 15, name: 'Superior Critical', summary: 'Critical hits on an 18, 19 or 20.' },
      { id: 'survivor', level: 18, name: 'Survivor', summary: 'Advantage on death saves (18+ counts as a 20). While Bloodied, regain 5 + CON HP at the start of your turn.' },
    ],
  }],
}

export const ROGUE = {
  id: 'rogue', name: 'Rogue', hitDie: 8, primary: ['DEX'], blurb: 'Skills, stealth and one deadly strike a turn.',
  difficulty: 'Medium', saves: ['DEX', 'INT'], armor: ['light'], weapons: ['simple', 'martial-finesse-light'], tools: ["Thieves' Tools"],
  skills: { count: 4, from: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleight-of-hand', 'stealth'] },
  packs: [
    { id: 'a', name: 'Rogue kit', items: 'Leather Armor, 2 Daggers, Shortsword, Shortbow, 20 Arrows, Quiver, Thieves\' Tools, Burglar\'s Pack, 8 GP', armor: 'leather', weapons: ['dagger', 'shortsword', 'shortbow'], gp: 8 },
    { id: 'b', name: 'Gold', items: '100 GP to buy your own', gp: 100 },
  ],
  subclassLevel: 3,
  features: [
    { id: 'expertise-1', level: 1, name: 'Expertise', summary: 'Double your proficiency bonus for two skills you are proficient in.',
      choices: [{ key: 'skills', label: 'Expertise', count: 2, kind: 'expertise', options: (c) => c.proficientSkills() }] },
    { id: 'sneak-attack', level: 1, name: 'Sneak Attack', summary: 'Once per turn, extra damage when you hit with a Finesse or ranged weapon and have advantage, or an ally is next to the target.',
      effects: [{ type: 'action', id: 'sneak-attack', name: 'Sneak Attack', kind: 'free', summary: 'Once per turn, on a qualifying hit.', roll: { label: 'Extra damage', expr: (c) => `${Math.ceil(c.level / 2)}d6` } }] },
    { id: 'thieves-cant', level: 1, name: "Thieves' Cant", summary: 'The secret language of rogues, and one more language.' },
    { id: 'rogue-mastery', level: 1, name: 'Weapon Mastery', summary: 'Use the mastery property of two weapons you choose.',
      choices: [masteryChoice(() => 2, (wp) => wp.cat.startsWith('simple') || wp.props.includes('finesse') || wp.props.includes('light'))] },
    { id: 'cunning-action', level: 2, name: 'Cunning Action', summary: 'Bonus action: Dash, Disengage or Hide.',
      effects: [{ type: 'action', id: 'cunning-action', name: 'Cunning Action', kind: 'bonus', summary: 'Dash, Disengage or Hide.' }] },
    { id: 'steady-aim', level: 3, name: 'Steady Aim', summary: 'Bonus action: advantage on your next attack this turn, if you haven\'t moved. Your speed is 0 until the end of the turn.',
      effects: [{ type: 'action', id: 'steady-aim', name: 'Steady Aim', kind: 'bonus', summary: 'Advantage on your next attack. Speed 0 this turn.' }] },
    asi(4),
    { id: 'cunning-strike', level: 5, name: 'Cunning Strike', summary: 'Trade Sneak Attack dice for effects: Poison (1d6), Trip (1d6), Withdraw (1d6).' },
    { id: 'uncanny-dodge', level: 5, name: 'Uncanny Dodge', summary: 'Reaction: halve the damage of an attack that hits you, from an attacker you can see.',
      effects: [{ type: 'action', id: 'uncanny-dodge', name: 'Uncanny Dodge', kind: 'reaction', summary: 'Halve the damage of one attack.' }] },
    { id: 'expertise-6', level: 6, name: 'Expertise', summary: 'Two more skills with expertise.',
      choices: [{ key: 'skills', label: 'Expertise', count: 2, kind: 'expertise', options: (c) => c.proficientSkills() }] },
    { id: 'evasion', level: 7, name: 'Evasion', summary: 'DEX save for half damage: none on a success, half on a failure.' },
    { id: 'reliable-talent', level: 7, name: 'Reliable Talent', summary: 'A roll of 9 or lower on a check with a skill you are proficient in counts as a 10.' },
    asi(8),
    { id: 'asi-10', level: 10, name: 'Ability Score Improvement', summary: '+2 to one ability, +1 to two, or a feat you qualify for.', asi: true },
    { id: 'improved-cunning-strike', level: 11, name: 'Improved Cunning Strike', summary: 'Use up to two Cunning Strike effects on one Sneak Attack.' },
    asi(12),
    { id: 'devious-strikes', level: 14, name: 'Devious Strikes', summary: 'New Cunning Strikes: Daze (2d6), Knock Out (6d6), Obscure (3d6).' },
    { id: 'slippery-mind', level: 15, name: 'Slippery Mind', summary: 'Proficiency in WIS and CHA saving throws.', effects: [{ type: 'prof', saves: ['WIS', 'CHA'] }] },
    asi(16),
    { id: 'elusive', level: 18, name: 'Elusive', summary: 'No attack roll has advantage against you unless you are Incapacitated.' },
    epicBoon,
    { id: 'stroke-of-luck', level: 20, name: 'Stroke of Luck', summary: 'Turn a failed d20 test into a 20. Back on a short or long rest.',
      effects: [{ type: 'resource', id: 'stroke-of-luck', name: 'Stroke of Luck', max: () => 1, reset: 'short' }] },
  ],
  subclasses: [{
    id: 'thief', name: 'Thief', summary: 'Burglar, treasure hunter, quick hands.',
    features: [
      { id: 'fast-hands', level: 3, name: 'Fast Hands', summary: 'Cunning Action can also: Sleight of Hand, use Thieves\' Tools, or Use an Object.' },
      { id: 'second-story-work', level: 3, name: 'Second-Story Work', summary: 'Climb speed equal to your speed. Running jumps go DEX modifier feet further.' },
      { id: 'supreme-sneak', level: 9, name: 'Supreme Sneak', summary: 'New Cunning Strike: Stealth Attack (1d6), staying hidden after the attack.' },
      { id: 'use-magic-device', level: 13, name: 'Use Magic Device', summary: 'Attune to four magic items, use spell scrolls, a chance not to spend item charges.' },
      { id: 'thiefs-reflexes', level: 17, name: "Thief's Reflexes", summary: 'Two turns in the first round of combat: the second at your initiative minus 10.' },
    ],
  }],
}

const martialArts = scale([[1, 'd6'], [5, 'd8'], [11, 'd10'], [17, 'd12']])
const unarmored = (c) => !c.armor && !c.shield

export const MONK = {
  id: 'monk', name: 'Monk', hitDie: 8, primary: ['DEX', 'WIS'], blurb: 'Fast, unarmored martial artist. Many attacks, Focus to bend the rules.',
  difficulty: 'Medium', saves: ['STR', 'DEX'], armor: [], weapons: ['simple', 'martial-light'],
  skills: { count: 2, from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
  packs: [
    { id: 'a', name: 'Monk kit', items: 'Spear, 5 Daggers, artisan\'s tools or an instrument, Explorer\'s Pack, 11 GP', weapons: ['spear', 'dagger'], gp: 11 },
    { id: 'b', name: 'Gold', items: '50 GP to buy your own', gp: 50 },
  ],
  subclassLevel: 3,
  scales: { martialArts },
  features: [
    { id: 'martial-arts', level: 1, name: 'Martial Arts', summary: 'Unarmed and monk weapons can use DEX and your Martial Arts die. Bonus action: one Unarmed Strike.',
      effects: [
        { type: 'monk-weapons' },
        { type: 'action', id: 'ma-bonus', name: 'Bonus Unarmed Strike', kind: 'bonus', summary: 'One Unarmed Strike.', attack: 'unarmed', when: unarmored },
      ] },
    { id: 'unarmored-defense', level: 1, name: 'Unarmored Defense', summary: 'Without armor or a shield, AC = 10 + DEX + WIS.',
      effects: [{ type: 'ac', label: 'Unarmored Defense (10 + DEX + WIS)', value: (c) => 10 + c.mod.DEX + c.mod.WIS, when: unarmored }] },
    { id: 'monks-focus', level: 2, name: "Monk's Focus", summary: 'Focus Points (one per level) fuel Flurry of Blows, Patient Defense and Step of the Wind. Back on a short rest.',
      effects: [
        { type: 'resource', id: 'focus', name: 'Focus Points', max: (c) => c.level, reset: 'short' },
        { type: 'action', id: 'flurry', name: 'Flurry of Blows', kind: 'bonus', cost: { resource: 'focus', amount: 1 }, summary: (c) => `${c.level >= 10 ? 3 : 2} Unarmed Strikes.`, attack: 'unarmed', count: (c) => (c.level >= 10 ? 3 : 2) },
        { type: 'action', id: 'patient-defense', name: 'Patient Defense', kind: 'bonus', summary: 'Disengage free. For 1 Focus: Disengage + Dodge.' },
        { type: 'action', id: 'step-of-the-wind', name: 'Step of the Wind', kind: 'bonus', summary: 'Dash free. For 1 Focus: Disengage + Dash, jump distance doubled.' },
      ] },
    { id: 'unarmored-movement', level: 2, name: 'Unarmored Movement', summary: 'Extra speed without armor or a shield.',
      effects: [{ type: 'bonus', target: 'speed', label: 'Unarmored Movement', value: (c) => scale([[2, 10], [6, 15], [10, 20], [14, 25], [18, 30]])(c.level), when: unarmored }] },
    { id: 'uncanny-metabolism', level: 2, name: 'Uncanny Metabolism', summary: 'When you roll initiative: regain all Focus Points and heal a Martial Arts die + monk level. Once per long rest.',
      effects: [
        { type: 'resource', id: 'uncanny-metabolism', name: 'Uncanny Metabolism', max: () => 1, reset: 'long' },
        { type: 'action', id: 'uncanny-metabolism', name: 'Uncanny Metabolism', kind: 'free', cost: { resource: 'uncanny-metabolism', amount: 1 }, summary: 'On initiative: Focus back to full.', roll: { label: 'Heal', expr: (c) => `1${martialArts(c.level)}+${c.level}` }, heal: true, refill: 'focus' },
      ] },
    { id: 'deflect-attacks', level: 3, name: 'Deflect Attacks', summary: 'Reaction: reduce damage from an attack by 1d10 + DEX + monk level. At 0, spend 1 Focus to redirect it.',
      effects: [{ type: 'action', id: 'deflect', name: 'Deflect Attacks', kind: 'reaction', summary: 'Reduce the damage. At 0, 1 Focus to redirect.', roll: { label: 'Reduce by', expr: (c) => `1d10+${c.mod.DEX + c.level}` } }] },
    asi(4),
    { id: 'slow-fall', level: 4, name: 'Slow Fall', summary: 'Reaction: reduce falling damage by 5 x monk level.',
      effects: [{ type: 'action', id: 'slow-fall', name: 'Slow Fall', kind: 'reaction', summary: (c) => `Reduce falling damage by ${5 * c.level}.` }] },
    { id: 'monk-extra-attack', level: 5, name: 'Extra Attack', summary: 'Attack twice when you take the Attack action.', effects: [{ type: 'attacks', value: () => 2 }] },
    { id: 'stunning-strike', level: 5, name: 'Stunning Strike', summary: 'Once per turn on a hit: 1 Focus, CON save or Stunned until your next turn.',
      effects: [{ type: 'action', id: 'stunning-strike', name: 'Stunning Strike', kind: 'free', cost: { resource: 'focus', amount: 1 }, summary: 'On a hit, once per turn.', save: { ability: 'CON', dc: (c) => 8 + c.mod.WIS + c.prof } }] },
    { id: 'empowered-strikes', level: 6, name: 'Empowered Strikes', summary: 'Unarmed Strikes can deal Force damage.' },
    { id: 'evasion-monk', level: 7, name: 'Evasion', summary: 'DEX save for half damage: none on a success, half on a failure.' },
    asi(8),
    { id: 'acrobatic-movement', level: 9, name: 'Acrobatic Movement', summary: 'Without armor, move along walls and across liquids on your turn.' },
    { id: 'heightened-focus', level: 10, name: 'Heightened Focus', summary: 'Flurry gives 3 strikes, Patient Defense gives temp HP, Step of the Wind can carry an ally.' },
    { id: 'self-restoration', level: 10, name: 'Self-Restoration', summary: 'End Charmed, Frightened or Poisoned on yourself at the end of each turn.' },
    asi(12),
    { id: 'deflect-energy', level: 13, name: 'Deflect Energy', summary: 'Deflect Attacks works against any damage type.' },
    { id: 'disciplined-survivor', level: 14, name: 'Disciplined Survivor', summary: 'Proficiency in all saves. Spend 1 Focus to reroll a failed save.', effects: [{ type: 'prof', saves: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }] },
    { id: 'perfect-focus', level: 15, name: 'Perfect Focus', summary: 'On initiative without Uncanny Metabolism, regain Focus up to 4 if you have 3 or fewer.' },
    asi(16),
    { id: 'superior-defense', level: 18, name: 'Superior Defense', summary: 'Start of turn, 3 Focus: resistance to all damage but Force for 1 minute.' },
    epicBoon,
    { id: 'body-and-mind', level: 20, name: 'Body and Mind', summary: 'DEX and WIS +4 each, to a maximum of 25.', effects: [{ type: 'score', ability: 'DEX', value: 4, max: 25 }, { type: 'score', ability: 'WIS', value: 4, max: 25 }] },
  ],
  subclasses: [{
    id: 'open-hand', name: 'Warrior of the Open Hand', summary: 'Master of unarmed combat: push, topple, deny reactions.',
    features: [
      { id: 'open-hand-technique', level: 3, name: 'Open Hand Technique', summary: 'On a Flurry hit: Addle (no reactions), Push (STR save or 15 ft), or Topple (DEX save or Prone).',
        effects: [{ type: 'note', save: { label: 'Push / Topple DC', dc: (c) => 8 + c.mod.WIS + c.prof } }] },
      { id: 'wholeness-of-body', level: 6, name: 'Wholeness of Body', summary: 'Bonus action: heal a Martial Arts die + WIS (min 1). WIS modifier uses (min 1) per long rest.',
        effects: [
          { type: 'resource', id: 'wholeness', name: 'Wholeness of Body', max: (c) => Math.max(1, c.mod.WIS), reset: 'long' },
          { type: 'action', id: 'wholeness', name: 'Wholeness of Body', kind: 'bonus', cost: { resource: 'wholeness', amount: 1 }, summary: 'Heal yourself.', roll: { label: 'Heal', expr: (c) => `1${martialArts(c.level)}+${c.mod.WIS}` }, heal: true },
        ] },
      { id: 'fleet-step', level: 11, name: 'Fleet Step', summary: 'After any other bonus action, use Step of the Wind right away.' },
      { id: 'quivering-palm', level: 17, name: 'Quivering Palm', summary: '4 Focus on an Unarmed Strike hit: later, end the vibrations for a CON save, 10d12 Force (half on a success).',
        effects: [{ type: 'action', id: 'quivering-palm', name: 'Quivering Palm', kind: 'free', cost: { resource: 'focus', amount: 4 }, summary: 'Set the vibrations on a hit.', roll: { label: 'Damage', expr: () => '10d12' }, save: { ability: 'CON', dc: (c) => 8 + c.mod.WIS + c.prof } }] },
    ],
  }],
}

export const CLASSES = [FIGHTER, ROGUE, MONK]
export const classById = (id) => CLASSES.find((c) => c.id === id) || null
export { ASI_LEVELS }
