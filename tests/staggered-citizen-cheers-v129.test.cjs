'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const begin=game.indexOf('// V124: Short arcade crowd reactions');
const end=game.indexOf('// A deliberately SHORT pointer',begin);
assert(begin>0&&end>begin,'reuse current citizen quotes, random scheduling and real screen-space layout');
const script=game.slice(begin,end);
const rng=Object.create(Math);
let seed=20271117;
rng.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const citizens=Array.from({length:18},(_,i)=>({x:48+i*(354/17),y:682+(i%2)*5,alive:true}));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ctx={Math:rng,Number,Array,W:450,H:710,PY:584,car:225,clamp,
 citizens,bubbles:[],bubbleTimer:0,cheerTime:0,mode:'playing'};
vm.createContext(ctx);vm.runInContext(script,ctx);
const layout=q=>vm.runInContext('citizenBubbleLayout('+JSON.stringify(q)+')',ctx);
const separate=(a,b)=>{
 const A=layout(a),B=layout(b);
 return A.x+A.w+7<=B.x||B.x+B.w+7<=A.x||
        A.y+A.h+7<=B.y||B.y+B.h+7<=A.y;
};
const offsets=new Set();
let pairs=0;
for(let i=0;i<100;i++){
 ctx.bubbles=[];ctx.bubbleTimer=0;
 vm.runInContext('updateBubbles(.016)',ctx);
 assert.equal(ctx.bubbles.length,1,'initial ambient cheer still appears');
 const first=ctx.bubbles[0];
 assert.equal(first.event,undefined,'ordinary ambient cheer has no special event flag');
 const shift=first.y-first.citizen.y+61;
 assert(shift>=-8&&shift<=21,'new cheer uses a modest randomized vertical range');
 offsets.add(shift);
 const a=layout(first);
 assert(a.y>=100&&a.y+a.h<=665,'low cheers stay above citizen head/tail');
 assert.equal(first.carAtBirth,225,'speech remains fixed to the original car position');
 ctx.bubbleTimer=0;
 vm.runInContext('updateBubbles(.016)',ctx);
 assert(ctx.bubbles.length>=1&&ctx.bubbles.length<=2,'existing maximum of two simultaneous balloons retained');
 if(ctx.bubbles.length===2){
  pairs++;
  const other=ctx.bubbles[1],b=layout(other);
  assert.notEqual(other.citizen,first.citizen,'do not place two lines on one citizen');
  assert(Math.abs(a.y-b.y)>=11,'two balloons are never aligned in a horizontal row');
  assert(separate(first,other),'rendered balloon rectangles must not overlap, including 7px gutter');
  assert(b.x>=22&&b.x+b.w<=428,'second balloon respects screen bounds');
 }
}
assert(pairs>40,'different citizens can still display simultaneous staggered cheers');
assert(offsets.size>=3,'normal speech heights actually vary');
assert([...offsets].some(x=>x>0),'some speech appears below the previous fixed V128 level');
ctx.bubbles=[];ctx.bubbleTimer=0;
vm.runInContext('citizenCue(citizens[0],true)',ctx);
assert.equal(ctx.bubbles.length,1,'special return event retained');
assert.equal(ctx.bubbles[0].y,citizens[0].y-86,'special event positions are unchanged');
assert.equal(ctx.bubbles[0].event,'return','special event semantics preserved');
assert(game.includes('if(bubbleTimer>0||bubbles.length>=2)return'),
 'bubble count remains capped at two');
assert(game.includes('const initialCar=Number.isFinite(q.carAtBirth)?q.carAtBirth:carX'),
 'existing no-stretch car-at-birth anchor retained');
assert(game.includes('tipY:place.y+place.h+16'),'pointer stays short for every random position');
assert(html.includes('v129-staggered-cheers')&&sw.includes('v129-staggered-cheers'),
 'game script and PWA cache versions updated together');
console.log('PASS v129: real varied lower cheek-level placement, 100 random scenarios, non-overlap, 11px stagger, mobile bounds and original event behavior.');
