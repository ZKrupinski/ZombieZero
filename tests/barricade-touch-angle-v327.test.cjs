'use strict';
// Finger contact jitter must not paint two adjacent barricade rows.
// Intentional right-angle corners and diagonals remain possible.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const mod=fs.readFileSync('dist/fortress-mode.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const ids=['fortress-builder','fortress-actions','fortress-confirm','fortress-cancel',
 'fortress-ready','fortress-stock','fortress-tip','fortress-build-count',
 'fortress-supply','fortress-preview-summary','fortress-tool'];
const dom={};
for(const id of ids)dom[id]={
 hidden:false,disabled:false,textContent:'',style:{},dataset:{},
 addEventListener(k,fn){this[k]=fn},setAttribute(){},
 getBoundingClientRect(){return {left:0,top:0,width:450,height:710}}
};
const fakeDoc={getElementById:id=>dom[id]||null,
 createElement:()=>({getContext:()=>null})},win={};
new Function('window','document',mod)(win,fakeDoc);
const f=win.ZZFortress;
const canvas={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),
 setPointerCapture(){}};
const XY=(c,r,ox=0,oy=0,type='touch')=>({
 clientX:38+c*44+11+ox,clientY:82+r*44+11+oy,
 pointerType:type,pointerId:67,button:0
});
function down(c,r,ox=0,oy=0,type='touch'){
 assert.equal(f.down(XY(c,r,ox,oy,type),canvas),true);
}
function move(c,r,ox=0,oy=0,type='touch'){
 assert.equal(f.move(XY(c,r,ox,oy,type),canvas),true);
}
function up(c,r,ox=0,oy=0,type='touch'){
 assert.equal(f.up(XY(c,r,ox,oy,type),canvas),true);
}
const confirm=()=>dom['fortress-confirm'].click();
f.reset();f.begin([],1);
// Even +21px/-19px pressure drift (crossing a grid-row threshold) stays
// a single horizontal row while the finger progresses across the board.
down(0,3);
for(let col=1;col<=6;col++)move(col,3,0,col%2?20:-19);
up(6,3,0,21); // finger lift should not generate an accidental second row
assert.equal(f.getPreview().builds,7,'horizontal finger drag paints one row');
confirm();
for(let col=0;col<=6;col++){
 assert.equal(f.getWallHP(col*2,6),30,'main horizontal wall row');
 assert.equal(f.getWallHP(col*2,5),0,'jitter cannot paint the row above');
 assert.equal(f.getWallHP(col*2,8),0,'jitter cannot paint the row below');
}
assert.equal(f.getStock(),19);
// Same axis correction when painting red demolition over existing walls.
down(0,3);
for(let col=1;col<=6;col++)move(col,3,0,col%2?-18:18);
up(6,3,0,-21);
assert.equal(f.getPreview().removes,7,'demolition stays on same wall row');
confirm();
assert.equal(f.getWallCount(),0,'seven cubes removed without spilling to nearby rows');
assert.equal(f.getStock(),26,'removed cubes are refunded correctly');
// Vertical stroke with thumb-wobble remains a single column.
down(5,3);
for(let row=4;row<=8;row++)move(5,row,row%2?19:-18,0);
up(5,8,20);
assert.equal(f.getPreview().builds,6);
confirm();
for(let row=3;row<=8;row++){
 assert.equal(f.getWallHP(10,row*2),30);
 assert.equal(f.getWallHP(9,row*2),0);
 assert.equal(f.getWallHP(12,row*2),0);
}
// A deliberate corner turning >1.35 tiles still draws an L shape.
f.reset();f.begin([],1);
down(0,0);
move(4,0);
move(4,2);
up(4,3);
assert.equal(f.getPreview().builds,8,'five along top plus three at the corner');
confirm();
for(let col=0;col<=4;col++)assert.equal(f.getWallHP(col*2,0),30);
for(let row=1;row<=3;row++)assert.equal(f.getWallHP(8,row*2),30);
assert.equal(f.getWallHP(6,2),0,'corner does not create a thick second row');
// Diagonal drawing is not forced to horizontal or vertical.
f.reset();f.begin([],1);
down(2,4);move(6,8);up(6,8);
assert.equal(f.getPreview().builds,5,'true 45-degree drag still paints one diagonal');
confirm();
for(let i=0;i<5;i++)assert.equal(f.getWallHP((i+2)*2,(i+4)*2),30);
assert.equal(f.getWallHP(6,8),0);
// Mouse input stays unfiltered for precise arbitrary drawing.
f.reset();f.begin([],1);
down(0,0,0,0,'mouse');move(4,1,0,0,'mouse');up(4,1,0,0,'mouse');
assert.equal(f.getPreview().builds,5);
assert(f.getPreview().valid);
// No coordinate drift or state leakage after cancel/new wave.
f.cancel();f.reset();f.begin([],1);
down(0,0);move(5,0);up(5,0);confirm();
assert.equal(f.getWallCount(),6);
assert(html.includes('src="fortress-mode.js?v='),'touch module remains versioned');
assert(sw.includes('v327-touch-angle-snap'));
console.log('PASS v327: jitter-free one-row/column touch painting, red erase, L turns, diagonal and mouse precision.');
