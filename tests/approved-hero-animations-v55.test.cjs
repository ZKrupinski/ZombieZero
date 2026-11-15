'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const base='dist/assets/ip/';
const expected={
 'hero-idle-v55.png':'7e17351ee93f36534febabca2f489c5c5f9b8d6f5f5df6760287619a44602fd3',
 'hero-attack-v55.png':'2f9c46743e079685311f6ed4cb2ea1c44669541a705c3bcf57aa0c7c60da1f22'
};
for(const [name,sha] of Object.entries(expected)){
 const b=fs.readFileSync(base+name);
 assert.equal(crypto.createHash('sha256').update(b).digest('hex'),sha,name+' must match user-approved graphics');
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG signature');
 assert.equal(b.readUInt32BE(16),1536,'eight 192px frame columns');
 assert.equal(b.readUInt32BE(20),576,'three 192px hero rows');
 assert.equal(b[25],6,'true-color RGBA (alpha preserved)');
}
const js=fs.readFileSync(base+'hero-animations-v55.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const images=[];
class ImageMock{
 constructor(){this.naturalWidth=1536;this.naturalHeight=576;images.push(this)}
 set src(v){this._src=v;}
 get src(){return this._src}
}
const doc={documentElement:{dataset:{}}};
const win={};
vm.runInNewContext(js,{window:win,document:doc,Image:ImageMock});
assert.equal(images.length,2,'two separate idle/attack atlases must load');
assert.equal(win.ZZHeroAnimationsV55.ready,false);
assert(images[0].src.includes('hero-idle-v55.png')&&images[1].src.includes('hero-attack-v55.png'));
images[0].onload();
assert.equal(win.ZZHeroAnimationsV55.ready,false,'do not mix different generation assets during partial loading');
images[1].onload();
assert.equal(win.ZZHeroAnimationsV55.ready,true);
assert.equal(doc.documentElement.dataset.zzHeroAnimations,'ready');
assert.equal(win.ZZHeroAnimationsV55.cell,192);
assert.equal(win.ZZHeroAnimationsV55.frames,8);
assert.equal(win.ZZHeroAnimationsV55.characters,3);
assert(game.includes('const approved=window.ZZHeroAnimationsV55;'),'game reads new approved atlas');
assert(game.includes('const atlas=attacking?approved.attack:approved.idle;'),'game selects attack or idle clip');
assert(game.includes('Math.floor(clock*8)%8'),'eight-frame continuous idle 8 FPS');
assert(game.includes('Math.min(7,Math.floor(t*8))'),'attack animates all 8 frames within existing hit interval');
assert(game.includes('selectedHero*192'),'Ace, Ruby, and Ria share correct row mapping');
assert(game.includes('const sprite=window.ZZHeroCarAttack;'),'fallback to previous sprite if loading fails');
assert(game.includes('Math.abs(b.x-car)<hero().paddle+radius/2'),'real racket hitbox unchanged');
assert(html.indexOf('hero-animations-v55.js')<html.indexOf('game.js?v=65-subtle-bloom-larger-balls'),
 'hero atlas loader starts before gameplay script');
assert(css.includes('hero-idle-v55.png?v=55-approved-cast')&&css.includes('clip-path:none!important'),
 'title/game-over cards display new padded idle art without masking wheels');
for(const name of ['hero-idle-v55.png','hero-attack-v55.png','hero-animations-v55.js'])
 assert(sw.includes("'./assets/ip/"+name+"'"),'PWA caches '+name);
assert(sw.includes('zombie-zero-shell-v65-subtle-bloom-larger-balls'),'PWA cache bust');
console.log('PASS: approved 3x8 RGBA idle/attack PNGs, exact checksums, correct animation and legacy fallback.');
