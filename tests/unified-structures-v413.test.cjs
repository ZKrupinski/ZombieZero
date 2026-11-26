'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/fortress-mode.js','utf8');
const nodes={};for(const id of ['fortress-builder','fortress-actions','fortress-ready','fortress-confirm','fortress-cancel','fortress-tip'])nodes[id]={addEventListener(k,v){this[k]=v},setAttribute(){},dataset:{}};
const window={},document={getElementById:id=>nodes[id]||null,createElement:()=>({getContext:()=>null})};
new Function('window','document',source)(window,document);
const f=window.ZZFortress,c={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),setPointerCapture(){}};
const ptr=(col,row)=>({clientX:38+col*22+10,clientY:82+row*22+10,pointerId:1,button:0});
const kinds=['wall','bollard','ice','lure','saw'];
f.reset();f.begin([],1);
for(let i=0;i<kinds.length;i++){
 assert(f.selectBuild(kinds[i]));const p=ptr(i*2,4);
 assert(f.down(p,c));f.up(p,c);nodes['fortress-confirm'].click();
 const w=f.getStructure(i*2,4),span=i<2?1:2;assert.equal(w.kind,kinds[i]);assert.equal(f.structureSize(w),22*span);
 for(let dy=0;dy<span;dy++)for(let dx=0;dx<span;dx++)assert.equal(f.getStructure(i*2+dx,4+dy),w);
 if(span===1)assert.equal(f.getStructure(i*2+1,4),undefined);
}
assert.equal(f.getWallCount(),5);assert.equal(f.getStock(),1);
f.reset();f.begin([],1);
for(const kind of ['wall','bollard']){
 assert(f.selectBuild(kind));let a=ptr(0,kind==='wall'?0:4),b=ptr(4,kind==='wall'?0:4);
 f.down(a,c);f.move(b,c);f.up(b,c);assert.equal(f.getPreview().builds,5);
 nodes['fortress-confirm'].click();
}
assert.equal(f.getWallCount(),10);assert.equal(f.getStock(),1);
assert(source.includes('displayScale={wall:.82,bollard:.82,ice:.82,lure:.82,saw:.82}'));
console.log('PASS V413: 22px walls/moles and 44px machines, continuous single-cell drags, no overlapping dragged previews, equal picker scale.');
