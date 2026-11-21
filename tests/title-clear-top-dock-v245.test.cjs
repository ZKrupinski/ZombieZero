'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('dist/garage.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const v245=css.slice(css.indexOf('/* v245 — clear header / centered icon trio.'),css.indexOf('/* v248 — five *complete* portrait cards'));
assert(v245.startsWith('/* v245'),'latest patch should be attached');
assert(v245.includes('#overlay[data-screen="selection"]{'),'title-only overlay adjustment');
assert(v245.includes('rgba(0,0,0,0) 0%')&&v245.includes('rgba(0,0,0,0) 40%'),
 'top forty percent is completely clear, no dark gradient covering title text');
assert(v245.includes('rgba(7,20,28,.45) 100%'),'lower content remains legible');
assert(v245.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),
 'all three icons in shared centered group');
assert(v245.includes('width:min(79%,calc(310px * var(--ui-scale,1)))'),
 'group is narrower than full stage width and adaptively bounded');
assert(v245.includes('column-gap:calc(2px * var(--ui-scale,1))'),
 'reduced horizontal spacing between icon buttons');
assert(css.includes('#overlay[data-screen="selection"] #main-dock>button::before'),
 'existing approved dock sprite remains');
assert(css.includes('background:transparent!important'),'existing box-free buttons preserved');
assert(!v245.includes('#overlay[data-screen="results"]'),'game over overlay remains unchanged');
assert(/garage\.css\?v=(13-v245-clear-top-centered-icons|14-v248-complete-hero-cards|15-v254-gameover-reel)/.test(html),
 'CSS cache bust reaches phone');
assert(sw.includes('v245-clear-top-centered-icons'),'service worker cache bust');
console.log('PASS v245: transparent arcade title top, three centered tightly-spaced large icons, 9:16 and existing menu unaffected.');
