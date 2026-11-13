'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const geometry=source('dist/assets/ip/v2/sprite-geometry.js');
const obj=source('dist/assets/ip/v2/object-zombies.js');
const green=source('dist/assets/ip/v2/green-walk.js');
const calls=[];
class ImageMock{constructor(){this.naturalWidth=1024;this.naturalHeight=512}
 set src(v){this._src=v;if(this.onload)this.onload()}get src(){return this._src}}
const context={window:{},Image:ImageMock};vm.createContext(context);
for(const js of [geometry,obj,green])vm.runInContext(js,context);
const cast=context.window.ZZObjectSprite,mascot=context.window.ZZGreenWalk;
const data=context.window.ZZSpriteGeometry;
const canvas={globalAlpha:1,filter:'none',save(){},restore(){},
 drawImage(...args){calls.push(args)},
 translate(){throw Error('never stretch using nonuniform transforms')},
 scale(){throw Error('never stretch cubic forms')}};
function validate(z,name,critical=false){
 calls.length=0;
 const ok=name==='green_zombie'?mascot.draw(canvas,z,0):
   critical?cast.drawDeath(canvas,z,true,.13,.58):cast.draw(canvas,z,0);
 assert(ok,name+' draws');
 assert(calls.length>0,name+' creates bitmap draw calls');
 const walk=data[name].walkUnion;
 const desired=name==='green_zombie'?58:z.boss?(name==='big_zombie'?104:98):Math.min(58,53*walk[3]/walk[2]);
 const scale=desired/walk[3];
 for(const [img,sx,sy,sw,sh,dx,dy,dw,dh] of calls){
  assert(sw>0&&sw<=128&&sh>0&&sh<=128,name+' source is alpha cropped');
  assert(Math.abs(dw/sw-dh/sh)<1e-8,name+' aspect ratio maintained on cropped rectangle');
  assert(Math.abs(dw/sw-scale)<1e-8,name+' stable animation scale');
  assert(Math.abs(dx+dw/2-(z.x+z.w/2))<1e-6,name+' centered around the character');
  assert(Math.abs(dy+dh-(z.y+z.h+2))<1e-6,name+' consistent foot baseline');
 }
}
for(let form=0;form<8;form++){
 const name=cast.normal[form];
 const z={form,x:10+form*45,y:70,w:33,h:44,flash:0,seed:0,moveDir:0,recoil:0};
 validate(z,name);
 if(form)validate(z,name,true);
}
for(let bossForm=0;bossForm<2;bossForm++){
 const name=cast.bosses[bossForm];
 validate({boss:true,bossForm,x:150+bossForm*65,y:65,w:66,h:88,flash:0,seed:0,moveDir:0,recoil:0},name);
}
assert(!obj.includes('ctx.scale(1+v*.03'),'no extra squeeze on death');
assert(green.includes('window.ZZSpriteGeometry?.green_zombie'),'green alpha data applied');
console.log('PASS: 10 characters use tightly cropped 128px sources with proportional scale and fixed center/feet pivots');
