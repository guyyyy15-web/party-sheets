# Party Sheets

Character sheets for our D&D table, on the phone. Build a hero in a short wizard, and the app applies the rules
of the class, species, background and feats: AC, attacks, saves, skills, resources, rests and level up.
Dice from any screen, thrown on the screen with real physics.

**Live:** https://guyyyy15-web.github.io/party-sheets/ (on the iPhone: Share → Add to Home Screen)

## Phase 1 (this version)

- Classes: Fighter (Champion), Rogue (Thief), Monk (Warrior of the Open Hand), levels 1 to 20
- 9 species, 4 backgrounds, Origin feats, fighting styles, ASIs, Grappler, epic boons
- Wizard: name and portrait, class (with a quick quiz), species, background, ability scores (standard array,
  point buy, or 4d6 thrown on screen), class choices, gear, a hero card
- Sheet: HP with damage / heal / temp, AC and speed with their sources, My Turn by action type, attacks with
  weapon mastery, resources as pips, short and long rests, checks and saves, features, gear, notes, level up
- Backups: Export all / Import on the home screen. Works offline.
- **Show the math** on every roll (on by default, in Table settings): the dice and their faces, each modifier with
  where it comes from (score → modifier, proficiency, Expertise, Exhaustion), the total, and the rule in one line,
  so players learn to do it with real dice. Advantage, disadvantage and critical hits explain themselves.
- At the table: Hit Dice on a short rest (die + CON, at least 1), Heroic Inspiration (Humans get it on a long rest),
  the 14 conditions and Exhaustion (-2 per level on d20 tests, -5 ft speed, -1 level per long rest), and species
  abilities as actions (Giant Ancestry, Large Form, Stonecunning, Draconic Flight, Relentless Endurance, lineage spells)

## Spellcasters (phase 2)

- All 12 SRD classes: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock,
  Wizard, each with its SRD subclass, levels 1 to 20. 339 SRD spells.
- **Spells tab:** spell save DC and spell attack with their math (8 + ability modifier + proficiency), slots as pips
  (Pact Magic for the Warlock, back on a short rest), concentration with a reminder when you take damage, cantrips
  and prepared spells (always-prepared spells from the subclass don't count).
- Cast with a chosen slot (a higher slot adds its dice), or as a ritual; then roll the spell attack and the
  damage or healing. Cantrip dice grow at character levels 5, 11 and 17.
- The SRD has one subclass per class and 18 feats; others are in the Player's Handbook and can't be included.

## Saved on the server

Every character is saved on the server as you play (a status on the sheet: Saved / Saving… / Not saved, with
**Save now**). With no signal, changes wait on the phone and go up when it's back. Table settings → **Your cloud
key**: open that link on a new phone to bring all your characters back.

## Accounts

**Sign in** (top of the home screen) with Face ID or a username and password: your characters and groups come
back on any phone or computer, and you land straight on your character. Your password never leaves the device: it
unlocks an encrypted copy the server can't read.

## Groups (phase 2)

- Each playing group gets its own **group**: an invite link for the players and a separate link for its DM.
  Make one on the home screen (Groups → + New group) and share the links.
- Players open the invite and bring a character (one group per character). It stays on the phone and works
  offline; changes reach the group within seconds, and offline changes go up when the phone is back online.
- The **DM screen** (from the DM link, on a phone or a laptop) shows every character in the group live: HP, AC,
  initiative, speed, passive Perception, saves, conditions. The DM can mark damage, healing, temp HP, conditions,
  Exhaustion and Inspiration, but can't change a character's choices or level.
- Server: a Cloudflare Worker + D1 in `server/` (not encrypted; the links' keys are stored only as hashes).

## Run it

```bash
npm install
npm run build   # src/ → app.js and dice3d.js (committed: GitHub Pages serves the repo as it is)
npm test        # rules engine (sample characters, every class × species × level), dice, bundles match src/
npm run smoke   # iPhone browser test: three heroes through the wizard, a turn, level up, rests, backup, offline
npm run a11y    # accessibility (axe-core) on every screen: no serious issues allowed
node scripts/live.cjs   # after a release: the same kind of checks on the real site (iPhone 13 and SE)
```

## Layout

```
src/engine/engine.js   derive(character): every number with its sources, open choices, rests
src/content/           rules as data: basics (skills, armor, weapons), classes, species, backgrounds, feats
src/ui/                wizard, sheet, dice tray, store (IndexedDB + backups), shared pieces
src/dice*.js polyhedra.js   dice maths and the 3D dice (from Katsebushi)
```

Uses rules from the System Reference Document 5.2 by Wizards of the Coast LLC, available under CC-BY-4.0
(https://creativecommons.org/licenses/by/4.0/). Not affiliated with Wizards of the Coast.
