# Party Sheets: rules for Claude sessions

Phone character sheets for Guy's D&D group (one table, not a public product). UI in English. Guy writes in Hebrew:
answer in Hebrew. GitHub Pages serves `main` (repo root, no CI build). The PRD is a Claude doc: "Party Sheets — PRD".

- Edit `src/`, then `npm run build`: `app.js` and `dice3d.js` are committed and must match `src/` (a test checks).
  The build sets `VERSION` in `sw.js` from the files' content. New files the page needs go in `FILES` in `sw.js`.
- Rules are data in `src/content/`, applied by `src/engine/engine.js` (pure, no DOM). A character stores only its
  choices and state; never store a derived number. Every derived number keeps its `sources`.
- Content: only the SRD 5.2 (CC-BY-4.0), written in our own words. Never paste Player's Handbook text. Table
  content from the book goes in by the players themselves ("My content", phase 3).
- Saves: IndexedDB `party-sheets` (localStorage fallback). The character shape has `v: 1`; a change to it must read
  older characters too. Backups must keep importing.
- Dice thrown on screen take their result from the physics (`readTop`), never a separate random number.
- A new class or rule needs a sample character in `tests/engine.test.mjs` with numbers checked against the SRD.
- Before pushing: `npm test` and `npm run smoke`, and look at screenshots/ after UI changes.
