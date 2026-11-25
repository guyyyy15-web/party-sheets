// Picks the icons the app uses from game-icons.net (CC BY 3.0, via @iconify-json/game-icons) into
// src/content/icons-data.js, so the page carries only these few (works offline, no CDN).
// Run: node scripts/pick-icons.mjs. Each entry lists candidates; the first one that exists wins.
import fs from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { icons } = JSON.parse(fs.readFileSync(require.resolve('@iconify-json/game-icons/icons.json'), 'utf8'))

const WANT = {
  // classes
  'class.barbarian': ['axe-swing', 'battle-axe'], 'class.bard': ['lyre'], 'class.cleric': ['holy-symbol', 'ankh'], 'class.druid': ['oak-leaf', 'leaf-swirl'],
  'class.fighter': ['crossed-swords'], 'class.monk': ['fist', 'punch'], 'class.paladin': ['templar-shield', 'shield-reflect', 'winged-sword'], 'class.ranger': ['high-shot', 'bow-arrow'],
  'class.rogue': ['hood', 'cloak-dagger'], 'class.sorcerer': ['fire-ray', 'magic-swirl'], 'class.warlock': ['pentacle', 'warlock-eye', 'evil-book'], 'class.wizard': ['spell-book', 'wizard-staff'],
  // species
  'species.dragonborn': ['dragon-head'], 'species.dwarf': ['dwarf-face', 'dwarf-helmet'], 'species.elf': ['elf-ear', 'woman-elf-face'], 'species.gnome': ['gears', 'cog'],
  'species.goliath': ['giant', 'muscle-up'], 'species.halfling': ['footprint', 'barefoot'], 'species.human': ['person', 'character'], 'species.orc': ['orc-head', 'tusks-flag'], 'species.tiefling': ['devil-mask', 'horned-helm'],
  // backgrounds
  'bg.acolyte': ['prayer', 'candle-holder'], 'bg.criminal': ['lockpicks', 'hood'], 'bg.sage': ['scroll-unfurled', 'book-cover'], 'bg.soldier': ['spartan-helmet', 'visored-helm'],
  'bg.artisan': ['anvil-impact', 'hammer-nails'], 'bg.charlatan': ['domino-mask', 'drama-masks'], 'bg.entertainer': ['juggler', 'theater'], 'bg.farmer': ['pitchfork', 'wheat'],
  'bg.guard': ['guards', 'barbute'], 'bg.guide': ['compass', 'direction-signs'], 'bg.hermit': ['meditation', 'candle-light'], 'bg.merchant': ['scales', 'coins'],
  'bg.noble': ['crown', 'tiara'], 'bg.sailor': ['anchor', 'sailboat'], 'bg.scribe': ['quill-ink', 'quill'], 'bg.wayfarer': ['bindle', 'walking-boot'],
  // weapons
  'w.club': ['wood-club', 'spiked-bat'], 'w.dagger': ['plain-dagger'], 'w.greatclub': ['wood-club'], 'w.handaxe': ['hatchet', 'wood-axe'], 'w.javelin': ['thrown-spear', 'spear-hook'],
  'w.light-hammer': ['claw-hammer', 'thor-hammer'], 'w.mace': ['mace-head', 'flanged-mace'], 'w.quarterstaff': ['bo', 'wizard-staff'], 'w.sickle': ['sickle'], 'w.spear': ['barbed-spear', 'spears'],
  'w.dart': ['dart'], 'w.light-crossbow': ['crossbow'], 'w.shortbow': ['pocket-bow', 'bow-arrow'], 'w.sling': ['sling'], 'w.battleaxe': ['battle-axe'], 'w.flail': ['flail'],
  'w.glaive': ['glaive'], 'w.greataxe': ['sharp-axe', 'battle-axe'], 'w.greatsword': ['broadsword', 'two-handed-sword'], 'w.halberd': ['halberd'], 'w.lance': ['spear-feather', 'barbed-spear'], 'w.longsword': ['broadsword'],
  'w.maul': ['war-axe', 'thor-hammer', 'warhammer'], 'w.morningstar': ['spiked-mace', 'mace-head'], 'w.pike': ['pikeman', 'spears'], 'w.rapier': ['rapier', 'stiletto'], 'w.scimitar': ['scimitar', 'curvy-knife'],
  'w.shortsword': ['gladius', 'stiletto'], 'w.trident': ['trident'], 'w.warhammer': ['warhammer', 'thor-hammer'], 'w.war-pick': ['war-pick'], 'w.whip': ['whip'],
  'w.blowgun': ['blowgun', 'dart'], 'w.hand-crossbow': ['crossbow'], 'w.heavy-crossbow': ['crossbow'], 'w.longbow': ['bow-arrow', 'high-shot'], 'w.musket': ['musket'], 'w.pistol': ['crossed-pistols', 'saber-and-pistol'],
  // armor
  'a.padded': ['leather-vest', 'shirt'], 'a.leather': ['leather-armor', 'leather-vest'], 'a.studded-leather': ['studded-leather', 'leather-armor'], 'a.hide': ['wolf-head', 'leather-armor'],
  'a.chain-shirt': ['chain-mail', 'mail-shirt'], 'a.scale-mail': ['scale-mail', 'lamellar'], 'a.breastplate': ['breastplate'], 'a.half-plate': ['lamellar', 'breastplate'],
  'a.ring-mail': ['chain-mail'], 'a.chain-mail': ['chain-mail'], 'a.splint': ['lamellar', 'breastplate'], 'a.plate': ['armor-vest', 'breastplate'], 'a.shield': ['checked-shield', 'shield'], 'a.none': ['shirt'],
  // magic schools (spells)
  'school.abjuration': ['shield-reflect', 'magic-shield'], 'school.conjuration': ['portal', 'magic-portal'], 'school.divination': ['crystal-ball', 'third-eye'], 'school.enchantment': ['charm', 'heart-tower'],
  'school.evocation': ['fireball'], 'school.illusion': ['domino-mask', 'mirror-mirror'], 'school.necromancy': ['skull-crossed-bones', 'death-skull'], 'school.transmutation': ['magic-potion', 'alchemy'],
  // conditions
  'cond.blinded': ['blindfold'], 'cond.charmed': ['charm', 'heart-beats'], 'cond.deafened': ['ear-muffs', 'silenced'], 'cond.frightened': ['terror', 'screaming'], 'cond.grappled': ['grab', 'manacles'],
  'cond.incapacitated': ['knockout', 'dizzy'], 'cond.invisible': ['invisible', 'ghost'], 'cond.paralyzed': ['frozen-body', 'imprisoned'], 'cond.petrified': ['stone-bust', 'stone-block'], 'cond.poisoned': ['poison-bottle', 'poison'],
  'cond.prone': ['falling', 'lying-down'], 'cond.restrained': ['manacles', 'chained-heart'], 'cond.stunned': ['dizzy', 'star-swirl'], 'cond.unconscious': ['sleepy', 'night-sleep'], 'cond.exhaustion': ['tired-eye', 'despair'],
  // general
  'ui.d20': ['dice-twenty-faces-twenty'], 'ui.feat': ['laurel-crown', 'laurels'], 'ui.subclass': ['crown', 'tied-scroll'], 'ui.spell': ['magic-swirl'], 'ui.pack': ['knapsack', 'backpack'], 'ui.gold': ['two-coins', 'coins'], 'ui.dm': ['dungeon-gate', 'scroll-quill'], 'ui.group': ['three-friends', 'team-idea'],
}
const out = {}, miss = []
for (const [k, cands] of Object.entries(WANT)) {
  const hit = cands.find((n) => icons[n])
  if (hit) out[k] = { n: hit, b: icons[hit].body.replace(/fill="#fff"/g, 'fill="currentColor"') }
  else miss.push(`${k} (${cands.join('|')})`)
}
fs.writeFileSync(new URL('../src/content/icons-data.js', import.meta.url), `// Generated by scripts/pick-icons.mjs from game-icons.net (CC BY 3.0: Lorc, Delapouite and contributors). Don't edit.
export const ICONS = ${JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.b])))}
export const ICON_NAMES = ${JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.n])))}
`)
console.log(`${Object.keys(out).length} icons, ${Math.round(fs.statSync(new URL('../src/content/icons-data.js', import.meta.url)).size / 1024)} KB`)
if (miss.length) console.log('missing:', miss.join(', '))
