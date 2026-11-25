// A campaign in the real app (iPhone, local files, the server pointed at a closed port): build a Cleric and a Fighter
// in the wizard, level both from 1 to 20 through the Level up sheet (average HP + every choice), and at every level
// check what the sheet shows against the engine. At level 5, a fight: damage through temp HP, a spell attack with its
// math, Cure Wounds with a slot, concentration, a short rest with Hit Dice and a long rest.
const { chromium, devices } = require('playwright')
const http = require('http')
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.json': 'application/json' }
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'))
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
let fails = 0, checks = 0
const ok = (c, m) => { checks++; if (!c) { fails++; console.log(`FAIL ${m}`) } }
const say = (m) => console.log(`ok  ${m}`)
const shots = path.join(root, 'screenshots')

/** Makes every open choice in `scope` (the wizard page or the Level up sheet) the way a player would. */
async function choose(p, scope) {
  for (let guard = 0; guard < 40; guard++) {
    const panel = p.locator(`${scope} .panel.choice:not(.done)`).first()
    if (!(await panel.count())) return
    if (await panel.locator('button:has-text("+2 to one")').count()) {
      await panel.locator('button:has-text("+2 to one")').click()
      await panel.locator('.abil-grid .chip:not([disabled])').first().click()
    } else if (await panel.locator('button:has-text("Take a feat")').count() === 0 && await panel.locator('.abil-grid .chip').count()) {
      await panel.locator('.abil-grid .chip:not([disabled])').first().click() // an epic boon's +1
    } else {
      const card = panel.locator('.card.opt:not(.on):not([disabled])').first()
      if (!(await card.count())) throw new Error(`can't satisfy: ${await panel.locator('h2').textContent()}`)
      await card.click()
    }
  }
  throw new Error('choices never settle')
}

;(async () => {
  const { derive } = await import('../src/engine/engine.js')
  await new Promise((r) => server.listen(8779, r))
  const URL = 'http://localhost:8779/'
  const b = await chromium.launch()
  const ctx = await b.newContext({ ...devices['iPhone 13 Pro'] })
  await ctx.addInitScript(() => { (localStorage.setItem('ps.api', JSON.stringify('http://127.0.0.1:9')), localStorage.setItem('ps.seenLanding', 'true')); localStorage.setItem('ps.throwOnScreen', 'false') })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept())
  const stored = (name) => p.evaluate((n) => new Promise((res) => { const r = indexedDB.open('party-sheets', 1); r.onsuccess = () => { const q = r.result.transaction('characters').objectStore('characters').getAll(); q.onsuccess = () => res(q.result.find((c) => c.name === n)) } }), name)
  const num = async (sel) => Number((await p.textContent(sel)).replace(/[^0-9-]/g, ''))
  const statB = (label) => `.vitals .stat:has(.lbl:text-is("${label}")) b`

  async function build(name, cls, species, bg) {
    await p.goto(URL)
    await p.click('text=+ New hero')
    await p.fill('input[placeholder="e.g. Katsebushi"]', name)
    await p.click('.wiz-foot button')
    await p.click(`.class-card:has-text("${cls}")`); await p.click('.wiz-foot button')
    await p.click(`.card:has-text("${species}")`); await choose(p, '.wizard'); await p.click('.wiz-foot button')
    await p.click(`.card:has-text("${bg}")`); await choose(p, '.wizard'); await p.click('button:has-text("+2 and +1")'); await p.click('.wiz-foot button')
    await p.click('button:has-text("Suggest for")'); await p.click('.wiz-foot button')
    await choose(p, '.wizard'); await p.click('.wiz-foot button')
    await p.click('.card.opt >> nth=0'); await p.click('.wiz-foot button')
    await p.click('button:has-text("Start playing")'); await p.waitForSelector('.vitals')
  }

  /** The sheet shows the engine's numbers for the stored character. */
  async function sheetMatches(name, level) {
    const ch = await stored(name)
    const d = derive(ch)
    ok(ch.level === level, `${name} ${level}: stored level ${ch.level}`)
    ok(d.pending.length === 0, `${name} ${level}: choices left ${d.pending.map((x) => x.key)}`)
    ok((await p.textContent('.vitals .hp b')).replace(/\s/g, '').endsWith(`/${d.hp.value}`), `${name} ${level}: max HP ${d.hp.value} on the sheet`)
    ok(await num(statB('AC')) === d.ac.value, `${name} ${level}: AC ${d.ac.value}`)
    ok(await num(statB('Prof')) === d.prof, `${name} ${level}: proficiency +${d.prof}`)
    for (const a of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) ok(Number((await p.textContent(`.abil-mini:has(small:text-is("${a}")) .score`)).trim()) === d.scores[a].total, `${name} ${level}: ${a} score`)
    return { ch, d }
  }

  async function levelUp(name, to) {
    const before = derive(await stored(name))
    const hpBefore = Number((await p.textContent('.vitals .hp b')).replace(/\s/g, '').split('/')[0])
    // the preview of the next level (from the sheet), then level up, then the summary: they must agree
    await p.click('.next-level')
    const preview = await p.$$eval('.sheet .lvl-lines li', (e) => e.map((x) => x.textContent))
    const asiHere = /Ability Score Improvement|Epic Boon/.test(await p.textContent('.sheet .lvl-summary'))
    ok((await p.textContent('.next-level')).includes(`Level ${to}`), `${name} ${to}: the sheet previews level ${to}`)
    await p.click('.sheet button:has-text("Level up now")')
    await p.click('.sheet button:has-text("(average)")')
    await choose(p, '.sheet')
    await p.click(`.sheet button:has-text("Become level ${to}")`)
    await p.waitForSelector('.sheet .lvl-summary')
    const summary = await p.$$eval('.sheet .lvl-lines li', (e) => e.map((x) => x.textContent))
    const hpLine = (list) => list.find((t) => t.startsWith('Max HP'))
    // with no ASI at this level the preview is exact; with one, the choice (say +2 CON) can change the numbers
    if (!asiHere) ok(hpLine(summary) === hpLine(preview), `${name} ${to}: summary HP line = preview (${hpLine(summary)})`)
    const shownMax = Number(hpLine(summary)?.match(/→\s*(\d+)/)?.[1])
    ok(shownMax === derive(await stored(name)).hp.value, `${name} ${to}: summary shows the new max HP ${shownMax}`)
    await p.click('.sheet button:text-is("Done")')
    await p.waitForSelector('.scrim', { state: 'detached' })
    const { d } = await sheetMatches(name, to)
    const gained = d.hp.value - before.hp.value
    ok(Number((await p.textContent('.vitals .hp b')).replace(/\s/g, '').split('/')[0]) === Math.min(d.hp.value, hpBefore + Math.max(0, gained)), `${name} ${to}: current HP goes up by the gain (+${gained})`)
    return d
  }

  // ── the Cleric: 1 → 20, with a fight at level 5
  await build('Mira', 'Cleric', 'Dwarf', 'Acolyte')
  await sheetMatches('Mira', 1); say('Mira (Cleric, dwarf) built at level 1 and the sheet matches the engine')
  for (let lv = 2; lv <= 20; lv++) {
    const d = await levelUp('Mira', lv)
    if (lv === 5) {
      // the fight
      const max = d.hp.value
      await p.click('.vitals .hp'); await p.fill('input[aria-label="Amount"]', '6'); await p.click('.sheet button:text-is("Temp HP")')
      await p.click('.vitals .hp'); await p.fill('input[aria-label="Amount"]', '20'); await p.click('.sheet button:text-is("Damage")')
      ok((await p.textContent('.vitals .hp b')).replace(/\s/g, '') === `${max - 14}/${max}`, `fight: 20 damage with 6 temp HP leaves ${max - 14}`)
      await p.click('[role=tab]:has-text("Spells")')
      const dc = await num('.sc-head .stat-card:has(.lbl:text-is("Spell save DC")) b')
      ok(dc === d.spellcasting.dc.value, `fight: spell save DC ${dc}`)
      await p.click('.sc-head button:has-text("Spell attack")')
      await p.waitForSelector('.roll-card')
      const steps = await p.$$eval('.roll-card .math li:not(.sum) b', (e) => e.map((x) => Number(x.textContent.replace('+', ''))))
      const total = Number(await p.textContent('.roll-card .rc-head b'))
      ok(steps.reduce((a, b) => a + b, 0) === total, `fight: spell attack math adds up (${steps.join(' + ')} = ${total})`)
      ok(steps.length >= 3 && steps.slice(1).reduce((a, b) => a + b, 0) === d.spellcasting.attack.value, 'fight: spell attack bonus = WIS + proficiency')
      await p.click('.roll-card button[aria-label="Close the roll"]')
      const slot2 = async () => p.textContent('.slots .res:has-text("2nd level") small')
      ok((await slot2()).startsWith('3 of 3'), 'fight: three 2nd-level slots')
      await p.click('.spell:has(b:text-is("Cure Wounds")) button:text-is("Cast")')
      await p.click('.sheet button:has-text("2nd-level slot")')
      await p.click('.sheet button:has-text("Heal 4d8")')
      await p.waitForSelector('.roll-card')
      const heal = Number(await p.textContent('.roll-card .rc-head b'))
      const hsteps = await p.$$eval('.roll-card .math li:not(.sum) b', (e) => e.map((x) => Number(x.textContent.replace('+', ''))))
      ok(hsteps.reduce((a, b) => a + b, 0) === heal && heal >= 4 + d.mod.WIS && heal <= 32 + d.mod.WIS, `fight: Cure Wounds at 2nd level heals 4d8 + WIS = ${heal}`)
      await p.click('.roll-card button[aria-label="Close the roll"]').catch(() => {})
      await p.click('.sheet button:text-is("Done")')
      ok((await slot2()).startsWith('2 of 3'), 'fight: casting used a 2nd-level slot')
      await p.click('.vitals .hp'); await p.fill('input[aria-label="Amount"]', String(heal)); await p.click('.sheet button:text-is("Heal")')
      ok((await p.textContent('.vitals .hp b')).replace(/\s/g, '') === `${Math.min(max, max - 14 + heal)}/${max}`, 'fight: healed')
      await p.click('.spell:has(b:text-is("Bless")) button:text-is("Cast")')
      await p.click('.sheet button:has-text("1st-level slot")'); await p.click('.sheet button:text-is("Done")')
      ok(await p.isVisible('.conc:has-text("Bless")'), 'fight: concentrating on Bless')
      await p.click('.vitals .hp'); ok(await p.isVisible('.sheet .warn-line:has-text("CON save")'), 'fight: damage reminds about the concentration save'); await p.click('.sheet button[aria-label="Close"]')
      // short rest: spend a Hit Die (d8 + CON); slots stay spent
      await p.click('.vitals .hp'); await p.fill('input[aria-label="Amount"]', '15'); await p.click('.sheet button:text-is("Damage")')
      // concentrating on Bless: the damage rolls the CON save (DC 10 for 15 damage) by itself
      await p.waitForSelector('.roll-card:has-text("Concentration: CON save, DC 10")')
      const saveTotal = Number(await p.textContent('.roll-card .rc-head b'))
      await p.click('button[aria-label="Close the roll"]')
      ok((await p.isVisible('.conc:has-text("Bless")')) === (saveTotal >= 10), `fight: the CON save (${saveTotal} vs DC 10) ${saveTotal >= 10 ? 'keeps' : 'ends'} Bless`)
      const hpLow = Number((await p.textContent('.vitals .hp b')).replace(/\s/g, '').split('/')[0])
      await p.click('button:has-text("Short rest")')
      await p.click('.sheet button:has-text("Roll a Hit Die"), .sheet button:has-text("Hit Die")')
      await p.waitForTimeout(400)
      await p.click('.roll-card button[aria-label="Close the roll"]').catch(() => {})
      const hpAfterHd = Number((await p.textContent('.vitals .hp b')).replace(/\s/g, '').split('/')[0])
      ok(hpAfterHd > hpLow && hpAfterHd - hpLow <= 8 + d.mod.CON, `short rest: a Hit Die healed ${hpAfterHd - hpLow}`)
      await p.click('.sheet button:has-text("Finish")').catch(async () => { await p.click('.sheet button[aria-label="Close"]') })
      ok((await slot2()).startsWith('2 of 3'), 'short rest: spell slots stay spent')
      await p.screenshot({ path: `${shots}/campaign-fight.png`, fullPage: true })
      await p.click('button:has-text("Long rest")')
      ok((await p.textContent('.vitals .hp b')).replace(/\s/g, '') === `${max}/${max}`, 'long rest: full HP')
      ok((await slot2()).startsWith('3 of 3'), 'long rest: slots back')
      ok(!(await p.isVisible('.conc-banner')) && !(await p.isVisible('.conc')), 'long rest: concentration ended')
      await p.click('[role=tab]:has-text("Your Turn")')
      say('Mira at level 5: a full fight and both rests')
    }
  }
  await p.screenshot({ path: `${shots}/campaign-cleric-20.png`, fullPage: true })
  say('Mira levelled 1 → 20 through the Level up sheet; every level matches the engine')

  // ── the Fighter: 1 → 20, Battle Master
  await p.click('button[aria-label="All characters"]')
  await build('Brakka', 'Fighter', 'Orc', 'Soldier')
  await sheetMatches('Brakka', 1)
  for (let lv = 2; lv <= 20; lv++) {
    const d = await levelUp('Brakka', lv)
    const per = d.attacksPerAction
    if ([5, 11, 20].includes(lv)) {
      ok((await p.textContent('.turn')).includes(`${per} per Attack action`) || (await p.textContent('.turn')).includes(`${per} attacks`), `Brakka ${lv}: ${per} attacks per Attack action on the sheet`)
      // an attack roll's math adds up to the to-hit on the sheet
      await p.click('.attack >> nth=0 >> .roll-btn >> nth=0')
      await p.waitForSelector('.roll-card')
      const steps = await p.$$eval('.roll-card .math li:not(.sum) b', (e) => e.map((x) => Number(x.textContent.replace('+', ''))))
      ok(steps.reduce((a, b) => a + b, 0) === Number(await p.textContent('.roll-card .rc-head b')), `Brakka ${lv}: attack math adds up`)
      await p.click('.roll-card button[aria-label="Close the roll"]')
    }
  }
  say('Brakka levelled 1 → 20; attacks per action and attack math checked at 5, 11 and 20')
  await p.screenshot({ path: `${shots}/campaign-fighter-20.png`, fullPage: true })
  ok(errs.length === 0, `no page errors ${errs.join(' | ')}`)
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'nothing scrolls sideways')
  await b.close(); server.close()
  console.log(`\n${checks} checks, ${fails ? `${fails} FAILED` : 'all good'}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
