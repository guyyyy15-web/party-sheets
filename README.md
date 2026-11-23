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

## Run it

```bash
npm install
npm run build   # src/ → app.js and dice3d.js (committed: GitHub Pages serves the repo as it is)
npm test        # rules engine (sample characters, every class × species × level), dice, bundles match src/
npm run smoke   # iPhone browser test: three heroes through the wizard, a turn, level up, rests, backup, offline
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
