'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync('dist/game.js','utf8');
const sec=(a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)+a.length));
const pools=[],flames=[];
const g={save(){},restore(){}};
const ctx={Math,g,clock:0,fxEnabled:true,selectedHero:0,has:k=>ctx.skills.includes(k),skills:['fire'],clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),drawProjectedLightSpill:(...v)=>pools.push(v),flameTongue:(...v)=>flames.push(v)};
vm.createContext(ctx);
vm.runInContext(sec('const TRAIL_GROUND_HERO_COLORS=','// V89:'),ctx);
vm.runInContext(sec('const BALL_TRAIL_NORMAL=','// V409:'),ctx);
vm.runInContext(sec('function drawBurningTrailFlames(','// V84:'),ctx);
for(const len of [170,190]){
 ctx.path=Array.from({length:len+1},(_,i)=>({x:i,y:100,s:i}));
 for(let mask=0;mask<8;mask++){
  ctx.skills=['fire','pierce','power'].filter((_,i)=>mask&(1<<i));
  for(let hero=0;hero<5;hero++){
   ctx.selectedHero=hero;pools.length=0;flames.length=0;
   vm.runInContext('drawTrailGroundReflections({held:false},8,path);drawBurningTrailFlames({},8,path)',ctx);
   assert.equal(pools.length,Math.ceil((len-4)/16)+1);
   assert.equal(pools[0][0],4);assert.equal(pools.at(-1)[0],len);
   assert.equal(pools[0][9],1);assert(Math.abs(pools.at(-1)[9]-.12)<1e-8);
   assert(pools.every(a=>a[4]>0&&Number.isFinite(a[4])));
   assert.equal(flames.length,mask&1?2*Math.ceil((len-4)/12):0);
  }
 }
}
ctx.skills=[];ctx.ball={x:200,y:100,trail:Array.from({length:20},(_,i)=>({x:190-i*10,y:100}))};
const line=vm.runInContext('buildBallTrailPath(ball,8)',ctx);
assert.equal(line.at(-1).s,170);assert(line.length<60);
assert(line.every((p,i)=>!i||p.s-line[i-1].s<=4.001));
console.log('PASS V410: full length, all hero/skill combinations, lower draw counts and exact taper.');
