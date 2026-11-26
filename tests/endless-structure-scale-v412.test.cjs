'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const window={},document={getElementById:()=>null,createElement:()=>({getContext:()=>null})};
new Function('window','document',fs.readFileSync('dist/fortress-mode.js','utf8'))(window,document);
const f=window.ZZFortress;
const opening=Array.from({length:36},(_,i)=>({x:45+i%9*42,y:70+Math.floor(i/9)*60,w:33,h:44,hp:10}));
for(let repeat=0;repeat<50;repeat++){
 assert.equal(f.setupEndless(14,opening,565),6);
 const {tile,columns,rows}=f.bounds();assert.equal(tile,44);
 const all=new Set();
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const w=f.getStructure(col,row);if(w)all.add(w)}
 assert.equal(all.size,6);
 for(const w of all){
  const span=w.kind==='wall'||w.kind==='bollard'?1:2,size=tile*span;
  assert.equal(w.x+size<=408,true);assert(w.y+size<=499);
  for(let dy=0;dy<span;dy++)for(let dx=0;dx<span;dx++)assert.equal(f.getStructure(w.col+dx,w.row+dy),w);
  if(w.kind==='bollard')w.raised=true;
  assert(!f.isOpen({w:2,h:2},w.x+size-3,w.y+size-3),'collision covers enlarged far edge');
  const b={x:w.x+size+1,y:w.y+size-8,vx:-100,vy:0};
  const hit=f.bounceBall(b,b.x+7,b.y,3);
  assert(hit&&hit.nx===1);assert(b.x>=w.x+size+3);
  for(const other of all)if(w!==other){const s=other.kind==='wall'||other.kind==='bollard'?44:88;assert(w.x+size<=other.x||other.x+s<=w.x||w.y+size<=other.y||other.y+s<=w.y)}
 }
}
f.reset();assert.equal(f.bounds().tile,22);assert.equal(f.bounds().columns,17);assert.equal(f.getWallCount(),0);
console.log('PASS V412: normal 44/88px footprints, full-size ball collisions, clear spawn zones and reset to mini 22px.');
