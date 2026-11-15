'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const prefix='dist/assets/ip/';
const names=['hero-ball-tennis-v58.png','hero-ball-baseball-v58.png','hero-ball-toy-v58.png'];
for(const file of names){
 const b=fs.readFileSync(prefix+file);
 assert(b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),file+' PNG signature');
 assert.equal(b.readUInt32BE(16),1774,file+' width');
 assert.equal(b.readUInt32BE(20),887,file+' height');
 assert.equal(b[25],6,file+' RGBA transparency');
 assert(b.length>100000,file+' must preserve rich shaded original bitmap');
}
const src=fs.readFileSync(prefix+'hero-balls-v58.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const images=[];class FakeImage{
 constructor(){this.naturalWidth=1774;this.naturalHeight=887;images.push(this)}
 set src(v){this._src=v;this.onload()}
 get src(){return this._src}
}
const window={};
vm.runInNewContext(src,{Image:FakeImage,window});
assert.equal(window.ZZHeroBallsV58.version,58);
assert.equal(images.length,3);
assert(window.ZZHeroBallsV58.ready.every(Boolean));
names.forEach((n,i)=>assert(images[i].src.includes(n)));
assert(game.includes('const HELD_BALL_OFFSETS=[{x:-21,y:-30},{x:-23,y:-31},{x:25,y:-30}]'));
assert(game.includes('balls[0].x=car+o.x;balls[0].y=PY+o.y;return'));
assert(game.includes("ballImpact(b,'x'")&&game.includes("ballImpact(b,'y'"));
assert(game.includes('drawHeroBallSprite(b,r,col)'));
assert(game.includes('const spin=[0,1,6,7]'));
assert(game.includes("index=b.bounceAxis==='x'"));
assert(game.includes('Math.abs(b.x-car)<hero().paddle+radius/2'),'collision unchanged');
assert(html.indexOf('hero-balls-v58.js')<html.indexOf('game.js?v=71-boss-open-space'));
for(const n of [...names,'hero-balls-v58.js'])assert(sw.includes("'./assets/ip/"+n+"'"));
assert(sw.includes('zombie-zero-shell-v71-boss-open-space'));
console.log('PASS: transparent tennis/baseball/toy PNG sheets, hero mapping, spin, squash/rebound, face-safe serve and PWA cache.');
