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
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage()
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
  await p.click('.fab'); await scan(p, 'dice tray')
  await b.close(); server.close()
  console.log(bad ? `\n${bad} serious issue(s)` : '\nno serious accessibility issues')
  process.exit(bad ? 1 : 0)
})()
