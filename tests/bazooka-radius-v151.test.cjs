'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const from=game.indexOf('const BAZOOKA_RADIUS_MIN=');
const to=game.indexOf('function drawJunk(){',from);
assert(from>0&&to>from,'bazooka system and drawing routines must be present');
assert(!game.includes('const BAZOOKA_RADIUS=120'),'old 120px hard-coded radius removed');
assert(html.includes('v151-variable-bazooka'),'browser fetches new script version');
assert(sw.includes('v151-variable-bazooka'),'PWA cache refreshes the script');
const blasts=[],hits=[],effects=[],bursts=[],flashes=[];
let sequence=[];
const rng=Object.create(Math);
rng.random=()=>sequence.length?sequence.shift():.5;
const g={
 save(){},restore(){},translate(){},rotate(){},
 fillRect(...args){flashes.push(args)},beginPath(){},
};
const state={Math:rng,g,
 citizens:[{alive:true,x:60,y:540,shooting:0}],
 foes:[],balls:[{held:false}],mode:'playing',runMode:'campaign',
 clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
 has:k=>k==='bazooka',supportRisk:()=>3,
 effect:(...a)=>effects.push(a),burst:(...a)=>bursts.push(a),
 damage:(z,n)=>hits.push({z,n}),sfx:()=>{},haptic:()=>{},feedback:()=>{},citizenCue:()=>{},
 rect:()=>{},luminous:f=>f(),drawPixelBurst:(...a)=>blasts.push(a)
};
vm.createContext(state);
vm.runInContext(game.slice(from,to),state);
const evaluate=s=>vm.runInContext(s,state);
for(const [rand,minMax] of [[0,48],[.25,55],[.5,65],[.75,76],[1,88]]){
 sequence=[rand];
 assert.equal(evaluate('rollBazookaRadius()'),minMax,'fixed radius quantile '+rand);
}
function fireAndBlast(rand){
 hits.length=effects.length=bursts.length=flashes.length=blasts.length=0;
 state.citizens[0].shooting=0;
 state.foes=[
  {x:100,y:200,w:10,h:10,tag:'target'},
  {x:150,y:205,w:1,h:1,tag:'near'},
  {x:180,y:205,w:1,h:1,tag:'far'}
 ];
 state.has=k=>k==='bazooka';
 evaluate('rockets=[];bazookaBlasts=[];bazookaTimer=0');
 sequence=[0,0,rand]; // choose first shooter, first target, specified radius
 evaluate('updateBazooka(.01)');
 const radius=evaluate('rockets[0].radius');
 assert(radius>=48&&radius<=88,'radius assigned once per launched rocket');
 state.has=()=>false; // isolate arrival from any new firing
 sequence=[.5];
 evaluate('updateBazooka(.7)');
 assert.equal(evaluate('bazookaBlasts[0].radius'),radius,'impact retains launch radius');
 assert.equal(hits.some(h=>h.z.tag==='target'),true,'directly hit target');
 assert.equal(hits.some(h=>h.z.tag==='near'),true,'nearby enemy hit');
 assert.equal(hits.some(h=>h.z.tag==='far'),radius>=75,'far enemy only hit by sufficiently large blast');
 assert(hits.every(h=>h.n===8),'original per-target damage remains eight');
 assert(Math.abs(effects.at(-1)[3]-radius*.94)<.001,'contact effect scales with actual hit radius');
 state.citizens[0].shooting=0;
 evaluate('drawBazooka()');
 assert(blasts.length>=1,'visible explosion drawn');
 assert(Math.abs(blasts.at(-1)[3]-radius*.94)<.001,'visible burst radius matches damage');
 const flash=flashes.at(-1);
 assert(flash&&Math.abs(flash[2]-radius*.52*(1-0))<.001,
  'central flash is scaled to chosen radius');
 return radius;
}
assert.equal(fireAndBlast(0),48,'small explosion is possible');
assert.equal(fireAndBlast(1),88,'large explosion is capped below previous 120px');
const average=[...Array(101)].reduce((sum,_,i)=>{
 sequence=[i/100];
 return sum+evaluate('rollBazookaRadius()');
},0)/101;
assert(average<68,'small explosions are modestly more frequent');
console.log('PASS V151: variable 48-88px bazooka blasts, bound and biased radius, damage/FX parity, 8 damage, launch-time sample, cache update');
