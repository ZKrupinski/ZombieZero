'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const keys=['yellow_brain_cube','red_brain_cube','red_barrel'],kinds=['normal','critical'];
const sw=fs.readFileSync('dist/sw.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');
assert(sw.includes('v97-approved-6png')&&html.includes('v97-approved-6png'),'PWA and script version updated');
for(const k of keys)for(const t of kinds){
 const path='dist/assets/ip/v2/p1-deaths/'+k+'-'+t+'-v97.png',a=fs.readFileSync(path);
 assert(a.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'PNG '+path);
 assert.equal(a.readUInt32BE(16),2048,'8 horizontal frames');
 assert.equal(a.readUInt32BE(20),256,'cell height');
 assert(a[25]===6||a.includes(Buffer.from('tRNS')),'transparent sprite '+path);
 assert(sw.includes('./assets/ip/v2/p1-deaths/'+k+'-'+t+'-v97.png'),'PWA precache '+path);
}
const src=fs.readFileSync('dist/assets/ip/v2/object-zombies.js','utf8');
const frames=[],bakes=[];
class Img{
 constructor(){this.naturalWidth=1024;this.naturalHeight=512}
 set src(p){this._src=p;if(p.endsWith('-v97.png')){this.naturalWidth=2048;this.naturalHeight=256}this.onload?.()}
 get src(){return this._src}
}
const mock={window:{},Image:Img,Math,document:{createElement(){
 return{width:0,height:0,getContext(){return {save(){},restore(){},translate(){},rotate(){},drawImage(){bakes.push(1)}}}}
}}};
vm.createContext(mock);vm.runInContext(fs.readFileSync('dist/assets/ip/v2/sprite-geometry.js','utf8'),mock);
vm.runInContext(src,mock);
const lib=mock.window.ZZObjectSprite;
const canvas={globalAlpha:1,save(){},restore(){},drawImage(img,...args){frames.push({src:img.src,args})}};
assert.equal(Object.keys(lib.p1FinishedDeaths).length,3);
for(const [id,form] of [['yellow_brain_cube',7],['red_brain_cube',3],['red_barrel',1]])
for(const critical of [false,true]){
 const clip=lib.p1FinishedDeaths[id][critical?'critical':'normal'];
 assert(clip.ready,'loaded PNG '+id);
 const z={x:70,y:70,w:33,h:44,form,flash:0};
 const dur=critical?.58:.52;
 frames.length=0;bakes.length=0;
 for(let n=0;n<8;n++)assert(lib.drawDeath(canvas,z,critical,(n+.9)*dur/8,dur));
 assert.equal(frames.length,8,'one draw per frame');
 assert.equal(bakes.length,0,'never rebuild on active PNG path');
 for(let n=0;n<8;n++){
  assert(frames[n].src.includes(id+'-'+(critical?'critical':'normal')+'-v97.png'),'correct art');
  assert.equal(frames[n].args[0],n*256,'frame crop '+n);
  assert.equal(frames[n].args[2],256);assert.equal(frames[n].args[3],256);
 }
 assert(frames[7].args[6]>frames[0].args[6],'late frames expand');
}
const source=fs.readFileSync('dist/game.js','utf8');
assert(source.includes('ZZObjectSprite.drawDeath(g,d.z,d.critical,anim.t,anim.split)'),'game death flow retained');
assert(src.includes('if(drawP1BrainDeath(ctx,img,z,critical,elapsed,duration))return true;'),'v96 fallback');
assert(src.includes('drawFrame(ctx,livingAtlas,{...z,flash:0},0,1-blend)'),'living->death blend');
console.log('PASS: six padded 8f PNGs, unique normal/critical assets, PWA, no runtime baking, frame expansion, fallback.');
