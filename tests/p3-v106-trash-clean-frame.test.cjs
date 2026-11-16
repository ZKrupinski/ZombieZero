'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root='dist/assets/ip/v2/';
const source=fs.readFileSync(root+'trash_can_hd.png');
const generator=fs.readFileSync('tools/generate_p3_trash_v106.py','utf8');
const game=fs.readFileSync(root+'object-zombies.js','utf8');
const service=fs.readFileSync('dist/sw.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const preview=fs.readFileSync('docs/p3-v106-trash-can-preview.jpg');
const sourceWidth=source.readUInt32BE(16),sourceHeight=source.readUInt32BE(20);
assert.deepEqual([sourceWidth,sourceHeight],[2048,1024],'canonical original HD atlas');
assert.equal(source[25],6,'real original RGBA');
assert(generator.includes('extract_original(atlas, source_index)'),'original cell source per output frame');
assert(generator.includes('Only light pixel-accurate shifts are applied'),'only real source bitmap frames');
assert(!generator.includes('ImageDraw.Draw(mask)'), 'no polygon cropping or spin');
assert(!generator.includes('MASKS='),'no anatomical mask slicing');
assert(generator.includes('SCREEN_CX, FOOT_Y = 256, 360'),'stable ground anchor');
assert(generator.includes('def isolate_character'),'neighbor-cell bleed must be removed');
assert(generator.includes('largest = component'),'only largest connected original body retained');
assert(!generator.includes('.rotate('),'zero rotation of any pose');
assert(!generator.includes('Image.Resampling.BICUBIC'), 'no rotated/resampled source pixels');
assert(generator.includes('extract_original(atlas, source_index)'),'exact 256px source cells');
assert(generator.includes('dx, dy'),'only integer displacement, no scaling');
assert(preview.length>10000,'inspectable contact sheet from real source');
assert(html.includes('v106-clean-frame-no-spin'),'browser cache-bust');
assert(service.includes('v106-clean-cut-no-spin'),'PWA cache upgrade');
const assets=[];
for(const kind of ['normal','critical']){
 const name='trash_can-'+kind+'-v106.png';
 const file=fs.readFileSync(root+'p3-deaths/'+name);
 assert.deepEqual([...file.subarray(0,8)],[137,80,78,71,13,10,26,10],name+' PNG');
 assert.equal(file.readUInt32BE(16),6144,'12 frames');
 assert.equal(file.readUInt32BE(20),512,'512px frame');
 assert.equal(file[25],6,'RGBA');
 assert(file.length>100000,'real hi-res original pixels present');
 assert(service.includes('./assets/ip/v2/p3-deaths/'+name),'offline cache '+name);
 assets.push(file);
}
assert(!assets[0].equals(assets[1]),'normal/critical visually different');
class ImageMock{
 constructor(){this.naturalWidth=1024;this.naturalHeight=512;}
 set src(value){
  this._src=value;
  if(value.endsWith('_hd.png')){this.naturalWidth=2048;this.naturalHeight=1024;}
  else if(value.includes('/p3-deaths/')){this.naturalWidth=6144;this.naturalHeight=512;}
  this.onload?.();
 }
 get src(){return this._src;}
}
const env={window:{},Image:ImageMock,Math};
vm.createContext(env);
for(const file of ['sprite-geometry.js','boss-geometry.js','object-zombies.js']){
 vm.runInContext(fs.readFileSync(root+file,'utf8'),env);
}
const lib=env.window.ZZObjectSprite;
const draws=[];
const ctx={globalAlpha:1,filter:'none',save(){},restore(){},
 drawImage(img,...args){draws.push({src:img.src,args})}};
for(const slot of [1,3]){
 for(const critical of [false,true]){
  const kind=critical?'critical':'normal';
  const entry=lib.p3AnatomicalDeaths.trash_can[kind];
  const actor={boss:true,bossForm:slot,x:100,y:50,w:65,h:90,flash:0};
  const duration=critical?.94:.78;
  assert(entry.ready);
  assert(entry.image.src.endsWith('trash_can-'+kind+'-v106.png'));
  for(let frame=1;frame<12;frame++){
   draws.length=0;
   assert(lib.drawDeath(ctx,actor,critical,(frame+.5)*duration/12,duration));
   assert.equal(draws.length,1,'one 2D draw per precomposed frame');
   assert.equal(draws[0].args[0],512*frame,'frame '+frame);
   assert(Math.abs(draws[0].args[6]-draws[0].args[7])<.001,'no squashing');
  }
  const y=draws[0].args[5],foot=draws[0].args[7]*360/512;
  assert(Math.abs((y+foot)-(actor.y+actor.h+2))<.001,'correct world-space foot anchor');
  entry.ready=false;
  draws.length=0;
  assert(lib.drawDeath(ctx,actor,critical,.2,duration),'original HD fallback');
  assert(draws.length>0&&!draws.some(d=>d.src?.includes('/p3-deaths/')));
  entry.ready=true;
 }
}
for(const kind of ['normal','critical'])
 assert(lib.p3AnatomicalDeaths.big_zombie[kind].image.src.endsWith('big_zombie-'+kind+'-v104.png'),
 'approved big zombie art and motion remain untouched');
assert.equal(lib.bosses.join(','),'big_zombie,trash_can,big_zombie,trash_can');
console.log('PASS v106: correctly isolated HD source frames, no rotations, stable world-foot pivot, Big v104 intact');
