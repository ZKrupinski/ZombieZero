'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/game.js','utf8');
const section=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)+a.length));
class Path2D{
 constructor(){this.points=[];this.caps=[]}
 moveTo(x,y){this.points.push([x,y])}lineTo(x,y){this.points.push([x,y])}
 closePath(){}arc(x,y,r){this.caps.push({x,y,r})}
}
const fills=[],pools=[];
const g={save(){},restore(){},fill(p){fills.push(p)},createLinearGradient(){return{addColorStop(){}}}};
const env={Math,Path2D,g,clock:0,fxEnabled:true,selectedHero:0,has:k=>k==='fire',sampleBallTrail:(p,d)=>({x:d,y:0}),drawProjectedLightSpill:(...a)=>pools.push(a)};
vm.createContext(env);
vm.runInContext(section('const TRAIL_GROUND_HERO_COLORS=','// V89:'),env);
vm.runInContext(section('function makeTaperedTrailRibbon(','function drawHeroBallTrail('),env);
vm.runInContext(section('function drawElementalTrailBody(','// V83:'),env);
for(const r of [8,12]){
 env.path=Array.from({length:101},(_,i)=>({x:i*1.7,y:0,s:i*1.7}));env.r=r;
 fills.length=0;pools.length=0;
 vm.runInContext('drawElementalTrailBody(path[0],r,path,true,false);drawElementalTrailBody(path[0],r,path,true,false,.46);drawTrailGroundReflections({held:false},r,path)',env);
 assert.equal(fills.length,2);assert.equal(fills[0],fills[1],'reuse scene geometry for Bloom');
 const shape=fills[0],head=shape.caps[0],tail=shape.caps.at(-1);
 assert(Math.abs(head.r-r*.76)<1e-8);assert(Math.abs(tail.r/head.r-.12)<1e-8);
 assert(Math.abs(shape.points[25][1])-head.r<1e-8);
 assert(Math.abs(shape.points[75][1])<head.r*.6);
 assert.equal(pools[0][9],1);assert(Math.abs(pools.at(-1)[9]-.12)<1e-8);
}
env.path=Array.from({length:77},(_,i)=>({x:Math.min(i,76-i)*2.5,y:0,s:i*2.5}));
const rebound=vm.runInContext('makeTaperedTrailRibbon(path,12)',env);
assert(rebound.caps.some(p=>p.x===95),'exact reversal retains a round join');
assert(rebound.points.every(p=>p.every(Number.isFinite)));
assert(fs.readFileSync('dist/index.html','utf8').includes('v409-tapered-wake'));
assert(fs.readFileSync('dist/sw.js','utf8').includes('v409-tapered-wake'));
console.log('PASS: tapered live ribbon and floor wake, unchanged head diameter, shared Bloom geometry and reversal join.');
