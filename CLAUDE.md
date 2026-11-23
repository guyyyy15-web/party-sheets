# Party Sheets: rules for Claude sessions

Phone character sheets for Guy's D&D group (one table, not a public product). UI in English. Guy writes in Hebrew:
answer in Hebrew. GitHub Pages serves `main` (repo root, no CI build). The PRD is a Claude doc: "Party Sheets — PRD".

- Edit `src/`, then `npm run build`: `app.js` and `dice3d.js` are committed and must match `src/` (a test checks).
  The build sets `VERSION` in `sw.js` from the files' content. New files the page needs go in `FILES` in `sw.js`.
- Rules are data in `src/content/`, applied by `src/engine/engine.js` (pure, no DOM). A character stores only its
  choices and state; never store a derived number. Every derived number keeps its `sources`.
- Content: the SRD 5.2 (CC-BY-4.0) plus, by Guy's decision (2026-11-23, a private app for his groups), the 2024
  Player's Handbook subclasses and feats as **mechanics in our own words** (`source: 'PHB 2024'`, shown with a PHB
  tag). Never paste book text or flavor text; summaries say what it does, with the numbers.
- Saves: IndexedDB `party-sheets` (localStorage fallback). The character shape has `v: 1`; a change to it must read
  older characters too. Backups must keep importing.
- Dice thrown on screen take their result from the physics (`readTop`), never a separate random number.
- A new class or rule needs a sample character in `tests/engine.test.mjs` with numbers checked against the SRD.
- Before pushing: `npm test`, `npm run smoke`, `npm run smoke:rooms` and `npm run a11y`, and look at screenshots/ after UI changes. After a
  release: `node scripts/live.cjs` (the real site, iPhone 13 and SE).
- Spellcasting: class data in `src/content/casters.js`, spells in `src/content/spells.js` (SRD only, own words),
  the math in `src/engine/spells.js` (`spellcastingOf`, `spellRoll`). A character stores `spells: { cantrips, prepared }`
  and `state.concentration`; slots are resources `slot-N` / `pact-slots` in `state.used`.
- Accuracy: rules were audited against the SRD 5.2 PDF on 2026-11-23. When adding content, check the PDF, not memory.

## Groups (rooms) — server in `server/`

- Cloudflare Worker `party-sheets-sync` (https://party-sheets-sync.guyyyy15-web.workers.dev) + D1 `party-sheets`
  (WEUR). Never touch other Workers/D1/R2 on the account (nekamot-sync, chatzer-sync, squad-journal…).
  Deploy: `cd server && npm run deploy` (remote migrations, then wrangler deploy). Schema changes go in a new
  `server/migrations/NNNN_name.sql`; never edit an applied one.
- Not encrypted (Guy's call): characters are plain JSON. The server keeps only SHA-256 hashes of the invite key,
  the DM key and each phone's owner key. Never log request bodies.
- Links: `#/join/<room>.<playerKey>` and `#/dm/<room>.<dmKey>`; the app clears them from the address bar.
  One room per character (`ch.roomId`, local only). Players see the party list; the DM sees every full sheet.
- DM quick actions (PATCH) may change only `hp`, `temp`, `conditions`, `inspiration`, `exhaustion`, `deathSaves`.
  Never choices or level.
- Sync (`src/ui/sync.js`, pure parts in `src/sync-core.js`): one request per sync. Send `diff(local, base)` (PUT,
  merged by field; `state` one level deeper) or fetch the server copy. Every 10 s and 0.8 s after a change; the DM
  screen refreshes every 5 s. The same `mergePatch` runs on both sides.
- Limits: 256 KB per character, 12 per room, 10 new rooms per client per hour, 5000 rooms in total.
- Tests never call production: `npm run test:server` (API, local wrangler dev) and `npm run smoke:rooms` (two phones
  and a DM through a local Worker, with axe). The app reads the API address from localStorage `ps.api` (tests only).
