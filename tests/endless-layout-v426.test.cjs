'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/fortress-mode.js','utf8'),game=fs.readFileSync('dist/game.js','utf8');
const window={},document={getElementById:()=>null,createElement:()=>({getContext:()=>null})};
new Function('window','document',src)(window,document);
const f=window.ZZFortress,opening=Array.from({length:36},(_,i)=>({x:45+i%9*40.875,y:70+Math.floor(i/9)*58,w:33,h:44,hp:10}));
const all=()=>{const a=[];for(let r=0;r<f.bounds().rows;r++)for(let c=0;c<f.bounds().columns;c++){const w=f.getStructure(c,r);if(w)a.push(w)}return a};
const types=['wall','bollard','ice','lure','saw'],layouts=new Set();
for(let i=0;i<60;i++)for(const wave of [1,2,3,4,5,6,7,8,9,10,14,15,25,100]){
 const n=Math.min(5,Math.ceil(wave/2))+(wave>=15?1:0);
 assert.equal(f.setupEndless(wave,opening,565),n);
 const a=all();assert.equal(a.length,n);assert.equal(f.bounds().tile,44);
 for(const kind of types.slice(0,Math.min(5,n)))assert(a.some(w=>w.kind===kind));
 assert(types.every(kind=>a.filter(w=>w.kind===kind).length<=2));
 assert([0,1,2,3,4,5].some(col=>a.every(w=>w.col<col||w.col>=col+3)),'132px open corridor');
 for(const w of a){
  assert(w.y>=710/3&&w.y+44<=710*2/3);assert.equal(f.structureSize(w),44);
  assert(opening.every(z=>z.x>=w.x+56||z.x+z.w<=w.x-12||z.y>=w.y+56||z.y+z.h<=w.y-12));
  assert(a.every(v=>v===w||v.x>=w.x+56||v.x+44<=w.x-12||v.y>=w.y+56||v.y+44<=w.y-12));
 }
 if(wave===1)layouts.add(a.map(w=>w.id).join(','));
}
assert(layouts.size>=5,'opening position changes across runs');
assert(f.setupEndless(100,[{x:0,y:0,w:450,h:450}],565)<=6,'crowded spawn never forces collisions');
f.reset();assert.equal(f.getWallCount(),0);assert.equal(f.bounds().tile,22);
assert(game.includes("runMode==='endless'&&wave>=51"));
assert(game.includes("rack();if(runMode==='endless')fortress?.setupEndless?.(endlessWaveNumber(),foes,DEFENSE_Y)"));
assert(game.includes('fortress.setupEndless(endlessWaveNumber(),foes,DEFENSE_Y)'));
console.log('PASS V426: intro from wave 1, five staggered types, randomized middle-third layout, open boss corridor, max 6, no overlaps.');
