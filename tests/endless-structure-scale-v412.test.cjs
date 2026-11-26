'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const window={},document={getElementById:()=>null,createElement:()=>({getContext:()=>null})};
new Function('window','document',fs.readFileSync('dist/fortress-mode.js','utf8'))(window,document);
const f=window.ZZFortress;
const opening=Array.from({length:36},(_,i)=>({x:45+i%9*42,y:70+Math.floor(i/9)*60,w:33,h:44,hp:10}));
for(let repeat=0;repeat<50;repeat++){
 const count=f.setupEndless(15,opening,565);assert(count>=12&&count<=21);
 const {tile,columns,rows}=f.bounds();assert.equal(tile,22);
 const all=new Set();
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const w=f.getStructure(col,row);if(w)all.add(w)}
 assert.equal(all.size,count);
 for(const w of all){
  const size=f.structureSize(w),span=size/tile;
  assert.equal(w.x+size<=408,true);assert(w.y>=710/3&&w.y+size<=710*2/3);
  for(let dy=0;dy<span;dy++)for(let dx=0;dx<span;dx++)assert.equal(f.getStructure(w.col+dx,w.row+dy),w);
  if(w.kind==='bollard')w.raised=true;
  assert(!f.isOpen({w:2,h:2},w.x+size-3,w.y+size-3),'collision covers enlarged far edge');
  // Test only exposed faces; a connected line's internal seam is not a free approach.
  if(!f.getStructure(w.col+span,w.row)){
   const b={x:w.x+size+1,y:w.y+size-8,vx:-100,vy:0};
   const hit=f.bounceBall(b,b.x+7,b.y,3);
   assert(hit&&hit.nx===1);assert(b.x>=w.x+size+3);
  }
  for(const other of all)if(w!==other){const s=f.structureSize(other);assert(w.x+size<=other.x||other.x+s<=w.x||w.y+size<=other.y||other.y+s<=w.y)}
 }
}
f.reset();assert.equal(f.bounds().tile,22);assert.equal(f.bounds().columns,17);assert.equal(f.getWallCount(),0);
console.log('PASS V412: mixed 22/44px footprints, full-size ball collisions, clear spawn zones and reset to mini 22px.');
