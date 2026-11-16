'use strict';
// v89: floor reflections must be rounded, filled gradient pools, never
// flattened streaks or a one-pixel hit line.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=89-thick-soft-ground-reflections'));
assert(sw.includes('zombie-zero-shell-v89-thick-soft-ground-reflections'));
function extract(a,b){
 const i=code.indexOf(a),j=code.indexOf(b,i+a.length);
 assert(i>=0&&j>i,'missing source section '+a);return code.slice(i,j);
}
const lighting=extract('function drawSoftLightSpill(','function rect(');
const sampling=extract('function sampleBallTrail(','function drawHeroBallTrail(');
const beforeGlint=extract('function drawHitGroundGlint(','function effectLightRGB(');
assert(!beforeGlint.includes('.stroke('),'no horizontal line strokes in hit ground lighting');
assert(!beforeGlint.includes('moveTo('),'no short straight-line glints');
assert(lighting.includes('g.scale(1,Math.max(.72,Math.min(1,vertical)))'),
 'projected reflection has bounded plump oval geometry');
const gradients=[],strokes=[],snapshots=[];
const transform={x:0,y:0,sy:1};
const c=new Proxy({},{
 get(o,k){
  if(k==='save')return()=>snapshots.push({t:{...transform},style:{...o}});
  if(k==='restore')return()=>{const last=snapshots.pop();Object.assign(transform,last.t);Object.assign(o,last.style)};
  if(k==='translate')return(x,y)=>{transform.x+=x;transform.y+=y*transform.sy};
  if(k==='scale')return(x,y)=>{transform.sy*=y};
  if(k==='stroke')return()=>strokes.push({x:transform.x,y:transform.y});
  if(k==='createRadialGradient')return(...args)=>{
   const gradient={x:transform.x+args[0],y:transform.y+args[1]*transform.sy,
    sy:transform.sy,radius:args[5],stops:[],addColorStop(t,value){this.stops.push([t,value])}};
   gradients.push(gradient);return gradient;
  };
  if(k in o)return o[k];return()=>{};
 },
 set(o,k,v){o[k]=v;return true}
});
const path=Array.from({length:12},(_,i)=>({x:235-i*4,y:135+i*5,s:i*16}));
const ball={x:235,y:135,held:false};
let equipped=new Set();
const ctx={g:c,Math,Number,clock:1.25,fxEnabled:true,selectedHero:0,
 clamp:(x,min,max)=>Math.min(max,Math.max(min,x)),
 has:k=>equipped.has(k),ballProjectionDrop:r=>24+r*1.25,
 HERO_BALL_TRAILS:[{main:'#d8efa1'},{main:'#f2e9dd'},{main:'#f5be76'}],
 balls:[],foes:[],hitFlashes:[],barrelBlasts:[],bazookaBlasts:[],fx:[],itemPickupFX:[],
 buildBallTrailPath:()=>path,knockVisualPosition:z=>z,
 SKILLS:{fire:{color:'#ff9b50'}}};
vm.createContext(ctx);vm.runInContext(sampling+lighting,ctx);
vm.runInContext('drawProjectedLightSpill(110,150,30,[91,200,255],.6,31,.82)',ctx);
assert(gradients.length===2&&gradients.every(x=>x.sy===.82),
 'floor light has two filled layers at 82% vertical depth');
assert(gradients.every(x=>x.y===181),'floor light still projected 31px down');
const afterDirect=gradients.length;
vm.runInContext('drawTrailGroundReflections('+JSON.stringify(ball)+',8,'+JSON.stringify(path)+')',ctx);
const trails=gradients.slice(afterDirect);
assert(trails.length===16,'eight bounded double-layer trail samples');
assert(trails.every(g=>g.sy===.82),'ALL trail samples visibly thick, not vertically crushed');
assert(trails.every(g=>g.stops[0][1].startsWith('rgba(192,234,112,')),
 'ordinary hero wake retains its readable colored floor light');
assert(trails.some(g=>g.radius>20),'large diffused trail pool maintained');
const early=gradients.length;
ctx.hitFlashes=[{x:115,y:150,groundY:200,t:.02,delay:.11,life:.42,critical:false,piercing:true}];
vm.runInContext('drawEffectLightSpills()',ctx);
assert(gradients.length===early,'delayed chain hit starts only when actual contact occurs');
ctx.hitFlashes[0].t=.15;
vm.runInContext('drawEffectLightSpills()',ctx);
const hit=gradients.slice(early);
assert(hit.length===4,'hit has two broad soft ellipses and two soft central pools');
assert(hit[0].sy===.94&&hit[1].sy===.94,'large hit reflection has 94% vertical depth');
assert(hit[2].sy===.98&&hit[3].sy===.98,'inner hit bloom is almost round');
assert(hit.every(g=>g.y===206),'hit reflection stays detached at actual enemy foot height');
assert(hit.every(g=>g.radius>=12),'hit center is an area, never a thin line');
assert(strokes.length===0,'no hit reflection strokes survive');
const after=gradients.length;
ctx.hitFlashes=[{x:130,y:155,groundY:207,t:.025,delay:0,life:.39,critical:true,piercing:false}];
vm.runInContext('drawEffectLightSpills()',ctx);
const critical=gradients.slice(after);
assert(critical.length===4&&critical[0].radius===74,'critical still has a large soft footprint');
assert(critical[0].sy===.94&&critical[2].sy===.98,
 'critical stays full-bodied instead of horizontal');
assert(critical[2].stops[0][1].startsWith('rgba(255,248,197,'),
 'bright warm-white bloom at critical floor center');
const prev=gradients.length;
ctx.fxEnabled=false;
vm.runInContext('drawEffectLightSpills()',ctx);
assert(gradients.length===prev,'lighting obeys FX enable flag');
console.log('PASS: full-bodied trail ellipses and hit/critical gradient pools; no thin line strokes.');
