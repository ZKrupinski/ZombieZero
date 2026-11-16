'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const s=fs.readFileSync('dist/game.js','utf8');
let points=[],strokes=0,blur=0;
const g={save(){},restore(){},beginPath(){points=[]},moveTo(x,y){points.push([x,y])},lineTo(x,y){assert(Number.isFinite(x)&&Number.isFinite(y));points.push([x,y])},stroke(){strokes++},set shadowBlur(v){blur+=v}};
const env={g,Math,fxEnabled:true,clock:1.2,has:k=>k==='pierce'};vm.createContext(env);
vm.runInContext(s.slice(s.indexOf('function drawPierceTrailLightning('),s.indexOf('// V76: per-ball rotational inertia')),env);
for(const r of [8,12])for(const reversal of [false,true]){
 env.path=Array.from({length:77},(_,i)=>({x:reversal?200-Math.min(i,76-i)*2.5:200-i*2.5,y:100,s:i*2.5}));env.r=r;strokes=0;blur=0;
 vm.runInContext('drawPierceTrailLightning(path[0],r,path)',env);
 assert.equal(strokes,1);assert.equal(blur,0);assert.equal(points.length,env.path.length);
 assert.deepEqual(points[0],[env.path[0].x,100]);assert.deepEqual(points.at(-1),[env.path.at(-1).x,100]);
 assert(points.some(p=>p[1]>101)&&points.some(p=>p[1]<99),'teeth alternate across centerline');
 assert(points.every(p=>Math.abs(p[1]-100)<=r*.42),'bounded zigzag width');
}
env.fxEnabled=false;strokes=0;vm.runInContext('drawPierceTrailLightning(path[0],8,path)',env);assert.equal(strokes,0);
console.log('PASS v110: one branchless stroke, zero blur, alternating teeth, exact endpoints and finite reversal geometry.');
