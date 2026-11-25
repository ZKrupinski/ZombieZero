'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const nodes={};
for(const id of ['fortress-builder','fortress-actions','fortress-ready','fortress-confirm','fortress-cancel','fortress-stock','fortress-tip','fortress-build-count','fortress-supply','fortress-preview-summary','build-pick-wall','build-pick-lure','build-pick-saw','build-pick-ice'])nodes[id]={addEventListener(k,fn){this[k]=fn},setAttribute(){},dataset:{}};
const window={},document={getElementById:id=>nodes[id],createElement:()=>({getContext:()=>null})};
new Function('window','document',fs.readFileSync('dist/fortress-mode.js','utf8'))(window,document);
const f=window.ZZFortress,canvas={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),setPointerCapture(){}};
const p=(col,row)=>({clientX:38+col*22+10,clientY:82+row*22+10,pointerId:1,button:0});
function place(kind,col,row,cost){
 assert(f.selectBuild(kind));let before=f.getStock();
 f.down(p(col,row),canvas);f.move(p(col+1,row),canvas);f.up(p(col+1,row),canvas);
 assert.equal(f.getPreview().builds,1);assert.equal(f.getPreview().cost,cost);
 nodes['fortress-confirm'].click();assert.equal(f.getStock(),before-cost);
 assert.equal(f.getStructure(col,row).kind,kind);
}
f.reset();f.begin([],1);place('lure',2,5,4);place('saw',7,5,5);place('ice',12,5,6);
assert.equal(f.getStock(),11);assert.equal(f.getWallCount(),3);
const actor=(x,y)=>({x,y,w:16,h:22,hp:12});
const a=actor(38+2*22+28,82+5*22-24),b=actor(38+7*22+6,82+5*22-25),c=actor(38+12*22+6,82+5*22-25);
const enemies=[a,b,c];let pushes=0,hits=0;
f.deploy([]);
const ops={canMove:()=>true,push:()=>{pushes++;return true},damage(z,n){hits++;z.hp-=n}};
f.tickDevices(.1,enemies,1,ops);
assert(pushes>0);assert(hits>0);assert(c.fortressFrozenUntil>3);
const previous=hits;f.tickDevices(.1,enemies,1.1,ops);assert.equal(hits,previous);
assert(f.getStructure(7,5).cooldown>0);
f.begin([],2);assert.equal(f.getStructure(12,5).hp,24);
assert.equal(f.getStructure(12,5).cooldown,0);
assert(f.selectBuild('ice'));let before=f.getStock();
f.down(p(12,5),canvas);f.up(p(12,5),canvas);
assert.equal(f.getPreview().refund,6);nodes['fortress-confirm'].click();assert.equal(f.getStock(),before+6);
console.log('PASS V366: individual placement, material costs, full demolition refund, lure, damage, freeze, cooldown, persistence');
// Every tile belongs to one shared machine, including the far corner.
f.reset();f.begin([],1);place('saw',4,6,5);
const machine=f.getStructure(4,6);
for(let row=6;row<10;row++)for(let col=4;col<8;col++){
 assert.equal(f.getStructure(col,row),machine);
}
const right=machine.x+88,bottom=machine.y+88;
const ball={x:right+1,y:bottom-3,vx:-100,vy:0};
assert.equal(f.bounceBall(ball,right+8,ball.y,3).nx,1);
assert(ball.x>=right+3);
assert(!f.isOpen({w:3,h:3},right-3,bottom-3));
assert(f.selectBuild('ice'));
f.down(p(2,4),canvas);f.up(p(2,4),canvas);
assert.equal(f.getPreview().builds,0);
f.down(p(7,9),canvas);f.up(p(7,9),canvas);
assert.equal(f.getPreview().refund,5);
nodes['fortress-confirm'].click();
assert.equal(f.getWallCount(),0);
assert.equal(f.getStructure(4,6),undefined);
assert(f.isOpen({w:3,h:3},right-3,bottom-3));
f.down(p(16,19),canvas);f.up(p(16,19),canvas);
nodes['fortress-confirm'].click();
assert.equal(f.getStructure(16,19),f.getStructure(13,16));
assert.equal(f.getStructure(13,16).kind,'ice');
console.log('PASS 4×4 occupancy, edge placement, shared demolition, overlap and outer-face collisions');
