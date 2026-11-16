'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync('dist/game.js','utf8');
let stats,colors,ground;
const noop=()=>{};
const g=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get(o,k){if(k in o)return o[k];return (...args)=>{if(k==='stroke'){stats.strokes++;colors.push(o.strokeStyle)}if(k==='fill')colors.push(o.fillStyle);if(k==='bezierCurveTo')stats.curves++;if(k==='createRadialGradient'){stats.gradients++;return{addColorStop:noop}}}},set(o,k,v){if(k==='shadowBlur'&&v>0)stats.blur++;o[k]=v;return true}});
const env={g,Math,fxEnabled:true,clock:1.2,selectedHero:0,balls:[],has:k=>env.skills.includes(k),clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),TRAIL_GROUND_FIRE:[[255,150,60]],TRAIL_GROUND_PIERCE:[[100,220,255]],drawProjectedLightSpill(){ground++}};
vm.createContext(env);
vm.runInContext(src.slice(src.indexOf('function compactBallFX('),src.indexOf('// V76: per-ball rotational inertia')),env);
vm.runInContext(src.slice(src.indexOf('function drawTrailGroundReflections('),src.indexOf('// V89:',src.indexOf('function drawTrailGroundReflections('))),env);
env.path=Array.from({length:77},(_,i)=>({x:250-i*2.5,y:120+i*.5,s:i*2.5}));env.b={x:250,y:120,vx:300,vy:100,held:false};
for(const skills of [['power','fire'],['power','pierce'],['fire','pierce'],['power','fire','pierce']])for(const count of [1,2,3,6]){
 env.skills=skills;env.balls=Array.from({length:count},()=>env.b);stats={strokes:0,curves:0,gradients:0,blur:0};colors=[];ground=0;
 vm.runInContext(`
 if(!compactBallFX())throw Error('must select compact mode');
 drawBallSkillTrail(b,12,path);drawBurningTrailFlames(b,12,path);drawPierceTrailLightning(b,12,path);
 drawBallStateAura(b,12);drawBurningBallFlames(b,12,false);drawPierceBallLightning(b,12,false);
 drawBallStatusForeground(b,12);drawBurningBallFlames(b,12,true);drawPierceBallLightning(b,12,true);
 drawTrailGroundReflections(b,12,path);`,env);
 assert(stats.strokes<=12,'bounded strokes including jagged arc and short forks');
 assert(stats.curves<=30);if(skills.includes('fire'))assert(stats.curves>=10,'animated flame silhouettes remain');assert.equal(stats.gradients,0);assert.equal(stats.blur,0);assert.equal(ground,1);
 if(skills.includes('fire'))assert(colors.includes('#ffad48'),'orange fire identifier');
 if(skills.includes('pierce'))assert(colors.includes('#a9f4ff'),'cyan pierce identifier');
}
console.log('PASS v108: 16 stacked configurations, <=12 strokes + bounded flame silhouettes + 1 floor pool per ball, no radial aura/blur; both skill cues retained.');
