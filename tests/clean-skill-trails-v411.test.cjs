'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync('dist/game.js','utf8');
const section=(a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)+a.length));
const live=section('function draw(){','function frame(');
for(const fn of ['drawBallStateAura','drawBallStatusForeground','drawBurningBallFlames','drawPierceBallLightning','drawBurningTrailFlames','drawPierceTrailLightning'])assert(!live.includes(fn+'('),fn+' is not in live render');
assert(live.includes('drawHeroBallSprite(b,r,palette.main)'));
assert(live.includes('drawSimpleSkillTrailAccent(b,r,trailPath)'));
assert(live.includes('captureBloom(()=>drawElementalTrailBody'));
assert(s.includes('drawSkillTintedFrame('));
let strokes=0,points=[],curves=0;
const g={save(){},restore(){},beginPath(){points=[]},moveTo(x,y){points.push([x,y])},lineTo(x,y){points.push([x,y])},stroke(){strokes++},arc(){curves++},bezierCurveTo(){curves++},quadraticCurveTo(){curves++},createLinearGradient(){return{addColorStop(){}}}};
const env={Math,g,fxEnabled:true,has:k=>env.skills.includes(k),skills:[]};
vm.createContext(env);
vm.runInContext(section('function drawSimpleSkillTrailAccent(','// V83:'),env);
for(const r of [4,8,12])for(const mask of [0,1,2,3,4,5,6,7])for(const shape of ['straight','rebound']){
 env.skills=['fire','pierce','power'].filter((_,i)=>mask&(1<<i));env.r=r;
 env.path=Array.from({length:49},(_,i)=>({x:shape==='straight'?i*4:Math.min(i,48-i)*4,y:100,s:i*4}));
 strokes=curves=0;points=[];
 vm.runInContext('drawSimpleSkillTrailAccent({},r,path)',env);
 assert.equal(strokes,mask&3?1:0);assert.equal(curves,0);
 if(mask&3){
 assert.deepEqual(points[0],[0,100]);assert.deepEqual(points.at(-1),[env.path.at(-1).x,100]);
 assert(points.every(p=>p.every(Number.isFinite)&&Math.abs(p[1]-100)<=r*.22+1e-8));
 assert(g.lineWidth<=Math.max(.65,r*.115));
 }
}
console.log('PASS V411: bitmap only on the ball; single thin stroke maximum on all skill trails, no vector curves or external ornaments.');
