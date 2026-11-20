'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
const functions=source.slice(source.indexOf('function multiCount()'),source.indexOf('// Support is rare'));
const newBall=source.slice(source.indexOf('function newBall('),source.indexOf('function resetBalls('));
function run(count,active,key,held=false,random=.4){
 const math=Object.create(Math);math.random=()=>random;
 const env={Math:math,active:{...active},car:270,PY:600,heldBallOffset:()=>({x:-12,y:-45}),
  SKILLS:{dual:{duration:16,color:'blue'},triple:{duration:16,color:'purple'}},hero:()=>({duration:1}),
  has:k=>env.active[k]>0,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),hud(){},retireBall(){},
  HERO_ATTACK_DURATION:.42,heroAttackTime:0,swing:0,sounds:[],sfx(k){this;env.sounds.push(k)},
  itemPickupFX:[],effect(){},burst(){},feedback(){},growth(){return 0}};
 vm.createContext(env);vm.runInContext(newBall+functions,env);
 env.balls=Array.from({length:count},(_,i)=>env.newBall(100+i*20,180+i*15,125,-365,held));
 const originals=env.balls.map(b=>({...b})),refs=env.balls.slice();
 env.activate(key);
 refs.forEach((b,i)=>{assert.equal(env.balls[i],b);assert.deepEqual({...b},originals[i],'existing balls untouched')});
 return env;
}
for(const [key,count] of [['dual',2],['triple',3]]){
 const e=run(1,{},key);assert.equal(e.balls.length,count);
 for(const b of e.balls.slice(1)){
  assert.equal(b.x,258);assert.equal(b.y,555);assert(b.vy<0);
  assert.equal(b.held,false);assert.equal(b.impactKind,'serve');assert.equal(b.trail.length,0);
  assert(Math.abs(Math.hypot(b.vx,b.vy)-Math.hypot(125,365))<1e-8);
 }
 assert.equal(e.heroAttackTime,.42);assert.equal(e.sounds.filter(s=>s==='serve').length,1);
 if(count===3)assert(e.balls[1].vx*e.balls[2].vx<0,'two extra balls visibly fan apart');
 assert.equal(run(1,{},key,true).balls.length,1,'held ball is not auto-served');
}
assert(run(1,{},'dual',false,.1).balls[1].vx<0);
assert(run(1,{},'dual',false,.9).balls[1].vx>0);
for(const [count,active,key] of [[2,{dual:8},'triple'],[3,{triple:8},'dual'],[1,{dual:8},'triple']]){
 const e=run(count,active,key);assert.equal(e.balls.length,6);
 for(const b of e.balls.slice(count)){assert.equal(b.x,100);assert.equal(b.y,180)}
 assert(!e.sounds.includes('serve'),'stacked skills retain splitting');
}
for(const [count,key] of [[2,'dual'],[3,'triple']]){
 const e=run(count,{[key]:5},key);assert.equal(e.balls.length,count);
 assert(!e.sounds.includes('serve'),'duration refresh does not fire extra balls');
}
console.log('PASS: first multiball hero serves, random upward fan, unchanged existing balls, stacked splits and refresh/held guards');
