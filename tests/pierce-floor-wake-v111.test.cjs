'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const s=fs.readFileSync('dist/game.js','utf8'),calls=[];
const env={Math,fxEnabled:true,has:k=>k==='pierce',clock:0,selectedHero:0,balls:[{}],
 sampleBallTrail:(p,d)=>({x:250-d,y:100}),
 drawProjectedLightSpill:(...a)=>calls.push(a)};
vm.createContext(env);
vm.runInContext(s.slice(s.indexOf('const TRAIL_GROUND_HERO_COLORS='),s.indexOf('// V89:',s.indexOf('function drawTrailGroundReflections('))),env);
for(const len of [10,170,190])for(const r of [8,12]){
 calls.length=0;env.len=len;env.r=r;
 vm.runInContext('drawTrailGroundReflections({held:false},r,[{x:250,y:100,s:0},{x:250-len,y:100,s:len}])',env);
 assert.equal(calls.length,Math.min(20,Math.max(2,Math.ceil((len-4)/11)+1)));
 assert.equal(calls[0][0],246);assert.equal(calls.at(-1)[0],250-len);
 assert(calls.every(a=>a[7]===true&&a[8]===undefined),'cached full outer and core');
 assert(calls.every(a=>a[5]===30&&a[6]===.82),'floor offset and full depth');
 assert(calls[0][4]>calls.at(-1)[4]&&calls.at(-1)[4]>0,'visible tail fade');
 assert(calls[0][3][2]>calls[0][3][0]*5&&calls[0][3][1]<calls.at(-1)[3][1],'deep blue toward ball, cyan at tail');
 for(let i=1;i<calls.length;i++)assert(calls[i-1][0]-calls[i][0]<=11.01,'dense full spacing');
}
calls.length=0;env.fxEnabled=false;
vm.runInContext('drawTrailGroundReflections({held:false},8,[{s:0},{s:170}])',env);assert.equal(calls.length,0);
console.log('PASS v401: full density blue-to-cyan floor ramp and fixed projection.');
