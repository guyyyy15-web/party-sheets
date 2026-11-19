// The four backgrounds of the SRD 5.2 (CC-BY-4.0). A background gives ability increases (+2/+1 or +1/+1/+1 among
// its three abilities), an Origin feat, two skills and a tool.

export const BACKGROUNDS = [
  { id: 'acolyte', name: 'Acolyte', blurb: 'Raised in a temple, serving the gods.', abilities: ['INT', 'WIS', 'CHA'], feat: 'magic-initiate', featChoice: { list: ['cleric'] }, skills: ['insight', 'religion'], tool: "Calligrapher's Supplies" },
  { id: 'criminal', name: 'Criminal', blurb: 'You made a living in the shadows.', abilities: ['DEX', 'CON', 'INT'], feat: 'alert', skills: ['sleight-of-hand', 'stealth'], tool: "Thieves' Tools" },
  { id: 'sage', name: 'Sage', blurb: 'Years among books and scholars.', abilities: ['CON', 'INT', 'WIS'], feat: 'magic-initiate', featChoice: { list: ['wizard'] }, skills: ['arcana', 'history'], tool: "Calligrapher's Supplies" },
  { id: 'soldier', name: 'Soldier', blurb: 'Trained for war, at home in a camp.', abilities: ['STR', 'DEX', 'CON'], feat: 'savage-attacker', skills: ['athletics', 'intimidation'], tool: 'Gaming Set' },
]
export const backgroundById = (id) => BACKGROUNDS.find((b) => b.id === id) || null
