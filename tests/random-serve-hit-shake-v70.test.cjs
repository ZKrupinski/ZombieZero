'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert.match(html,/game\.js\?v=93-multiball-light-cache/);
assert.match(sw,/zombie-zero-shell-v93-multiball-light-cache/);
assert.doesNotMatch(source,/setLineDash\(\[4,6\]\)/,'old predicted trajectory must not appear');
assert.match(source,/\(center-car\)\/\(center-72\)/);
const shot=source.match(/function serve\(\)\{[\s\S]*?\n\}\}/);
assert(shot,'serve method found');
function serveAt(car){
 const math=Object.create(Math);
 const b={held:true,bounceTime:.12};
 const o={Math:math,W:450,PY:584,car,heldBallOffset:()=>({x:-12,y:-35}),mode:'playing',balls:[b],unlockAudio:()=>{},
 syncMulti:()=>{},sfx:()=>{},feedback:()=>{},hud:()=>{},swing:0,heroAttackTime:0,HERO_ATTACK_DURATION:.42};
 vm.runInNewContext(shot[0]+';serve()',o,{timeout:1000});
 return b;
}
const left=serveAt(72),right=serveAt(378),center=serveAt(225);
for(const b of [left,right]){
 assert.equal(b.held,false);
 assert(b.vy<0,'both directions travel upward');
 assert(Math.abs(Math.hypot(b.vx,b.vy)-Math.hypot(125,365))<.0001,'speed unchanged');
}
assert(left.vx>0&&right.vx<0,'inward directions at left and right edges');assert.equal(center.vx,0);assert.equal(left.x,60);assert.equal(right.x,366);
const jit=source.match(/function hitShakeOffset\(t,duration,boss=false\)\{[\s\S]*?\n\}/);
assert(jit,'frame-indexed per-zombie jitter exists');
const shake=vm.runInNewContext(jit[0]+';hitShakeOffset',{Math});
const normal0=shake(0,.105,false),normal1=shake(1/60,.105,false);
const boss0=shake(0,.135,true);
assert(Math.abs(normal0.x)>=4.2,'normal enemy shakes visibly');
assert(Math.sign(normal0.x)===-Math.sign(normal1.x),'alternating direction each frame');
assert(Math.abs(boss0.x)>Math.abs(normal0.x),'boss shake more pronounced');
assert.match(source,/const jitter=hitShakeOffset\(t,duration,!!z\.boss\)/);
assert.match(source,/const jitter=hitShakeOffset\(d\.t,d\.freeze\|\|\.105,!!d\.z\.boss\)/);
console.log('PASS: position-based hidden-trajectory serves and phase-locked per-enemy/boss hit shudders');
