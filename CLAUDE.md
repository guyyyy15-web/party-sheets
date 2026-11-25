# Party Sheets: rules for Claude sessions

Phone character sheets for Guy's D&D group (one table, not a public product). UI in English. Guy writes in Hebrew:
answer in Hebrew. GitHub Pages serves `main` (repo root, no CI build). The PRD is a Claude doc: "Party Sheets — PRD".

- Edit `src/`, then `npm run build`: `app.js` and `dice3d.js` are committed and must match `src/` (a test checks).
  The build sets `VERSION` in `sw.js` from the files' content. New files the page needs go in `FILES` in `sw.js`.
- Rules are data in `src/content/`, applied by `src/engine/engine.js` (pure, no DOM). A character stores only its
  choices and state; never store a derived number. Every derived number keeps its `sources`.
- Content: the SRD 5.2 (CC-BY-4.0) plus, by Guy's decision (2026-11-23, a private app for his groups), the 2024
  Player's Handbook subclasses, feats and backgrounds (all 16, `src/content/backgrounds.js`) as **mechanics in our own words** (`source: 'PHB 2024'`, shown with a PHB
  tag), and every official expansion subclass (`src/content/ext-subclasses-*.js`, `expansion: true`, tagged with its
  book; older ones follow the 2024 rule: features below level 3 arrive at 3). Never paste book text or flavor text;
  summaries say what it does, with the numbers.
- Icons: game-icons.net (CC BY 3.0, credited on the home page). `node scripts/pick-icons.mjs` copies the ones in use
  into `src/content/icons-data.js` (the page carries only those; no CDN). Use `<GameIcon id="w.longsword" />`.
- Saves: IndexedDB `party-sheets` (localStorage fallback). The character shape has `v: 1`; a change to it must read
  older characters too. Backups must keep importing.
- Dice thrown on screen take their result from the physics (`readTop`), never a separate random number.
- A new class or rule needs a sample character in `tests/engine.test.mjs` with numbers checked against the SRD.
- Campaign checks: `tests/campaign.test.mjs` levels one character per class 1→20 against an oracle typed from the
  SRD tables (scores, HP, AC, saves, attacks, slots, resources, rests, fights); `npm run campaign` does a Cleric and a
  Fighter 1→20 through the real Level up sheet with a fight at 5. Run both after any rules change.
- Before pushing: `npm test`, `npm run smoke`, `npm run smoke:rooms` and `npm run a11y` (and `npm run campaign` after rules changes), and look at screenshots/ after UI changes. After a
  release: `node scripts/live.cjs` (the real site, iPhone 13 Pro and SE).
- Level-up UX (`src/engine/levelup.js` `levelDiff` + `headlines`, UI `src/ui/levelup.jsx`): the card after "Become
  level N" and the next-level preview on the sheet both come from `levelDiff`, so they agree; `state.leveledAt` shows a
  "What's new" link for a day. The plan for the next UX steps is the Claude doc "Party Sheets — Level-up UX plan".
- Play style and advice (`src/content/builds.js` 37 paths, `src/engine/advice.js`): after picking a class the player
  answers "How do you want to play?" (`ch.build`, a choice). `recommend` / `recommendAsi` / `recommendSpells` tag up to
  3 options per choice with a reason in real numbers; no path → the class's first path. A path's expansion subclass
  falls back to a core one when the group hasn't allowed expansions.
- Term cards (`src/content/glossary.js` ~118 terms in our own words, `src/engine/explain.js` "For you" lines that call
  `derive()` with the item swapped in, UI `src/ui/glossary.jsx`): ⓘ on armor and conditions, weapon properties as
  links, "What it is" in the how-it's-made sheets, a searchable Rules glossary (📖 on the sheet, Table settings).
- Landing page (`src/ui/landing.jsx`): a first visit with no characters and no account sees what Party Sheets is
  (5 points), Start / Sign in / Share; once (`ps.seenLanding`), never on invite, DM or restore links; "About Party
  Sheets" in Table settings reopens it. Link preview: `og.png` (`node scripts/og.cjs`) and the og: tags in index.html.
  Test scripts set `ps.seenLanding` except smoke, which checks the landing page.
- Feat spells (`src/content/feat-spells.js`, `featSpellsOf` in `src/engine/spells.js`): Magic Initiate, Fey/Shadow
  Touched, Ritual Caster, Telepathic, Telekinetic pick real spells (choices of kind `spell`; options read the feature's
  own picks via `c.own(key)`, a background's `featChoice` fixes Magic Initiate's list). `d.featSpells` carry their own
  ability, DC, attack and free-cast resource; the Spells tab shows them under "From feats" (also for non-casters).
- Advantage is tracked per character (`state.edge`: + advantage, − disadvantage, the sheet's tracker). While it isn't
  0, every d20 roll first asks whether it applies (app.jsx `askEdge`); there is no global Advantage switch.
- "Start my turn" (`src/ui/turn.jsx`): move → pick an attack or cantrip → roll to hit → Hit/Miss (crit/NAT 1 handled)
  → damage → next attack (Extra Attack) → bonus action → done. Same roll() as the sheet. 3D dice are on by default
  wherever WebGL works (Reduce motion doesn't turn them off; the tray can).
- Phones (≤ 599 px): the sheet's top is a sticky app bar (`.char-top`; the tabs stick under it at `--bar-h`, measured
  by a ResizeObserver), tighter spacing, and each attack folds its math/properties/mastery behind ⓘ (`.attack.open`).
  Design for the iPhone 13 Pro (390 px, Guy); live.cjs also checks the SE so nothing breaks there.
- Wizard: the Next button is never `disabled` (`aria-disabled` instead). Whatever a step still needs carries
  `data-need="true"` + `data-key`; Next too early adds `.show-missing` (red outline + "Needed to continue") and scrolls
  there; answering one scrolls to the next open one. Scroll with `scrollToEl` (vertical only).
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
- **Every character is saved on the server** (Guy, 2026-11-23), in a group or not: `PUT/GET/DELETE /me/characters/:id`
  with the owner key (`X-Owner`), `GET /me/characters` to restore. The phone's copy is a cache for offline use. The
  sheet shows Saved / Saving… / Not saved with **Save now**; the home screen warns when something isn't saved.
  The cloud key link `#/restore/<ownerKey>` (Table settings) brings every character back on a new phone; a restored
  character keeps its key in `ch.ownerKey` (local only). Deleting a character deletes it on the server; leaving a
  group (or the admin deleting the group) keeps it saved, with no group. Limit: 50 characters per owner.
- **Accounts** (`src/ui/account.js`, like Chatzer's saved duckling): a vault = { owner key, username, groups with
  their keys, the sign-in methods }, AES-GCM encrypted on the phone. Its id + key come from Face ID (passkey, WebAuthn
  PRF, salt `party-sheets-vault-v1`, rpId = location.hostname) or username + password (PBKDF2 600k on the phone).
  Server: `vaults` (ciphertext + owner_hash) and `usernames` (hash → vault) for unique names; it never sees the
  password or the contents. Signing in sets the owner key, restores the groups and `/me/characters`, and opens the
  latest character. The vault is re-saved when the groups change (`ps-rooms` event). Sign out clears this phone only.
  Passkeys are tied to the host `guyyyy15-web.github.io` (moving domains needs Related Origin Requests).
- Links: `#/join/<room>.<playerKey>` and `#/dm/<room>.<dmKey>`; the app clears them from the address bar.
  One room per character (`ch.roomId`, local only). Players see the party list; the DM sees every full sheet.
- DM quick actions (PATCH) may change only `hp`, `temp`, `conditions`, `inspiration`, `exhaustion`, `deathSaves`.
  Never choices or level.
- Sync (`src/ui/sync.js`, pure parts in `src/sync-core.js`): one request per sync. Send `diff(local, base)` (PUT,
  merged by field; `state` one level deeper) or fetch the server copy. Every 10 s and 0.8 s after a change; the DM
  screen refreshes every 5 s. The same `mergePatch` runs on both sides.
- **Initiative** (`src/encounter-core.js` pure + tested, UI `src/ui/initiative.jsx`, migration 0005): a third link per
  group, `#/init/<room>.<initKey>`, made (or remade) by the DM in Links (`POST /rooms/:id/init-link`, only its hash
  kept). Role `init` sees sheets without gold, items or notes (`privateless`) and may PATCH HP/conditions like the DM.
  One fight per room (`encounters`: JSON + rev; `PUT` with the last seen rev, 409 → re-apply). Players' rolls arrive by
  themselves (`POST …/encounter/initiative`, own character only) from the sheet's fight banner or the Init stat; every
  number can be typed by hand (real dice). Enemies by kind × count, no HP: `dmg` counts damage taken from 0 (healing
  down), the DM says when one falls (`dead`, skipped in the order). Players see the order, enemies' damage and
  conditions, never their AC. Poll: runner 3 s, players 5 s.
  Attacks in a fight: when the turn reaches a player while their sheet is open, the turn guide opens by itself
  ("Who are you attacking?" → to hit → damage). The damage is POSTed to `…/encounter/claim`: with `enc.auto` it is added
  to the enemy at once, else it waits in `enc.claims` for the runner (✓ with the amount editable, or ✕). Players never
  get the claims list. The runner can take anyone out of the fight (tap their number → Remove).
- The DM deletes a group in Links (`DELETE /rooms/:id`: characters stay saved in no group, the fight goes); others
  can remove it from their phone; a group that answers 404 is forgotten. The wizard's 🗑 deletes a half-made hero.
- **Items** (`src/content/items.js` `cleanItem`/`itemLine`, UI `src/ui/items.jsx`, engine in `derive()`): a character's
  `items` [{ id, name, kind weapon|armor|shield|wondrous|potion|gear, base, bonus 0–3, ac, save, attune, attuned,
  equipped, qty, potion, desc, from dm|custom }]. Equipped weapons join the attacks (+bonus to hit and damage, with a
  source), worn armor/shield set AC (+bonus), wondrous items add AC/saves; an item that needs attunement works only when
  attuned (3 at most). Potions: Drink rolls the SRD healing dice and takes one off. The DM gives items from the DM
  screen (🎁 → `state.gifts`, a DM PATCH key, ≤ 10, ≤ 8 KB); the player's sheet shows each gift: Hold/Wear it, Into my
  bag, or Decline. Players add their own (tagged custom). Gear tab: items first.
- Logo: the d20 from game-icons (`ui.d20`; icons/icon.svg → `node scripts/icons.cjs`; og.png → `node scripts/og.cjs`).
  Links sheet: each link has Copy and Share (share text is a short sentence + the URL).
- Group settings (`rooms.settings`, DM only): `expansions` = subclasses from the expansion books (`expansion: true`,
  tagged with their book). A character in no group follows the phone's Table setting.
- Admin screen (`#/admin`, `src/ui/admin.jsx`, `GET /admin/stats`): the first password set becomes the admin's
  (`settings.admin_hash`, salted SHA-256), then it's locked. To reset: delete that row in D1 `party-sheets`.
  Usage counts writes only (`usage` table: groups made, characters joined, player changes, DM actions), never content.
- Limits: 256 KB per character, 12 per room, 10 new rooms per client per hour, 5000 rooms in total.
- Tests never call production: `smoke`, `a11y` and `live.cjs` point the API at a closed local port (offline); `npm run test:server` (API, local wrangler dev) and `npm run smoke:rooms` (two phones
  and a DM through a local Worker, with axe). The app reads the API address from localStorage `ps.api` (tests only).
