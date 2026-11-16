'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const base='dist/assets/ip/v2/p3-deaths/';
const keys=['big_zombie','trash_can'],modes=['normal','critical'];
const src=fs.readFileSync('dist/assets/ip/v2/object-zombies.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const design=fs.readFileSync('tools/generate_p3_boss_deaths.py','utf8');
assert(html.includes('v104-anatomical-boss-deaths'));
assert(sw.includes('v104-original-anatomy'));
assert(design.includes('"normal": {}'),'normal giant keeps entire body');
assert(design.includes('"critical":{"head"'),'only whole face/head separates');
assert(!design.includes('REGIONS ='),'no grid partition data');
assert(!src.includes('P3_DEATH_FRAMES=12'),'rejected v103 grid split is absent');
for(const key of keys){
 const pair=[];
 for(const mode of modes){
  const name=key+'-'+mode+(key==='trash_can'?'-v105.png':'-v104.png');
  const p=base+name,bytes=fs.readFileSync(p);
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],'PNG '+name);
  assert.equal(bytes.readUInt32BE(16),6144,'12 frames');
  assert.equal(bytes.readUInt32BE(20),512,'512px');
  assert.equal(bytes[25],6,'RGBA transparent PNG '+name);
  assert(bytes.length>50000,'real source texture rather than placeholder');
  assert(sw.includes('./assets/ip/v2/p3-deaths/'+name),'cache image '+name);
  pair.push(bytes);
 }
 assert(!pair[0].equals(pair[1]),'distinct normal and critical '+key);
}
const draws=[];
class Img{
 constructor(){this.naturalWidth=1024;this.naturalHeight=512;}
 set src(value){
  this._src=value;
  if(value.includes('/p3-deaths/')){this.naturalWidth=6144;this.naturalHeight=512;}
  if(value.endsWith('_hd.png')){this.naturalWidth=2048;this.naturalHeight=1024;}
  this.onload?.();
 }
 get src(){return this._src}
}
const realm={window:{},Image:Img,Math};
vm.createContext(realm);
for(const file of ['sprite-geometry.js','boss-geometry.js','object-zombies.js'])
 vm.runInContext(fs.readFileSync('dist/assets/ip/v2/'+file,'utf8'),realm);
const sprite=realm.window.ZZObjectSprite;
assert.equal(Object.keys(sprite.p3AnatomicalDeaths).length,2);
assert.equal(sprite.bosses.join(','),'big_zombie,trash_can,big_zombie,trash_can',
 'all 4 gameplay boss slots');
const ctx={globalAlpha:1,filter:'none',save(){},restore(){},
 drawImage(img,...args){draws.push({url:img.src,args})}};
for(let slot=0;slot<4;slot++){
 const id=sprite.bosses[slot],z={boss:true,bossForm:slot,x:80,y:60,w:70,h:100,flash:0};
 for(const critical of [false,true]){
  const kind=critical?'critical':'normal',duration=critical?.94:.78;
  const entry=sprite.p3AnatomicalDeaths[id][kind];
  assert(entry.ready,id+' '+kind);
  for(let frame=1;frame<12;frame++){
   draws.length=0;
   assert(sprite.drawDeath(ctx,z,critical,(frame+.5)*duration/12,duration));
   assert.equal(draws.length,1,'one image draw per cached death frame');
   assert(draws[0].url.endsWith('/'+id+'-'+kind+(id==='trash_can'?'-v105.png':'-v104.png')));
   assert.equal(draws[0].args[0],512*frame);
   assert.equal(draws[0].args[2],512);
   assert.equal(draws[0].args[3],512);
  }
  entry.ready=false;draws.length=0;
  sprite.drawDeath(ctx,z,critical,.2,duration);
  assert(draws.length>0 && !draws.some(x=>x.url?.includes('/p3-deaths/')),
   'legacy HD/SD death art still renders when sprite fails');
  entry.ready=true;
 }
}
assert.equal(Object.keys(sprite.p1FinishedDeaths).length,3,'keep P1');
assert.equal(Object.keys(sprite.p2FinishedDeaths).length,4,'keep P2');
assert(fs.readFileSync('dist/game.js','utf8').includes(
 'ZZObjectSprite.drawDeath(g,d.z,d.critical,anim.t,anim.split)'),
 'unchanged gameplay death path');
console.log('PASS P3-v104/v105: approved big unchanged; trash original-HD updated, 4 slots, single draw, safe fallback.');
