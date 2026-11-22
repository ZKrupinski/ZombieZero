'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('dist/garage.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const anchor='/* v283: fix the horizontal drift introduced by independent CSS scale.';
const n=css.split(anchor).length-1;
assert.equal(n,1,'a single targeted center alignment override exists');
const block=css.slice(css.indexOf(anchor));
assert(block.includes('[data-reel-hero="4"] .hero-reel-artwork>img.hero-vehicle-scarlet'),
 'target only Scarlet inside the rotating selection and result reel');
assert(block.includes('left:50%!important;')&&block.includes('right:auto!important;'),
 'center positioning is independent from carousel card width');
assert(block.includes('bottom:0!important;')&&block.includes('top:auto!important;'),
 'Scarlet keeps the same wheel baseline after aligning');
assert(block.includes('scale:1!important;'),
 'old independent scale is disabled, preventing a scaled translateX shift');
assert(block.includes('transform:translateX(-50%) scale(.8)!important;'),
 'horizontal centering and approved 80 percent size are one transform');
assert(block.includes('transform-origin:center bottom!important;'),
 'car center and wheel baseline remain anchored to bottom');
assert(!block.includes('margin-left:-'),'do not hard-code an offset for one screen size');
assert(game.includes('const size=112*.8,carSpriteBottom=579+112/2;'),
 'in-game 80 percent Scarlet sprite unaffected');
assert(html.includes('v283-scarlet-true-center')&&sw.includes('v283-scarlet-true-center'),
 'CSS and mobile PWA caches updated together');
console.log('PASS v283: center Scarlet on title/results without scaling translate offset; preserve 80% and wheel anchor');
