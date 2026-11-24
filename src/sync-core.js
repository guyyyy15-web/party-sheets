// Pure helpers for sharing a character with a room (no DOM, no network): what changed, and how changes merge.
// The server applies the same mergePatch (server/src/index.js), so both sides agree on the result.

/** Fields that stay on this phone and never go to the room. */
export const LOCAL_ONLY = new Set(['id', 'roomId', 'updatedAt', 'draft', 'wizardStep', 'ownerKey'])
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** What `next` changed compared with `base` (the last copy both sides agreed on): changed top-level fields, and
 *  inside `state` only the changed keys. */
export function diff(next, base) {
  const p = {}
  for (const k of Object.keys(next || {})) {
    if (LOCAL_ONLY.has(k) || k.startsWith('_')) continue
    if (k === 'state') {
      const s = {}
      for (const sk of Object.keys(next.state || {})) if (!same(next.state[sk], base?.state?.[sk])) s[sk] = next.state[sk]
      if (Object.keys(s).length) p.state = s
    } else if (!same(next[k], base?.[k])) p[k] = next[k]
  }
  return p
}

export const isEmpty = (p) => !p || Object.keys(p).length === 0

/** Apply a patch: top-level fields replace, `state` merges one level deeper. */
export function mergePatch(data, patch) {
  const out = { ...data }
  for (const [k, v] of Object.entries(patch || {})) {
    if (k === 'id' || k.startsWith('_')) continue
    if (k === 'state' && v && typeof v === 'object' && !Array.isArray(v)) out.state = { ...(data.state || {}), ...v }
    else out[k] = v
  }
  return out
}

/** The character to send when it first enters a room (no local-only fields). */
export const shareable = (ch) => Object.fromEntries(Object.entries(ch).filter(([k]) => !LOCAL_ONLY.has(k) && !k.startsWith('_')))

/** A fresh server copy arrived: keep this phone's unsent changes on top of it. */
export function rebase(local, base, server) {
  const mine = diff(local, base)
  return { merged: { ...mergePatch(server, mine), id: local.id, roomId: local.roomId }, pending: mine }
}

/** `#/join/<room>.<key>` or `#/dm/<room>.<key>` → { kind, roomId, key } */
export function parseLink(hash) {
  const r = /^#\/restore\/([A-Za-z0-9_-]{24,64})$/.exec(hash || '')
  if (r) return { kind: 'restore', key: r[1] }
  const m = /^#\/(join|dm|init)\/([A-Za-z0-9_-]{6,40})\.([A-Za-z0-9_-]{24,64})$/.exec(hash || '')
  return m ? { kind: m[1], roomId: m[2], key: m[3] } : null
}
