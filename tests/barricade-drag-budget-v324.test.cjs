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
 fort.resolve(z,x,y+46,.79,()=>{});
}
fort.reset();fort.begin([],1);
// Spend eight, then cap the next drag at the exact remaining eight.
drag(0,7,0);confirm();
assert.equal(fort.getStock(),8);assert.equal(fort.getWallCount(),8);
start(0,1);move(4,1);assert.equal(fort.getPreview().builds,5);assert.equal(fort.getPreview().balance,3);
assert.equal(materialNumber.textContent,'13/16');
move(10,1);assert.equal(fort.getPreview().builds,8);assert.equal(fort.getPreview().balance,0);assert(fort.getPreview().valid);
stop(10,1);confirm();assert.equal(fort.getStock(),0);assert.equal(fort.getWallCount(),16);
start(0,4);move(7,4);assert.equal(fort.getPreview().builds,0);stop(7,4);assert.equal(nodes['fortress-actions'].hidden,true);
drag(0,2,0);assert.equal(fort.getPreview().removes,3);assert.equal(fort.getPreview().balance,3);confirm();
assert.equal(fort.getStock(),3);assert.equal(fort.getWallCount(),13);
drag(0,7,4);assert.equal(fort.getPreview().builds,3);confirm();
assert.equal(fort.getStock(),0);assert.equal(fort.getWallCount(),16);
start(5,0);move(0,0);assert.equal(fort.getPreview().removes,3);assert.equal(fort.getPreview().builds,3);assert.equal(fort.getPreview().balance,0);stop(0,0);confirm();
assert.equal(fort.getWallCount(),16);fort.begin([],2);assert.equal(fort.getStock(),8);
for(let i=0;i<3;i++){const z={x:41,y:82+4*22+3,w:16,h:16};fort.resolve(z,z.x,z.y-30,.79,()=>{});}
assert.equal(fort.getWallHP(0,4),27);
fort.begin([],3);assert.equal(fort.getStock(),16);assert.equal(fort.getWallHP(0,4),30);assert.equal(fort.getSupply().healed,16);
drag(0,7,5);confirm();drag(0,7,6);confirm();assert.equal(fort.getStock(),0);
drag(0,2,4);assert.equal(fort.getPreview().removes,3);nodes['fortress-cancel'].click();assert.equal(fort.getWallHP(0,4),30);
assert(html.includes('src="fortress-mode.js?v='),'fortress module remains cache-versioned');
assert(sw.includes('v324-live-drag-budget'));
// v382: materials are weighted by actual device cost, not object count.
fort.reset();fort.begin([],1);
assert.equal(materialNumber.textContent,'0/16');
assert.equal(fort.selectBuild('ice'),true);
drag(0,0);assert.equal(materialNumber.textContent,'3/16');confirm();
assert.equal(materialNumber.textContent,'3/16');
drag(0,0);assert.equal(materialNumber.textContent,'0/16');
nodes['fortress-cancel'].click();assert.equal(materialNumber.textContent,'3/16');
drag(0,0);confirm();assert.equal(materialNumber.textContent,'0/16');
console.log('PASS v324: live drag caps at materials, zero stock stops drawing, red demolition refunds and free wave healing remain valid.');
