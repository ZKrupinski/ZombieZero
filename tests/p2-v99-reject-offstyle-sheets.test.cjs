'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/assets/ip/v2/object-zombies.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
assert(src.includes('P2_FINISHED_DEATH_KEYS'),'v100 P2 approvals enabled');
assert(src.includes('drawP2FinishedDeath('),'P2 runtime uses the new sprites');
assert(src.includes('if(drawP1FinishedDeath(ctx,z,critical,elapsed,duration,img))return true;'),'P1 priority kept');
assert(html.includes('v100-approved-p2'),'browser reloads new JS');
assert(sw.includes('v100-approved-p2'),'PWA invalidates old rejected sprites');
assert(!sw.includes('-v98.png'),'all rejected v98 P2 assets excluded from cache');
assert(html.includes('cast-demo.js?v=74-clean-trash-can-frames-v98-active-death'),
 'cast demo still uses the actual runtime death render');
const painted=[];
class Img{
 constructor(){this.naturalWidth=1024;this.naturalHeight=512}
 set src(path){this._src=path;
  if(path.includes('/p1-deaths/')||path.includes('/p2-deaths/')){this.naturalWidth=2048;this.naturalHeight=256;}
  this.onload?.()}
 get src(){return this._src}
}
const env={window:{},Image:Img,Math,document:{createElement(){return{width:0,height:0,getContext(){return{
 save(){},restore(){},translate(){},rotate(){},drawImage(){}
 }}}}}};
vm.createContext(env);
vm.runInContext(fs.readFileSync('dist/assets/ip/v2/sprite-geometry.js','utf8'),env);
vm.runInContext(src,env);
const lib=env.window.ZZObjectSprite;
lib.request(Object.keys(lib.names));
const ctx={globalAlpha:1,filter:'none',save(){},restore(){},drawImage(img,...args){painted.push({url:img.src,args})}};
for(const [form,key] of [[6,'black_brain_cube'],[4,'cardboard_box'],[5,'wooden_crate'],[2,'black_barrel']]){
 for(const critical of [false,true]){
  const z={form,x:50,y:90,w:33,h:44,flash:0},kind=critical?'critical':'normal';
  painted.length=0;assert(lib.drawDeath(ctx,z,critical,.06,critical?.58:.52));
  assert(painted.some(x=>x.url.endsWith(key+'-'+kind+'-v100.png')),'approved sprite '+key+' '+kind);
  // Simulate missing resource: the original 2-key animation must remain usable.
  const asset=lib.p2FinishedDeaths[key][kind];asset.ready=false;
  painted.length=0;assert(lib.drawDeath(ctx,z,critical,.06,critical?.58:.52));
  assert(painted.every(x=>x.url.endsWith(key+'.png')),'original fallback '+key+' '+kind);
  asset.ready=true;
 }
}
assert.equal(Object.keys(lib.p1FinishedDeaths).length,3,'all three P1 remain loaded');
assert(fs.readFileSync('dist/game.js','utf8').includes('ZZObjectSprite.drawDeath(g,d.z,d.critical,elapsed,duration)'));
console.log('PASS: v98 rejected, new P2 v100 enabled, original P2 fallback and P1 preserved.');
