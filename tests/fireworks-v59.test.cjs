'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../dist/game.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'../dist/sw.js'),'utf8');

new vm.Script(code,{filename:'game.js'});
assert.match(html,/game\.js\?v=63-soft-trail-pixel-hit/);
assert.match(sw,/zombie-zero-shell-v63-soft-trail-pixel-hit/);
assert.match(code,/const HELD_BALL_OFFSETS=\[\{x:-21,y:-30\},\{x:-23,y:-31\},\{x:25,y:-30\}\]/);
assert.match(code,/if\(ball\.held\)\{const o=heldBallOffset\(\);ball\.x=car\+o\.x;ball\.y=PY\+o\.y;continue\}/);
assert.match(code,/function drawBallStateAura\(b,r\)/);
assert.match(code,/drawBallStateAura\(b,r\);\s*drawHeroBallSprite\(b,r,palette\.main\)/);
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
 section('function drawBallStateAura(b,r)','/* V58: Render'),
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
// V63: no additive tile stacking. One tapered translucent ribbon follows the ball.
assert.match(code,/function drawHeroBallTrail\(b,r\)/);
assert.match(code,/const maxLength=58,spine=/);
assert.match(code,/g\.createLinearGradient\(tip\.x,tip\.y,b\.x,b\.y\)/);
assert.doesNotMatch(code,/const ballDiameter=r\*3\.05/);
assert.match(code,/f\.critical\?\.23:\.35/);
assert.match(code,/f\.critical\?55:20,f\.critical\?32:16/);
assert.match(code,/f\.critical\?1:1\.75/);
assert.match(code,/f\.critical\?\.56:1\.45/);
assert.match(code,/!burning&&z\.hp>0&&!critical/);
assert.match(code,/if\(z\.hp<=0\|\|critical\|\|burning\)burst\(/);
assert.match(code,/const box=Math.max\(3,Math.round/);
assert.match(code,/const sz=Math.max\(4,Math.round\(r\*\(\.4/);
assert.match(code,/drawPixelBurst\(b.x,b.y,t,BAZOOKA_RADIUS\*\.94,68/);
console.log('V63 soft hero-ball ribbon and weighty cube impact smoke checks passed.');

assert.match(code,/function drawHeroBallTrail\(b,r\)/);
assert.match(code,/HERO_BALL_TRAILS=\[/);
assert.match(code,/function drawPixelBurst\(/);
assert.doesNotMatch(code,/const HELD_BALL_OFFSETS=\[\{x:38/);
