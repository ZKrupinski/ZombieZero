'use strict';
// v98: approved P2 sheets are eight standalone RGBA frames and actually
// render during deaths as well as in the collection demo.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const keys=['black_brain_cube','cardboard_box','wooden_crate','black_barrel'];
const kinds=['normal','critical'],bytes={};
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const src=fs.readFileSync('dist/assets/ip/v2/object-zombies.js','utf8');
const demo=fs.readFileSync('dist/assets/ip/v2/cast-demo.js','utf8');
assert(html.includes('v98-p2-finishers')&&html.includes('cast-demo.js?v=74-clean-trash-can-frames-v98-active-death'));
assert(sw.includes('v98-p2-finishers'),'cache bust includes the P2 revision');
assert(demo.includes('pack.drawDeath(ctx,preview,critical,seconds%duration,duration)'),
 'collection menu uses exact active gameplay death renderer');
for(const id of keys)for(const kind of kinds){
 const path='dist/assets/ip/v2/p2-deaths/'+id+'-'+kind+'-v98.png',a=fs.readFileSync(path);
 assert(a.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),path+' valid PNG');
 assert.equal(a.readUInt32BE(16),2048,'8 horizontal columns '+path);
 assert.equal(a.readUInt32BE(20),256,'256px padded frame '+path);
 assert.equal(a[25],6,'RGBA with alpha '+path);
 assert(sw.includes('./assets/ip/v2/p2-deaths/'+id+'-'+kind+'-v98.png'),'offline cached '+path);
 assert(a.length>150000,'non-placeholder art '+path);
 bytes[id+kind]=a;
}
for(const id of keys)assert(!bytes[id+'normal'].equals(bytes[id+'critical']),
 'the two kinds must be distinct bitmaps: '+id);
assert(src.includes("['black_brain_cube','cardboard_box','wooden_crate','black_barrel']"),
 'P2 finished loader scoped to exactly four unique species');
assert(src.includes('if(drawP2FinishedDeath(ctx,z,critical,elapsed,duration,img))return true;'));
assert(src.includes('if(drawP1FinishedDeath(ctx,z,critical,elapsed,duration,img))return true;'),
 'P1 route preserved');
assert(src.includes('if(drawP1BrainDeath(ctx,img,z,critical,elapsed,duration))return true;'),
 'v96 P1 fallback preserved');
assert(src.includes('if(!clip?.ready)return false'),'P2 missing asset falls back');
const painted=[];class Img{
 constructor(){this.naturalWidth=1024;this.naturalHeight=512}
 set src(p){this._src=p;if(p.endsWith('-v97.png')||p.endsWith('-v98.png')){
   this.naturalWidth=2048;this.naturalHeight=256;}this.onload?.()}
 get src(){return this._src}
}
const mock={Math,Image:Img,window:{},document:{createElement(){return{
 width:0,height:0,getContext(){return{save(){},restore(){},translate(){},rotate(){},drawImage(){}}}
}}}};
vm.createContext(mock);vm.runInContext(fs.readFileSync('dist/assets/ip/v2/sprite-geometry.js','utf8'),mock);
vm.runInContext(src,mock);
const lib=mock.window.ZZObjectSprite;
assert.equal(Object.keys(lib.p2FinishedDeaths).length,4);
const ctx={globalAlpha:1,save(){},restore(){},drawImage(img,...args){painted.push({src:img.src,args})}};
for(const [id,form] of [['black_brain_cube',6],['cardboard_box',4],
 ['wooden_crate',5],['black_barrel',2]])for(const critical of [false,true]){
 const clip=lib.p2FinishedDeaths[id][critical?'critical':'normal'];
 assert(clip.ready,'ready '+id);
 const z={x:70,y:70,w:33,h:44,form,flash:0};
 const dur=critical?.58:.52;painted.length=0;
 for(let i=0;i<8;i++)assert(lib.drawDeath(ctx,z,critical,(i+.9)*dur/8,dur));
 assert.equal(painted.length,8,'one image draw per active frame '+id);
 for(let i=0;i<8;i++){
   assert(painted[i].src.endsWith(id+'-'+(critical?'critical':'normal')+'-v98.png'));
   assert.equal(painted[i].args[0],256*i,'frame x '+i);
   assert.equal(painted[i].args[2],256);
   assert.equal(painted[i].args[3],256);
 }
 assert(painted[7].args[6]>painted[0].args[6],'expanding debris animation');
}
// Explicit missing-PNG fallback leaves the original 2-keyframe death available.
lib.p2FinishedDeaths.black_barrel.normal.ready=false;
painted.length=0;
assert(lib.drawDeath(ctx,{x:70,y:70,w:33,h:44,form:2,flash:0},false,.04,.52));
assert(painted.some(c=>c.src.endsWith('black_barrel.png')),'original black barrel fallback');
const game=fs.readFileSync('dist/game.js','utf8');
assert(game.includes('ZZObjectSprite.drawDeath(g,d.z,d.critical,anim.t,anim.split)'),
 'critical and normal gameplay hooks untouched');
console.log('PASS: 8 P2 sprites (8x256 RGBA each), active/death preview parity, distinct critical, fallback, P1 & core gameplay.');
