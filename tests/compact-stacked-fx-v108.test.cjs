'use strict';
// v400: capture all skill draw operations at identical time/geometry. More
// balls or a measured slow frame must never select different artwork.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync('dist/game.js','utf8');
const section=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert(i>=0&&j>i);return src.slice(i,j)};
let ops=[];
const g=new Proxy({globalAlpha:1,shadowBlur:0},{get(o,k){if(k in o)return o[k];return (...args)=>{ops.push([k,...args]);if(k==='createLinearGradient'||k==='createRadialGradient')return{addColorStop(...a){ops.push(['stop',...a])}}}},set(o,k,v){if(typeof v!=='object')ops.push([k,v]);o[k]=v;return true}});
const env={g,Math,fxEnabled:true,clock:1.2,selectedHero:0,balls:[],perfTier:0,has:k=>env.skills.includes(k),clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),drawProjectedLightSpill(...args){ops.push(['floor',...args])}};
vm.createContext(env);
vm.runInContext(section('function compactBallFX(','// V76: per-ball rotational inertia'),env);
vm.runInContext(section('const TRAIL_GROUND_HERO_COLORS=','// V89:'),env);
env.path=Array.from({length:77},(_,i)=>({x:250-i*2.5,y:120+i*.5,s:i*2.5}));env.b={x:250,y:120,vx:300,vy:100,held:false};
for(const skills of [['fire'],['pierce'],['power'],['power','fire'],['power','pierce'],['fire','pierce'],['power','fire','pierce']]){
 env.skills=skills;let reference=null;
 for(const count of [1,2,3,6])for(const tier of [0,1,2]){
  env.balls=Array.from({length:count},()=>env.b);env.perfTier=tier;ops=[];
  g.globalAlpha=1;g.shadowBlur=0;ops=[];
  vm.runInContext(`
   drawBallSkillTrail(b,12,path);drawBurningTrailFlames(b,12,path);drawPierceTrailLightning(b,12,path);
   drawBallStateAura(b,12);drawBurningBallFlames(b,12,false);drawPierceBallLightning(b,12,false);
   drawBallStatusForeground(b,12);drawBurningBallFlames(b,12,true);drawPierceBallLightning(b,12,true);
   drawTrailGroundReflections(b,12,path);`,env);
  const serial=JSON.stringify(ops);
  if(reference===null)reference=serial;else assert.equal(serial,reference,skills+' must retain exact full detail');
  const floors=ops.filter(x=>x[0]==='floor');
  assert.equal(floors.length,Math.ceil((env.path.at(-1).s-4)/16)+1);assert(floors.every(a=>a[9]===undefined),'full core layer retained');
  if(skills.includes('fire'))assert(ops.some(x=>x[0]==='bezierCurveTo'),'full fire tongues retained');
  if(skills.includes('pierce'))assert(ops.some(x=>x[0]==='strokeStyle'&&x[1]==='#45c8ff'),'outer electric glow retained');
 }
}
console.log('PASS v400: 84 skill/count/load combinations preserve identical paint operations and complete floor wake.');
