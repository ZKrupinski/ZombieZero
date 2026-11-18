'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const keys=['black_brain_cube','cardboard_box','wooden_crate','black_barrel'];
const types=['normal','critical'],src=fs.readFileSync('dist/assets/ip/v2/object-zombies.js','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');
const preview=fs.readFileSync('dist/assets/ip/v2/cast-demo.js','utf8');
assert(html.includes('v100-approved-p2')&&sw.includes('v100-approved-p2'));
assert(preview.includes('pack.drawDeath(ctx,preview,critical,seconds%duration,duration)'));
assert(src.includes("['black_brain_cube','cardboard_box','wooden_crate','black_barrel']"));
const pngs={};
for(const key of keys)for(const kind of types){
 const filename=key+'-'+kind+'-v100.png',path='dist/assets/ip/v2/p2-deaths/'+filename,buf=fs.readFileSync(path);
 assert(buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'PNG signature '+path);
 assert.equal(buf.readUInt32BE(16),2048,'8 frame columns '+path);
 assert.equal(buf.readUInt32BE(20),256,'256px frame height '+path);
 assert.equal(buf[25],6,'RGBA alpha '+path);
 assert(buf.length>100000,'not empty '+path);
 assert(sw.includes('./assets/ip/v2/p2-deaths/'+filename),'precache '+path);
 pngs[key+kind]=buf;
}
for(const key of keys)assert(!pngs[key+'normal'].equals(pngs[key+'critical']),
 'independent death + critical assets '+key);
assert(!sw.includes('-v98.png'),'rejected previous P2 art excluded');
const actual=[],caches=[];
class Img {
 constructor(){this.naturalWidth=1024;this.naturalHeight=512;}
 set src(p){this._src=p;if(p.includes('/p1-deaths/')||p.includes('/p2-deaths/')){
  this.naturalWidth=2048;this.naturalHeight=256;}this.onload?.()}
 get src(){return this._src}
}
const realm={Math,window:{},Image:Img,document:{createElement(){return{
 width:0,height:0,getContext(){return{save(){},restore(){},translate(){},rotate(){},drawImage(){caches.push(1)}}}
 }}}};
vm.createContext(realm);
vm.runInContext(fs.readFileSync('dist/assets/ip/v2/sprite-geometry.js','utf8'),realm);
vm.runInContext(src,realm);
const lib=realm.window.ZZObjectSprite;
assert.equal(Object.keys(lib.p2FinishedDeaths).length,4);
const ctx={globalAlpha:1,filter:'none',save(){},restore(){},drawImage(img,...args){actual.push({source:img.src,args})}};
for(const [key,form] of [['black_brain_cube',6],['cardboard_box',4],['wooden_crate',5],['black_barrel',2]]){
 for(const critical of [false,true]){
  const kind=critical?'critical':'normal',z={x:70,y:60,w:33,h:44,form,flash:0},duration=critical?.58:.52;
  const resource=lib.p2FinishedDeaths[key][kind];assert(resource.ready,key+' loaded '+kind);
  actual.length=0;caches.length=0;
  for(let frame=0;frame<8;frame++)
    assert(lib.drawDeath(ctx,z,critical,(frame+.9)*duration/8,duration));
  assert.equal(actual.length,8,'one cached bitmap draw per frame');
  assert.equal(caches.length,0,'no per-frame pixel recomposition');
  actual.forEach((d,frame)=>{
   assert(d.source.endsWith(key+'-'+kind+'-v100.png'),'right animation');
   assert.equal(d.args[0],256*frame,'frame x '+frame);
   assert.equal(d.args[2],256);assert.equal(d.args[3],256);
  });
  assert(actual[7].args[6]>actual[0].args[6],'expanded final debris');
 }
}
assert.equal(Object.keys(lib.p1FinishedDeaths).length,3,'P1 unchanged');
assert(src.includes('if(drawP1FinishedDeath(ctx,z,critical,elapsed,duration,img))return true;'));
assert(fs.readFileSync('dist/game.js','utf8').includes('ZZObjectSprite.drawDeath(g,d.z,d.critical,elapsed,duration)'));
console.log('PASS: user-approved v100 P2 8 RGBA sheets, 8 frames each, distinct deaths, actual gameplay/preview and fallback.');
