// Shared rules data: abilities, skills, armor, weapons. Mechanics from the SRD 5.2 (CC-BY-4.0), in our own words.

export const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
export const ABILITY_NAMES = { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' }

export const SKILLS = [
  { id: 'acrobatics', name: 'Acrobatics', ability: 'DEX' },
  { id: 'animal-handling', name: 'Animal Handling', ability: 'WIS' },
  { id: 'arcana', name: 'Arcana', ability: 'INT' },
  { id: 'athletics', name: 'Athletics', ability: 'STR' },
  { id: 'deception', name: 'Deception', ability: 'CHA' },
  { id: 'history', name: 'History', ability: 'INT' },
  { id: 'insight', name: 'Insight', ability: 'WIS' },
  { id: 'intimidation', name: 'Intimidation', ability: 'CHA' },
  { id: 'investigation', name: 'Investigation', ability: 'INT' },
  { id: 'medicine', name: 'Medicine', ability: 'WIS' },
  { id: 'nature', name: 'Nature', ability: 'INT' },
  { id: 'perception', name: 'Perception', ability: 'WIS' },
  { id: 'performance', name: 'Performance', ability: 'CHA' },
  { id: 'persuasion', name: 'Persuasion', ability: 'CHA' },
  { id: 'religion', name: 'Religion', ability: 'INT' },
  { id: 'sleight-of-hand', name: 'Sleight of Hand', ability: 'DEX' },
  { id: 'stealth', name: 'Stealth', ability: 'DEX' },
  { id: 'survival', name: 'Survival', ability: 'WIS' },
]
export const skillName = (id) => SKILLS.find((s) => s.id === id)?.name || id

/** Armor: base AC, how much DEX counts (null = all), category. */
export const ARMOR = [
  { id: 'padded', name: 'Padded Armor', type: 'light', base: 11, dexMax: null, stealthDis: true },
  { id: 'leather', name: 'Leather Armor', type: 'light', base: 11, dexMax: null },
  { id: 'studded-leather', name: 'Studded Leather Armor', type: 'light', base: 12, dexMax: null },
  { id: 'hide', name: 'Hide Armor', type: 'medium', base: 12, dexMax: 2 },
  { id: 'chain-shirt', name: 'Chain Shirt', type: 'medium', base: 13, dexMax: 2 },
  { id: 'scale-mail', name: 'Scale Mail', type: 'medium', base: 14, dexMax: 2, stealthDis: true },
  { id: 'breastplate', name: 'Breastplate', type: 'medium', base: 14, dexMax: 2 },
  { id: 'half-plate', name: 'Half Plate Armor', type: 'medium', base: 15, dexMax: 2, stealthDis: true },
  { id: 'ring-mail', name: 'Ring Mail', type: 'heavy', base: 14, dexMax: 0, stealthDis: true },
  { id: 'chain-mail', name: 'Chain Mail', type: 'heavy', base: 16, dexMax: 0, str: 13, stealthDis: true },
  { id: 'splint', name: 'Splint Armor', type: 'heavy', base: 17, dexMax: 0, str: 15, stealthDis: true },
  { id: 'plate', name: 'Plate Armor', type: 'heavy', base: 18, dexMax: 0, str: 15, stealthDis: true },
]
export const armorById = (id) => ARMOR.find((a) => a.id === id) || null

/** What each weapon mastery property does (one line each). */
export const MASTERY = {
  cleave: 'Hit a creature: make one more attack against another creature within 5 ft of it (once per turn, no ability modifier to its damage).',
  graze: 'On a miss, still deal damage equal to the ability modifier you used.',
  nick: 'The extra Light-weapon attack is part of the Attack action, not your bonus action (once per turn).',
  push: 'On a hit, push a Large or smaller target up to 10 ft straight away from you.',
  sap: 'On a hit, the target has disadvantage on its next attack roll before your next turn.',
  slow: 'On a hit that deals damage, the target\'s speed drops by 10 ft until your next turn.',
  topple: 'On a hit, the target makes a CON save (DC 8 + your attack modifier + proficiency) or falls Prone.',
  vex: 'On a hit that deals damage, you have advantage on your next attack against that target before the end of your next turn.',
}

const w = (id, name, cat, dmg, type, props = [], mastery = null, extra = {}) => ({ id, name, cat, dmg, type, props, mastery, ...extra })
/** Weapons: category simple/martial, melee/ranged, damage, properties, mastery. */
export const WEAPONS = [
  w('club', 'Club', 'simple-melee', '1d4', 'bludgeoning', ['light'], 'slow'),
  w('dagger', 'Dagger', 'simple-melee', '1d4', 'piercing', ['finesse', 'light', 'thrown'], 'nick', { range: '20/60' }),
  w('greatclub', 'Greatclub', 'simple-melee', '1d8', 'bludgeoning', ['two-handed'], 'push'),
  w('handaxe', 'Handaxe', 'simple-melee', '1d6', 'slashing', ['light', 'thrown'], 'vex', { range: '20/60' }),
  w('javelin', 'Javelin', 'simple-melee', '1d6', 'piercing', ['thrown'], 'slow', { range: '30/120' }),
  w('light-hammer', 'Light Hammer', 'simple-melee', '1d4', 'bludgeoning', ['light', 'thrown'], 'nick', { range: '20/60' }),
  w('mace', 'Mace', 'simple-melee', '1d6', 'bludgeoning', [], 'sap'),
  w('quarterstaff', 'Quarterstaff', 'simple-melee', '1d6', 'bludgeoning', ['versatile'], 'topple', { versatile: '1d8' }),
  w('sickle', 'Sickle', 'simple-melee', '1d4', 'slashing', ['light'], 'nick'),
  w('spear', 'Spear', 'simple-melee', '1d6', 'piercing', ['thrown', 'versatile'], 'sap', { range: '20/60', versatile: '1d8' }),
  w('dart', 'Dart', 'simple-ranged', '1d4', 'piercing', ['finesse', 'thrown'], 'vex', { range: '20/60' }),
  w('light-crossbow', 'Light Crossbow', 'simple-ranged', '1d8', 'piercing', ['ammunition', 'loading', 'two-handed'], 'slow', { range: '80/320' }),
  w('shortbow', 'Shortbow', 'simple-ranged', '1d6', 'piercing', ['ammunition', 'two-handed'], 'vex', { range: '80/320' }),
  w('sling', 'Sling', 'simple-ranged', '1d4', 'bludgeoning', ['ammunition'], 'slow', { range: '30/120' }),
  w('battleaxe', 'Battleaxe', 'martial-melee', '1d8', 'slashing', ['versatile'], 'topple', { versatile: '1d10' }),
  w('flail', 'Flail', 'martial-melee', '1d8', 'bludgeoning', [], 'sap'),
  w('glaive', 'Glaive', 'martial-melee', '1d10', 'slashing', ['heavy', 'reach', 'two-handed'], 'graze'),
  w('greataxe', 'Greataxe', 'martial-melee', '1d12', 'slashing', ['heavy', 'two-handed'], 'cleave'),
  w('greatsword', 'Greatsword', 'martial-melee', '2d6', 'slashing', ['heavy', 'two-handed'], 'graze'),
  w('halberd', 'Halberd', 'martial-melee', '1d10', 'slashing', ['heavy', 'reach', 'two-handed'], 'cleave'),
  w('lance', 'Lance', 'martial-melee', '1d10', 'piercing', ['heavy', 'reach'], 'topple'),
  w('longsword', 'Longsword', 'martial-melee', '1d8', 'slashing', ['versatile'], 'sap', { versatile: '1d10' }),
  w('maul', 'Maul', 'martial-melee', '2d6', 'bludgeoning', ['heavy', 'two-handed'], 'topple'),
  w('morningstar', 'Morningstar', 'martial-melee', '1d8', 'piercing', [], 'sap'),
  w('pike', 'Pike', 'martial-melee', '1d10', 'piercing', ['heavy', 'reach', 'two-handed'], 'push'),
  w('rapier', 'Rapier', 'martial-melee', '1d8', 'piercing', ['finesse'], 'vex'),
  w('scimitar', 'Scimitar', 'martial-melee', '1d6', 'slashing', ['finesse', 'light'], 'nick'),
  w('shortsword', 'Shortsword', 'martial-melee', '1d6', 'piercing', ['finesse', 'light'], 'vex'),
  w('trident', 'Trident', 'martial-melee', '1d8', 'piercing', ['thrown', 'versatile'], 'topple', { range: '20/60', versatile: '1d10' }),
  w('warhammer', 'Warhammer', 'martial-melee', '1d8', 'bludgeoning', ['versatile'], 'push', { versatile: '1d10' }),
  w('war-pick', 'War Pick', 'martial-melee', '1d8', 'piercing', ['versatile'], 'sap', { versatile: '1d10' }),
  w('whip', 'Whip', 'martial-melee', '1d4', 'slashing', ['finesse', 'reach'], 'slow'),
  w('blowgun', 'Blowgun', 'martial-ranged', '1', 'piercing', ['ammunition', 'loading'], 'vex', { range: '25/100' }),
  w('hand-crossbow', 'Hand Crossbow', 'martial-ranged', '1d6', 'piercing', ['ammunition', 'light', 'loading'], 'vex', { range: '30/120' }),
  w('heavy-crossbow', 'Heavy Crossbow', 'martial-ranged', '1d10', 'piercing', ['ammunition', 'heavy', 'loading', 'two-handed'], 'push', { range: '100/400' }),
  w('longbow', 'Longbow', 'martial-ranged', '1d8', 'piercing', ['ammunition', 'heavy', 'two-handed'], 'slow', { range: '150/600' }),
]
export const weaponById = (id) => WEAPONS.find((x) => x.id === id) || null
export const isRanged = (wp) => wp.cat.endsWith('ranged')
