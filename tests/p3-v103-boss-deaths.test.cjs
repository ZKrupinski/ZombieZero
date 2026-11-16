'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const base='dist/assets/ip/v2/p3-deaths/';
const keys=['big_zombie','trash_can'],modes=['normal','critical'];
const src=fs.readFileSync('dist/assets/ip/v2/object-zombies.js','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
assert(html.includes('v103-original-boss-deaths')&&sw.includes('v103-original-boss-deaths'),
 'v103 cache-busting for app and loader');
const files=[];
for(const key of keys)for(const mode of modes){
 const name=key+'-'+mode+'-v103.png',path=base+name,buf=fs.readFileSync(path);
 assert(buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'PNG '+name);
 assert.equal(buf.readUInt32BE(16),6144,'12 frames '+name);
 assert.equal(buf.readUInt32BE(20),512,'512px square cells '+name);
 assert.equal(buf[25],6,'RGBA transparent '+name);
 assert(buf.length>30000,'substantial source-art pixels '+name);
 assert(sw.includes('./assets/ip/v2/p3-deaths/'+name),'PWA optional asset '+name);
 files.push(buf);
}
assert(!files[0].equals(files[1])&&!files[2].equals(files[3]),
 'normal and critical boss art must be distinct');
const drawCalls=[];
class Img {
 constructor(){this.naturalWidth=1024;this.naturalHeight=512;}
 set src(x){
  this._src=x;
  if(x.includes('/p3-deaths/')){this.naturalWidth=6144;this.naturalHeight=512;}
  else if(x.endsWith('_hd.png')){this.naturalWidth=2048;this.naturalHeight=1024;}
  this.onload?.();
 }
 get src(){return this._src;}
}
const realm={Math,window:{},Image:Img};
vm.createContext(realm);
vm.runInContext(fs.readFileSync('dist/assets/ip/v2/sprite-geometry.js','utf8'),realm);
vm.runInContext(fs.readFileSync('dist/assets/ip/v2/boss-geometry.js','utf8'),realm);
vm.runInContext(src,realm);
const sprite=realm.window.ZZObjectSprite;
const ctx={
 globalAlpha:1,filter:'none',save(){},restore(){},
 drawImage(image,...args){drawCalls.push({src:image.src,args});}
};
assert.equal(Object.keys(sprite.p3BossDeaths).length,2,'two unique boss species');
assert.equal(sprite.bosses.join(','),'big_zombie,trash_can,big_zombie,trash_can',
 'four boss slots map to two identities');
for(let bossForm=0;bossForm<4;bossForm++)for(const critical of [false,true]){
 const key=sprite.bosses[bossForm],mode=critical?'critical':'normal';
 const duration=critical?.94:.78,actor={boss:true,bossForm,x:70,y:50,w:50,h:90,flash:0};
 assert(sprite.p3BossDeaths[key][mode].ready,'loaded '+key+' '+mode);
 for(let frame=1;frame<12;frame++){
  drawCalls.length=0;
  assert(sprite.drawDeath(ctx,actor,critical,(frame+.2)*duration/12,duration));
  assert.equal(drawCalls.length,1,'one bitmap draw per boss death frame');
  assert(drawCalls[0].src.includes(key+'-'+mode+'-v103.png'),'correct P3 source');
  assert.equal(drawCalls[0].args[0],512*frame,'frame index '+frame);
  assert.equal(drawCalls[0].args[2],512,'frame width');
  assert.equal(drawCalls[0].args[3],512,'frame height');
 }
 const old=sprite.p3BossDeaths[key][mode].ready;
 sprite.p3BossDeaths[key][mode].ready=false;
 drawCalls.length=0;
 sprite.drawDeath(ctx,actor,critical,.3,duration);
 assert(drawCalls.length>0&&!drawCalls.some(d=>d.src?.includes('/p3-deaths/')),
  'P3 missing -> original HD fallback');
 sprite.p3BossDeaths[key][mode].ready=old;
}
assert.equal(Object.keys(sprite.p1FinishedDeaths).length,3,'preserve P1');
assert.equal(Object.keys(sprite.p2FinishedDeaths).length,4,'preserve P2');
assert(fs.readFileSync('dist/game.js','utf8')
 .includes('ZZObjectSprite.drawDeath(g,d.z,d.critical,anim.t,anim.split)'),
 'unchanged real game death draw path');
console.log('PASS: P3 original HD boss strips, 12 RGBA frames, both modes, four slots, fallbacks.');
