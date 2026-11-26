'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/game.js','utf8'),defs=src.slice(src.indexOf('let slowTintCache='),src.indexOf('\n',src.indexOf('const SLOW_TINT_PIXEL_LIMIT=')));
const helper=src.slice(src.indexOf('function resetSlowTintCache(){'),src.indexOf('function zombie(z){'));
const h=new Function(`
 let allocations=0,slow=true;const calls=[];
 const document={createElement(){allocations++;const ctx={drawImage(...a){calls.push(['source',...a])},fillRect(...a){calls.push([this.globalCompositeOperation,this.fillStyle,...a])}};return {width:0,height:0,getContext:()=>ctx}}};
 const slowEchoVisible=()=>slow;
 ${defs}
 ${helper}
 const image={width:1024,height:512},target={drawImage(...a){calls.push(['target',...a])},save(){calls.push(['save'])},globalAlpha:1};
 return {image,target,calls,proxy:()=>slowTintContext(target),tint:slowTintBitmap,allocations:()=>allocations,reset:resetSlowTintCache,active:slowTintOn,toggle(v){slow=v},pixels:()=>slowTintPixels};
`)();
const a=h.tint(h.image,0,0,128,128);
assert.equal(h.allocations(),1);assert.equal(h.tint(h.image,0,0,128,128),a);assert.equal(h.allocations(),1);
assert(h.calls.some(c=>c[0]==='source-atop'&&c[1]==='rgba(65,166,246,0.44)'));
const g=h.proxy();assert.equal(h.proxy(),g);g.save();g.globalAlpha=.28;assert.equal(h.target.globalAlpha,.28);
g.drawImage(h.image,0,0,128,128,5,10,43,55);
const last=h.calls.at(-1);assert.equal(last[1],a);assert.deepEqual(last.slice(2),[0,0,128,128,5,10,43,55]);assert.equal(h.allocations(),1);
for(let i=0;i<300;i++)h.tint({width:256,height:256});
assert(h.pixels()<=3500000);h.reset();assert.equal(h.pixels(),0);
h.toggle(false);assert.equal(h.active(),false);
assert(src.includes('z.fortressFrozenUntil>clock)return drawMiniEnemy'));
assert(src.includes("drawThrowable(q.kind,q.x,q.y,size*q.enemyScale,q.angle,true)"));
assert(src.includes("drawThrowable(p.kind,pos.x,pos.y,size*(p.enemyScale||1),pos.t*Math.PI*5,true)"));
assert(src.includes("drawThrowable(z.throwKind,hand.x,hand.y+phase.y*mini,size*phase.scale*mini,phase.turn,true)"));
assert(src.includes('slowTintOn()?slowTintBitmap(base):base'));
console.log('PASS V425: cryo-matched source-atop tint, shared sprite-cel cache, bounded memory, hostile shots only, no duplicate trap tint.');
