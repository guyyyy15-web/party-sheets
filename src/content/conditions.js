// The conditions of the SRD 5.2 (CC-BY-4.0), each in one or two lines of our own words.
// Exhaustion has levels; its effect on d20 tests and speed is applied by the engine.

export const CONDITIONS = [
  { id: 'blinded', name: 'Blinded', summary: "Can't see. Attacks against you have advantage, your attacks have disadvantage." },
  { id: 'charmed', name: 'Charmed', summary: "Can't attack the charmer. The charmer has advantage on social checks with you." },
  { id: 'deafened', name: 'Deafened', summary: "Can't hear." },
  { id: 'frightened', name: 'Frightened', summary: "Disadvantage on checks and attacks while the source is in sight. Can't move closer to it." },
  { id: 'grappled', name: 'Grappled', summary: 'Speed 0. Disadvantage on attacks against anyone but the grappler.' },
  { id: 'incapacitated', name: 'Incapacitated', summary: 'No actions, bonus actions or reactions. Concentration ends. Disadvantage on initiative.' },
  { id: 'invisible', name: 'Invisible', summary: 'Advantage on initiative. Attacks against you have disadvantage, yours have advantage.' },
  { id: 'paralyzed', name: 'Paralyzed', summary: 'Incapacitated, speed 0. Fail STR and DEX saves. Attacks against you have advantage, and hits from within 5 ft are critical.' },
  { id: 'petrified', name: 'Petrified', summary: 'Turned to stone: incapacitated, speed 0, resist all damage, immune to Poisoned. Fail STR and DEX saves. Attacks against you have advantage.' },
  { id: 'poisoned', name: 'Poisoned', summary: 'Disadvantage on attack rolls and ability checks.' },
  { id: 'prone', name: 'Prone', summary: 'Crawl or spend half your speed to stand. Your attacks have disadvantage. Attacks against you within 5 ft have advantage, from further away disadvantage.' },
  { id: 'restrained', name: 'Restrained', summary: 'Speed 0. Your attacks and DEX saves have disadvantage, attacks against you have advantage.' },
  { id: 'stunned', name: 'Stunned', summary: 'Incapacitated. Fail STR and DEX saves. Attacks against you have advantage.' },
  { id: 'unconscious', name: 'Unconscious', summary: 'Incapacitated and Prone, drop what you hold. Fail STR and DEX saves. Attacks against you have advantage, and hits from within 5 ft are critical.' },
]

/** Exhaustion: levels 1-6. Each level: -2 to d20 tests and -5 ft speed. Level 6: death. A long rest removes one level. */
export const EXHAUSTION = { max: 6, d20PerLevel: 2, speedPerLevel: 5, summary: 'Each level: -2 to every d20 test and -5 ft speed. At level 6 you die. A long rest removes one level.' }

/** Heroic Inspiration: spend it to reroll any die once, right after rolling. */
export const INSPIRATION = 'Heroic Inspiration: reroll one die right after you roll it, and use the new roll. You can have only one at a time.'
