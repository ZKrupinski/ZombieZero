'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../dist/game.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'../dist/sw.js'),'utf8');

new vm.Script(code,{filename:'game.js'});
assert.match(html,/game\.js\?v=88-trail-hit-floor-light/);
assert.match(sw,/zombie-zero-shell-v88-trail-hit-floor-light/);
assert.match(code,/const HELD_BALL_OFFSETS=\[\{x:-21,y:-30\},\{x:-23,y:-31\},\{x:25,y:-30\}\]/);
assert.match(code,/if\(ball\.held\)\{const o=heldBallOffset\(\);ball\.x=car\+o\.x;ball\.y=PY\+o\.y;continue\}/);
assert.match(code,/function drawBallStateAura\(b,r\)/);
assert.match(code,/drawBallStateAura\(b,r\);\s*drawBurningBallFlames\(b,r,false\);\s*drawPierceBallLightning\(b,r,false\);\s*drawHeroBallSprite\(b,r,palette\.main\)/);
assert.doesNotMatch(code,/g\.strokeRect\(b\.x-r\*\.45,b\.y-r\*\.45/);

const section=(start,end)=>{
 const i=code.indexOf(start),j=code.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'Missing FX section '+start);
 return code.slice(i,j);
};
const source=[
 section('function drawEffects(labels=false)','function icon(k)'),
 section('function drawImpactFlashes()','function drawBarrelBlasts()'),
 section('function drawBarrelBlasts()','// V60: Each empowered ball'),
 section('function drawBallStateAura(b,r)','/* V77: Single original base bitmap'),
 section('function drawBazooka()','function drawJunk()')
].join('\n');

let drawCalls=0;
const canvas=new Proxy({},{
 get(target,property){
  if(typeof property==='string'&&property.startsWith('_'))return undefined;
  return function(){drawCalls++};
 },
 set(target,property,value){target[property]=value;return true}
});
let activeSkills=new Set();
const ctx={
 Math, g:canvas, clock:1.42,fxEnabled:true,
 has:key=>activeSkills.has(key),
 clamp:(n,min,max)=>Math.max(min,Math.min(max,n)),
 luminous:draw=>draw(),
 fx:[{x:90,y:140,color:'#ffaa33',size:50,text:'',t:.12,life:.48}],
 hitFlashes:[{x:160,y:140,t:.05,life:.22,critical:false,angle:.9,piercing:false}],
 barrelBlasts:[{x:170,y:150,t:.1,life:.58,seed:1.4}],
 bazookaBlasts:[{x:180,y:160,t:.2,life:.64,seed:2.2}],
 citizens:[],rockets:[],RED_BARREL_RADIUS:86,BAZOOKA_RADIUS:120
};
vm.createContext(ctx);
vm.runInContext(source,ctx,{timeout:1000});
vm.runInContext('drawEffects(false);drawEffects(true);drawImpactFlashes();drawBarrelBlasts();drawBazooka();',ctx,{timeout:1000});
for(const names of [['fire'],['pierce'],['power'],['fire','pierce']]){
 activeSkills=new Set(names);
 vm.runInContext('drawBallStateAura({x:180,y:560,vx:130,vy:-380,held:false},8);drawBallStateAura({x:225,y:585,vx:0,vy:0,held:true},8);',ctx,{timeout:1000});
}
assert.ok(drawCalls>90,'Expected rendered fireworks, sparks and energized ball state');
// V67: common centerline, physical rebound anchors, no fuzzy replay.
assert.match(code,/const BALL_TRAIL_NORMAL=170,BALL_TRAIL_POWER=190/);
assert.match(code,/function recordBallTrail\(b,x,y,corner=false\)/);
assert.match(code,/function buildBallTrailPath\(b,r\)/);
assert.match(code,/function sampleBallTrail\(path,d\)/);
assert.match(code,/function drawHeroBallTrail\(b,r,path=buildBallTrailPath\(b,r\)\)/);
assert.match(code,/function drawBallSkillTrail\(b,r,path=buildBallTrailPath\(b,r\)\)/);
assert.match(code,/const trailPath=buildBallTrailPath\(b,r\)/);
assert.match(code,/drawHeroBallTrail\(b,r,trailPath\)/);
assert.match(code,/drawBallSkillTrail\(b,r,trailPath\)/);
assert.match(code,/recordBallTrail\(b,b\.x,b\.y,!!b\._trailCorner\)/);
assert.match(code,/b\._trailCorner=true/);
assert.match(code,/g\.shadowColor='transparent';g\.shadowBlur=0/);
assert.doesNotMatch(code,/drawHeroBallTrail\(b,r,\.11\)/);
assert.match(code,/KNOCK_TWEEN_LIFE=\.27/);assert.match(code,/CHAIN_HIT_FREEZE=\.125/);
assert.match(code,/HIT_FREEZE_NORMAL=\.16,HIT_FREEZE_BOSS=\.19/);
assert.match(code,/brightness\(2\.25\) saturate\(\.52\)/);
assert.match(code,/actor\.knockDelay=\(pos\.chainDepth\|\|0\)>0/);
assert.match(code,/actor\.hitShakeFrom=actor\.chainReactAt/);
assert.match(code,/if\(d\.t<\(d\.freeze\|\|0\)\)/);
assert.match(code,/function drawStruckZombie\(z\)/);
const testPath=vm.runInContext(`(function(){
 const b={x:80,y:100,held:false,trail:[]};
 for(let i=0;i<80;i++)recordBallTrail(b,80+i*4,100,i===55);
 b.x=400;b.y=100;
 const a=buildBallTrailPath(b,8),p=buildBallTrailPath(b,16);
 const kink=a.some(k=>Math.abs(k.x-300)<.1&&Math.abs(k.y-100)<.1);
 return {n:a[a.length-1].s,p:p[p.length-1].s,kink};
})()`,ctx);
assert(testPath.n<=170.01&&testPath.p<=190.01,'large balls get capped trail lengths');
assert(testPath.kink,'bounce anchor remains on the exact spline path');
console.log('V67 shared bounce-correct trails, halo removal and staged hit reaction checks passed.');

assert.match(code,/HERO_BALL_TRAILS=\[/);
assert.match(code,/function drawPixelBurst\(/);
assert.doesNotMatch(code,/const HELD_BALL_OFFSETS=\[\{x:38/);
