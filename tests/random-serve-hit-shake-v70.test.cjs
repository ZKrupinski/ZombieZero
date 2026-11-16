'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert.match(html,/game\.js\?v=87-projected-ground-reflection/);
assert.match(sw,/zombie-zero-shell-v87-projected-ground-reflection/);
assert.doesNotMatch(source,/setLineDash\(\[4,6\]\)/,'old predicted trajectory must not appear');
assert.match(source,/const angle=\(\.16\+Math\.random\(\)\*\.52\)/);
const shot=source.match(/function serve\(\)\{[\s\S]*?\n\}\}/);
assert(shot,'serve method found');
function serveSeed(samples){
 const math=Object.create(Math);
 math.random=()=>samples.shift()??.5;
 const b={held:true,bounceTime:.12};
 const o={Math:math,mode:'playing',balls:[b],unlockAudio:()=>{},
 syncMulti:()=>{},sfx:()=>{},hud:()=>{}};
 vm.runInNewContext(shot[0]+';serve()',o,{timeout:1000});
 return b;
}
const left=serveSeed([.01,.01]),right=serveSeed([.99,.99]);
for(const b of [left,right]){
 assert.equal(b.held,false);
 assert(b.vy<0,'both directions travel upward');
 assert(Math.abs(Math.hypot(b.vx,b.vy)-Math.hypot(125,365))<.0001,'speed unchanged');
}
assert(left.vx<0&&right.vx>0,'random directions left and right');
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
console.log('PASS: random hidden-trajectory serves and phase-locked per-enemy/boss hit shudders');
