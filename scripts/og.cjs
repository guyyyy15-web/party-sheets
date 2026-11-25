// Link preview images (1200x630) for WhatsApp and other apps, one per kind of link: node scripts/og.cjs, then look.
// og.png = the app; og-join.png = a group invite; og-dm.png = the DM screen; og-init.png = the Initiative link.
const { chromium } = require('playwright')
const path = require('path')
const CARDS = [
  { file: 'og.png', kicker: '', title: 'Tavern Table', line: 'Your D&D sheet that plays along: every rule applied, heroes that react, the whole party at one table.', art: 'ui.d20', color: '#d6a548', icons: true },
  { file: 'og-join.png', kicker: 'Tavern Table · you are invited', title: 'Join the party', line: 'Tap to bring your hero to the table. The party sees your hero, the DM sees your sheet.', art: 'ui.group', color: '#d6a548' },
  { file: 'og-dm.png', kicker: 'Tavern Table · for the DM only', title: 'The DM\'s table', line: 'Every sheet at the table, live: HP, conditions, items to give. Keep this link to yourself.', art: 'ui.dm', color: '#c7614f' },
  { file: 'og-init.png', kicker: 'Tavern Table · run the fight', title: 'The Fight', line: 'The order, the enemies, the damage. Players’ rolls arrive by themselves.', art: 'class.fighter', color: '#9c82c9' },
]
;(async () => {
  const { ICONS } = await import('../src/content/icons-data.js')
  const { avatarUri } = await import('../src/engine/avatar.js')
  const parade = ['fighter', 'wizard', 'cleric', 'rogue', 'druid', 'bard'].map((c, i) => `<img src="${avatarUri({ id: `og-${c}`, classId: c, speciesId: ['human', 'elf', 'dwarf', 'halfling', 'orc', 'tiefling'][i] })}" style="width:92px;height:92px;border-radius:50%;border:3px solid #463830">`).join('')
  const icon = (id, color, size) => `<svg viewBox="0 0 512 512" width="${size}" height="${size}" style="color:${color}">${ICONS[id]}</svg>`
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } })
  for (const c of CARDS) {
    const html = `<html><head><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Atkinson+Hyperlegible:wght@400;700&display=swap" rel="stylesheet"></head>
    <body style="margin:0;width:1200px;height:630px;background:radial-gradient(circle at 80% 30%,#3a2a1e,#16110e 62%);color:#f1e6d2;font-family:'Atkinson Hyperlegible',sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box;position:relative;overflow:hidden">
      <div style="position:absolute;right:56px;top:185px;opacity:.9">${icon(c.art, c.color, 260)}</div>
      ${c.kicker ? `<div style="font-size:28px;letter-spacing:.06em;text-transform:uppercase;color:${c.color};font-weight:700">${c.kicker}</div>` : ''}
      <div style="font-family:'Cinzel',serif;font-size:84px;font-weight:700;line-height:1.05;margin-top:10px;max-width:760px">${c.title}</div>
      <div style="font-size:36px;color:#c4b49e;margin-top:20px;max-width:640px;line-height:1.35">${c.line}</div>
      ${c.icons ? `<div style="display:flex;gap:18px;margin-top:36px">${parade}</div>` : ''}
    </body></html>`
    await p.setContent(html, { waitUntil: 'networkidle' }).catch(() => {})
    await p.waitForTimeout(500)
    await p.screenshot({ path: path.join(__dirname, '..', c.file) })
  }
  await b.close()
})()
