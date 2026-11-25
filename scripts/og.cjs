// Link preview images (1200x630) for WhatsApp and other apps, one per kind of link: node scripts/og.cjs, then look.
// og.png = the app; og-join.png = a group invite; og-dm.png = the DM screen; og-init.png = the Initiative link.
const { chromium } = require('playwright')
const path = require('path')
const CARDS = [
  { file: 'og.png', kicker: '', title: 'Tavern Table', line: 'D&D character sheets for your table: every rule applied, the math shown, a live DM screen.', art: 'ui.d20', color: '#c9a35c', icons: true },
  { file: 'og-join.png', kicker: 'Tavern Table · you are invited', title: 'Join the party', line: 'Tap to bring your character to the table. Your group sees your hero, the DM sees your sheet.', art: 'ui.group', color: '#c9a35c' },
  { file: 'og-dm.png', kicker: 'Tavern Table · for the DM only', title: 'The DM screen', line: 'Every sheet in the group, live: HP, conditions, items to give. Keep this link to yourself.', art: 'ui.dm', color: '#c7614f' },
  { file: 'og-init.png', kicker: 'Tavern Table · run the fight', title: 'Initiative', line: 'The order, the enemies, the damage. Players’ rolls arrive by themselves.', art: 'class.fighter', color: '#9c82c9' },
]
;(async () => {
  const { ICONS } = await import('../src/content/icons-data.js')
  const icon = (id, color, size) => `<svg viewBox="0 0 512 512" width="${size}" height="${size}" style="color:${color}">${ICONS[id]}</svg>`
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } })
  for (const c of CARDS) {
    const html = `<html><head><link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@700&family=Zen+Kaku+Gothic+New:wght@500;700&display=swap" rel="stylesheet"></head>
    <body style="margin:0;width:1200px;height:630px;background:radial-gradient(circle at 80% 30%,#2a2236,#15131a 62%);color:#efe6d2;font-family:'Zen Kaku Gothic New',sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box;position:relative;overflow:hidden">
      <div style="position:absolute;right:56px;top:185px;opacity:.9">${icon(c.art, c.color, 260)}</div>
      ${c.kicker ? `<div style="font-size:28px;letter-spacing:.06em;text-transform:uppercase;color:${c.color};font-weight:700">${c.kicker}</div>` : ''}
      <div style="font-family:'Shippori Mincho',serif;font-size:92px;font-weight:700;line-height:1.05;margin-top:10px;max-width:760px">${c.title}</div>
      <div style="font-size:36px;color:#b9ae98;margin-top:20px;max-width:640px;line-height:1.35">${c.line}</div>
      ${c.icons ? `<div style="display:flex;gap:28px;margin-top:40px">${icon('class.fighter', '#c7614f', 80)}${icon('class.wizard', '#6f98c4', 80)}${icon('class.cleric', '#c9a35c', 80)}${icon('class.rogue', '#9c82c9', 80)}${icon('class.druid', '#79a179', 80)}</div>` : ''}
    </body></html>`
    await p.setContent(html, { waitUntil: 'networkidle' }).catch(() => {})
    await p.waitForTimeout(500)
    await p.screenshot({ path: path.join(__dirname, '..', c.file) })
  }
  await b.close()
})()
