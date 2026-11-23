'use strict';
// BARRICADE HORDE: full refund for last-wave zombie losses, material
// budget and near-touch actions, drag-to-dismantle, and repair mode.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const mod=fs.readFileSync('dist/fortress-mode.js','utf8');
const css=fs.readFileSync('dist/fortress-mode.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const ids=['fortress-builder','fortress-actions','fortress-confirm','fortress-cancel',
 'fortress-ready','fortress-stock','fortress-tip','fortress-build-count',
 'fortress-supply','fortress-preview-summary','fortress-tool'];
const nodes={};
for(const id of ids)nodes[id]={
 hidden:false,disabled:false,textContent:'',style:{},dataset:{},
 addEventListener(name,fn){this[name]=fn},
 setAttribute(name,value){this[name]=value},
 getBoundingClientRect(){return {left:0,top:0,width:450,height:710}}
};
const doc={getElementById:id=>nodes[id]||null,
 createElement:()=>({getContext:()=>null})};
const win={};new Function('window','document',mod)(win,doc);
const fort=win.ZZFortress;
const canvas={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),
 setPointerCapture(){}};
const p=(col,row)=>({clientX:49+col*22+10,
 clientY:82+row*22+10,pointerId:42,button:0});
function drag(a,b,row){
 assert.equal(fort.down(p(a,row),canvas),true);
 fort.move(p(b,row),canvas);
 assert.equal(fort.up(p(b,row),canvas),true);
}
function bite(col,row,count){
 const x=49+col*22+3,y=82+row*22+3;
 const z={x,y,w:15,h:16};
 for(let i=0;i<count;i++){
  z.x=x;z.y=y;fort.resolve(z,x,y-30,.79,()=>{});
 }
}
fort.reset();
const enemies=Array.from({length:12},(_,i)=>({x:50+i*22,y:42,w:16,h:18}));
fort.begin(enemies,1);
assert.equal(enemies.length,0,'empty building phase');
assert.equal(fort.getStock(),26);
assert.match(nodes['fortress-build-count'].textContent,/26개/);
drag(0,3,0);
assert.equal(fort.getPreview().builds,4);
assert.equal(fort.getPreview().balance,22);
assert.match(nodes['fortress-build-count'].textContent,/22개/,'live remaining build capacity');
assert.match(nodes['fortress-preview-summary'].textContent,/확정 후 자재 22/);
assert.equal(nodes['fortress-actions'].dataset.side,'below');
assert.match(nodes['fortress-actions'].style.left,/px/,'actions follow finger X');
assert.match(nodes['fortress-actions'].style.top,/px/,'actions follow finger Y');
nodes['fortress-confirm'].click();
assert.equal(fort.getWallCount(),4);
assert.equal(fort.getStock(),22);
drag(0,1,0);
assert.deepEqual(fort.getPreview().removes,2);
assert.equal(fort.getPreview().balance,24);
assert.equal(nodes['fortress-actions'].hidden,false,'floating confirmation displayed');
assert.equal(nodes['fortress-ready'].hidden,true,'cannot start with pending demolition');
const colors=[];
const g={save(){},restore(){},drawImage(){},strokeRect(){},beginPath(){},moveTo(){},
 lineTo(){},stroke(){},fillRect(){colors.push(this.fillStyle)}};
fort.draw(g,true);
assert(colors.includes('#fc334c'),'existing walls show red removal preview');
nodes['fortress-cancel'].click();
assert.equal(fort.getWallCount(),4,'cancel leaves walls untouched');
assert.equal(fort.getStock(),22,'cancel does not refund');
drag(0,1,0);nodes['fortress-confirm'].click();
assert.equal(fort.getWallCount(),2);
assert.equal(fort.getStock(),24,'refund 1 for each dismantled wall');
drag(1,3,0);
assert.deepEqual([fort.getPreview().builds,fort.getPreview().removes],[1,2],
 'mixed blank/existing drag charges builds and credits removals');
nodes['fortress-confirm'].click();
assert.equal(fort.getWallCount(),1);
assert.equal(fort.getStock(),25);
drag(0,2,3);nodes['fortress-confirm'].click();
assert.equal(fort.getStock(),22);
assert.equal(fort.getWallCount(),4);
fort.ready(); // No bound callback; production uses bind(deploy).
bite(0,3,30);bite(1,3,30);
assert.equal(fort.getPendingRefund(),2,'every zombie-destroyed wall counts once');
assert.equal(fort.getWallCount(),2);
assert.equal(fort.getStock(),22,'material only refunded on the next stage');
fort.begin([],2);
assert.equal(fort.getStock(),32,'22 leftover + 2 destroyed refunded + 8 new');
assert.deepEqual(fort.getSupply(),{refund:2,bonus:8});
assert.match(nodes['fortress-supply'].textContent,/파괴 환급 \+2/);
assert.match(nodes['fortress-supply'].textContent,/보급 \+8/);
assert.match(nodes['fortress-build-count'].textContent,/32개/);
assert.equal(fort.getPendingRefund(),0,'stage refund counter resets');
bite(2,3,3);assert.equal(fort.getWallHP(2,3),27);
nodes['fortress-tool'].click();
assert.equal(nodes['fortress-tool']['aria-pressed'],'true');
drag(2,2,3);
assert.equal(fort.getPreview().repairs,1);
nodes['fortress-confirm'].click();
assert.equal(fort.getWallHP(2,3),30,'repair mode fully restores damage');
assert.equal(fort.getStock(),31,'repair still costs 1 material');
nodes['fortress-tool'].click();
fort.begin([],3);
assert.equal(fort.getStock(),39,'no duplicate refund in following wave');
assert.deepEqual(fort.getSupply(),{refund:0,bonus:8});
// When stock runs out, construction is blocked but removal is still possible.
fort.reset();fort.begin([],1);
drag(0,15,0);nodes['fortress-confirm'].click();
drag(0,9,1);nodes['fortress-confirm'].click();
assert.equal(fort.getStock(),0);
assert.match(nodes['fortress-build-count'].textContent,/0개/);
drag(0,0,2);
assert.equal(fort.getPreview().builds,0,'zero-stock construction is not previewed while dragging');
assert.equal(fort.getPreview().balance,0,'budget never drops below zero');
assert.equal(nodes['fortress-actions'].hidden,true,'no confirmation for a blocked empty stroke');
assert.equal(fort.getWallCount(),26);
drag(0,0,0);assert.equal(fort.getPreview().removes,1);
assert.equal(nodes['fortress-confirm'].disabled,false,'no stock needed to dismantle');
nodes['fortress-confirm'].click();
assert.equal(fort.getStock(),1,'recycle one cube to recover one material');
drag(0,0,2);nodes['fortress-confirm'].click();
assert.equal(fort.getStock(),0);
assert.equal(fort.getWallCount(),26);
assert(css.includes('#fortress-actions[data-side="below"]')&&css.includes('#fortress-tool'),
 'finger-adjacent controls and repair toggle styled');
for(const id of ['fortress-build-count','fortress-supply','fortress-tool','fortress-preview-summary'])
 assert(html.includes('id="'+id+'"'),id+' present in DOM');
assert(html.includes('src="fortress-mode.js?v='),'barricade module has versioned URL');
assert(html.includes('fortress-mode.css?v=318-refund-erase-builder'));
assert(sw.includes('v318-refund-erase-builder'),'PWA cache refreshed');
// V319: all 20 wall-grid rows (y=82..522) must remain uncovered by
// persistent HUD. Ready stays below row 20 but above the relocated panel.
const panel=css.slice(css.indexOf('.zz-fortress-top{'),css.indexOf('}',css.indexOf('.zz-fortress-top{'))+1);
const ready=css.slice(css.indexOf('\n#fortress-ready{'),css.indexOf('}',css.indexOf('\n#fortress-ready{'))+1);
assert(panel.includes('top:auto;bottom:1.2%'),'construction info must be anchored to lower hero/citizen strip');
assert(!panel.includes('top:2.8%'),'old top-covering HUD removed');
assert(ready.includes('top:79%'),'ready moved below the bottommost building cell');
assert(710*.79-46/2 > 82+20*22,'ready button never covers a buildable grid row');
assert(html.includes('fortress-mode.css?v=318-refund-erase-builder-v319-bottom-ui'),'changed stylesheet invalidates web cache');
assert(sw.includes('v319-bottom-ui'),'service-worker shell refreshes the bottom HUD');
console.log('PASS v318/v319: resource refund, erase/repair, floating controls, bottom HUD outside building grid.');
