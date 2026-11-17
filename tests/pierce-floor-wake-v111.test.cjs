'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const s=fs.readFileSync('dist/game.js','utf8'),calls=[];
const env={Math,fxEnabled:true,compactBallFX:()=>true,has:()=>true,
 TRAIL_GROUND_PIERCE:[[89,213,255]],
 sampleBallTrail:(p,d)=>({x:250-d,y:100}),
 drawProjectedLightSpill:(...a)=>calls.push(a)};
vm.createContext(env);
vm.runInContext(s.slice(s.indexOf('function drawTrailGroundReflections('),s.indexOf('// V89:',s.indexOf('function drawTrailGroundReflections('))),env);
for(const len of [10,170,190])for(const r of [8,12]){
 calls.length=0;env.len=len;env.r=r;
 vm.runInContext('drawTrailGroundReflections({held:false},r,[{x:250,y:100,s:0},{x:250-len,y:100,s:len}])',env);
 assert(calls.length<=7&&calls.length>=2);
 assert.equal(calls[0][0],250);assert.equal(calls.at(-1)[0],250-len);
 assert(calls.every(a=>a[7]===true&&a[8]===false),'cached outer pool only');
 assert(calls.every(a=>a[5]===30&&a[6]===.82),'floor offset and full depth');
 assert(calls[0][4]>calls.at(-1)[4]&&calls.at(-1)[4]>0,'visible tail fade');
 for(let i=1;i<calls.length;i++)assert(calls[i-1][0]-calls[i][0]<calls[i-1][2]+calls[i][2],'overlapping soft pools');
}
calls.length=0;env.fxEnabled=false;
vm.runInContext('drawTrailGroundReflections({held:false},8,[{s:0},{s:170}])',env);assert.equal(calls.length,0);
console.log('PASS v111: full-length cyan wake, 2-7 overlapping cached pools, preserved floor depth, no inner duplicate.');
