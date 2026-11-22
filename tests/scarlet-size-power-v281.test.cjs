'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const game=fs.readFileSync('dist/game.js','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');

const scarlet=game.match(/if\(window\.ZZGarage\)HEROES\.push\(\{id:'scarlet'[^\n]+/);
assert(scarlet,'Scarlet is a fifth hero, distinct from the existing four');
assert(scarlet[0].includes('speed:780,paddle:54,damage:2,lives:5'),
 'Scarlet starts at 780 speed, 2.0 attack and 5 lives with unchanged guard');
assert(scarlet[0].includes('프리즘 타격'),
 'Scarlet retains her original unique prism-hit identity');
assert(game.includes('const size=112*.8,carSpriteBottom=579+112/2;'),
 'Scarlet is drawn at exactly 80 percent of her former in-game size');
assert.equal((game.match(/car-size\/2,carSpriteBottom-size,size,size/g)||[]).length,2,
 'both atlas animation and portrait fallback use the reduced size with fixed wheel baseline');
assert(css.includes('/* v281: Scarlet\'s car + rider always render at 80%'),
 'per-character portrait sizing is isolated from the other heroes');
assert(css.includes('#overlay #heroes .hero-options img.hero-vehicle-scarlet,'),
 'Scarlet title and results portraits are resized');
assert(css.includes('#garage-dialog .garage-reel-figure img.scarlet-preview,'),
 'Scarlet garage portrait is resized');
assert(css.includes('#radio-dialog .rx-portrait[src*="scarlet-portrait"]'),
 'radio gallery portrait uses the same size');
assert((css.match(/scale:\.8!important/g)||[]).length>=2,
 'both selection and garage/radio use the same 80% factor');
assert(html.includes('v281-scarlet-80pct-stats')&&sw.includes('v281-scarlet-80pct-stats'),
 'new CSS and JS bypass old mobile and service worker caches');
console.log('PASS v281: Scarlet 80% title / garage / gameplay size and 780 speed, 2 attack, 5 hearts');
