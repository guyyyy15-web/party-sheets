// The link preview image (og.png, 1200x630) for WhatsApp and other apps: node scripts/og.cjs, then look at it.
const { chromium } = require('playwright')
const path = require('path')
;(async () => {
  const { ICONS } = await import('../src/content/icons-data.js')
  const icon = (id, color) => `<svg viewBox="0 0 512 512" width="86" height="86" style="color:${color}">${ICONS[id]}</svg>`
  const html = `<html><head><link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@700&family=Zen+Kaku+Gothic+New:wght@500&display=swap" rel="stylesheet"></head>
  <body style="margin:0;width:1200px;height:630px;background:radial-gradient(circle at 80% 20%,#2a2236,#15131a 60%);color:#efe6d2;font-family:'Zen Kaku Gothic New',sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box">
    <div style="font-size:84px">🎲</div>
    <div style="font-family:'Shippori Mincho',serif;font-size:96px;font-weight:700;line-height:1.05;margin-top:8px">Party Sheets</div>
    <div style="font-size:38px;color:#b9ae98;margin-top:18px;max-width:900px;line-height:1.35">D&amp;D character sheets for your table: every rule applied, the math shown, a live DM screen.</div>
    <div style="display:flex;gap:28px;margin-top:40px">${icon('class.fighter', '#c7614f')}${icon('class.wizard', '#6f98c4')}${icon('class.cleric', '#c9a35c')}${icon('class.rogue', '#9c82c9')}${icon('class.druid', '#79a179')}</div>
  </body></html>`
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } })
  await p.setContent(html, { waitUntil: 'networkidle' }).catch(() => {})
  await p.waitForTimeout(600)
  await p.screenshot({ path: path.join(__dirname, '..', 'og.png') })
  await b.close()
})()
