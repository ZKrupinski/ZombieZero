'use strict';
// v83: burning ball + fire ribbon are separate, compatible with other skills.
// Loot scales with stage number and kills remaining, not only with a flat roll.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=88-trail-hit-floor-light'),'game script cache version');
assert(sw.includes('zombie-zero-shell-v88-trail-hit-floor-light'),'offline cache version');
assert(src.includes('drawBurningBallFlames(b,r,false);\n  drawPierceBallLightning(b,r,false);\n  drawHeroBallSprite(b,r,palette.main);'),
 'rear fire layer is underneath unchanged physical ball');
assert(src.includes('drawBallStatusForeground(b,r);\n  drawBurningBallFlames(b,r,true);\n  drawPierceBallLightning(b,r,true);'),
 'fire highlights are above physical ball');
assert(src.includes('drawBurningTrailFlames(b,r,trailPath);'),'fire follows sampled trailing centerline');

const noop=()=>{},elements={},drawCount={flame:0,fill:0,arc:0};
const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{
 get(o,k){
  if(k in o)return o[k];
  if(k==='bezierCurveTo')return()=>{drawCount.flame++};
  if(k==='fill')return()=>{drawCount.fill++};
  if(k==='arc')return()=>{drawCount.arc++};
  return noop;
 },set(o,k,v){o[k]=v;return true}
});
function el(id){return elements[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}};
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{addEventListener:noop},localStorage:{getItem:()=>0,setItem:noop},
 Path2D:class{},requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,
 Math:Object.create(Math),console,drawCount};
vm.createContext(sandbox);
vm.runInContext(src+`
function check(ok,msg){if(!ok)throw Error(msg)}
function foe(x,y=180){return {x,y,w:33,h:44,hp:4,max:4,kind:0,form:0,flash:0,
 seed:1.2,burn:0,row:1,col:0}}
const ball={x:210,y:255,vx:290,vy:-420,held:false};
const path=[{x:210,y:255,s:0},{x:206,y:267,s:13},{x:202,y:279,s:26},
 {x:197,y:291,s:39},{x:191,y:305,s:54},{x:184,y:320,s:70},
 {x:177,y:338,s:89},{x:172,y:352,s:105}];
active={};fxEnabled=true;clock=1.7;
const inactiveFlames=drawCount.flame,inactiveFills=drawCount.fill;
drawBurningBallFlames(ball,8,false);drawBurningTrailFlames(ball,8,path);
check(drawCount.flame===inactiveFlames&&drawCount.fill===inactiveFills,
 'fire disabled means no extra render work');
active.fire=8;
drawBurningBallFlames(ball,8,false);
check(drawCount.flame>=24&&drawCount.fill>=12,'ball rear draws independent moving tongues and bright cores');
const ballFlames=drawCount.flame;
drawBurningBallFlames(ball,8,true);
check(drawCount.flame>ballFlames,'front heat flicker is separately layered over sprite');
const rearFlames=drawCount.flame;
drawBurningTrailFlames(ball,8,path);
check(drawCount.flame>rearFlames&&drawCount.fill>20,'independent tongues and three ribbon layers trail the ball');
active.power=8;active.pierce=8;
const fireWithSkills=drawCount.flame;
drawBurningBallFlames(ball,12,false);drawBurningTrailFlames(ball,12,path);
check(drawCount.flame>fireWithSkills,'combined power + pierce still renders fire');
active={};const beforeOff=drawCount.flame;drawBurningTrailFlames(ball,12,path);
check(drawCount.flame===beforeOff,'inactive fire draws no lingering flames');

active={};start();serve();clock=100;
wave=1;rack();check(stageLootLimit()===3&&lootVisibleLimit()===2,'early stage remains controlled');
check(Math.abs(lootDropChance()-.19)<.001,'initial stage baseline remains 19%');
foes=foes.slice(-2);check(lootStageProgress()>.8,'killed majority boosts progress');
check(lootDropChance()>.33&&stageLootQuota()===3,'end of first stage gets bonus odds and final reserved slot');
wave=20;rack();check(stageLootLimit()===5&&lootVisibleLimit()===3,'later stages allow more skill types');
const early20=lootDropChance();
foes=foes.slice(-2);check(lootDropChance()>early20+.13,'stage kill progress adds substantial chance');
wave=50;rack();check(stageLootLimit()===7,'final campaign stage allows seven ordinary pickups');
check(lootDropChance()>.4,'late stage starts with higher base odds');
foes=foes.slice(-2);check(lootDropChance()>.55,'late stage late kills rise above 55%');
items=[];active={};supportDropsThisWave=1;fireDropsThisWave=1;stageLootCount=0;stageLootKinds=[];
Math.random=()=>0;
for(let i=0;i<7;i++){items=[];drop(foe(150+i*3,200))}
check(stageLootCount===7,'late-stage stage cap reached after seven eligible pickups');
check(new Set(stageLootKinds).size>=5,'different skill kinds are prioritized before repetition');
items=[];drop(foe(220,200));check(stageLootCount===7&&items.length===0,'late stage cap still respected');
console.log('PASS: burning ball surface, fire trail, combined skills, late-stage loot rarity and variety.');
`,sandbox);
