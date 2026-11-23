'use strict';
// Real in-world 7/10/20-member worm parades. The defense-line check must
// remain safe even under large dt, surviving barricade walls and damage.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const a=source.indexOf('// V337 '),b=source.indexOf('function march(dt){',a);
assert(a>0&&b>a,'actual worm parade functions included in production march');
const production=source.slice(a,b);
const pitch=343.5/17,top=110;
const makeFoes=()=>Array.from({length:36},(_,i)=>({
 x:45+(i%18)*pitch,y:top+Math.floor(i/18)*29,
 w:16.5,h:22,row:Math.floor(i/18),col:i%18,hp:2,
 seed:i+1,arrivalTime:-1,flash:0
}));
function setup(requested,runMode='mini'){
 const math=Object.create(Math);
 math.random=()=>requested===7?.1:requested===10?.55:.96;
 const ctx={Math:math,runMode,clock:50,mode:'playing',balls:[{held:false}],
 foes:makeFoes(),ENEMY_TOP_Y:70,DEFENSE_Y:565,
 foeColumns:()=>18,foeStartX:()=>45,foePitch:()=>pitch,
 zombieMinX:()=>42,zombieMaxX:z=>408-z.w,
 enemySlowRate:()=>1,
 clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),
 isMiniHorde:()=>['mini','fortress'].includes(ctx.runMode),
 clearShortStep:(z,wait)=>{z.shortStepNext=ctx.clock+wait;},
 canKnockback:(z,x,y)=>{
  if(x<42||x>408-z.w||y<70||y+z.h>549)return false;
  // One independent fortress block, even though this group is on the
  // normal playable road. The real game checks a swept wall path.
  if(ctx.runMode==='fortress'&&ctx.wall&&
      x<ctx.wall.x+ctx.wall.w&&x+z.w>ctx.wall.x&&
      y<ctx.wall.y+ctx.wall.h&&y+z.h>ctx.wall.y)return false;
  return !ctx.foes.some(other=>other!==z&&
      x<other.x+other.w+.25&&x+z.w+.25>other.x&&
      y<other.y+other.h+.25&&y+z.h+.25>other.y);
 }
 };
 vm.createContext(ctx);
 vm.runInContext(production,ctx);
 return ctx;
}
function state(ctx){return vm.runInContext('wormParade',ctx)}
for(const mode of ['mini','fortress']){
 for(const size of [7,10,20]){
  const ctx=setup(size,mode),initial=new Map(ctx.foes.map(z=>[z,{x:z.x,y:z.y}]));
  assert.equal(ctx.startWormParade(),true,mode+' parade can begin');
  const group=state(ctx);
  assert(group&&group.members.length===size,mode+' selects exactly '+size+' unique zombies');
  assert.equal(new Set(group.members.map(m=>m.z)).size,size);
  assert(group.members.every(m=>m.z.wormParade===group),'group owns its motion');
  const members=group.members.map(m=>m.z);
  let sidesteps=0,retreats=0,frontSurges=0;
  for(let i=0;i<320;i++){
   const old=new Map(ctx.foes.map(z=>[z,{x:z.x,y:z.y}]));
   ctx.updateWormParade(.0167);
   ctx.clock+=.0167;
   for(const z of ctx.foes){
    assert(z.y+z.h<=ctx.DEFENSE_Y-90+1e-8,
     'even the forward worm surge MUST stay outside the 90px defense zone');
    assert(z.y-initial.get(z).y<=28+1e-8,
     'no member may advance farther than the reserved clear-space surge');
   }
   for(const z of members){
    if(Math.abs(z.x-initial.get(z).x)>.06)sidesteps++;
    if(initial.get(z).y-z.y>2)retreats++;
    if(z.y-initial.get(z).y>3)frontSurges++;
   }
  }
  assert(sidesteps>0,mode+' group swings left and right in world space');
  assert(frontSurges>0,mode+' front line surges into open space, scattering the formation');
  assert(retreats>0,mode+' group visibly retreats before releasing');
  assert.equal(state(ctx),null,'group cleans up after the fixed event duration');
  assert(members.every(z=>!z.wormParade),'all survivors regain normal AI');
  assert(ctx.foes.length===36,'existing zombie roster unchanged by choreography');
 }
}
{
 const ctx=setup(7,'campaign');
 assert.equal(ctx.startWormParade(),false,'campaign never starts a worm parade');
 ctx.runMode='endless';
 assert.equal(ctx.startWormParade(),false,'endless stays unchanged');
}
{
 const ctx=setup(7,'mini');
 for(const z of ctx.foes)z.y=535-z.h; // dangerously near player boundary
 assert.equal(ctx.startWormParade(),false,
  'a horde near the defense line MUST NOT start a group excursion');
}
{
 const ctx=setup(7,'fortress');
 ctx.wall={x:35,y:80,w:378,h:35};
 assert(ctx.startWormParade());
 const before=new Map(ctx.foes.map(z=>[z,{x:z.x,y:z.y}]));
 for(let i=0;i<320;i++){ctx.updateWormParade(.0167);ctx.clock+=.0167}
 assert(ctx.foes.every(z=>z.y>=115||z.y===before.get(z).y),
  'barricade prevents a worm member from passing through its collision blocks');
}
// Production integration must not double-advance a worm member, spawn extra
// zombies, interrupt knockback or skip fortress wall resolution.
assert(source.includes('updateWormParade(dt);\n tryStartBreakouts();'));
assert(source.includes('const WORM_FORWARD_GAP=42,WORM_FORWARD_MAX=28;'),
 'parade requires a genuine open pocket ahead and limits forward travel');
assert(source.includes('function wormForwardClearance(group){'),
 'front pocket must be tested against actual surviving colliders');
assert(source.includes('options.sort((a,b)=>b.score-a.score)'),
 'frontmost available zombie group gets priority');
assert(source.includes('const ny=z.y+clamp(goalY-z.y,-maxStep,maxStep);'),
 'real colliders must follow the front surge and withdrawal');
assert(source.includes('if(z.wormParade===wormParade&&wormParade){done.push(z);continue}'));
assert(source.includes('if(z.wormParade||Number.isInteger(z.eliteKind)'),
 'breakouts cannot steal active group participants');
assert(source.includes('if(!profile||z.wormParade||z.hitHold>0'),
 'dodge AI resumes only when the event ends');
assert(source.includes('clearWormParade();wormNextAt=clock+9+Math.random()*5;'),
 'new wave resets parade and schedules a fresh occasional event');
assert(source.includes('fortress.resolve(z,z.fortressPreviousX,z.fortressPreviousY,dt,'),
 'all fortress wall collisions remain operational');
assert(source.includes('if(foes.includes(z)&&z.y+z.h>=DEFENSE_Y)'),
 'ordinary defense breach checks stay intact');
assert(html.includes('-v337-horde-worm-parade'),'script cache refreshes on reload');
assert(sw.includes('v337-horde-worm-parade'),'PWA cache is invalidated');
console.log('PASS v337/v338: open-space frontmost 7/10/20 zombie zigzag surge and retreat, untouched 90px defense margin, original AI recovers.');
