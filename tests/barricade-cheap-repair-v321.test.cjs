'use strict';
// Legacy v321 paid-repair scenario is now the free, automatic survivor-healing
// contract. Keep the regression at its historical test path.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('dist/fortress-mode.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const guide=fs.readFileSync('dist/menu-pages.js','utf8');
const ids=['fortress-builder','fortress-actions','fortress-confirm','fortress-cancel',
 'fortress-ready','fortress-material','fortress-tip','fortress-preview-summary'];
const nodes={};
for(const id of ids)nodes[id]={hidden:false,disabled:false,style:{},dataset:{},
 addEventListener(k,fn){this[k]=fn},
 getBoundingClientRect(){return {left:0,top:0,width:450,height:710}}};
const materialNumber={textContent:''};
nodes['fortress-material'].querySelector=selector=>selector==='strong'?materialNumber:null;
const doc={getElementById:id=>nodes[id]||null,
 createElement:()=>({getContext:()=>null})};
const win={};new Function('window','document',source)(win,doc);
const fort=win.ZZFortress;
const canvas={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),
 setPointerCapture(){}};
const p=(col,row=0)=>({pointerId:17,button:0,clientX:48+22*col,clientY:92+22*row});
function drag(a,b,row=0){
 assert.equal(fort.down(p(a,row),canvas),true);
 fort.move(p(b,row),canvas);assert.equal(fort.up(p(b,row),canvas),true);
}
const confirm=()=>nodes['fortress-confirm'].click();
function chip(col,row=0,count=1){
 const x=41+col*22,y=90+row*22,z={x,y,w:16,h:22};
 for(let i=0;i<count;i++){
  z.x=x;z.y=y;fort.resolve(z,x,y-35,.79,()=>{});
 }
}
fort.reset();fort.begin([],1);
drag(0,5);confirm();
assert.equal(fort.getWallCount(),6);
assert.equal(fort.getStock(),20);
for(let i=0;i<6;i++)chip(i);
assert.equal(fort.getWallHP(0,0),29,'survivor damaged during active wave');
assert.equal(fort.getStock(),20,'being bitten consumes no material');
const count=fort.getWallCount(),stock=fort.getStock();
fort.begin([],2);
assert.equal(fort.getWallCount(),count,'surviving cubes persist in place');
for(let i=0;i<6;i++)assert.equal(fort.getWallHP(i,0),30,'ALL survivors fully healed');
assert.equal(fort.getStock(),stock+8,'automatic repair is free on top of stage supply');
assert.deepEqual(fort.getSupply(),{refund:0,bonus:8,healed:6});
assert.equal(materialNumber.textContent,String(stock+8).padStart(2,'0'));
assert(!html.includes('id="fortress-supply"'),'duplicate supply label removed');
assert(!html.includes('id="fortress-tool"'),'manual repair button is removed');
assert(!source.includes('repairMode'),'manual repair mode removed');
assert(!source.includes('repairCost'),'paid repair billing removed');
assert.match(guide,/자동 수리/);
// Every new stage heals again, even when all available construction material is gone.
fort.begin([],3);
assert.equal(fort.getStock(),stock+16);
assert.equal(fort.getWallHP(0,0),30);
console.log('PASS v321/v329: free automatic full healing of all surviving barricades, no repair button or charges.');
