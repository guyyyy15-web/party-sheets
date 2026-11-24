// Backgrounds: the four of the SRD 5.2 (CC-BY-4.0) and, by Guy's decision (a private app for his groups), the other
// twelve of the 2024 Player's Handbook, as mechanics only (`source: 'PHB 2024'`). A background gives ability increases
// (+2/+1 or +1/+1/+1 among its three abilities), an Origin feat, two skills and a tool. Blurbs are our own words.
const PHB = 'PHB 2024'

export const BACKGROUNDS = [
  { id: 'acolyte', name: 'Acolyte', blurb: 'Raised in a temple, serving the gods.', abilities: ['INT', 'WIS', 'CHA'], feat: 'magic-initiate', featChoice: { list: ['cleric'] }, skills: ['insight', 'religion'], tool: "Calligrapher's Supplies" },
  { id: 'artisan', name: 'Artisan', blurb: 'You learned a trade at a workbench.', abilities: ['STR', 'DEX', 'INT'], feat: 'crafter', skills: ['investigation', 'persuasion'], tool: "Artisan's Tools (one kind)", source: PHB },
  { id: 'charlatan', name: 'Charlatan', blurb: 'Fake names, fake cures, real profits.', abilities: ['DEX', 'CON', 'CHA'], feat: 'skilled', skills: ['deception', 'sleight-of-hand'], tool: 'Forgery Kit', source: PHB },
  { id: 'criminal', name: 'Criminal', blurb: 'You made a living in the shadows.', abilities: ['DEX', 'CON', 'INT'], feat: 'alert', skills: ['sleight-of-hand', 'stealth'], tool: "Thieves' Tools" },
  { id: 'entertainer', name: 'Entertainer', blurb: 'Stages, crowds and applause.', abilities: ['STR', 'DEX', 'CHA'], feat: 'musician', skills: ['acrobatics', 'performance'], tool: 'Musical Instrument', source: PHB },
  { id: 'farmer', name: 'Farmer', blurb: 'Fields, animals and hard work.', abilities: ['STR', 'CON', 'WIS'], feat: 'tough', skills: ['animal-handling', 'nature'], tool: "Carpenter's Tools", source: PHB },
  { id: 'guard', name: 'Guard', blurb: 'You kept watch on the walls.', abilities: ['STR', 'INT', 'WIS'], feat: 'alert', skills: ['athletics', 'perception'], tool: 'Gaming Set', source: PHB },
  { id: 'guide', name: 'Guide', blurb: 'You led travelers through the wild.', abilities: ['DEX', 'CON', 'WIS'], feat: 'magic-initiate', featChoice: { list: ['druid'] }, skills: ['stealth', 'survival'], tool: "Cartographer's Tools", source: PHB },
  { id: 'hermit', name: 'Hermit', blurb: 'Years alone, far from everyone.', abilities: ['CON', 'WIS', 'CHA'], feat: 'healer', skills: ['medicine', 'religion'], tool: 'Herbalism Kit', source: PHB },
  { id: 'merchant', name: 'Merchant', blurb: 'Buying low, selling high, on the road.', abilities: ['CON', 'INT', 'CHA'], feat: 'lucky', skills: ['animal-handling', 'persuasion'], tool: "Navigator's Tools", source: PHB },
  { id: 'noble', name: 'Noble', blurb: 'Born to a title and its duties.', abilities: ['STR', 'INT', 'CHA'], feat: 'skilled', skills: ['history', 'persuasion'], tool: 'Gaming Set', source: PHB },
  { id: 'sage', name: 'Sage', blurb: 'Years among books and scholars.', abilities: ['CON', 'INT', 'WIS'], feat: 'magic-initiate', featChoice: { list: ['wizard'] }, skills: ['arcana', 'history'], tool: "Calligrapher's Supplies" },
  { id: 'sailor', name: 'Sailor', blurb: 'Ships, storms and ports.', abilities: ['STR', 'DEX', 'WIS'], feat: 'tavern-brawler', skills: ['acrobatics', 'perception'], tool: "Navigator's Tools", source: PHB },
  { id: 'scribe', name: 'Scribe', blurb: 'You copied books and kept records.', abilities: ['DEX', 'INT', 'WIS'], feat: 'skilled', skills: ['investigation', 'perception'], tool: "Calligrapher's Supplies", source: PHB },
  { id: 'soldier', name: 'Soldier', blurb: 'Trained for war, at home in a camp.', abilities: ['STR', 'DEX', 'CON'], feat: 'savage-attacker', skills: ['athletics', 'intimidation'], tool: 'Gaming Set' },
  { id: 'wayfarer', name: 'Wayfarer', blurb: 'You grew up on the streets.', abilities: ['DEX', 'WIS', 'CHA'], feat: 'lucky', skills: ['insight', 'stealth'], tool: "Thieves' Tools", source: PHB },
]
export const backgroundById = (id) => BACKGROUNDS.find((b) => b.id === id) || null
