'use strict';
// Drag is an incremental construction transaction, not an unlimited ghost.
// Over-budget squares never enter the live preview on pointermove.
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('dist/fortress-mode.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const ids=['fortress-builder','fortress-actions','fortress-confirm','fortress-cancel',
 'fortress-ready','fortress-material','fortress-tip','fortress-preview-summary'];
const nodes={};
for(const id of ids)nodes[id]={hidden:false,disabled:false,textContent:'',style:{},dataset:{},
 addEventListener(name,fn){this[name]=fn},setAttribute(){},
 getBoundingClientRect(){return {left:0,top:0,width:450,height:710}}};
const materialNumber={textContent:''};
nodes['fortress-material'].querySelector=selector=>selector==='strong'?materialNumber:null;
const doc={getElementById:id=>nodes[id]||null,createElement:()=>({getContext:()=>null})};
const w={};new Function('window','document',src)(w,doc);
const fort=w.ZZFortress,canvas={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),
 setPointerCapture(){}};
const p=(col,row=0)=>({pointerId:2,button:0,clientX:48+col*22,clientY:92+row*22});
const start=(col,row=0)=>assert.equal(fort.down(p(col,row),canvas),true);
const move=(col,row=0)=>assert.equal(fort.move(p(col,row),canvas),true);
const stop=(col,row=0)=>assert.equal(fort.up(p(col,row),canvas),true);
const confirm=()=>nodes['fortress-confirm'].click();
const drag=(a,b,row=0)=>{start(a,row);move(b,row);stop(b,row)};
function bite(col,row=0){
 const x=41+col*22,y=90+row*22,z={x,y,w:16,h:22};
 // Approach the selected row from the empty row below; the upper rows
 // already have solid barricades and are not a valid bite origin.
 fort.resolve(z,x,y+30,.79,()=>{});
}
fort.reset();fort.begin([],1);
// Spend 17 cubes on the first row. Remaining nine are visible immediately.
drag(0,16);confirm();
assert.equal(fort.getStock(),9);
assert.equal(fort.getWallCount(),17);
// Draw past capacity over several pointermove events, without releasing.
start(0,1);move(4,1);
assert.equal(fort.getPreview().builds,5);
assert.equal(fort.getPreview().balance,4);
assert.equal(materialNumber.textContent,'22/26');
move(16,1);
assert.equal(fort.getPreview().builds,9,'the preview stops at 9 cubes');
assert.equal(fort.getPreview().balance,0);
assert.equal(materialNumber.textContent,'26/26');
assert.equal(fort.getPreview().valid,true,'drawn preview always affordable');
stop(16,1);
assert.match(nodes['fortress-preview-summary'].textContent,/설치 \+9/);
confirm();
assert.equal(fort.getStock(),0);
assert.equal(fort.getWallCount(),26);
// No stock prevents any further blank-cell previews already on pointerDown.
start(0,2);move(16,2);
assert.equal(fort.getPreview().builds,0);
assert.equal(fort.getPreview().balance,0);
stop(16,2);
assert.equal(nodes['fortress-actions'].hidden,true);
// Red removal works with zero materials, since it refunds rather than costs.
start(0,0);move(2,0);
assert.equal(fort.getPreview().removes,3);
assert.equal(fort.getPreview().balance,3);
stop(2,0);confirm();
assert.equal(fort.getStock(),3);
assert.equal(fort.getWallCount(),23);
// Three reclaimed materials => exactly three new squares are previewed.
start(0,2);move(9,2);
assert.equal(fort.getPreview().builds,3);
assert.equal(fort.getPreview().balance,0);
stop(9,2);confirm();
assert.equal(fort.getStock(),0);
assert.equal(fort.getWallCount(),26);
// Mixed stroke: first remove old cubes, then construct with their refunds.
// Cells 3..5 on row 0 are existing, 0..2 are empty; trace right-to-left.
start(5,0);move(0,0);
assert.equal(fort.getPreview().removes,3);
assert.equal(fort.getPreview().builds,3);
assert.equal(fort.getPreview().balance,0);
stop(0,0);confirm();
assert.equal(fort.getStock(),0);
assert.equal(fort.getWallCount(),26);
// Surviving walls heal free at the next stage, irrespective of materials.
fort.begin([],2);
assert.equal(fort.getStock(),8);
for(let i=0;i<9;i++)bite(i%3,2);
assert.equal(fort.getWallHP(0,2),27,'survivors may be damaged in combat');
fort.begin([],3);
assert.equal(fort.getStock(),16,'only normal supply replenishes stock');
assert.equal(fort.getWallHP(0,2),30,'surviving barricade heals at no cost');
assert.equal(fort.getSupply().healed,26);
drag(0,15,3);confirm();
assert.equal(fort.getStock(),0,'all 16 materials spent on new blocks');
assert.equal(fort.getWallHP(0,2),30,'healed wall does not require material');
// Already-built cells can still be demolished and refunded at zero stock.
start(0,2);move(2,2);
assert.equal(fort.getPreview().removes,3);
assert.equal(fort.getPreview().balance,3);
stop(2,2);nodes['fortress-cancel'].click();
assert.equal(fort.getStock(),0);
assert.equal(fort.getWallHP(0,2),30,'cancel preserves healed wall');
assert(html.includes('src="fortress-mode.js?v='),'fortress module remains cache-versioned');
assert(sw.includes('v324-live-drag-budget'));
// v382: materials are weighted by actual device cost, not object count.
fort.reset();fort.begin([],1);
assert.equal(materialNumber.textContent,'0/26');
assert.equal(fort.selectBuild('ice'),true);
drag(0,0);assert.equal(materialNumber.textContent,'3/26');confirm();
assert.equal(materialNumber.textContent,'3/26');
drag(0,0);assert.equal(materialNumber.textContent,'0/26');
nodes['fortress-cancel'].click();assert.equal(materialNumber.textContent,'3/26');
drag(0,0);confirm();assert.equal(materialNumber.textContent,'0/26');
console.log('PASS v324: live drag caps at materials, zero stock stops drawing, red demolition refunds and free wave healing remain valid.');
