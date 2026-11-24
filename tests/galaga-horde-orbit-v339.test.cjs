'use strict';
// The Galaga-like motion must be visible on REAL colliders, not a graphic
// overlay. Two circles, then rejoin individual AI; 90px defense margin hard.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const a=source.indexOf('// V337 '),b=source.indexOf('function march(dt){',a);
assert(a>0&&b>a,'production keeps previous snake and new Galaga motion');
const code=source.slice(a,b);
function make(size,runMode='mini'){
 const math=Object.create(Math);
 math.random=()=>size===7?.1:size===10?.6:.93;
 const ctx={
  Math:math,runMode,mode:'playing',clock:50,balls:[{held:false}],
  ENEMY_TOP_Y:70,DEFENSE_Y:565,foes:[],fortress:null,
  foeColumns:()=>18,foeStartX:()=>45,foePitch:()=>343.5/17,
  zombieMinX:()=>42,zombieMaxX:z=>408-z.w,enemySlowRate:()=>1,
  isMiniHorde:()=>ctx.runMode==='mini'||ctx.runMode==='fortress',
  isFortress:()=>ctx.runMode==='fortress',
  clearShortStep:(z,wait)=>{z.shortStepNext=ctx.clock+wait;},
  clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  canKnockback:(z,x,y)=>x>=42&&x<=408-z.w&&y>=70&&y+z.h<=549&&
   !ctx.foes.some(other=>other!==z&&x<other.x+other.w+1&&
     x+z.w+1>other.x&&y<other.y+other.h+1&&y+z.h+1>other.y)
 };
 if(runMode==='fortress')ctx.fortress={
  isOpen:()=>true,isPathClear:()=>true
 };
 // Spawn an intact front segment in a real 18-lane horde. 20 uses the
 // corresponding next row, just as the game does on its dense waves.
 const lanes=size===7?Array.from({length:7},(_,i)=>i+5):
  Array.from({length:10},(_,i)=>i+4);
 for(let row=0;row<(size===20?2:1);row++)for(const col of lanes){
  ctx.foes.push({
   x:45+col*(343.5/17),y:120+row*29,
   w:16.5,h:22,row,col,seed:col+row*18,hp:2,arrivalTime:-1
  });
 }
 vm.createContext(ctx);
 vm.runInContext(code,ctx);
 return ctx;
}
const parade=ctx=>vm.runInContext('wormParade',ctx);
for(const mode of ['mini','fortress']){
 for(const size of [7,10,20]){
  const ctx=make(size,mode);
  const original=new Map(ctx.foes.map(z=>[z,{x:z.x,y:z.y}]));
  assert.equal(ctx.startGalagaOrbit(),true,mode+' can initiate an orbit');
  const p=parade(ctx);
  assert.equal(p.kind,'orbit');
  assert.equal(p.members.length,size,'chosen group size must be '+size);
  assert(p.members.every(m=>m.z.wormParade===p));
  const involved=p.members.map(m=>m.z);
  let lateral=0,vertical=0,halfTurns=0,extremes=0,lastDirection=0;
  for(let i=0;i<375;i++){
   ctx.clock+=1/60;
   ctx.updateWormParade(1/60);
   for(const z of ctx.foes){
    assert(z.y+z.h<=ctx.DEFENSE_Y-90+1e-6,
     'no Galaga orbit position can cause a defense-line breach');
    assert(z.x>=42&&z.x+z.w<=408,'every zombie stays within road');
   }
   for(const z of involved){
    const orig=original.get(z);
    const dx=z.x-orig.x,dy=z.y-orig.y;
    lateral=Math.max(lateral,Math.abs(dx));
    vertical=Math.max(vertical,Math.abs(dy));
    assert(dy<=70+1e-6,'orbit cannot advance beyond 70px');
    if(Math.abs(dx)>27)extremes++;
    const direction=Math.sign(dx);
    if(direction&&lastDirection&&direction!==lastDirection)halfTurns++;
    if(direction)lastDirection=direction;
   }
  }
  assert(lateral>27&&vertical>60,
   mode+' loop must be markedly more visible than a 7px worm wiggle');
  assert(extremes>30,mode+' should trace an actual wide left-right circle');
  assert(halfTurns>=2,'two circles reverse lateral travel repeatedly');
  assert.equal(parade(ctx),null,'orbit finishes and releases the pack');
  assert(involved.every(z=>!z.wormParade),'normal walking AI restored');
  for(const z of involved){
   const p0=original.get(z);
   assert(Math.abs(z.x-p0.x)<1.5&&Math.abs(z.y-p0.y)<1.5,
    'two full orbits and a retreat return close to the original formation');
  }
  assert.equal(ctx.foes.length,size,'no extra zombies or fake followers');
 }
}
// The orbit must be disabled in regular and endless modes, and must not
// activate while the player is waiting to serve the first ball.
for(const mode of ['campaign','endless']){
 const ctx=make(7,mode);
 assert.equal(ctx.startGalagaOrbit(),false);
}
{
 const ctx=make(7,'mini');
 ctx.balls[0].held=true;
 assert.equal(ctx.startGalagaOrbit(),false,'held serve pauses new events');
}
{
 const ctx=make(7,'mini');
 for(const z of ctx.foes)z.y=460;
 assert.equal(ctx.startGalagaOrbit(),false,
  'there is insufficient room before 90px defense margin');
}
{
 const ctx=make(7,'fortress');
 ctx.fortress.isPathClear=(z,x0,y0,x1,y1)=>y1<=y0;
 assert.equal(ctx.startGalagaOrbit(),false,
  'barricade wall in the cleared front pocket vetoes the orbit');
}
{
 const ctx=make(7,'mini');
 ctx.foes.push({x:42,y:171,w:366,h:29,hp:100,boss:true});
 assert.equal(ctx.startGalagaOrbit(),false,
  'a boss body below the line prevents the orbit before it starts');
}
// Both event types remain and launch much more often than the former
// 19-30 second random worm interval.
assert(code.includes('function startWormParade(){'));
assert(code.includes('function startGalagaOrbit(){'));
assert(code.includes('function wormOrbitOffset(t,side=1){'));
assert(code.includes('if(wormParade.kind===\'orbit\'){updateGalagaOrbit(dt);return}'));
assert(code.includes('if(!wormParade){startLooseHordeParade();return}'));
assert(code.includes('wormNextAt=clock+10+Math.random()*4;'));
assert(source.includes('clearWormParade();wormNextAt=clock+4+Math.random()*2.5;'));
assert(source.includes('if(z.wormParade===wormParade&&wormParade){done.push(z);continue}'),
 'normal march never double-advances active circling zombies');
assert(source.includes('if(!profile||z.wormParade||z.hitHold>0'),
 'reactive dodge must wait until orbit releases participant');
assert(html.includes('-v339-frequent-galaga-orbit'),'updated game script version');
assert(sw.includes('v339-frequent-galaga-orbit'),'PWA cache version refreshed');
console.log('PASS v339: more frequent real 7/10/20 Galaga double-orbits, wide visible motion, proper release, 90px defense and barricade safety; original worm retained.');
