'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const moduleSource=fs.readFileSync('dist/fortress-mode.js','utf8');
const index=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const guide=fs.readFileSync('dist/menu-pages.js','utf8');
const ids=['fortress-builder','fortress-actions','fortress-confirm','fortress-cancel',
 'fortress-ready','fortress-stock','fortress-tip','fortress-build-count',
 'fortress-supply','fortress-preview-summary','fortress-tool'];
const nodes={};
for(const id of ids)nodes[id]={
 hidden:false,disabled:false,textContent:'',style:{},dataset:{},
 addEventListener(name,fn){this[name]=fn},
 setAttribute(name,val){this[name]=val},
 getBoundingClientRect(){return {left:0,top:0,width:450,height:710}}
};
const fakeDocument={getElementById:id=>nodes[id]||null,
 createElement:()=>({getContext:()=>null})};
const fakeWindow={};
new Function('window','document',moduleSource)(fakeWindow,fakeDocument);
const fort=fakeWindow.ZZFortress;
const canvas={
 getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),
 setPointerCapture(){}
};
const point=(col,row=0)=>({pointerId:17,button:0,clientX:37+22*col,clientY:92+22*row});
function drag(first,last,row=0){
 assert.equal(fort.down(point(first,row),canvas),true);
 fort.move(point(last,row),canvas);
 assert.equal(fort.up(point(last,row),canvas),true);
}
function chip(col,row=0){
 const x=30+22*col,y=90+22*row,enemy={x,y,w:16,h:22};
 assert.equal(fort.resolve(enemy,x,y-35,.79,()=>{}),true);
}
fort.reset();fort.begin([],1);
drag(0,5);nodes['fortress-confirm'].click();
assert.equal(fort.getWallCount(),6);
assert.equal(fort.getStock(),20);
for(let i=0;i<6;i++)chip(i);
assert.equal(fort.getWallHP(0,0),29);
nodes['fortress-tool'].click();
drag(0,4);
assert.equal(fort.getPreview().repairs,5);
assert.equal(fort.getPreview().repairCost,1,'one material covers five full repairs');
assert.equal(fort.getPreview().balance,19);
assert.match(nodes['fortress-preview-summary'].textContent,/수리 5칸 \(자재 -1\)/);
assert.match(nodes['fortress-tip'].textContent,/최대 5칸/);
nodes['fortress-cancel'].click();
assert.equal(fort.getStock(),20,'cancel costs nothing');
assert.equal(fort.getWallHP(0,0),29,'cancel does not repair');
drag(0,4);nodes['fortress-confirm'].click();
assert.equal(fort.getStock(),19,'five damaged blocks consume one material');
for(let i=0;i<5;i++)assert.equal(fort.getWallHP(i,0),30,'repaired block is fully restored');
assert.equal(fort.getWallHP(5,0),29,'unselected block stays damaged');
drag(5,5);
assert.equal(fort.getPreview().repairCost,1,'one damaged block costs one material');
nodes['fortress-confirm'].click();
assert.equal(fort.getStock(),18);
assert.equal(fort.getWallHP(5,0),30);
for(let i=0;i<6;i++)chip(i);
drag(0,5);
assert.equal(fort.getPreview().repairCost,2,'six repaired cubes cost only two materials');
assert.equal(fort.getPreview().balance,16);
nodes['fortress-confirm'].click();
assert.equal(fort.getStock(),16);
for(let i=0;i<6;i++)assert.equal(fort.getWallHP(i,0),30);
// No materials: cannot repair, but cancel does not mutate walls.
fort.reset();fort.begin([],1);
drag(0,17);nodes['fortress-confirm'].click();
drag(0,7,1);nodes['fortress-confirm'].click();
assert.equal(fort.getStock(),0);
chip(0);
nodes['fortress-tool'].click();drag(0,0);
assert.equal(fort.getPreview().repairs,0,'no repair preview once the material budget is depleted');
assert.equal(fort.getPreview().repairCost,0);
assert.equal(fort.getPreview().balance,0);
assert.equal(nodes['fortress-actions'].hidden,true,'no confirm buttons for blocked zero-stock repair');
nodes['fortress-cancel'].click();
assert.equal(fort.getWallHP(0,0),29);
assert.match(guide,/최대 5칸마다 자재 1개/);
assert(index.includes('src="fortress-mode.js?v='),'barricade module URL remains cache-versioned');
assert(index.includes('v321-cheaper-group-repair'));
assert(sw.includes('v321-cheaper-group-repair'));
console.log('PASS v321: 5 fully repaired barricades per material, preview budget, 6-for-2 rounding, cancel and insufficient-funds safety.');
