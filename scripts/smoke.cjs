// Phone test: iPhone viewport, the real files over a local server. Builds a hero in the wizard for each class,
// plays a turn, levels up, rests, backs up, and opens offline. Screenshots in screenshots/.
const { chromium, devices } = require('playwright')
const http = require('http')
const fs = require('fs')
const path = require('path')
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.json': 'application/json' }
const root = path.join(__dirname, '..')
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'))
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
let fails = 0
const ok = (c, m) => { console.log(`${c ? 'ok ' : 'FAIL'} ${m}`); if (!c) fails++ }
const shots = path.join(root, 'screenshots')

async function buildHero(p, { name, cls, species, bg, method, picks }) {
  await p.click('text=+ New character')
  await p.fill('input[placeholder="e.g. Katsebushi"]', name)
  await p.click('button[aria-label="Icon ⚔️"]')
  await p.click('.wiz-foot button')
  await p.click(`.class-card:has-text("${cls}")`)
  await p.click('.wiz-foot button')
  await p.click(`.card:has-text("${species}")`)
  for (const pk of picks.species || []) await p.click(`.panel .card:has-text("${pk}")`)
  await p.click('.wiz-foot button')
  await p.click(`.card:has-text("${bg}")`)
  await p.click('button:has-text("+2 and +1")')
  await p.click('.wiz-foot button')
  if (method === 'point-buy') {
    await p.click('button:has-text("Point buy")')
    for (let i = 0; i < 7; i++) await p.click('button[aria-label="DEX up"]')
    for (let i = 0; i < 5; i++) await p.click('button[aria-label="CON up"]')
    for (let i = 0; i < 5; i++) await p.click('button[aria-label="WIS up"]')
  } else {
    await p.click('button:has-text("Suggest for")')
  }
  await p.screenshot({ path: `${shots}/02-abilities-${cls}.png` })
  await p.click('.wiz-foot button')
  // every open choice: pick options in order until each panel is satisfied
  for (const pk of picks.choices || []) {
    const [panel, text] = pk.includes('|') ? pk.split('|') : [null, pk]
    await p.click(panel ? `.panel.choice:has-text("${panel}") .card:has-text("${text}")` : `.panel.choice .card:has-text("${text}")`)
  }
  await p.screenshot({ path: `${shots}/03-choices-${cls}.png`, fullPage: true })
  const blocked = await p.isDisabled('.wiz-foot button')
  ok(!blocked, `${cls}: all choices made`)
  await p.click('.wiz-foot button')
  await p.click('.card.opt >> nth=0')
  await p.click('.wiz-foot button')
  await p.screenshot({ path: `${shots}/04-ready-${cls}.png` })
  ok(await p.isEnabled('button:has-text("Start playing")'), `${cls}: ready to play`)
  await p.click('button:has-text("Start playing")')
  await p.waitForSelector('.vitals')
}

;(async () => {
  await new Promise((r) => server.listen(8771, r))
  const URL = process.env.SITE || 'http://localhost:8771/'
  fs.mkdirSync(shots, { recursive: true })
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(URL)
  await p.waitForSelector('text=No heroes yet')
  await p.screenshot({ path: `${shots}/01-home-empty.png` })
  ok(true, 'home: empty state')

  // Wizard: a monk like Katsebushi (point buy), a fighter, a rogue
  await p.click('text=+ New character')
  await p.waitForSelector('.wiz-title')
  await p.screenshot({ path: `${shots}/01b-hero.png` })
  await p.click('button[aria-label="Cancel"]')
  await buildHero(p, { name: 'Katsebushi', cls: 'Monk', species: 'Human', bg: 'Criminal', method: 'point-buy',
    picks: { species: ['Perception', 'Savage Attacker'], choices: ['Acrobatics', 'Insight'] } })
  const ac = await p.textContent('.vitals .stat >> nth=0')
  ok(/AC\s*1[45]/.test(ac.replace(/\s+/g, ' ')), `monk sheet shows AC (${ac.replace(/\s+/g, ' ')})`)
  await p.screenshot({ path: `${shots}/05-sheet-monk.png`, fullPage: true })

  // tap AC: where it comes from
  await p.click('.vitals .stat >> nth=0')
  ok(await p.isVisible('.sources >> text=Unarmored Defense'), 'tapping AC shows where it comes from')
  await p.click('.sheet-head .icon-btn')

  // a roll from My Turn (instant mode for speed), then throw on screen from the tray
  await p.click('.fab')
  await p.click('button:has-text("Throw on screen")')
  await p.click('button[aria-label="Close"]')
  await p.click('.attack:has-text("Unarmed Strike") .roll-btn >> nth=0')
  await p.waitForSelector('.roll-toast')
  ok(/Unarmed Strike to hit/.test(await p.textContent('.roll-toast')), 'to hit rolls from the sheet')

  // level up to 3: subclass appears as a choice
  for (const lvl of [2, 3]) {
    await p.click('button:has-text("Level up")')
    await p.click('button:has-text("(average)")')
    if (lvl === 3) await p.click('.panel.choice .card:has-text("Open Hand")')
    await p.click(`button:has-text("Become level ${lvl}")`)
  }
  ok(await p.isVisible('text=Warrior of the Open Hand'), 'level 3: the subclass is chosen in the level-up')
  ok(await p.isVisible('.res:has-text("Focus Points")'), 'Focus Points appear at level 2')
  await p.click('.action:has-text("Flurry of Blows") .roll-btn')
  const pipsAfter = await p.$$eval('.res:has-text("Focus Points") .pip.full', (e) => e.length)
  ok(pipsAfter === 2, `using Flurry spends a Focus Point (${pipsAfter} of 3 left)`)
  await p.click('button:has-text("Short rest")')
  ok((await p.$$eval('.res:has-text("Focus Points") .pip.full', (e) => e.length)) === 3, 'a short rest brings Focus back')
  await p.click('[role=tab]:has-text("Checks")')
  await p.screenshot({ path: `${shots}/06-checks.png`, fullPage: true })
  await p.click('[role=tab]:has-text("Features")')
  ok(await p.isVisible('text=Open Hand Technique'), 'features list the subclass')
  await p.click('button[aria-label="All characters"]')

  await buildHero(p, { name: 'Brakka', cls: 'Fighter', species: 'Dwarf', bg: 'Soldier', method: 'standard',
    picks: { choices: ['Perception', 'Survival', 'Defense', 'Greatsword', 'Longsword', 'Longbow'] } })
  ok(await p.isVisible('.res:has-text("Second Wind")'), 'fighter has Second Wind')
  await p.click('button[aria-label="All characters"]')
  await buildHero(p, { name: 'Pip', cls: 'Rogue', species: 'Halfling', bg: 'Criminal', method: 'standard',
    picks: { choices: ['Acrobatics', 'Deception', 'Perception', 'Investigation', 'Expertise|Stealth', 'Expertise|Sleight of Hand', 'Dagger', 'Shortbow'] } })
  ok(await p.isVisible('.action:has-text("Sneak Attack")'), 'rogue has Sneak Attack')
  await p.click('button[aria-label="All characters"]')
  ok((await p.$$('.char-card')).length === 3, 'home lists 3 heroes')
  await p.screenshot({ path: `${shots}/07-home.png` })

  // backup round trip
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Export all')])
  const file = path.join(shots, dl.suggestedFilename())
  await dl.saveAs(file)
  const ctx2 = await b.newContext({ ...devices['iPhone 13'] })
  const q = await ctx2.newPage()
  await q.goto(URL)
  await q.waitForSelector('text=No heroes yet')
  await q.setInputFiles('input[type=file]', file)
  await q.waitForSelector('text=Imported 3 characters')
  ok((await q.$$('.char-card')).length === 3, 'a new phone imports all 3 from the backup')

  // offline
  await p.evaluate(() => navigator.serviceWorker.ready)
  await p.reload()
  await p.waitForSelector('.char-card')
  await ctx.setOffline(true)
  await p.reload()
  ok(await p.waitForSelector('.char-card', { timeout: 8000 }).then(() => true).catch(() => false), 'opens with no network')
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no sideways scroll')
  ok(!errs.length, `no page errors ${errs.join(' | ')}`)
  await b.close()
  server.close()
  console.log(fails ? `\n${fails} failed` : '\nall good')
  process.exit(fails ? 1 : 0)
})()
