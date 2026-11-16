'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/assets/ip/v2/object-zombies.js','utf8'),
 html=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
assert(!src.includes('P2_FINISHED_DEATH_KEYS'),'unapproved P2 death renderer removed');
assert(!src.includes('drawP2FinishedDeath('),'P2 runtime falls back to original two-key art');
assert(src.includes('if(drawP1FinishedDeath(ctx,z,critical,elapsed,duration,img))return true;'),
 'approved P1 asset renderer remains unchanged');
assert(html.includes('v99-rejected-p2'),'browser cache-bust for JS reversion');
assert(sw.includes('v99-original-p2-fallback'),'fresh offline shell on rollback');
assert(!sw.includes('/p2-deaths/'),'rejected art no longer precached');
assert(html.includes('cast-demo.js?v=74-clean-trash-can-frames-v98-active-death'),
 'collection preview remains routed through real game renderer');
for(const key of ['black_brain_cube','cardboard_box','wooden_crate','black_barrel'])
 for(const kind of ['normal','critical'])
 assert(!fs.existsSync('dist/assets/ip/v2/p2-deaths/'+key+'-'+kind+'-v98.png'),
   'rejected PNG removed: '+key+' '+kind);
const painted=[];
class Img{
 constructor(){this.naturalWidth=1024;this.naturalHeight=512;}
 set src(path){this._src=path; if(path.includes('p1-deaths')){this.naturalWidth=2048;this.naturalHeight=256;}this.onload?.();}
 get src(){return this._src;}
}
const ctx={window:{},Image:Img,Math,document:{createElement(){return{width:0,height:0,getContext(){return{save(){},restore(){},translate(){},rotate(){},drawImage(){}}}}}}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('dist/assets/ip/v2/sprite-geometry.js','utf8'),ctx);
vm.runInContext(src,ctx);
const lib=ctx.window.ZZObjectSprite;
const paint={globalAlpha:1,filter:'none',save(){},restore(){},
 drawImage(img,...args){painted.push({url:img.src,args})}};
for(const [form,key] of [[6,'black_brain_cube'],[4,'cardboard_box'],[5,'wooden_crate'],[2,'black_barrel']]){
 for(const critical of [false,true]){
  const z={form,x:50,y:90,w:33,h:44,flash:0};
  painted.length=0;
  assert(lib.drawDeath(paint,z,critical,.06,critical?.58:.52));
  assert(painted.length>0,'original animation visible '+key);
  assert(painted.every(x=>x.url.endsWith(key+'.png')),'source art preserved '+key);
 }
}
assert.equal(Object.keys(lib.p1FinishedDeaths).length,3,'P1 three species kept');
const game=fs.readFileSync('dist/game.js','utf8');
assert(game.includes('ZZObjectSprite.drawDeath(g,d.z,d.critical,anim.t,anim.split)'));
console.log('PASS: all four off-style P2 death art removed, original normal/critical fallback, P1 retained, cache reset.');
