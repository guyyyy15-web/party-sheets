// A character's avatar (pure, no DOM; tests/avatar.test.mjs): the DiceBear "Adventurer" face from the character's own
// look (ch.avatar = { seed, hair, hairColor, skin, eyes, mouth, glasses, layer }: choices, never pixels) or, until the
// player picks, a look drawn from the character's id; then our class and species layers (src/content/avatars.js).
// The same character gives the same SVG on every phone.
import { Style, Avatar } from '@dicebear/core'
import adventurer from '@dicebear/styles/adventurer.json' with { type: 'json' }
import { CLASS_COLORS, NO_CLASS_COLOR, CLASS_LAYERS, SPECIES_LAYERS, HAIR, EYES, MOUTHS, HAIR_COLORS, SKIN_COLORS } from '../content/avatars.js'

const STYLE = new Style(adventurer)
// friendly faces only by default (the goofier ones stay pickable by hand)
const NICE_EYES = EYES.filter((_, i) => [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 15, 16, 17, 18, 21, 22, 24, 25, 26].includes(i + 1))
const NICE_MOUTHS = MOUTHS.filter((_, i) => [1, 2, 4, 5, 6, 8, 9, 17, 22, 23, 25, 26, 27, 28, 29, 30].includes(i + 1))
const NATURAL_HAIR = HAIR_COLORS.slice(0, 7)
const NATURAL_SKIN = SKIN_COLORS.slice(0, 4)

/** A small stable hash: the same text, the same number, on every phone. */
function hash(s) {
  let h = 2166136261
  for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619)
  return h >>> 0
}
const pick = (list, seed, salt) => list[hash(`${seed}:${salt}`) % list.length]

/** The look, every part known (what the player chose, the rest drawn from the seed). */
export function avatarLook(ch) {
  const a = ch?.avatar || {}
  const seed = a.seed || ch?.id || ch?.name || 'hero'
  const sp = SPECIES_LAYERS[ch?.speciesId]
  return {
    seed,
    hair: HAIR.includes(a.hair) ? a.hair : pick(HAIR, seed, 'hair'),
    hairColor: HAIR_COLORS.includes(a.hairColor) ? a.hairColor : pick(NATURAL_HAIR, seed, 'hairColor'),
    skin: SKIN_COLORS.includes(a.skin) ? a.skin : pick(sp?.skin || NATURAL_SKIN, seed, 'skin'),
    eyes: EYES.includes(a.eyes) ? a.eyes : pick(NICE_EYES, seed, 'eyes'),
    mouth: MOUTHS.includes(a.mouth) ? a.mouth : pick(NICE_MOUTHS, seed, 'mouth'),
    glasses: !!a.glasses,
    layer: a.layer !== false, // the class mark (hat, hood…) on by default
  }
}

/** A new random face (the 🎲 button): only the seed changes, the player's own picks are cleared. */
export const newSeed = () => Math.random().toString(36).slice(2, 10)

/** The avatar as an SVG string. `state` (optional) is for the living avatar of release 2. */
export function avatarSvg(ch) {
  const l = avatarLook(ch)
  const face = new Avatar(STYLE, {
    seed: l.seed, hairVariant: [l.hair], hairColor: [l.hairColor], skinColor: [l.skin], eyesVariant: [l.eyes], mouthVariant: [l.mouth],
    glassesProbability: l.glasses ? 100 : 0, earringsProbability: 0, featuresProbability: 0, detailsProbability: 0,
  }).toString()
  const color = CLASS_COLORS[ch?.classId] || NO_CLASS_COLOR
  const sp = SPECIES_LAYERS[ch?.speciesId]
  const fill = (svg) => svg.replaceAll('var(--skin)', `#${l.skin}`).replaceAll('var(--hair)', `#${l.hairColor}`)
  const inner = face.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<metadata[\s\S]*?<\/metadata>/, '')
  const hooded = ch?.classId === 'rogue' || ch?.classId === 'warlock'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 762 762">`
    + `<rect width="762" height="762" fill="${color}"/><circle cx="381" cy="381" r="381" fill="#ffffff" opacity=".18"/>`
    + `<g transform="translate(69 118) scale(.82)">${inner}${sp && !hooded ? fill(sp.over) : ''}${l.layer && CLASS_LAYERS[ch?.classId] ? CLASS_LAYERS[ch.classId] : ''}${sp && hooded ? fill(sp.over) : ''}</g></svg>`
}

/** As an <img> source (an image is sandboxed: its ids and styles can't touch the page). */
export const avatarUri = (ch) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(ch))}`
export { CLASS_COLORS }
