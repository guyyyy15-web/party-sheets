// Tavern Table's avatar flavor: a DiceBear "Adventurer" face (Lisa Wischofsky, CC BY 4.0, credited on the home page)
// under layers of our own, drawn here in the face's 762 × 762 space: a class mark (a hat, a hood, a crown of leaves…),
// species marks (pointed ears, a beard, horns, tusks) and the class color behind it all.
// Face geometry (Adventurer): head centre ≈ (365, 400), crown ≈ y 150, ears ≈ x 160 / 585, chin ≈ y 610.

/** One color per class: the avatar's background and ring, and the class's accent elsewhere. */
export const CLASS_COLORS = {
  barbarian: '#b5523f', bard: '#a0569c', cleric: '#d8b25a', druid: '#5f9a4c', fighter: '#8c8f99', monk: '#cf8a3c',
  paladin: '#e0c46a', ranger: '#4f7f4a', rogue: '#4a4a57', sorcerer: '#c2455f', warlock: '#6d4aa6', wizard: '#4f74c4',
}
export const NO_CLASS_COLOR = '#8a7f70'

const ink = '#1c1a1f'
const line = `stroke="${ink}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"`

/** The class mark, drawn over the face. */
export const CLASS_LAYERS = {
  // a pointed hat with a wide brim and a star
  wizard: `<path d="M230 205 L420 -20 Q445 -25 450 0 L545 200 Z" fill="#3e5fae" ${line}/>
    <ellipse cx="385" cy="210" rx="285" ry="52" fill="#4f74c4" ${line}/>
    <path d="M440 95 l12 26 28 3 -21 19 6 28 -25 -14 -25 14 6 -28 -21 -19 28 -3z" fill="#f2d16b" ${line}/>`,
  // a steel cap with a nose guard
  fighter: `<path d="M150 300 Q150 95 368 90 Q585 95 590 300 Z" fill="#a9adb6" ${line}/>
    <path d="M150 300 H590" ${line} fill="none"/><rect x="352" y="292" width="32" height="78" rx="10" fill="#a9adb6" ${line}/>
    <circle cx="200" cy="280" r="9" fill="${ink}"/><circle cx="540" cy="280" r="9" fill="${ink}"/>`,
  // a fur band with two horns
  barbarian: `<path d="M170 250 Q90 120 150 20 Q170 140 245 205 Z" fill="#efe3c8" ${line}/>
    <path d="M565 250 Q650 120 590 20 Q570 140 495 205 Z" fill="#efe3c8" ${line}/>
    <path d="M150 265 Q368 150 590 265 L585 315 Q368 210 155 315 Z" fill="#7a4b2a" ${line}/>`,
  // a dark hood around the face
  rogue: `<path d="M95 640 C70 230 230 45 368 45 C505 45 668 230 640 640 L555 640 C600 380 520 205 368 200 C215 205 135 380 180 640 Z" fill="#3b3b47" ${line}/>
    <path d="M368 45 Q372 120 368 200" fill="none" stroke="#2a2a33" stroke-width="8"/>`,
  // a feathered cap
  ranger: `<path d="M150 255 Q190 90 380 85 Q560 95 600 250 Q380 200 150 255 Z" fill="#4f7f4a" ${line}/>
    <path d="M520 150 Q640 40 700 20 Q650 120 560 190 Z" fill="#c2453a" ${line}/>`,
  // a golden halo
  cleric: `<ellipse cx="368" cy="70" rx="200" ry="46" fill="none" stroke="#f2d16b" stroke-width="30"/>
    <ellipse cx="368" cy="70" rx="200" ry="46" fill="none" stroke="${ink}" stroke-width="6" opacity=".55"/>`,
  // a circlet with a gem on the brow
  paladin: `<path d="M160 270 Q368 200 580 270" fill="none" stroke="#e0c46a" stroke-width="34" stroke-linecap="round"/>
    <path d="M160 270 Q368 200 580 270" fill="none" stroke="${ink}" stroke-width="6" opacity=".5"/>
    <path d="M368 205 l34 40 -34 40 -34 -40z" fill="#5f8fd8" ${line}/>`,
  // a crown of leaves
  druid: `<g fill="#6fae58" ${line}>
    <path d="M170 250 q-40 -90 40 -130 q30 80 -40 130z"/><path d="M250 180 q-10 -100 80 -120 q10 90 -80 120z"/>
    <path d="M370 160 q20 -100 110 -100 q-20 90 -110 100z"/><path d="M480 190 q60 -80 140 -50 q-50 70 -140 50z"/>
    <path d="M560 260 q90 -40 140 20 q-80 40 -140 -20z"/></g>`,
  // a headband with flying ties
  monk: `<path d="M152 285 Q368 205 585 285 L585 335 Q368 255 152 335 Z" fill="#c2453a" ${line}/>
    <path d="M585 300 Q680 300 730 380 Q660 360 600 330 Z" fill="#c2453a" ${line}/><path d="M590 320 Q650 400 690 470 Q620 430 585 345 Z" fill="#c2453a" ${line}/>`,
  // a beret with a long feather
  bard: `<path d="M150 230 Q160 110 360 95 Q560 95 600 210 Q380 170 150 230 Z" fill="#8e4a94" ${line}/>
    <circle cx="380" cy="100" r="18" fill="#8e4a94" ${line}/>
    <path d="M520 130 Q660 -10 740 10 Q660 90 560 175 Z" fill="#f2d16b" ${line}/>`,
  // little flames of raw magic over the head
  sorcerer: `<g ${line}>
    <path d="M250 150 q-20 -70 30 -120 q0 60 30 80 q10 -30 -5 -60 q60 40 40 110 z" fill="#e8633f"/>
    <path d="M370 120 q-25 -80 35 -130 q0 70 30 95 q15 -35 -5 -70 q70 50 45 125 z" fill="#f29a3f"/>
    <path d="M490 155 q-15 -60 25 -100 q0 50 25 65 q10 -25 -5 -50 q50 35 35 95 z" fill="#e8633f"/></g>`,
  // a violet hood with an eye sigil
  warlock: `<path d="M95 640 C70 230 230 45 368 45 C505 45 668 230 640 640 L555 640 C600 380 520 205 368 200 C215 205 135 380 180 640 Z" fill="#4b3478" ${line}/>
    <path d="M318 120 Q368 80 418 120 Q368 160 318 120 Z" fill="#c9f2a0" ${line}/><circle cx="368" cy="120" r="14" fill="${ink}"/>`,
}

/** Species marks, drawn over the face (and under a hood). `skin`: DiceBear skin colors that fit the species. */
export const SPECIES_LAYERS = {
  elf: { over: `<path d="M575 380 L700 250 L612 450 Z" fill="var(--skin)" ${line}/>` },
  'half-elf': { over: `<path d="M578 385 L660 300 L608 445 Z" fill="var(--skin)" ${line}/>` },
  dwarf: { over: `<path d="M200 520 Q230 760 368 760 Q510 760 535 520 Q470 600 368 600 Q260 600 200 520 Z" fill="var(--hair)" ${line}/>` },
  tiefling: { over: `<path d="M235 200 Q190 90 250 20 Q265 110 300 175 Z" fill="#3a2a36" ${line}/><path d="M500 200 Q545 90 485 20 Q470 110 435 175 Z" fill="#3a2a36" ${line}/>`, skin: ['b5524a', 'a0569c'] },
  orc: { over: `<path d="M300 560 L285 500 L320 545 Z" fill="#f3ead2" ${line}/><path d="M440 560 L455 500 L420 545 Z" fill="#f3ead2" ${line}/>`, skin: ['8a9a6b', '6f8a5a'] },
  dragonborn: { over: `<path d="M260 190 l30 -60 20 65z M330 170 l35 -70 25 70z M410 175 l35 -60 15 70z" fill="var(--skin)" ${line}/>`, skin: ['7a9fb4', 'b06a55', '6aa06a'] },
  goliath: { over: `<path d="M250 330 l50 30 M430 330 l55 -25 M330 500 l20 40" stroke="#4d5a68" stroke-width="12" stroke-linecap="round" fill="none"/>`, skin: ['9aa3ad'] },
  aasimar: { over: `<circle cx="368" cy="400" r="330" fill="none" stroke="#f6e7a8" stroke-width="18" opacity=".7"/>` },
}

// DiceBear option values offered in "Your look" (Adventurer)
export const HAIR = [...Array.from({ length: 26 }, (_, i) => `long${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 19 }, (_, i) => `short${String(i + 1).padStart(2, '0')}`)]
export const EYES = Array.from({ length: 26 }, (_, i) => `variant${String(i + 1).padStart(2, '0')}`)
export const MOUTHS = Array.from({ length: 30 }, (_, i) => `variant${String(i + 1).padStart(2, '0')}`)
export const HAIR_COLORS = ['0e0e0e', '3a2a1c', '6a4e35', 'a55728', 'c99b5e', 'e8d6a0', 'b9b9b9', 'f4f4f4', '7a3cb3', '3c7ab3', 'b33c5e', '3cb37a']
export const SKIN_COLORS = ['f2d3b1', 'ecad80', '9e5622', '763900', 'b5524a', 'a0569c', '8a9a6b', '7a9fb4', '9aa3ad']
