// Every class's avatar, and each species mark, on one sheet: screenshots/avatars.png. Check it by eye after drawing.
import { avatarUri } from '../src/engine/avatar.js'
import { CLASS_COLORS } from '../src/content/avatars.js'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
const { chromium } = createRequire(import.meta.url)('playwright')
const classes = Object.keys(CLASS_COLORS)
const species = ['human', 'elf', 'dwarf', 'tiefling', 'orc', 'dragonborn', 'goliath', 'aasimar', 'halfling', 'gnome']
const cell = (ch, label) => `<figure><img src="${avatarUri(ch)}" alt=""><figcaption>${label}</figcaption></figure>`
const rows = [
  classes.map((c, i) => cell({ id: `c${i}x`, classId: c, speciesId: 'human' }, c)).join(''),
  classes.map((c, i) => cell({ id: `k${i}y`, classId: c, speciesId: species[(i % (species.length - 1)) + 1] }, `${c} · ${species[(i % (species.length - 1)) + 1]}`)).join(''),
  species.map((s, i) => cell({ id: `s${i}z`, classId: classes[(i * 5) % 12], speciesId: s }, `${s} · ${classes[(i * 5) % 12]}`)).join(''),
]
const html = `<html><body style="margin:0;background:#15131a;color:#ece5d6;font:12px sans-serif">${rows.map((r) => `<div style="display:flex;flex-wrap:wrap">${r}</div>`).join('')}<style>figure{margin:8px;text-align:center}img{width:110px;height:110px;border-radius:50%;display:block}</style></body></html>`
mkdirSync('screenshots', { recursive: true })
writeFileSync('screenshots/avatars.html', html)
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } })
await p.goto(`file://${process.cwd()}/screenshots/avatars.html`); await p.screenshot({ path: 'screenshots/avatars.png', fullPage: true }); await b.close()
console.log('screenshots/avatars.png')
