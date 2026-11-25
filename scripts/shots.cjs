// The landing page's screenshots, taken from the test runs so they always show the current app: run `npm run smoke`
// and `npm run smoke:rooms` first, then `node scripts/shots.cjs` → landing/*.jpg (phone-sized, top of each screen).
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')
const SHOTS = [
  ['01b-hero.png', 'build'], ['16-avatar-hurt.png', 'alive'], ['14-rider.png', 'turn'], ['15-hit.png', 'hit'],
  ['rooms-7-bless-targets.png', 'friends'], ['rooms-8b-order-conc.png', 'fight'], ['rooms-5-dm-phone.png', 'dm'], ['17-print.png', 'print'],
]
;(async () => {
  fs.mkdirSync(path.join(root, 'landing'), { recursive: true })
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 390, height: 680 }, deviceScaleFactor: 1.5 })
  let missing = 0
  for (const [src, name] of SHOTS) {
    const f = path.join(root, 'screenshots', src)
    if (!fs.existsSync(f)) { console.log(`missing screenshots/${src} (run smoke and smoke:rooms first)`); missing++; continue }
    await p.setContent(`<html><body style="margin:0;background:#16110e"><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:390px;display:block"></body></html>`)
    await p.waitForFunction(() => document.images[0].complete)
    await p.screenshot({ path: path.join(root, 'landing', `${name}.jpg`), type: 'jpeg', quality: 78, clip: { x: 0, y: 0, width: 390, height: 680 } })
    console.log(`landing/${name}.jpg`, Math.round(fs.statSync(path.join(root, 'landing', `${name}.jpg`)).size / 1024), 'KB')
  }
  await b.close()
  process.exit(missing ? 1 : 0)
})()
