// The fight's recap (recap() in src/encounter-core.js): who dealt the most, the biggest hit, criticals, enemies felled,
// healing and damage taken; shown when the fight ends (runner and players) and shared as an image (WhatsApp).
import React, { useState } from 'react'
import { recap } from '../encounter-core.js'
import { avatarUri } from '../engine/avatar.js'
import { AvatarImg } from './avatar.jsx'

const heroCh = (party, h) => party?.find((p) => p.id === h.charId)?.data || { id: h.charId, name: h.name }

export function RecapCard({ enc, party }) {
  const r = recap(enc)
  const [shared, setShared] = useState(null)
  const lines = highlights(r)
  return (
    <section className="recap" aria-label="The fight's recap">
      <h2>🏆 The fight is over</h2>
      <p className="muted">{r.rounds} round{r.rounds > 1 ? 's' : ''} · {r.fallen} of {r.enemies} enemies fell · {r.totalDealt} damage dealt{r.crits ? ` · ${r.crits} critical${r.crits > 1 ? 's' : ''}` : ''}</p>
      {lines.length > 0 && <ul className="recap-high">{lines.map((l) => <li key={l.k}><span aria-hidden>{l.icon}</span> <b>{l.title}</b> {l.text}</li>)}</ul>}
      <ul className="recap-heroes">
        {r.heroes.map((h) => (
          <li key={h.id}>
            <AvatarImg ch={heroCh(party, h)} size={40} />
            <span className="grow"><b>{h.name}</b><small>{[h.dealt && `${h.dealt} dealt`, h.biggest && `best hit ${h.biggest}`, h.crits && `${h.crits} crit${h.crits > 1 ? 's' : ''}`, h.felled && `${h.felled} felled`, h.healed && `${h.healed} healed`, h.taken && `${h.taken} taken`].filter(Boolean).join(' · ') || 'kept watch'}</small></span>
          </li>
        ))}
      </ul>
      <button className="btn ghost wide" onClick={async () => setShared(await shareRecap(enc, party))}>{shared === 'shared' ? '✓ Shared' : shared === 'saved' ? '✓ Image saved' : '↗ Share the recap'}</button>
    </section>
  )
}

export function highlights(r) {
  return [
    r.mvp && { k: 'mvp', icon: '⚔', title: 'Most damage:', text: `${r.mvp.name}, ${r.mvp.dealt}` },
    r.biggest && { k: 'big', icon: '💥', title: 'Biggest hit:', text: `${r.biggest.name}, ${r.biggest.biggest}${r.biggest.biggestOn ? ` on ${r.biggest.biggestOn}` : ''}` },
    r.healer && { k: 'heal', icon: '✚', title: 'Healer:', text: `${r.healer.name}, ${r.healer.healed} HP` },
    r.tank && { k: 'tank', icon: '🛡', title: 'Took the most:', text: `${r.tank.name}, ${r.tank.taken}` },
  ].filter(Boolean)
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
/** The recap as an image (1080 × 1350): drawn as SVG, painted on a canvas, then shared or saved. */
export async function shareRecap(enc, party) {
  const r = recap(enc)
  const W = 1080, rows = r.heroes.slice(0, 6), H = 520 + rows.length * 130
  const hi = highlights(r)
  const avatars = await Promise.all(rows.map((h) => toPng(avatarUri(heroCh(party, h)), 200)))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#16110e"/><rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="36" fill="#211915" stroke="#d6a548" stroke-width="4"/>
    <text x="${W / 2}" y="130" text-anchor="middle" font-family="Georgia, serif" font-size="64" font-weight="700" fill="#f1e6d2">The fight is over</text>
    <text x="${W / 2}" y="190" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="#c4b49e">${esc(`${r.rounds} round${r.rounds > 1 ? 's' : ''} · ${r.fallen} of ${r.enemies} enemies fell · ${r.totalDealt} damage`)}</text>
    ${hi.map((l, i) => `<text x="80" y="${270 + i * 52}" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#f1e6d2"><tspan fill="#d6a548" font-weight="700">${esc(l.title)}</tspan> ${esc(l.text)}</text>`).join('')}
    ${rows.map((h, i) => { const y = 270 + hi.length * 52 + 30 + i * 130; return `<image href="${avatars[i]}" x="80" y="${y}" width="104" height="104"/>
      <text x="210" y="${y + 46}" font-family="Georgia, serif" font-size="40" font-weight="700" fill="#f1e6d2">${esc(h.name)}</text>
      <text x="210" y="${y + 92}" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#c4b49e">${esc([h.dealt && `${h.dealt} dealt`, h.crits && `${h.crits} crits`, h.felled && `${h.felled} felled`, h.healed && `${h.healed} healed`].filter(Boolean).join(' · ') || 'kept watch')}</text>` }).join('')}
    <text x="${W / 2}" y="${H - 60}" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#d6a548">Tavern Table</text></svg>`
  const png = await toPng(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, W, H, true)
  const blob = await (await fetch(png)).blob()
  const file = new File([blob], 'fight-recap.png', { type: 'image/png' })
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'The fight is over' }); return 'shared' } } catch (e) { if (e?.name === 'AbortError') return null }
  const a = document.createElement('a'); a.href = png; a.download = 'fight-recap.png'; a.click()
  return 'saved'
}
/** An image (data URI) painted on a canvas → a PNG data URI. */
function toPng(src, w, h = w, round = false) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const g = c.getContext('2d')
      if (!round && w === h) { g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.clip() }
      g.drawImage(img, 0, 0, w, h)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = src
  })
}
