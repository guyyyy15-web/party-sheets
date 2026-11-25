// Avatars: DiceBear Adventurer + our class and species marks (src/engine/avatar.js, src/content/avatars.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import { avatarSvg, avatarLook, avatarUri } from '../src/engine/avatar.js'
import { CLASS_COLORS, CLASS_LAYERS, HAIR, SKIN_COLORS } from '../src/content/avatars.js'
import { CLASSES } from '../src/content/classes.js'

test('the same character gives the same avatar, on every phone; another id, another face', () => {
  const a = { id: 'c1abc', classId: 'wizard', speciesId: 'elf' }
  assert.equal(avatarSvg(a), avatarSvg({ ...a }))
  assert.notEqual(avatarSvg(a), avatarSvg({ ...a, id: 'c2xyz' }))
  assert.deepEqual(avatarLook(a), avatarLook({ ...a }))
})

test('every class has a color and a class mark; no class still draws', () => {
  for (const c of CLASSES) { assert.ok(CLASS_COLORS[c.id], c.id); assert.ok(CLASS_LAYERS[c.id], c.id) }
  assert.match(avatarSvg({ id: 'x1' }), /^<svg[^>]*viewBox="0 0 762 762"/)
  assert.ok(avatarSvg({ id: 'x1', classId: 'wizard' }).includes(CLASS_COLORS.wizard))
})

test('the player\'s picks win; unknown values fall back; the class mark can be turned off', () => {
  const ch = { id: 'c9', classId: 'fighter', avatar: { seed: 's', hair: 'short05', skin: SKIN_COLORS[2], hairColor: 'nope', layer: false } }
  const l = avatarLook(ch)
  assert.equal(l.hair, 'short05'); assert.equal(l.skin, SKIN_COLORS[2]); assert.ok(l.hairColor !== 'nope'); assert.equal(l.layer, false)
  assert.ok(!avatarSvg(ch).includes('#a9adb6'), 'no helmet')
  assert.ok(avatarSvg({ ...ch, avatar: { ...ch.avatar, layer: true } }).includes('#a9adb6'), 'the helmet')
  assert.ok(HAIR.includes(avatarLook({ id: 'zz' }).hair))
})

test('species marks: a tiefling gets horns and a fitting skin; the image is a safe data URI', () => {
  const t = avatarLook({ id: 'tf1', speciesId: 'tiefling' })
  assert.ok(['b5524a', 'a0569c'].includes(t.skin))
  const uri = avatarUri({ id: 'tf1', speciesId: 'tiefling', classId: 'bard' })
  assert.match(uri, /^data:image\/svg\+xml;charset=utf-8,/)
  assert.ok(!/<script/i.test(decodeURIComponent(uri)))
})
