// When features fire during a turn: the rules table for the turn guide (right after "Hit"), the "You were hit"
// prompt (HpSheet) and the moment after casting. Keyed by the action id the content already gives a feature, so a
// feature's own data (cost, roll, summary) stays where it is; this file says only WHEN it can be used.
// Checked against the SRD 5.2.1 and the 2024 PHB mechanics (2026-11-25). See src/engine/riders.js.
//
// ON_HIT: offered after a hit.  needs: 'weapon' (a weapon attack, not a spell or Unarmed Strike unless `unarmed`),
//   'melee' (melee weapon or Unarmed Strike), 'finesse-ranged' (Finesse or ranged weapon), 'heavy' (Heavy weapon),
//   'unarmed' (Unarmed Strike only), 'str' (an attack that uses STR), 'any' (any attack roll, spells too).
//   perTurn: once per turn. buff: only while that buff is on you (e.g. 'rage'). ask: a yes/no the player answers.
//   value(c): a flat amount when the feature has no roll. kind: 'bonus' when it takes the bonus action.
export const ON_HIT = {
  'sneak-attack': { needs: 'finesse-ranged', perTurn: true, ask: 'Advantage on the attack, or an ally within 5 ft of the target (and no disadvantage)?' },
  'divine-strike': { needs: 'weapon', perTurn: true },
  'primal-strike': { needs: 'weapon', perTurn: true },
  'radiant-strikes': { needs: 'melee' },
  'colossus-slayer': { needs: 'weapon', perTurn: true, ask: 'Is the target missing any of its HP?' },
  frenzy: { needs: 'str', perTurn: true, buff: 'rage', ask: 'Did you use Reckless Attack this turn?' },
  'brutal-strike': { needs: 'str', perTurn: true, ask: 'Reckless Attack, and you gave up advantage on this attack?' },
  'divine-fury': { needs: 'weapon', unarmed: true, perTurn: true, buff: 'rage' },
  'stunning-strike': { needs: 'melee', perTurn: true },
  'quivering-palm': { needs: 'unarmed' },
  'hand-of-harm': { needs: 'unarmed', perTurn: true },
  'empowered-strikes-elements': { needs: 'unarmed', perTurn: true },
  'blade-flourish': { needs: 'weapon', perTurn: true },
  'psychic-blades': { needs: 'weapon', perTurn: true },
  'touch-of-death': { needs: 'melee', unarmed: true, only: (a) => a.cost?.resource === 'channel-divinity', value: (c) => 5 + 2 * c.level, type: 'necrotic' },
  'symbiotic-strike': { needs: 'melee' },
  'giants-might-hit': { needs: 'weapon', unarmed: true, perTurn: true },
  'deft-strike': { needs: 'weapon', perTurn: true },
  'empowered-arms': { needs: 'unarmed', perTurn: true },
  'polar-strikes': { needs: 'weapon', perTurn: true },
  'gathered-swarm': { needs: 'any', perTurn: true },
  'psionic-strike': { needs: 'weapon', perTurn: true },
  'dreadful-strikes': { needs: 'weapon' },
  'dreadful-strike': { needs: 'weapon', perTurn: true },
  'charge-attack': { needs: 'melee', perTurn: true, ask: 'Did you move 10+ ft straight toward the target first?' },
  'shield-bash': { needs: 'melee', perTurn: true },
  'hurl-through-hell': { needs: 'any', perTurn: true },
  'lunar-form': { needs: 'any', perTurn: true, ask: 'Are you in Wild Shape?' },
  'gwm-damage': { needs: 'heavy', ask: 'Part of the Attack action on your turn?' },
  'hexblades-curse-hit': { needs: 'any', ask: 'Is this the target of your curse?' },
  // Battle Master maneuvers that add the die on a hit: one maneuver per attack
  ...Object.fromEntries(['disarming-attack', 'distracting-strike', 'goading-attack', 'maneuvering-attack', 'menacing-attack', 'pushing-attack', 'trip-attack', 'sweeping-attack'].map((id) => [`man-${id}`, { needs: 'weapon', oncePerAttack: true }])),
}

// ON_HURT: when something hits you (the HpSheet's "You were hit"). effect: 'halve' (the attack's damage),
// 'reduce' (by its roll), 'ac' (+value to AC: does it miss now?), 'zero' (no damage). melee: only a melee attack.
// types: only these damage types (Deflect Attacks: B/P/S until Deflect Energy).
export const ON_HURT = {
  'uncanny-dodge': { effect: 'halve' },
  deflect: { effect: 'reduce', types: (has) => (has('deflect-energy') ? null : ['bludgeoning', 'piercing', 'slashing']) },
  'deflect-energy': { effect: 'reduce', types: () => ['acid', 'cold', 'fire', 'force', 'lightning', 'thunder'] },
  'man-parry': { effect: 'reduce', melee: true },
  parry: { effect: 'ac', value: (c) => c.prof, melee: true },
  'arcane-deflection': { effect: 'ac', value: () => 2 },
  interception: null, // protects an ally: not your own damage
}
// Passive: damage you take is reduced (Heavy Armor Master: B/P/S from an attack, in heavy armor, by your PB).
export const DAMAGE_REDUCTION = {
  'heavy-armor-master': { types: ['bludgeoning', 'piercing', 'slashing'], value: (c) => c.prof, when: (c) => c.armor?.type === 'heavy', attack: true },
}
// At 0 HP instead (Relentless Endurance, Relentless Rage…): offered when damage would drop you to 0.
export const AT_ZERO = ['relentless-endurance', 'relentless-rage', 'mastery-of-death', 'undying-sentinel', 'strength-of-the-grave']

// ON_CAST: offered right after a casting (AfterCast). slot: only with a spell slot. classes: only spells of this
// class list. schools: only these schools. damage: only spells that deal damage.
export const ON_CAST = {
  'beguiling-magic': { slot: true, schools: ['Enchantment', 'Illusion'] },
  'wild-magic-check': { slot: true, classes: ['sorcerer'], perTurn: true },
  'power-surge': { damage: true, classes: ['wizard'], perTurn: true },
  'spiritual-focus': { minLevel: 1 },
  'hunters-rime': { spells: ['hunters-mark'] },
  'frozen-haunt': { spells: ['hunters-mark'] },
}

// Spell damage that gets your modifier (Potent Spellcasting, Empowered Evocation, Agonizing Blast, Elemental
// Affinity): `match` says which spells; added to that spell's damage roll as a part with its source.
export const SPELL_DAMAGE = [
  { feature: 'potent-spellcasting', label: 'Potent Spellcasting', ability: 'WIS', match: (s, cls) => s.level === 0 && s.classes.includes(cls) },
  { feature: 'empowered-evocation', label: 'Empowered Evocation', ability: 'INT', match: (s) => s.school === 'Evocation' && s.classes.includes('wizard') && s.level > 0 },
  { feature: 'agonizing-blast', label: 'Agonizing Blast', ability: 'CHA', match: (s) => s.id === 'eldritch-blast' },
]
