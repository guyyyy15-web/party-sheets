// Rooms end to end, all local: wrangler dev (local D1) + the app over a local server. Phone A makes a group and
// brings a hero, phone B joins with the invite, the DM opens the DM link: live sheets, quick actions both ways,
// offline and back. Never calls the production server. Screenshots in screenshots/rooms-*.png.
const { chromium, devices } = require('playwright')
const { spawn, execSync } = require('child_process')
const http = require('http')
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')
const srv = path.join(root, 'server')
const API = 'http://127.0.0.1:8798'
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.json': 'application/json' }
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'))
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
let fails = 0
const ok = (c, m) => { console.log(`${c ? 'ok ' : 'FAIL'} ${m}`); if (!c) fails++ }
const shots = path.join(root, 'screenshots')
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
async function axe(p, name) {
  await p.addScriptTag({ content: AXE })
  const bad = (await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, impact: v.impact, sample: v.nodes[0]?.target?.join(' ') })))).filter((v) => v.impact === 'serious' || v.impact === 'critical')
  ok(!bad.length, `a11y ${name}${bad.length ? `: ${JSON.stringify(bad)}` : ''}`)
}
const until = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true } catch {} await new Promise((r) => setTimeout(r, 300)) } return false }

;(async () => {
  const { newCharacter, derive } = await import('../src/engine/engine.js')
  const hero = (name, over) => ({ ...newCharacter(), name, portrait: { kind: 'icon', src: '⚔️' }, ...over })
  const aria = hero('Aria', { classId: 'fighter', level: 3, speciesId: 'human', backgroundId: 'soldier', scores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 12, CHA: 8 } })
  const brom = hero('Brom', { classId: 'monk', level: 2, speciesId: 'dwarf', backgroundId: 'acolyte', scores: { STR: 10, DEX: 16, CON: 14, INT: 8, WIS: 15, CHA: 10 } })
  const mira = hero('Mira', { classId: 'cleric', level: 3, speciesId: 'human', backgroundId: 'acolyte', scores: { STR: 10, DEX: 12, CON: 14, INT: 10, WIS: 16, CHA: 12 }, spells: { cantrips: [], prepared: ['bless'] } })
  for (const c of [aria, brom, mira]) c.state.hp = derive(c).hp.value
  const backup = (c) => ({ name: `${c.name}.json`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'party-sheets-backup', v: 1, characters: [c] })) })

  const state = path.join(srv, '.wrangler/state-rooms')
  fs.rmSync(state, { recursive: true, force: true })
  execSync(`npx wrangler d1 migrations apply party-sheets --local --persist-to ${state}`, { cwd: srv, stdio: 'ignore' })
  const dev = spawn('npx', ['wrangler', 'dev', '--port', '8798', '--ip', '127.0.0.1', '--persist-to', state, '--var', 'ALLOW_LOCALHOST:1'], { cwd: srv, stdio: 'ignore', detached: true })
  const stop = () => { try { process.kill(-dev.pid) } catch {} server.close() }
  try {
    ok(await until(async () => (await fetch(`${API}/health`)).ok, 60000), 'local Worker up')
    await new Promise((r) => server.listen(8772, r))
    const URL = 'http://localhost:8772/'
    fs.mkdirSync(shots, { recursive: true })
    const b = await chromium.launch()
    const phone = async () => {
      const ctx = await b.newContext({ ...devices['iPhone 13 Pro'] })
      await ctx.addInitScript((api) => (localStorage.setItem('ps.api', JSON.stringify(api)), localStorage.setItem('ps.seenLanding', 'true'), localStorage.setItem('ps.throwOnScreen', 'false')), API)
      const p = await ctx.newPage(); p.on('dialog', (d) => d.accept()); p.on('pageerror', (e) => ok(false, `page error: ${e.message}`))
      return { ctx, p }
    }

    // phone A: a new group, then bring Aria
    const A = await phone()
    await A.p.goto(URL)
    await A.p.click('text=+ New group')
    await A.p.fill('input[placeholder="Thursday night"]', 'Thursday night')
    await A.p.click('button:has-text("Create group")')
    await A.p.waitForSelector('text=Invite for players')
    const invite = await A.p.inputValue('input[aria-label="Invite for players"]')
    const dmUrl = await A.p.inputValue('input[aria-label="DM link (keep it for the DM)"]')
    ok(/#\/join\//.test(invite) && /#\/dm\//.test(dmUrl), 'group made, with an invite and a DM link')
    await A.p.screenshot({ path: `${shots}/rooms-1-links.png` })
    await axe(A.p, 'group links')
    await A.p.click('button[aria-label="Close"]')
    await A.p.setInputFiles('input[aria-label="Backup file"]', backup(aria))
    // saved on the server before it joins any group
    await until(() => A.p.evaluate(() => !!localStorage.getItem('ps.owner')))
    const ownerA = await A.p.evaluate(() => JSON.parse(localStorage.getItem('ps.owner')))
    const mine = async () => (await (await fetch(`${API}/me/characters`, { headers: { 'X-Owner': ownerA } })).json()).characters
    ok(await until(async () => (await mine()).some((c) => c.data.name === 'Aria' && c.roomId === null)), 'phone A: Aria is saved on the server without a group')
    await A.p.click('button:has-text("Bring a character")')
    await A.p.click('.sheet button:has-text("Aria")')
    ok(await until(() => A.p.isVisible('text=Aria joined Thursday night')), 'phone A: Aria joined the group')

    // phone B: opens the invite, brings Brom, sees Aria in the party
    const B = await phone()
    await B.p.goto(invite)
    ok(await until(() => B.p.isVisible('text=You joined')), 'phone B: joined with the invite')
    ok(!(await B.p.evaluate(() => location.hash)), 'phone B: the key is gone from the address bar')
    await B.p.setInputFiles('input[aria-label="Backup file"]', backup(brom))
    await B.p.click('button:has-text("Bring a character")')
    await B.p.click('.sheet button:has-text("Brom")')
    ok(await until(() => B.p.isVisible('text=Also here: Aria')), 'phone B: sees Aria in the party')
    await B.p.screenshot({ path: `${shots}/rooms-2-home.png`, fullPage: true })
    await axe(B.p, 'home with a group')

    // the DM, on a laptop
    const dctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
    await dctx.addInitScript((api) => (localStorage.setItem('ps.api', JSON.stringify(api)), localStorage.setItem('ps.seenLanding', 'true')), API)
    const D = await dctx.newPage(); D.on('pageerror', (e) => ok(false, `DM page error: ${e.message}`))
    await D.goto(dmUrl)
    ok(await until(async () => (await D.locator('.dm-card').count()) === 2), 'DM: sees both characters')
    const ariaMax = derive(aria).hp.value
    await D.click('.dm-card:has-text("Aria") .dm-hp')
    await D.fill('input[aria-label="Amount"]', '5')
    await D.click('.sheet button:has-text("Damage")')
    await D.click('.dm-card:has-text("Brom") .insp')
    await D.click('.dm-card:has-text("Brom") .cond-btn')
    await D.click('.cond:has(b:text-is("Poisoned"))')
    await D.click('button[aria-label="Close"]')
    await D.screenshot({ path: `${shots}/rooms-3-dm-desktop.png` })
    await axe(D, 'DM screen')

    // phone A sees the damage on Aria's sheet; phone B sees Brom poisoned and inspired
    await A.p.click('.char-card:has-text("Aria")')
    ok(await until(async () => (await A.p.textContent('.vitals .hp b')).startsWith(String(ariaMax - 5)), 15000), `phone A: Aria's HP is ${ariaMax - 5} after the DM's damage`)
    await B.p.click('.char-card:has-text("Brom")')
    ok(await until(async () => (await B.p.textContent('.cond-btn')).includes('Poisoned') && (await B.p.getAttribute('.status-row .insp', 'aria-pressed')) === 'true', 15000), 'phone B: Brom poisoned and inspired by the DM')

    // the DM gives Brom a magic weapon; Brom takes it in hand and it shows in his attacks
    await D.click('.dm-card:has-text("Brom") button:has-text("Give an item")')
    await D.fill('.sheet input[placeholder^="Flame Tongue"]', 'Moonblade')
    await D.selectOption('.sheet select', 'shortsword')
    await D.click('.sheet button[aria-label="Magic bonus up"]')
    await D.click('.sheet button:has-text("Give it to Brom")')
    ok(await until(() => B.p.isVisible('text=From the DM: Moonblade'), 20000), 'phone B: "From the DM: Moonblade"')
    await B.p.screenshot({ path: `${shots}/rooms-4b-gift.png` })
    await B.p.click('.gift-banner button:has-text("Hold it")')
    ok(await until(() => B.p.isVisible('.attack:has-text("Moonblade")')), 'phone B: Moonblade is in his attacks')
    { const t = await B.p.textContent('.attack:has-text("Moonblade") .roll-row'); ok(/\+7tohit1d6\+5/.test(t.replace(/\s+/g, "")), `phone B: +7 to hit, 1d6+5 (DEX +4, proficiency +2, magic +1): ${t}`) }

    // a player change reaches the DM
    await A.p.click('.status-row .insp')
    ok(await until(async () => (await D.getAttribute('.dm-card:has-text("Aria") .insp', 'aria-pressed')) === 'true', 15000), 'DM: sees Aria take Inspiration')

    // ── initiative: the DM makes the Initiative link, a third phone runs the fight
    await D.click('button:has-text("Invite")')
    await D.click('button:has-text("Make an Initiative link")')
    await D.waitForSelector('input[aria-label="Initiative link"]')
    const initUrl = await D.inputValue('input[aria-label="Initiative link"]')
    ok(/#\/init\//.test(initUrl), 'DM: made the Initiative link')
    await D.click('button[aria-label="Close"]')
    const T = await phone()
    await T.p.goto(initUrl)
    ok(await until(() => T.p.isVisible('text=No fight right now')), 'runner: the Initiative screen opens from the link')
    await T.p.click('button:has-text("Start a fight")')
    ok(await until(async () => (await T.p.locator('.init-row').count()) === 2), 'runner: the party is in the fight')
    // Aria rolls on her sheet (sent by itself); Brom's player rolled real dice and types it
    ok(await until(() => A.p.isVisible('text=A fight! Roll initiative'), 15000), 'phone A: the sheet says to roll initiative')
    await A.p.click('.fight-banner button:has-text("Roll")')
    await A.p.waitForSelector('.roll-card'); await A.p.click('button[aria-label="Close the roll"]')
    ok(await until(() => B.p.isVisible('text=A fight! Roll initiative'), 15000), 'phone B: the sheet says to roll initiative')
    await B.p.click('button:has-text("I rolled real dice")')
    await B.p.fill('input[aria-label="Your initiative total"]', '15')
    await B.p.click('.fight-banner button:has-text("Send")')
    ok(await until(async () => (await T.p.textContent('.init-row:has-text("Brom") .init-num')) === '15' && (await T.p.textContent('.init-row:has-text("Aria") .init-num')) !== '?', 15000), 'runner: both rolls arrived (Brom typed 15)')
    // enemies by kind and count, then a number typed by hand
    await T.p.click('button:has-text("+ Enemies")')
    await T.p.fill('input[placeholder^="Soldier"]', 'Soldier')
    await T.p.click('button[aria-label="How many up"]'); await T.p.click('button[aria-label="How many up"]')
    await T.p.fill('.sheet .field:has(span:text-is("AC (if you know it)")) input', '14')
    await T.p.click('button:has-text("Add 3 × Soldier")')
    ok(await until(async () => (await T.p.locator('.init-row.npc').count()) === 3), 'runner: Soldier 1–3 joined the order')
    ok(/AC 14 · Damage taken 0/.test(await T.p.textContent('.init-row:has-text("Soldier 2")')), 'runner: each soldier has AC 14 and 0 damage taken')
    await T.p.click('.init-row:has-text("Aria") .init-num')
    await T.p.fill('input[aria-label="Initiative total"]', '25')
    await T.p.click('.sheet button:has-text("Set 25")')
    ok(await until(async () => (await T.p.textContent('.init-row >> nth=0')).includes('Aria')), 'runner: Aria typed to 25 goes to the top')
    await T.p.click('button:has-text("Start round 1")')
    ok(await until(async () => (await T.p.textContent('.init-row.now')).includes('Aria')), 'runner: round 1 starts with Aria')
    ok(await until(() => A.p.isVisible('text=Your turn!'), 15000), 'phone A: "Your turn!"')
    // the turn guide opens by itself: whom, to hit, damage, sent to the runner
    ok(await until(() => A.p.isVisible('.sheet[aria-label="My turn"]'), 15000), 'phone A: the turn guide opened by itself')
    let claimed = 0
    for (let tryN = 0; tryN < 6 && !claimed; tryN++) {
      if (!(await A.p.isVisible('.sheet[aria-label="My turn"]'))) await A.p.click('button:has-text("Start my turn")')
      const G = A.p.locator('.sheet[aria-label="My turn"]')
      await G.locator('.guide-opt:has-text("Unarmed Strike")').click()
      if (tryN === 0) { ok(await G.locator('text=Who are you attacking?').isVisible(), 'phone A: "Who are you attacking?"'); await A.p.screenshot({ path: `${shots}/rooms-5b-target.png` }) }
      if (await G.locator('.guide-opt:has-text("Soldier 2")').count()) await G.locator('.guide-opt:has-text("Soldier 2")').click()
      await G.locator('button:has-text("Roll to hit (")').click()
      await A.p.waitForSelector('.roll-card'); await A.p.click('button[aria-label="Close the roll"]')
      if (await G.locator('button:text-is("Hit")').count()) await G.locator('button:text-is("Hit")').click()
      else if (await G.locator('button:has-text("Roll damage ›")').count()) await G.locator('button:has-text("Roll damage ›")').click()
      else { await G.locator('button[aria-label="Close"]').click(); continue } // a natural 1: try again
      await G.locator('button:has-text("Roll damage (")').click()
      await A.p.waitForSelector('.roll-card')
      claimed = Number((await A.p.textContent('.roll-card .rc-head b')).match(/\d+/)?.[0] || 0)
      await A.p.click('button[aria-label="Close the roll"]')
      ok(await until(() => G.locator('text=Sent: the DM confirms it.').isVisible()), 'phone A: damage sent, waiting for the runner')
      await G.locator('button[aria-label="Close"]').click()
    }
    ok(await until(async () => (await T.p.locator('.claim').count()) === 1, 15000), 'runner: the damage waits for approval')
    await T.p.screenshot({ path: `${shots}/rooms-5c-claim.png` })
    const asked = Number(await T.p.inputValue('.claim input'))
    await T.p.click('.claim button:has-text("✓")')
    ok(await until(async () => new RegExp(`Damage taken ${asked}`).test(await T.p.textContent('.init-row:has-text("Soldier 2")'))), `runner: approved, Soldier 2 took ${asked}`)
    // damage counts up from 0; the DM says when it falls
    await T.p.click('.init-row:has-text("Soldier 1") .init-main')
    await T.p.fill('input[aria-label="Amount"]', '8'); await T.p.click('.sheet button:has-text("+ Damage")')
    await T.p.fill('input[aria-label="Amount"]', '12'); await T.p.click('.sheet button:has-text("+ Damage")')
    ok(await until(async () => /Damage taken: 20/.test(await T.p.textContent('.dmg-total'))), 'runner: 8 + 12 = 20 damage taken')
    await T.p.click('.sheet button:has-text("The DM says it fell")')
    await T.p.click('button[aria-label="Close"]')
    ok(await until(async () => /fell/.test(await T.p.textContent('.init-row:has-text("Soldier 1")'))), 'runner: Soldier 1 fell')
    await T.p.screenshot({ path: `${shots}/rooms-5-initiative.png`, fullPage: true })
    await axe(T.p, 'Initiative screen')
    await B.p.waitForTimeout(5500)
    await B.p.click('button.fight-banner')
    const order = await B.p.textContent('.sheet .init-list')
    ok(/Soldier 1\s*fell/.test(order) && !/AC/.test(order), `phone B: sees Soldier 1 fell, no enemy AC (${order.replace(/\s+/g, ' ').slice(0, 120)})`)
    await B.p.screenshot({ path: `${shots}/rooms-6-player-order.png` })
    await B.p.click('button[aria-label="Close"]')
    await T.ctx.close()

    // offline and back: the change waits, then arrives
    await A.ctx.setOffline(true)
    await A.p.click('.vitals .hp'); await A.p.fill('input[aria-label="Amount"]', '3'); await A.p.click('.sheet button:has-text("Heal")')
    ok(await until(() => A.p.isVisible('.sync-badge.offline'), 8000), 'phone A: shows "not saved: no connection"')
    ok(await A.p.isVisible('.sync-badge button:has-text("Save now")'), 'phone A: offers Save now')
    await A.p.click('.sync-badge button:has-text("Save now")') // still offline: stays unsaved, nothing lost
    ok(await until(() => A.p.isVisible('.sync-badge.offline')), 'phone A: Save now while offline keeps it pending')
    await A.ctx.setOffline(false)
    if (await A.p.isVisible('.sync-badge button:has-text("Save now")')) await A.p.click('.sync-badge button:has-text("Save now")').catch(() => {})
    ok(await until(() => A.p.isVisible('.sync-badge.ok')), 'phone A: saved once back online')
    ok(await until(async () => (await D.textContent('.dm-card:has-text("Aria") .dm-hp b')).startsWith(String(ariaMax - 2)), 15000), 'DM: sees the heal made offline')
    await A.p.screenshot({ path: `${shots}/rooms-4-sheet.png` })

    // ── spells on friends: Mira (a cleric on a third phone) casts Bless on Aria and Brom; both sheets show it; Mira
    // takes damage, fails the CON save, and Bless is gone from both sheets
    const M = await phone()
    await M.p.goto(invite)
    ok(await until(() => M.p.isVisible('text=You joined')), 'phone M: joined with the invite')
    await M.p.setInputFiles('input[aria-label="Backup file"]', backup(mira))
    await M.p.click('button:has-text("Bring a character")')
    await M.p.click('.sheet button:has-text("Mira")')
    ok(await until(() => M.p.isVisible('text=Mira joined')), 'phone M: Mira joined the group')
    await M.p.click('.char-card:has-text("Mira")')
    await M.p.click('.tabs button:text-is("Spells")')
    await M.p.click('.spell:has-text("Bless") button:text-is("Cast")')
    await M.p.click('.sheet button:has-text("1st-level slot")')
    ok(await until(() => M.p.isVisible('.buff-targets .guide-opt:has-text("Aria")')), 'phone M: Bless asks who gets it, with the party')
    await M.p.click('.buff-targets .guide-opt:has-text("Aria")')
    await M.p.click('.buff-targets .guide-opt:has-text("Brom")')
    ok(await until(async () => (await M.p.locator('.buff-targets .guide-opt:has-text("on their sheet")').count()) === 2), 'phone M: Bless sent to Aria and Brom')
    await M.p.screenshot({ path: `${shots}/rooms-7-bless-targets.png` })
    await axe(M.p, 'buff targets')
    await M.p.click('.sheet button:text-is("Done")')
    const onSheet = async (P, name) => { if (!(await P.p.isVisible(`.char-top h1:text-is("${name}")`))) { await P.p.goto(URL); await P.p.click(`.char-card:has-text("${name}")`) } }
    await onSheet(A, 'Aria'); await onSheet(B, 'Brom')
    ok(await until(() => A.p.isVisible('.buff:has-text("Bless (from Mira)")'), 30000), 'phone A: Aria shows Bless (from Mira)')
    ok(await until(() => B.p.isVisible('.buff:has-text("Bless (from Mira)")'), 30000), 'phone B: Brom shows Bless (from Mira)')
    await A.p.screenshot({ path: `${shots}/rooms-8-blessed.png` })
    // Aria's saves now add the d4: a DEX save shows "Bless (from Mira)" in its math
    await A.p.evaluate(() => localStorage.setItem('ps.throwOnScreen', 'false'))
    await A.p.click('.tabs button:text-is("Checks")')
    await A.p.click('button[aria-label^="DEX saving throw"]')
    ok(await until(() => A.p.isVisible('.roll-card .math li:has-text("Bless (from Mira)")')), 'phone A: a save rolls the Bless d4 with the d20')
    await A.p.click('.roll-card button[aria-label="Close the roll"]').catch(() => {})
    // Mira takes 6 damage and rolls a 1 on her CON save
    await M.p.evaluate(() => { Math.random = () => 0 })
    await M.p.click('.vitals .hp'); await M.p.fill('input[aria-label="Amount"]', '6'); await M.p.click('.sheet button:has-text("Damage")')
    ok(await until(async () => !(await M.p.isVisible('.conc-banner'))), 'phone M: the failed save ended her concentration')
    ok(await until(async () => !(await A.p.isVisible('.buff:has-text("Bless")')), 30000), 'phone A: Bless is gone from Aria')
    ok(await until(async () => !(await B.p.isVisible('.buff:has-text("Bless")')), 30000), 'phone B: Bless is gone from Brom')
    // Mira leaves again (the checks below count two characters in the group)
    await M.p.click('button[aria-label="Character settings"]')
    await M.p.click('button:has-text("Leave the group")')
    ok(await until(async () => (await D.locator('.dm-card').count()) === 2, 15000), 'DM: Mira left the room')
    await M.ctx.close()

    // accounts: phone A saves an account with a username + password and with "Face ID" (a virtual authenticator with
    // PRF, the same thing a passkey does on an iPhone); a new phone signs in and lands on Aria's sheet, with the groups
    const cdpA = await A.ctx.newCDPSession(A.p)
    await cdpA.send('WebAuthn.enable')
    const { authenticatorId: authA } = await cdpA.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, hasPrf: true, automaticPresenceSimulation: true } })
    await A.p.click('button[aria-label="All characters"]')
    await A.p.click('.acct-chip')
    await A.p.click('[role=tab]:has-text("Create one")')
    await A.p.fill('input[autocomplete="username"]', 'aria_player'); await A.p.fill('input[type=password]', 'secret-password-1')
    await A.p.click('button:has-text("Create with username + password")')
    ok(await until(() => A.p.isVisible('text=✓ on')), 'phone A: account created with username + password')
    await A.p.click('.acct-methods li:has-text("Face ID"), .acct-methods li:has-text("passkey"), .acct-methods li:has-text("fingerprint") >> button:has-text("Add")').catch(() => {})
    const pkOn = await until(async () => (await A.p.locator('.acct-methods .ok-line').count()) === 2, 15000)
    ok(pkOn, 'phone A: Face ID (passkey with PRF) added too')
    await A.p.click('.sheet button[aria-label="Close"]')
    ok((await A.p.textContent('.acct-chip')).includes('aria_player'), 'phone A: the account chip shows the username')

    const P = await phone()
    await P.p.goto(URL)
    await P.p.click('.acct-chip')
    await P.p.screenshot({ path: `${shots}/rooms-8-sign-in.png` })
    await axe(P.p, 'sign-in sheet')
    await P.p.fill('input[autocomplete="username"]', 'aria_player'); await P.p.fill('input[type=password]', 'wrong-password-9')
    await P.p.click('.acct-form button:text-is("Sign in")')
    ok(await until(() => P.p.isVisible('text=Wrong username or password')), 'new phone: a wrong password is refused')
    await P.p.fill('input[type=password]', 'secret-password-1')
    await P.p.click('.acct-form button:text-is("Sign in")')
    ok(await until(() => P.p.isVisible('.char-top h1:text-is("Aria")'), 20000), 'new phone: signed in with the password, straight onto Aria\'s sheet')
    await P.p.click('button[aria-label="All characters"]')
    ok(await until(() => P.p.isVisible('.room:has-text("Thursday night")')), 'new phone: the group came back too')
    ok(await P.p.isVisible('.room:has-text("Thursday night") button:has-text("DM screen")'), 'new phone: with its DM link')
    await P.p.screenshot({ path: `${shots}/rooms-7-signed-in.png`, fullPage: true })

    if (pkOn) {
      // Face ID round trip on phone A: sign out (its copy goes), then sign back in with the passkey
      await A.p.click('.acct-chip')
      await A.p.click('button:has-text("Sign out on this phone")')
      ok(await until(() => A.p.isVisible('text=No heroes yet')), 'phone A: signed out')
      await A.p.click('.acct-chip')
      await A.p.click('.sheet button:has-text("Sign in with")')
      ok(await until(() => A.p.isVisible('.char-top h1:text-is("Aria")'), 20000), 'phone A: signed back in with Face ID (passkey), straight onto Aria\'s sheet')
      if (!(await A.p.isVisible('.char-top h1'))) console.log('   phone A says:', await A.p.locator('.sheet .warn-line').textContent().catch(() => '(nothing)'))
    }

    // sign out on the new phone: its copy goes, the account keeps everything
    await P.p.click('.acct-chip')
    await P.p.click('button:has-text("Sign out on this phone")')
    ok(await until(() => P.p.isVisible('text=No heroes yet')), 'new phone: signed out, nothing left on the phone')

    // a new phone: the cloud key link brings Aria back from the server
    const N = await phone()
    await N.p.goto(URL + '#/restore/' + ownerA)
    ok(await until(() => N.p.isVisible('.char-card:has-text("Aria")')), 'new phone: the cloud key link restored Aria from the server')
    ok(!(await N.p.evaluate(() => location.hash)), 'new phone: the cloud key is gone from the address bar')
    await N.p.click('.char-card:has-text("Aria")')
    ok(await until(async () => (await N.p.textContent('.vitals .hp b')).startsWith(String(ariaMax - 2))), 'new phone: with the latest HP')

    // the DM screen on a phone
    const dp = await b.newContext({ ...devices['iPhone 13 Pro'] })
    await dp.addInitScript((api) => (localStorage.setItem('ps.api', JSON.stringify(api)), localStorage.setItem('ps.seenLanding', 'true')), API)
    const DP = await dp.newPage(); await DP.goto(dmUrl); await DP.waitForSelector('.dm-card')
    ok(await DP.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'DM on a phone: nothing scrolls sideways')
    await DP.screenshot({ path: `${shots}/rooms-5-dm-phone.png`, fullPage: true })

    // the DM allows expansion subclasses for the group; the player's phone learns it
    await D.click('button:text-is("Settings")')
    await D.click('label:has-text("Allow subclasses from the expansion books") input')
    await D.waitForTimeout(500)
    await D.click('.sheet button[aria-label="Close"]')
    ok(await until(() => B.p.evaluate(() => JSON.parse(localStorage.getItem('ps.rooms') || '[]')[0]?.settings?.expansions === true), 40000), 'phone B: knows the DM allowed expansions')

    // the owner's admin screen: set the password, then see every group and character
    const adm = await b.newContext({ viewport: { width: 1280, height: 900 } })
    await adm.addInitScript((api) => (localStorage.setItem('ps.api', JSON.stringify(api)), localStorage.setItem('ps.seenLanding', 'true')), API)
    const AD = await adm.newPage(); AD.on('pageerror', (e) => ok(false, `admin page error: ${e.message}`))
    await AD.goto(URL + '#/admin')
    await AD.fill('input[type=password]', 'owner-password-123'); await AD.click('button:text-is("Open")')
    await AD.waitForSelector('text=Choose the admin password')
    await AD.click('button:text-is("Set the admin password")')
    ok(await until(() => AD.isVisible('.admin-rooms .room:has-text("Thursday night")')), 'admin: sees the group')
    ok(await AD.locator('.admin-rooms .room:has-text("Thursday night") .admin-chars li').count() === 2, 'admin: sees both characters')
    ok((await AD.textContent('.kinds')).includes('DM actions'), 'admin: usage by kind')
    await AD.screenshot({ path: `${shots}/rooms-6-admin.png`, fullPage: true })
    await axe(AD, 'admin screen')
    const octx = await b.newContext()
    await octx.addInitScript((api) => (localStorage.setItem('ps.api', JSON.stringify(api)), localStorage.setItem('ps.seenLanding', 'true')), API)
    const other = await octx.newPage()
    await other.goto(URL + '#/admin'); await other.fill('input[type=password]', 'not-the-password-1'); await other.click('button:text-is("Open")')
    ok(await until(() => other.isVisible('text=Wrong admin password')), 'admin: a wrong password is refused')

    // leaving the group
    await A.p.click('button[aria-label="Character settings"]')
    await A.p.click('button:has-text("Leave the group")')
    ok(await until(async () => (await D.locator('.dm-card').count()) === 1, 12000), 'DM: Aria left the room')
    ok(await until(async () => (await mine()).some((c) => c.data.name === 'Aria' && c.roomId === null)), 'leaving keeps Aria saved on the server')
    await A.p.click('button[aria-label="Character settings"]')
    await A.p.click('button:has-text("Delete character")')
    ok(await until(async () => !(await mine()).some((c) => c.data.name === 'Aria')), 'deleting removes Aria from the server')

    // the DM deletes the group: phone B keeps Brom, the group disappears there too
    await D.goto(dmUrl.split('#')[0]); await D.waitForSelector('.room:has-text("Thursday night")')
    D.on('dialog', (dg) => dg.accept())
    await D.click('.room:has-text("Thursday night") button[aria-label^="Links for"]')
    await D.click('button:has-text("Delete this group")')
    ok(await until(async () => !(await D.isVisible('.room:has-text("Thursday night")'))), 'DM: the group is deleted')
    await B.p.goto(URL)
    ok(await until(async () => !(await B.p.isVisible('.room:has-text("Thursday night")')) && (await B.p.isVisible('.char-card:has-text("Brom")')), 20000), 'phone B: the group is gone, Brom is still here')
    await b.close()
  } finally { stop() }
  console.log(fails ? `\n${fails} FAILED` : '\nall good')
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
