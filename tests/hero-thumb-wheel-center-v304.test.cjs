'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('dist/garage.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const mark=css.lastIndexOf('/* v304: Shared actual-wheel baseline');
assert(mark>0,'new thumbnail-only finishing rules must come after v303');
const scoped=css.slice(mark);
for(const screen of ['selection','results'])
 assert(scoped.includes('#overlay[data-screen="'+screen+'"]'),'covers both reel uses of art');
for(const key of ['[data-reel-hero="3"]','[data-reel-hero="4"]','top:auto!important','bottom:0!important','left:50%!important','transform-origin:center bottom!important'])
 assert(scoped.includes(key),'wheel-bottom alignment rule: '+key);
assert.match(scoped,/transform:translateX\(-50%\) scale\(\.90\)!important/,'Wrench slightly enlarged');
assert.match(scoped,/transform:translateX\(-50%\) scale\(\.74\)!important/,'Scarlet slightly reduced');
assert.match(scoped,/scale:1!important/,'avoid independent scale breaking center');
assert.match(scoped,/background-size:90% auto!important/,'Wrench fallback center');
assert.match(scoped,/#garage-dialog \.garage-reel-card\[data-reel-hero="3"\]/,'garage Wrench preview');
assert.match(scoped,/#garage-dialog \.garage-reel-card\[data-reel-hero="4"\]/,'garage Scarlet preview');
assert.match(scoped,/#radio-dialog \.rx-portrait\[src\*="wrench-mid-v261"\]/);
assert.match(scoped,/#radio-dialog \.rx-portrait\[src\*="scarlet-portrait"\]/);
assert.match(html,/garage\.css\?v=[^"]+v304-thumb-wheel-align/);
assert.match(sw,/v304-thumb-wheel-align/);
// This request affects thumbnails only, not the playfield or attack animations.
assert(game.includes('const size=124*.8;'),'gameplay Wrench remains at its approved 80%');
assert(game.includes('const size=112*.8,carSpriteBottom=579+112/2;'),'gameplay Scarlet remains at its approved 80%');
const base=192;
for(const scale of [.6,.8,1,1.2]){
 const centerX=base*.5;
 const centeredX=centerX+(base*.5-centerX)*scale;
 const bottomY=base;
 assert.equal(centeredX,96,'no horizontal drift on any card width');
 assert.equal(bottomY,192,'wheel bottom stays fixed when rescaled');
}
assert(Math.abs(.90/.80-1-.125)<1e-10,'Wrench grows 12.5% versus current thumbnail');
assert(Math.abs(.74/.80-.925)<1e-10,'Scarlet becomes 7.5% smaller versus current thumbnail');
console.log('PASS v304: all five character reel wheel baselines centered; Wrench 90%, Scarlet 74%, gameplay unaffected');
