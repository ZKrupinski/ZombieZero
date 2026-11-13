'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const root='dist/assets/ip/v2/';
const objectSource=fs.readFileSync(root+'object-zombies.js','utf8');
const greenSource=fs.readFileSync(root+'green-walk.js','utf8');
const gallerySource=fs.readFileSync(root+'cast-demo.js','utf8');
class ImageMock{
 constructor(){this.naturalWidth=1024;this.naturalHeight=512}
 set src(v){this._src=v;this.onload?.()}
 get src(){return this._src}
}
const env={Image:ImageMock,window:{}};vm.createContext(env);
vm.runInContext(objectSource,env);vm.runInContext(greenSource,env);
const object=env.window.ZZObjectSprite;
const green=env.window.ZZGreenWalk;
assert(object&&green,'animation loaders present');
const seeds=[0,.2,1.3,3.7,6.2,9.4,12.75];
const framesAtZero=new Set(),samples=[];
for(const seed of seeds){
 const actor={seed,form:1,moveDir:0,recoil:0};
 const mascot={...actor,form:0};
 const timing=object.walkTiming(actor);
 assert(timing.fps>=5.88&&timing.fps<=6.92,'pace stays within gentle variation');
 assert(timing.fps<9,'walk slowed from old 9 fps');
 framesAtZero.add(object.getFrame(actor,0));
 samples.push(timing.fps);
 for(const t of [0,.12,.5,1.18,2.35]){
  const frame=object.getFrame(actor,t);
  assert(frame>=0&&frame<=7,'object front frames stay in frontal strip');
  assert.equal(green.getFrame(mascot,t),frame,'green uses exactly same pace and phase');
  assert.equal(object.getFrame(actor,t),frame,'animation deterministic per enemy');
  actor.moveDir=-1;mascot.moveDir=-1;
  assert.equal(object.getFrame(actor,t),frame+8,'left strip only when moving left');
  assert.equal(green.getFrame(mascot,t),frame+8,'green left strip only when moving left');
  actor.moveDir=1;mascot.moveDir=1;
  assert.equal(object.getFrame(actor,t),frame+16,'right strip only when moving right');
  assert.equal(green.getFrame(mascot,t),frame+16,'green right strip only when moving right');
  actor.moveDir=0;mascot.moveDir=0;
 }
 // Recoil frames are not slowed or phase-shifted.
 actor.recoil=.20;mascot.recoil=.20;
 assert.equal(object.getFrame(actor,3),24,'object hit begins promptly');
 assert.equal(green.getFrame(mascot,3),24,'green hit begins promptly');
}
assert(framesAtZero.size>=4,'identical zombie species start at staggered walk poses');
assert(Math.max(...samples)-Math.min(...samples)>.4,'individual step cadence varies subtly');
assert(gallerySource.includes('pack.getFrame(actor,seconds)'),'gallery reuses in-game animation timing');
assert(!gallerySource.includes('Math.floor(seconds*9)%8'),'old gallery 9fps playback removed');
assert(objectSource.includes('return group[0]+Math.floor((Math.max(0,seconds)*timing.fps+timing.phase)%group[1])'),
 'walking phase independent of all other enemies');
assert(objectSource.includes('const first=critical?28:26'),'death frames unchanged');
assert(greenSource.includes('if((z.recoil||0)>.015)'),'green hit speed unchanged');
console.log('PASS: ~6.4fps walking, per-zombie phase and mild independent speed differences, green/object directions, hit/death unaffected');
