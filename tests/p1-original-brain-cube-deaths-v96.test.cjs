'use strict';
// P1-v96: original yellow/red brain cube geometry must be preserved.
// Source only original PNG pixels; no recolored green mascot or black hair.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('dist/assets/ip/v2/object-zombies.js','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
assert(sw.includes('v96-original-brain-cube-deaths'),'PWA bust');
assert(html.includes('object-zombies.js?v=77-analytic-ball-blue-boss-v96-original-brain-cube-deaths'));
assert(code.includes("['yellow_brain_cube','red_brain_cube']"),'only approved original brain cube species');
assert(!code.includes('ZZGreenPalette'),'never recolor green model for brain cubes');
assert(code.includes('P1_DEATH_CELL=256,P1_DEATH_FRAMES=8'),'eight padded frames');
assert(code.includes('cx.drawImage(img'),'all frames sampled from source art');
assert(code.includes('if(drawP1BrainDeath(ctx,img,z,critical,elapsed,duration))return true;'),'original 2-key fallback kept');
const sampled=[],baked=[],runtime=[];
class Img{
 constructor(){this.naturalWidth=1024;this.naturalHeight=512;this.complete=true}
 set src(v){this._src=v;this.onload?.()}
 get src(){return this._src}
}
const preCtx={save(){},restore(){},translate(){},rotate(){},
 drawImage(img,...args){baked.push([img._src,...args])}};
const env={Image:Img,Math,window:{},document:{createElement(){
 return {width:0,height:0,getContext(){return preCtx}}
}}};
vm.createContext(env);
vm.runInContext(fs.readFileSync('dist/assets/ip/v2/sprite-geometry.js','utf8'),env);
vm.runInContext(code,env);
const sprites=env.window.ZZObjectSprite;
assert(sprites.available({form:7}), 'yellow source original loaded');
assert(sprites.available({form:3}), 'red source original loaded');
const canvas={globalAlpha:1,save(){},restore(){},
 drawImage(img,...a){runtime.push({img,args:a})}};
const yellow={form:7,x:80,y:60,w:33,h:44,flash:0};
const red={form:3,x:150,y:60,w:33,h:44,flash:0};
for(const z of [yellow,red])for(const crit of [false,true]){
 runtime.length=0;
 for(let i=0;i<8;i++){
  assert(sprites.drawDeath(canvas,z,crit,(i+.02)/8*(crit?.58:.52),crit?.58:.52));
 }
 assert.equal(runtime.length,8,'exactly one cached draw per animation frame');
 for(let i=0;i<8;i++)assert.equal(runtime[i].args[0],i*256,'source frame '+i);
 assert(runtime.every(v=>v.args[5]>0&&v.args[6]>0),'visible original-proportions draw');
 assert(runtime.every(v=>v.img===runtime[0].img),'cached atlas reused');
}
assert.equal(sprites.p1DeathAtlases.size,4,'yellow/red normal/critical 4 cached atlases');
const firstBuild=baked.length;
for(let i=0;i<20;i++)sprites.drawDeath(canvas,yellow,i%2===0,.25,.52);
assert.equal(baked.length,firstBuild,'no per-frame re-baking or pixel recoloring');
// The generated sprites must reference the original material, not the green art.
assert(baked.some(x=>x[0].includes('yellow_brain_cube.png')),'yellow pixels used');
assert(baked.some(x=>x[0].includes('red_brain_cube.png')),'red pixels used');
assert(!baked.some(x=>x[0].includes('green_zombie')),'no green-hair source used');
assert(!baked.some(x=>x[0].includes('red_barrel')),'do not alter red barrel');
assert(baked.some(x=>x[1]===0&&x[2]===0&&x[3]===128),'first pose preserves original front art');
assert(baked.some(x=>x[1]===4*128+43&&x[2]===3*128+3),'brain sampled from original critical source');
runtime.length=0;const barrel={form:1,x:30,y:50,w:33,h:44,flash:0};
assert(sprites.drawDeath(canvas,barrel,true,.3,.58));
assert(runtime.every(x=>x.img._src?.includes('red_barrel.png')),'existing red barrel still uses source frame renderer');
const source=fs.readFileSync('dist/game.js','utf8');
assert(source.includes('ZZObjectSprite.drawDeath(g,d.z,d.critical,anim.t,anim.split)'),'game flow unaffected');
console.log('PASS: yellow/red original front bitmaps, 8 cached frames x 2 death modes, no black-hair assets, red barrel unchanged.');
