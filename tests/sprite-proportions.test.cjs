'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const obj=fs.readFileSync(path.join(root,'dist/assets/ip/v2/object-zombies.js'),'utf8');
const green=fs.readFileSync(path.join(root,'dist/assets/ip/v2/green-walk.js'),'utf8');
const calls=[];
class ImageMock {
 constructor(){this.naturalWidth=1024;this.naturalHeight=512}
 set src(value){this._src=value;if(this.onload)this.onload()}
 get src(){return this._src}
}
const context={window:{},Image:ImageMock};
vm.createContext(context);vm.runInContext(obj,context);vm.runInContext(green,context);
const cast=context.window.ZZObjectSprite,mascot=context.window.ZZGreenWalk;
const canvas={globalAlpha:1,filter:'none',save(){},restore(){},
 drawImage(...args){calls.push(args)},translate(){throw Error('unexpected coordinate transform')},
 scale(){throw Error('nonuniform scale is forbidden')}};
function validate(z,name,critical=false){
 calls.length=0;
 const ok=name==='green_zombie'?mascot.draw(canvas,z,0):critical?cast.drawDeath(canvas,z,true,.13,.58):cast.draw(canvas,z,0);
 assert(ok,name+' draws');
 assert(calls.length>0,name+' emits frames');
 for(const args of calls){
   const [img,sx,sy,sw,sh,dx,dy,dw,dh]=args;
   assert.equal(sw,128,name+' src width');
   assert.equal(sh,128,name+' src height');
   assert(Math.abs(dw-dh)<1e-6,name+' image must be uniformly scaled (square source to square dest)');
   const scale=dw/128;
   assert(Math.abs(dx+64*scale-(z.x+z.w/2))<1e-6,name+' fixed x pivot');
   assert(Math.abs(dy+120*scale-(z.y+z.h))<1e-6,name+' fixed foot pivot');
   const h=({'green_zombie':116,'red_barrel':100.5,'black_barrel':100,
     'red_brain_cube':103,'cardboard_box':92,'wooden_crate':102,
     'black_brain_cube':101,'yellow_brain_cube':103,'big_zombie':105,'trash_can':102.5})[name];
   const expected=z.boss?(name==='big_zombie'?98:92):52;
   assert(Math.abs(scale*h-expected)<1e-6,name+' same readable character height across cast');
 }
}
for(let form=0;form<8;form++){
 const name=cast.normal[form];
 validate({form,x:10+form*45,y:70,w:33,h:44,flash:0,seed:0,moveDir:0,recoil:0},name);
 if(form)validate({form,x:10+form*45,y:70,w:33,h:44,flash:0,seed:0,moveDir:0,recoil:0},name,true);
}
for(let bossForm=0;bossForm<2;bossForm++){
 const name=cast.bosses[bossForm];
 validate({boss:true,bossForm,x:150+bossForm*65,y:65,w:66,h:88,flash:0,seed:0,moveDir:0,recoil:0},name);
}
assert(!obj.includes('ctx.scale(1+v*.03'),'no squash on dying cubic geometry');
assert(green.includes('const uniformScale=52/116'),'green same physical scale');
console.log('PASS: all 10 enemies preserve natural square-pixel proportions, foot pivots and readable visible heights in gameplay and death');
