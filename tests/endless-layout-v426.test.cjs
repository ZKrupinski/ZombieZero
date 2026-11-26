'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/fortress-mode.js','utf8'),game=fs.readFileSync('dist/game.js','utf8');
const window={},document={getElementById:()=>null,createElement:()=>({getContext:()=>null})};
new Function('window','document',src)(window,document);
const f=window.ZZFortress,opening=Array.from({length:36},(_,i)=>({x:45+i%9*40.875,y:70+Math.floor(i/9)*58,w:33,h:44,hp:10}));
const all=()=>{const a=new Set();for(let r=0;r<f.bounds().rows;r++)for(let c=0;c<f.bounds().columns;c++){const w=f.getStructure(c,r);if(w)a.add(w)}return [...a]};
const types=['wall','bollard','ice','lure','saw'],layouts=new Set();
for(let i=0;i<60;i++)for(const wave of [1,2,3,4,5,6,7,8,9,10,14,15,25,100]){
 const n=Math.min(5,Math.ceil(wave/2)),expected=n===1?4:8+n-2;
 const count=f.setupEndless(wave,opening,565),a=all();assert.equal(a.length,count);assert.equal(f.bounds().tile,22);
 assert(count>=expected&&count<=expected+(wave>=15?4:0));
 for(const kind of types.slice(0,n))assert(a.some(w=>w.kind===kind));
 assert(Array.from({length:11},(_,i)=>i).some(col=>a.every(w=>w.col+f.structureSize(w)/22<=col||w.col>=col+6)),'132px open corridor');
 for(const w of a){
  const size=f.structureSize(w);assert(w.y>=710/3&&w.y+size<=710*2/3);
  assert.equal(size,w.kind==='wall'||w.kind==='bollard'?22:44);
  assert(opening.every(z=>z.x>=w.x+size+12||z.x+z.w<=w.x-12||z.y>=w.y+size+12||z.y+z.h<=w.y-12));
  assert(a.every(v=>v===w||v.x>=w.x+size||v.x+f.structureSize(v)<=w.x||v.y>=w.y+size||v.y+f.structureSize(v)<=w.y));
  if(size===22)assert([f.getStructure(w.col^1,w.row),f.getStructure(w.col,w.row^1),f.getStructure(w.col^1,w.row^1)].every(v=>v&&v.kind===w.kind),'four touching independent cells');
 }
 if(wave===1)layouts.add(a.map(w=>w.id).join(','));
}
assert(layouts.size>=5,'opening position changes across runs');
assert(f.setupEndless(100,[{x:0,y:0,w:450,h:450}],565)<=15,'crowded spawn never forces collisions');
f.reset();assert.equal(f.getWallCount(),0);assert.equal(f.bounds().tile,22);
assert(game.includes("runMode==='endless'&&wave>=51"));
assert(game.includes("rack();if(runMode==='endless')fortress?.setupEndless?.(endlessWaveNumber(),foes,DEFENSE_Y)"));
assert(game.includes('fortress.setupEndless(endlessWaveNumber(),foes,DEFENSE_Y)'));
console.log('PASS V426: intro from wave 1, five staggered types, randomized middle-third layout, open boss corridor, mixed sizes and contiguous small clusters, no overlaps.');
