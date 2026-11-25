// Accessibility check with axe-core on every main screen (iPhone viewport, local files). Fails on serious/critical issues.
const { chromium, devices } = require('playwright')
const http = require('http'), fs = require('fs'), path = require('path')
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
const root = path.join(__dirname, '..')
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'))
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res)
})
let bad = 0
async function scan(p, name) {
  await p.addScriptTag({ content: AXE })
  const r = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') })))
  const serious = r.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  bad += serious.length
  console.log(`${serious.length ? 'FAIL' : 'ok  '} ${name}${r.length ? ': ' + r.map((v) => `${v.impact} ${v.id} x${v.n} (${v.sample})`).join(' | ') : ''}`)
}
;(async () => {
  await new Promise((r) => server.listen(8772, r))
  const b = await chromium.launch()
  const ctx = await b.newContext({ ...devices['iPhone 13 Pro'] })
  await ctx.addInitScript(() => (localStorage.setItem('ps.api', JSON.stringify('http://127.0.0.1:9')), localStorage.setItem('ps.seenLanding', 'true'))) // never the production server
  const p = await ctx.newPage()
  await p.goto('http://localhost:8772/'); await p.waitForSelector('text=No heroes yet'); await scan(p, 'home')
  await p.click('text=+ New character'); await scan(p, 'wizard: hero')
  await p.fill('input[placeholder="e.g. Katsebushi"]', 'A'); await p.click('.wiz-foot button'); await scan(p, 'wizard: class')
  await p.click('.class-card:has-text("Rogue")'); await p.click('.wiz-foot button'); await p.click('.card:has-text("Elf")'); await scan(p, 'wizard: species')
  for (const t of ['Wood Elf', 'Wisdom', 'Perception']) await p.click(`.panel .card:has-text("${t}")`)
  await p.click('.wiz-foot button'); await p.click('.card:has-text("Criminal")'); await p.click('button:has-text("+2 and +1")'); await scan(p, 'wizard: background')
  await p.click('.wiz-foot button'); await p.click('button:has-text("Suggest for")'); await scan(p, 'wizard: abilities')
  await p.click('.wiz-foot button'); await scan(p, 'wizard: choices')
  for (const t of ['Acrobatics', 'Deception', 'Insight', 'Investigation']) await p.click(`.panel.choice .card:has-text("${t}") >> nth=0`)
  for (const t of ['Stealth', 'Sleight of Hand']) await p.click(`.panel.choice:has-text("Expertise") .card:has-text("${t}")`)
  for (const t of ['Dagger', 'Shortbow']) await p.click(`.panel.choice .card:has-text("${t}")`)
  await p.click('.wiz-foot button'); await p.click('.card.opt >> nth=0'); await p.click('.wiz-foot button'); await scan(p, 'wizard: ready')
  await p.click('button:has-text("Start playing")'); await p.waitForSelector('.vitals'); await scan(p, 'sheet: my turn')
  for (const t of ['Checks', 'Features', 'Gear', 'Notes']) { await p.click(`[role=tab]:has-text("${t}")`); await scan(p, `sheet: ${t}`) }
  await p.click('.cond-btn'); await scan(p, 'conditions'); await p.click('.sheet-head .icon-btn')
  await p.click('button:has-text("Short rest")'); await scan(p, 'short rest'); await p.click('.sheet-head .icon-btn')
  await p.click('.fab'); await scan(p, 'dice tray'); await p.click('.sheet-head button[aria-label="Close"]')
  // a level 5 wizard (imported): the Spells tab, the picker, casting
  const { newCharacter } = await import('../src/engine/engine.js')
  const wiz = { ...newCharacter(), name: 'Vex', classId: 'wizard', level: 5, speciesId: 'elf', backgroundId: 'sage', scores: { STR: 8, DEX: 14, CON: 14, INT: 16, WIS: 12, CHA: 10 }, spells: { cantrips: ['fire-bolt'], prepared: ['fireball'] } }
  await p.click('button[aria-label="All characters"]')
  await p.setInputFiles('input[aria-label="Backup file"]', { name: 'w.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'party-sheets-backup', v: 1, characters: [wiz] })) })
  await p.click('.char-card:has-text("Vex")'); await p.click('[role=tab]:has-text("Spells")'); await p.click('.spell-name:has-text("Fireball")'); await scan(p, 'sheet: Spells')
  await p.click('button:has-text("Choose spells")'); await scan(p, 'spell picker'); await p.click('.sheet button:text-is("Done")')
  await p.click('.spell:has-text("Fireball") button:text-is("Cast")'); await scan(p, 'cast a spell')
  await p.click('.sheet button[aria-label="Close"]')
  // the rogue built in the wizard above (every choice made): the next-level preview, then the summary after levelling
  await p.click('button[aria-label="All characters"]'); await p.click('.char-card:has-text("Rogue")')
  await p.click('.next-level'); await scan(p, 'next level preview')
  await p.click('.sheet button:has-text("Level up now")'); await p.click('.sheet button:has-text("(average)")')
  await p.click('.sheet button:has-text("Become level")'); await p.waitForSelector('.lvl-summary'); await scan(p, 'level up summary')
  await p.click('.sheet button:text-is("Done")'); await p.click('[role=tab]:has-text("Gear")'); await p.click('.gear-cell .term-i >> nth=0'); await scan(p, 'term card')
  await p.click('.sheet button[aria-label="Close"]'); await p.click('button[aria-label="Rules glossary"]'); await scan(p, 'glossary')
  await p.click('button[aria-label="Back"]'); await p.click('button[aria-label="All characters"]')
  await p.click('text=+ New character'); await p.fill('input[placeholder="e.g. Katsebushi"]', 'B'); await p.click('.wiz-foot button'); await p.click('.class-card:has-text("Wizard")'); await scan(p, 'play style question')
    await p.click('.wiz-top button, button[aria-label="Cancel"]').catch(() => {})
  await p.goto('http://localhost:8772/'); await p.click('button[aria-label="Table settings"]'); await p.click('text=About Party Sheets'); await scan(p, 'landing page')
    await b.close(); server.close()
  console.log(bad ? `\n${bad} serious issue(s)` : '\nno serious accessibility issues')
  process.exit(bad ? 1 : 0)
})()
