// Screenshots of the sheet on a desktop (1440) and a phone, with a sample character: node scripts/look.cjs (check them by eye after UI changes)
const { chromium, devices } = require('playwright')
const http = require('http'), fs = require('fs'), path = require('path')
const root = path.join(__dirname, '..')
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' }
const server = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(f)) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res) })
const CH = { v: 1, id: 'cdesk', name: 'Katsebushi', portrait: { kind: 'icon', src: '🥋' }, classId: 'monk', level: 6, subclassId: 'open-hand', speciesId: 'human', backgroundId: 'criminal', scores: { STR: 12, DEX: 14, CON: 13, INT: 8, WIS: 17, CHA: 10 }, scoreMethod: 'standard', choices: { 'class.skills': ['acrobatics', 'insight'], 'background.abilities': { mode: '2-1', plus2: 'DEX', plus1: 'INT' }, 'species.skillful.skill': ['perception'], 'species.versatile.feat': ['skilled'], 'species.versatile.feat>skilled.skills': ['athletics', 'history', 'religion'], 'asi-4.asi': { type: 'feat', feat: 'grappler', ability: 'STR' }, 'monk-tools.tool': ['instrument'], 'species.human-size.size': ['medium'] }, hpRolls: {}, equipment: { weapons: ['quarterstaff', 'dagger'], gp: 12, items: '' }, state: { hp: 31, temp: 0, used: { focus: 2 }, conditions: [], deathSaves: { ok: 0, fail: 0 } }, pinned: [], notes: '', overrides: {}, createdAt: '2026-11-23', updatedAt: '2026-11-23' }
;(async () => {
  await new Promise((r) => server.listen(8774, r))
  const b = await chromium.launch()
  for (const [name, opts] of [['desk', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }], ['phone', { ...devices['iPhone 13'], deviceScaleFactor: 1 }]]) {
    const p = await (await b.newContext(opts)).newPage()
    await p.goto('http://localhost:8774/')
    await p.evaluate(async (ch) => { await new Promise((res) => { const r = indexedDB.open('party-sheets', 1); r.onupgradeneeded = () => r.result.createObjectStore('characters', { keyPath: 'id' }); r.onsuccess = () => { const t = r.result.transaction('characters', 'readwrite'); t.objectStore('characters').put(ch); t.oncomplete = res } }); localStorage.setItem('ps.throwOnScreen', 'false') }, CH)
    await p.reload(); await p.screenshot({ path: `screenshots/look-${name}-home.png` })
    await p.click('.char-card'); await p.waitForSelector('.vitals')
    await p.screenshot({ path: `screenshots/look-${name}-turn.png`, fullPage: name === 'phone' })
    await p.click('[role=tab]:has-text("Checks")'); await p.screenshot({ path: `screenshots/look-${name}-checks.png`, fullPage: name === 'phone' })
    await p.click('.skills button:has-text("Athletics")'); await p.waitForSelector('.roll-card'); await p.screenshot({ path: `screenshots/look-${name}-roll.png` })
    const wide = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    console.log(name, 'no sideways scroll:', wide)
  }
  await b.close(); server.close()
})()
