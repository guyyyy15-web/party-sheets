// Phone browsers: `vh` counts the screen as if the browser bars were hidden, so on iPhone Safari and Android Chrome
// anything sized in vh (a sheet's max-height) slides under the toolbar and its last buttons can't be reached.
// Every vh size needs a dvh twin right after it (the size actually visible); the vh one stays as the fallback.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('every vh height in style.css has a dvh twin (nothing hides under the browser toolbar)', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8')
  const bad = []
  for (const m of css.matchAll(/((?:max-|min-)?height):\s*([^;]*\d+vh[^;]*);/g)) {
    const twin = `${m[1]}: ${m[2].replace(/(\d+)vh/g, '$1dvh')};`
    if (!css.slice(m.index + m[0].length, m.index + m[0].length + twin.length + 2).includes(twin)) bad.push(m[0])
  }
  assert.deepEqual(bad, [])
  assert.match(css, /\.scrim \{[^}]*height: 100dvh/, 'the backdrop is as tall as what is visible')
})
