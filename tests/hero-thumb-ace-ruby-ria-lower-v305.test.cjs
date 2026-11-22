'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('dist/garage.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const mark=css.lastIndexOf('/* v305: Ace, Ruby, Ria only:');
assert(mark>=0,'separate final override exists');
const v305=css.slice(mark);
for(const screen of ['selection','results']){
 for(const hero of [0,1,2]){
  const selector='#overlay[data-screen="'+screen+'"] #heroes[data-five-reel="true"] .hero-options\n > .hero-card.hero-reel-proxy[data-reel-hero="'+hero+'"] .hero-reel-artwork>.hero-vehicle-portrait';
  assert(v305.includes(selector),'portrait moved for '+screen+' hero '+hero);
 }
}
assert(!v305.includes('[data-reel-hero="3"]'),'Wrench untouched');
assert(!v305.includes('[data-reel-hero="4"]'),'Scarlet untouched');
assert.equal((v305.match(/bottom:-4px!important/g)||[]).length,1,'one shared four-pixel offset for exactly three heroes');
assert(v305.includes('left:50%!important')&&v305.includes('transform:translateX(-50%)!important'),'horizontal center stays identical');
assert(v305.includes('transform-origin:center bottom!important'),'same wheel pivot');
assert.match(html,/garage\.css\?v=[^"]*v305-lower-three-portraits/,'mobile HTML busts stylesheet cache');
assert.match(sw,/v305-lower-three-portraits/,'offline service-worker cache bumps');
assert.match(game,/const size=124\*\.8;/,'Wrench gameplay size remains unchanged');
assert.match(game,/const size=112\*\.8,carSpriteBottom=579\+112\/2;/,'Scarlet gameplay size remains unchanged');
console.log('PASS v305: Ace, Ruby and Ria lowered 4px in title/results only, Wrench and Scarlet remain centered and unchanged');
