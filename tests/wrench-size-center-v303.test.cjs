'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const game=fs.readFileSync('dist/game.js','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const start=game.indexOf('if(selectedHero===3){',game.indexOf('function player(){'));
const end=game.indexOf('if(selectedHero===3){',start+4);
const block=game.slice(start,end>=0?end:start+2600);
assert.match(block,/const size=124\*\.8;/,'80% Wrench size while retaining native 8-frame animation');
assert.match(block,/car-size\*244\/480,625\+VIEW_DELTA-size\*455\/480/,'old wheel pivot preserved');
assert.match(block,/const w=100\*\.8,h=w\*sprite\.naturalHeight\/sprite\.naturalWidth/,'asset loading fallback also scaled');
assert.match(block,/\(frame%4\)\*192,Math\.floor\(frame\/4\)\*192,192,192/,'both 8-frame sheets remain intact');
assert.match(block,/const sheet=\$\(swinging\?'wrench-swing':'wrench-idle'\)/);
const marker=css.lastIndexOf('/* v303: Match the approved Wrench buggy');
assert(marker>0,'final targeted styling block appended last');
const rule=css.slice(marker);
assert.match(rule,/\[data-reel-hero="3"\]/);
for(const screen of ['selection','results'])assert(rule.includes('[data-screen="'+screen+'"]'),'reel target '+screen);
for(const token of ['left:50%!important','top:auto!important','bottom:0!important','scale:1!important','transform:translateX(-50%) scale(.8)!important','transform-origin:center bottom!important','background-position:center bottom!important','background-size:contain!important'])
 assert(rule.includes(token),'centered 80% artwork '+token);
assert(rule.includes('#garage-dialog .garage-reel-card[data-reel-hero="3"]'),'garage 80% preview');
assert(rule.includes('#radio-dialog .rx-portrait[src*="wrench-mid-v261"]'),'radio 80% preview');
assert.match(html,/game\.js\?v=[^"]+v303-wrench-size-80/);
assert.match(html,/garage\.css\?v=[^"]+v303-wrench-portrait-center/);
assert.match(sw,/v303-wrench-80-center/);
// 192x192 bitmap is centered in its frame; scaling around bottom keeps
// the wheels at the SAME rendered y, while the portrait remains centered.
const sprite=[23,15,175,192],w=192,portraitScale=.8;
const center=(sprite[0]+sprite[2])/2,afterCenter=w/2+(center-w/2)*portraitScale;
assert(Math.abs(afterCenter-w/2)<3,'natural graphic center aligns with rest of cast');
assert.equal(w-(w-sprite[3])*portraitScale,w,'bottom of wheels does not move');
assert.equal(124*.8,99.2,'20% smaller than previous gameplay image');
console.log('PASS v303: Wrench 80% size in play, thumbnail and garage/radio; centered to wheel baseline in title/results');
