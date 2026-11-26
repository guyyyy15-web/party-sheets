// Builds src/content/monsters.js from the SRD 5.2 creatures (CC BY 4.0) as structured by Open5e (document
// "srd-2024"): numbers only (AC, HP, initiative, attacks, save DCs, multiattack count), no text. Each creature gets a
// game-icons.net picture (CC BY 3.0) by name, else by type.
// Run: node scripts/monsters.mjs <dir with the Open5e pages p1.json…p4.json>; then npm test (tests/monsters.test.mjs
// checks a sample against the SRD PDF) and node scripts/pick-icons.mjs.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
const all = readdirSync(dir).filter((f) => /^p\d+\.json$/.test(f)).flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')).results)
// a picture by name (first match wins), else by type
const BY_NAME = [
  [/goblin/i, 'goblin-head'], [/hobgoblin|bugbear/i, 'orc-head'], [/\borc\b/i, 'orc-head'], [/kobold|lizardfolk/i, 'lizardman'], [/troglodyte/i, 'troglodyte'],
  [/dragon|wyrmling|dracolich/i, 'dragon-head'], [/wyvern/i, 'wyvern'], [/hydra/i, 'hydra'], [/skeleton|lich|bone/i, 'skeleton'], [/zombie|ghoul|ghast/i, 'shambling-zombie'],
  [/ghost|wraith|specter|banshee|shadow|will-o/i, 'floating-ghost'], [/vampire/i, 'vampire-dracula'], [/mummy/i, 'mummy-head'], [/werewolf|wererat|weretiger|wereboar|werebear/i, 'werewolf'],
  [/wolf|worg|jackal|hyena|dog|mastiff/i, 'wolf-head'], [/bear|owlbear/i, 'bear-head'], [/boar|pig/i, 'boar'], [/spider|ettercap/i, 'spider-alt'], [/scorpion/i, 'scorpion'],
  [/snake|serpent|naga|python|constrictor/i, 'snake'], [/bat\b|bats/i, 'bat'], [/rat\b|rats/i, 'rat'], [/frog|toad/i, 'frog'], [/octopus|squid/i, 'octopus'], [/kraken/i, 'kraken-tentacle'],
  [/crab/i, 'crab'], [/shark/i, 'shark-jaws'], [/whale|killer whale/i, 'sperm-whale'], [/eagle|hawk|blood hawk|roc\b/i, 'eagle-head'], [/raven|crow/i, 'raven'], [/vulture/i, 'vulture'], [/owl\b/i, 'barn-owl'],
  [/elephant/i, 'elephant-head'], [/mammoth/i, 'mammoth'], [/horse|pony|mule|warhorse/i, 'horse-head'], [/camel/i, 'camel-head'], [/goat|ram\b/i, 'goat'], [/lion\b/i, 'lion'], [/tiger|panther|cat\b|leopard|saber/i, 'tiger-head'],
  [/ape\b|baboon|monkey/i, 'monkey'], [/badger/i, 'badger'], [/deer|elk|stag/i, 'deer-head'], [/bee\b|wasp/i, 'bee'], [/fly\b|flies/i, 'fly'], [/centipede/i, 'centipede'], [/beetle/i, 'beetle-shell'],
  [/dinosaur|tyrannosaurus|triceratops|allosaurus|plesiosaurus|pteranodon|ankylosaurus/i, 'dinosaur-rex'], [/djinni|efreeti|genie|marid|dao/i, 'djinn'], [/unicorn/i, 'unicorn'], [/pegasus/i, 'pegasus'],
  [/griffon|hippogriff/i, 'griffin-symbol'], [/sphinx/i, 'greek-sphinx'], [/centaur/i, 'centaur'], [/salamander/i, 'salamander'], [/troll/i, 'troll'], [/ogre/i, 'ogre'], [/minotaur/i, 'minotaur'],
  [/harpy/i, 'harpy'], [/gargoyle/i, 'gargoyle'], [/medusa|gorgon/i, 'medusa-head'], [/mimic/i, 'mimic-chest'], [/golem|animated/i, 'golem-head'], [/giant/i, 'giant'], [/imp\b|quasit/i, 'imp'],
  [/demon|devil|balor|pit fiend|hezrou|vrock|glabrezu|marilith|barbed|bearded|chain|bone devil|horned|ice devil|erinyes|lemure|dretch|nalfeshnee|succubus|incubus|rakshasa|hell hound|nightmare/i, 'horned-skull'],
  [/angel|deva|planetar|solar\b|couatl/i, 'angel-wings'], [/fairy|sprite|pixie|dryad|satyr|nymph|hag|blink dog/i, 'fairy'], [/shrieker|myconid|fungus|violet fungus/i, 'mushroom'], [/shrub|tree|blight|treant|vine/i, 'carnivorous-plant'],
  [/ooze|jelly|pudding|cube|slime/i, 'transparent-slime'], [/aboleth|chuul|otyugh|gibbering|cloaker|mind flayer|beholder|tentacle/i, 'brain-tentacle'], [/bandit|thug|tough/i, 'bandit'], [/pirate|captain/i, 'pirate-captain'],
  [/knight|gladiator|veteran|warrior|soldier|guard\b|champion/i, 'black-knight-helm'], [/mage|archmage|apprentice|wizard|warlock/i, 'wizard-face'], [/priest|acolyte|cleric/i, 'sun-priest'], [/cultist|fanatic|assassin|spy|scout|noble|commoner/i, 'cultist'],
]
const BY_TYPE = { aberration: 'brain-tentacle', beast: 'wolf-head', celestial: 'angel-wings', construct: 'golem-head', dragon: 'dragon-head', elemental: 'rock-golem', fey: 'fairy', fiend: 'horned-skull', giant: 'giant', humanoid: 'cultist', monstrosity: 'hydra', ooze: 'transparent-slime', plant: 'carnivorous-plant', undead: 'skeleton' }
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 }
const ABIL = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' }
const crText = (cr) => (cr === 0.125 ? '1/8' : cr === 0.25 ? '1/4' : cr === 0.5 ? '1/2' : String(cr))
const dice = (n, d, b) => (n && d ? `${n}${d.toLowerCase()}${b ? (b > 0 ? `+${b}` : `${b}`) : ''}` : b ? String(b) : null)
const out = all.map((r) => {
  const attacks = []
  const saves = []
  let multi = null
  for (const a of r.actions || []) {
    if (a.action_type && a.action_type !== 'ACTION') continue
    if (/^Multiattack/i.test(a.name)) { const m = /makes (one|two|three|four|five|six)\b/i.exec(a.desc || ''); multi = m ? WORDS[m[1].toLowerCase()] : null; continue }
    for (const t of a.attacks || []) {
      const main = dice(t.damage_die_count, t.damage_die_type, t.damage_bonus)
      const extra = dice(t.extra_damage_die_count, t.extra_damage_die_type, t.extra_damage_bonus)
      const mainType = t.damage_type?.key || (main && t.extra_damage_type?.key && !extra ? t.extra_damage_type.key : null) || t.extra_damage_type?.key || ''
      attacks.push({ name: a.name, toHit: t.to_hit_mod, dice: main || extra, type: mainType, ...(main && extra && t.damage_type ? { extra: `${extra} ${t.extra_damage_type?.key || ''}`.trim() } : {}),
        ...(t.reach ? { reach: t.reach } : {}), ...(t.range ? { range: `${t.range}${t.long_range ? `/${t.long_range}` : ''}` } : {}) })
    }
    const s = /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+)/.exec(a.desc || '')
    if (s && !(a.attacks || []).length) { const dm = /(\d+) \((\d+d\d+(?: [+−-] \d+)?)\) ([A-Z][a-z]+) damage/.exec(a.desc); saves.push({ name: a.name, ability: ABIL[s[1].toLowerCase()], dc: +s[2], ...(dm ? { dice: dm[2].replace(/ /g, '').replace('−', '-'), type: dm[3].toLowerCase() } : {}), ...(a.usage_limits?.type === 'RECHARGE_ON_ROLL' ? { recharge: a.usage_limits.param } : {}) }) }
  }
  const speed = Object.entries(r.speed || {}).filter(([k, v]) => k !== 'unit' && v).map(([k, v]) => (k === 'walk' ? `${v} ft.` : `${k} ${v} ft.`)).join(', ')
  return {
    id: r.key.replace(/^srd-2024_/, ''), name: r.name, size: r.size?.name, type: r.type?.key, cr: crText(r.challenge_rating), xp: r.experience_points,
    ac: r.armor_class, hp: r.hit_points, hpDice: String(r.hit_dice || '').replace(/ /g, ''), init: r.initiative_bonus ?? r.modifiers?.dexterity ?? 0, speed,
    icon: `g.${(BY_NAME.find(([re]) => re.test(r.name)) || [null, BY_TYPE[r.type?.key] || 'cultist'])[1]}`,
    attacks: attacks.slice(0, 6), ...(saves.length ? { saves: saves.slice(0, 4) } : {}), ...(multi ? { multi } : {}),
  }
}).sort((a, b) => a.name.localeCompare(b.name))
// where Open5e's copy differs from the SRD 5.2.1 PDF (checked by hand, 2026-11-26)
const FIX = { 'axe-beak': { Beak: { dice: '1d8+2', type: 'slashing' } }, baboon: { Bite: { dice: '1d4-1' } }, jackal: { Bite: { dice: '1d4-1' } } }
for (const m of out) for (const at of m.attacks) Object.assign(at, FIX[m.id]?.[at.name] || {})
const header = `// The SRD 5.2 creatures (System Reference Document 5.2 by Wizards of the Coast, CC BY 4.0), numbers only, built by
// scripts/monsters.mjs from Open5e's structured copy and checked against the SRD PDF (tests/monsters.test.mjs).
// { id, name, size, type, cr, xp, ac, hp, hpDice, init, speed, icon (game-icons), attacks: [{ name, toHit, dice, type,
//   extra?, reach?, range? }], saves?: [{ name, ability, dc, dice?, type?, recharge? }], multi? (attacks per Multiattack) }
`
writeFileSync('src/content/monsters.js', `${header}export const MONSTERS = ${JSON.stringify(out)}\nexport const monsterById = (id) => MONSTERS.find((m) => m.id === id) || null\n`)
console.log(`${out.length} creatures, ${out.filter((m) => m.attacks.length).length} with attacks, src/content/monsters.js ${Math.round(readFileSync('src/content/monsters.js').length / 1024)} KB`)
