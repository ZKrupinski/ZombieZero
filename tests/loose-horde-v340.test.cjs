'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
const a=source.indexOf('// V337 '),b=source.indexOf('function march(dt){',a);
const code=source.slice(a,b);
function make(n,k,runMode){
 let calls=0;
 const math=Object.create(Math);
 math.random=()=>{calls++;return calls===2?(n===20?.93:n===10?.60:.1):
   calls===3?(k+.1)/6:.15};
 const ctx={Math:math,clock:50,runMode,mode:'playing',balls:[{held:false}],
  foes:[],ENEMY_TOP_Y:70,DEFENSE_Y:565,foeColumns:()=>18,foeStartX:()=>45,foePitch:()=>20.2,
  zombieMinX:()=>42,zombieMaxX:z=>408-z.w,enemySlowRate:()=>1,
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),isMiniHorde:()=>runMode==='mini'||runMode==='fortress',
  isFortress:()=>runMode==='fortress',fortress:null,clearShortStep:()=>{},
  canKnockback:(z,x,y)=>x>=42&&x+z.w<=408&&y>=70&&y+z.h<=549&&
   !(runMode==='fortress'&&y+z.h>218&&y<232&&x<290&&x+z.w>80)&&
   !ctx.foes.some(o=>o!==z&&x<o.x+o.w+1&&x+z.w+1>o.x&&y<o.y+o.h+1&&y+z.h+1>o.y)};
 // Deliberately irregular survivors, with gaps, displaced columns and rows.
 for(let i=0;i<n;i++)ctx.foes.push({x:50+(i%7)*47+(i%3)*3,
  y:130+Math.floor(i/7)*65+(i%3)*8,w:16.5,h:22,hp:2,row:Math.floor(i/7),
  col:i%7,arrivalTime:-1});
 // For large groups leave the mock wall outside the pack at startup.
 if(n>7&&runMode==='fortress')for(const z of ctx.foes)z.y+=115;
 vm.createContext(ctx);vm.runInContext(code,ctx);return ctx;
}
const state=ctx=>vm.runInContext('wormParade',ctx);
for(const mode of ['mini','fortress'])for(let k=0;k<6;k++){
 const ctx=make(7,k,mode);
 ctx.updateWormParade(1/60);
 const p=state(ctx);assert(p&&p.kind==='loose');
 assert.equal(p.members.length,7);
 assert.equal(p.motif,['snake','orbit','figure8','zigzag','fan','ripple'][k]);
 ctx.updateWormParade(1/60);
 assert(p.members.slice(1).every(m=>m.z.x===m.baseX&&m.z.y===m.baseY));
 let extent=0;
 for(let i=0;i<600&&state(ctx);i++){
  ctx.clock+=1/60;ctx.updateWormParade(1/60);
  if(i===70)p.members[2].z.hitHold=.3;
  if(i===71)assert(!p.members[2].z.wormParade);
  for(const m of p.members){
   const z=m.z;
   assert(z.y+z.h<=475+1e-6&&z.x>=42&&z.x+z.w<=408+1e-6);
   if(mode==='fortress')assert(!(z.y+z.h>218&&z.y<232&&z.x<290&&z.x+z.w>80));
   extent=Math.max(extent,Math.hypot(z.x-m.baseX,z.y-m.baseY));
  }
  for(const z of ctx.foes)for(const o of ctx.foes)if(z!==o)
   assert(!(z.x<o.x+o.w-1e-6&&z.x+z.w>o.x+1e-6&&z.y<o.y+o.h-1e-6&&z.y+z.h>o.y+1e-6));
 }
 assert(extent>20);assert.equal(state(ctx),null);
 assert(ctx.foes.every(z=>!z.wormParade));
}
for(const n of [3,10,20]){
 const ctx=make(n,0,'mini');assert(ctx.startLooseHordeParade());
 assert.equal(state(ctx).members.length,n);
}
for(const mode of ['campaign','endless']){
 const ctx=make(7,0,mode);assert.equal(ctx.startLooseHordeParade(),false);
}
{
 const ctx=make(7,0,'mini');for(const z of ctx.foes)z.y=480;
 assert.equal(ctx.startLooseHordeParade(),false);
}
assert(fs.readFileSync('dist/index.html','utf8').includes('v340-staggered-loose-horde'));
assert(fs.readFileSync('dist/sw.js','utf8').includes('v340-staggered-loose-horde'));
console.log('PASS v340: irregular groups, stagger, six motifs, collision safety and hit release.');
