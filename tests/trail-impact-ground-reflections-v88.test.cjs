'use strict';
// v88: verify trail reflections for every hero and skill, plus distinct
// timed impacts / chain hit and critical projections below actor feet.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('dist/game.js','utf8'),html=fs.readFileSync('dist/index.html','utf8'),
 sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=90-continuous-soft-trails'),'fresh game URL');
assert(sw.includes('zombie-zero-shell-v90-continuous-soft-trails'),'new offline cache');
assert(code.includes("has('power')?12:8"),'power ball game size unchanged');
const render=code.slice(code.indexOf('function draw(){'),code.indexOf('function frame('));
assert(render.includes('drawImpactFlashes()'),'hit flashes remain independent');
assert(render.includes('fxRenderer.composite(g);drawEffectLightSpills()'),
 'reflections are composited after bitmap FX before interface');
assert(code.includes('drawTrailGroundReflections(b,radius,buildBallTrailPath(b,radius))'),
 'per-ball projected wake integrated in the existing light pass');
assert(code.includes('groundY:beforeY+actor.h'),
 'chain reflections retain the actor foot anchor and timing');
assert(code.includes('groundY:z.y+z.h'),
 'direct hits capture enemy ground contact position');
const section=(a,b)=>{
 const i=code.indexOf(a),j=code.indexOf(b,i+a.length);
 assert(i>=0&&j>i,'required implementation '+a);
 return code.slice(i,j);
};
const light=section('function drawSoftLightSpill(','function rect(');
const interpolation=section('function sampleBallTrail(','function drawHeroBallTrail(');
const gradients=[],strokes=[],saveStack=[],frame={x:0,y:0,sy:1};
const ctx2d=new Proxy({},{
 get(o,k){
  if(k==='save')return()=>saveStack.push({frame:{...frame},style:{...o}});
  if(k==='restore')return()=>{const prev=saveStack.pop();Object.assign(frame,prev.frame);Object.assign(o,prev.style)};
  if(k==='translate')return(x,y)=>{frame.x+=x;frame.y+=frame.sy*y};
  if(k==='scale')return(x,y)=>{frame.sy*=y};
  if(k==='createRadialGradient')return(...args)=>{
   const gr={x:frame.x+args[0],y:frame.y+args[1]*frame.sy,sy:frame.sy,
    radius:args[5],stops:[],addColorStop(t,color){this.stops.push([t,color])}};
   gradients.push(gr);return gr;
  };
  if(k==='stroke')return()=>strokes.push({x:frame.x,y:frame.y,color:o.strokeStyle,
    blur:o.shadowBlur,alpha:o.globalAlpha});
  if(k in o)return o[k];
  return()=>{};
 },
 set(o,k,v){o[k]=v;return true}
});
const path=Array.from({length:12},(_,i)=>({x:240-i*4,y:180+i*4,s:i*16}));
const ball={x:240,y:180,held:false,vx:220,vy:-330,trail:path};
const expectedPools=Math.min(20,Math.max(2,Math.ceil((path[path.length-1].s-4)/11)+1))*2;

let skills=new Set();
const context={
 g:ctx2d,Math,clock:2.3,fxEnabled:true,selectedHero:0,
 has:k=>skills.has(k),clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),
 HERO_BALL_TRAILS:[{main:'#d8efa1'},{main:'#f2e9dd'},{main:'#f5be76'}],
 buildBallTrailPath:()=>path,ballProjectionDrop:r=>24+r*1.25,
 balls:[],foes:[],hitFlashes:[],barrelBlasts:[],bazookaBlasts:[],fx:[],itemPickupFX:[],
 knockVisualPosition:z=>z,SKILLS:{fire:{color:'#ff9b50'}}
};
vm.createContext(context);
vm.runInContext(interpolation+light,context);
vm.runInContext('drawTrailGroundReflections('+JSON.stringify(ball)+',8,'+JSON.stringify(path)+')',context);
assert(gradients.length===expectedPools,'the complete trailing centerline receives dense soft pools');
assert(gradients.every(x=>x.sy===.82),'trails project as flattened ellipses, not light around ball');
assert(gradients.some(x=>x.stops[0][1].startsWith('rgba(192,234,112,')),
 'plain tennis trail produces visible lime-tinted reflection without skill');
assert(gradients.every(x=>x.y>=210),'each reflection sits at least 30px below its trail sample');
const defaultCount=gradients.length;
skills=new Set(['fire','pierce','power']);
vm.runInContext('drawTrailGroundReflections('+JSON.stringify(ball)+',12,'+JSON.stringify(path)+')',context);
const combined=gradients.slice(defaultCount);
assert(combined.length===expectedPools,'combined skills stay bounded over the full trail');
assert(combined.some(x=>x.stops[0][1].startsWith('rgba(255,155,62,')),
 'flame trail lights the ground in warm orange');
assert(combined.some(x=>x.stops[0][1].startsWith('rgba(95,217,255,')),
 'pierce trail lights the ground in electric blue');
const beforeDisabled=gradients.length;
context.fxEnabled=false;
vm.runInContext('drawTrailGroundReflections('+JSON.stringify(ball)+',8,'+JSON.stringify(path)+')',context);
assert(gradients.length===beforeDisabled,'disabling visual FX skips trail reflections');
context.fxEnabled=true;
context.balls=[];
context.hitFlashes=[{x:130,y:150,groundY:201,t:.03,delay:.12,life:.47,critical:false,piercing:true}];
const early=gradients.length;
vm.runInContext('drawEffectLightSpills()',context);
assert(gradients.length===early&&strokes.length===0,
 'chain hit reflection waits until the individual hit delay');
context.hitFlashes[0].t=.17;
vm.runInContext('drawEffectLightSpills()',context);
assert(gradients.length===early+4,'delayed chain hit emits a broad floor reflection and soft center');
assert(strokes.length===0,'no line stroke replaces the broad ground glint');
assert(gradients.at(-4).y===207,'hit flash projection uses actual enemy feet +6');
assert(gradients.at(-2).y===207&&gradients.at(-2).sy===.98&&
 gradients.at(-2).stops[0][1].startsWith('rgba(169,239,255,'),
 'electric chain hit core remains a broad cyan ground pool');
context.hitFlashes=[{x:146,y:140,groundY:204,t:.02,delay:0,life:.39,critical:true,piercing:false}];
const old=gradients.length;
vm.runInContext('drawEffectLightSpills()',context);
assert(gradients.length===old+4,'critical hit projects a wide reflection and bright soft center');
assert(gradients.at(-4).radius===74,'critical hit reflection is larger');
assert(gradients.at(-4).stops[0][1].startsWith('rgba(255,226,142,'),
 'critical floor reflection is warm-white, not generic pale orange');
assert(gradients.at(-2).sy===.98&&strokes.length===0,'critical core is filled and soft, never a line');
context.hitFlashes=[];
context.balls=[ball];skills=new Set();
const integrated=gradients.length;
vm.runInContext('drawEffectLightSpills()',context);
assert(gradients.length>=integrated+expectedPools,'full composite renders the complete ground wake');
console.log('PASS: default and empowered trail floor reflections, delayed chain hits, critical glints and true ground anchors.');
