'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('dist/game.js','utf8');
const serve=s.slice(s.indexOf('function serve(){'),s.indexOf('function overlay('));
const input=s.slice(s.indexOf('let inputPointer=null'),s.indexOf("document.addEventListener('pointerdown',inputDown"));
const make=()=>new Function(`
 const W=450,PY=584,HERO_ATTACK_DURATION=.42,c={getBoundingClientRect:()=>({width:225,left:0}),setPointerCapture(){}};
 let mode='playing',car=225,target=225,touchUsed=false,groggyTime=0,balls=[{held:true}],heroAttackTime=0,swing=0,launches=0;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),heldBallOffset=()=>({x:-12,y:-35}),unlockAudio=()=>{},syncMulti=()=>{},sfx=()=>{},feedback=k=>{if(k==='serve')launches++},hud=()=>{};
 ${serve}
 ${input}
 return {inputDown,inputMove,inputEnd,releaseInput,serve,state:()=>({car,target,ball:balls[0],launches}),lose:()=>{balls=[{held:true}]},rally:()=>{balls[0].held=false},pause:()=>{mode='paused';releaseInput()}};
`)();
const e=(type,x,id=1)=>({type,clientX:x,pointerId:id,pointerType:'touch',button:0,preventDefault(){}});
for(const [dx,x,sign] of [[-100,72,1],[0,225,0],[100,378,-1]]){
 const h=make();h.inputDown(e('pointerdown',100));
 assert(h.state().ball.held);assert.equal(h.state().launches,0);
 h.inputMove(e('pointermove',100+dx));assert.equal(h.state().car,x);
 assert(h.state().ball.held);assert.equal(h.state().ball.x,x-12);
 h.inputEnd(e('pointerup',100+dx));assert(!h.state().ball.held);
 assert.equal(h.state().launches,1);assert.equal(Math.sign(h.state().ball.vx),sign);assert(h.state().ball.vy<0);
 assert(Math.abs(Math.hypot(h.state().ball.vx,h.state().ball.vy)-Math.hypot(125,365))<1e-9);
 h.inputEnd(e('lostpointercapture',100+dx));assert.equal(h.state().launches,1);
}
for(const type of ['pointercancel','lostpointercapture']){
 const h=make();h.inputDown(e('pointerdown',100));h.inputMove(e('pointermove',130));h.inputEnd(e(type,130));assert(h.state().ball.held);assert.equal(h.state().launches,0);
}
const h=make();h.inputDown(e('pointerdown',100));h.inputEnd(e('pointerup',140,2));assert(h.state().ball.held);h.inputEnd(e('pointerup',140));assert.equal(h.state().car,305);assert(!h.state().ball.held);
const lost=make();lost.rally();lost.inputDown(e('pointerdown',100));lost.lose();lost.inputEnd(e('pointerup',100));assert(lost.state().ball.held);
const paused=make();paused.inputDown(e('pointerdown',100));paused.pause();paused.inputEnd(e('pointerup',100));assert(paused.state().ball.held);
const keyboard=make();keyboard.serve();assert(!keyboard.state().ball.held);
assert(!s.includes('setLineDash([4,6])'));
console.log('PASS V419: held ball tracks drag, hidden inward fan, release-only launch, cancellation and keyboard behavior.');
