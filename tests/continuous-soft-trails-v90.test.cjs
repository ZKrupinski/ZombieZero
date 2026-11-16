'use strict';
// v90: all trail-related systems cover the ORIGINAL trajectory length,
// use connected/overlapping geometry, and add only a slight FX-only bloom.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('dist/game.js','utf8'),
 html=fs.readFileSync('dist/index.html','utf8'),
 sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=92-trail-bloom-softened'),'new game asset version');
assert(sw.includes('zombie-zero-shell-v92-trail-bloom-softened'),'new offline cache key');
function part(a,b){
 const i=code.indexOf(a),j=code.indexOf(b,i+a.length);
 assert(i>=0&&j>i,'missing source '+a);return code.slice(i,j);
}
const heroTrail=part('function drawHeroBallTrail(','// V90:');
const halo=part('function drawTrailEdgeHalo(','// V82:');
const skills=part('function drawBallSkillTrail(','// V83:');
const flame=part('function drawBurningTrailFlames(','// V84:');
const pierce=part('function drawPierceTrailLightning(','// V76:');
const sample=part('function sampleBallTrail(','function drawHeroBallTrail(');
const lighting=part('function drawSoftLightSpill(','function rect(');
const render=part('function draw(){','function frame(');
assert(render.includes('drawHeroBallTrail(b,r,trailPath);'),'original ribbon remains');
assert(render.includes('luminous(()=>drawTrailEdgeHalo(b,r,trailPath),')&&
 render.includes('()=>drawTrailEdgeHalo(b,r,trailPath,.72)'),
 'same soft halo is captured into existing FX-only bloom at reduced strength');
assert(render.includes('drawBallSkillTrail(b,r,trailPath)')&&
 render.includes('drawBurningTrailFlames(b,r,trailPath)')&&
 render.includes('drawPierceTrailLightning(b,r,trailPath)'),
 'existing skill layers are retained');
assert(!skills.includes('d+=r>8?13:11'),'legacy 11/13px dotted skill spacing removed');
assert(!flame.includes('Math.min(path[path.length-1].s,170)'),
 'flame effect does not stop before original powered trail');
assert(!pierce.includes('Math.min(144,path[path.length-1].s)'),
 'pierce does not stop at the old 144px limit');
assert(!lighting.includes('Math.min(path[path.length-1].s,134)'),
 'floor reflection does not stop at the old 134px limit');
const gradients=[],strokes=[],arcs=[],stateStack=[],transform={x:0,y:0,sy:1};
let pathNow=[],flameTips=0;
const g=new Proxy({},{
 get(o,k){
  if(k==='save')return()=>stateStack.push({t:{...transform},sty:{...o}});
  if(k==='restore')return()=>{const prev=stateStack.pop();Object.assign(transform,prev.t);Object.assign(o,prev.sty)};
  if(k==='translate')return(x,y)=>{transform.x+=x;transform.y+=transform.sy*y};
  if(k==='scale')return(x,y)=>{transform.sy*=y};
  if(k==='beginPath')return()=>{pathNow=[]};
  if(k==='moveTo')return(x,y)=>{pathNow.push([x,y])};
  if(k==='lineTo')return(x,y)=>{pathNow.push([x,y])};
  if(k==='createLinearGradient')return()=>({stops:[],addColorStop(t,col){this.stops.push([t,col])}});
  if(k==='createRadialGradient')return(...args)=>{
   const gr={x:transform.x+args[0],y:transform.y+args[1]*transform.sy,
    scaleY:transform.sy,stops:[],addColorStop(t,col){this.stops.push([t,col])}};
   gradients.push(gr);return gr;
  };
  if(k==='stroke')return()=>{strokes.push({points:pathNow.slice(),blur:o.shadowBlur||0,
   width:o.lineWidth,alpha:o.globalAlpha,style:o.strokeStyle})};
  if(k in o)return o[k];return()=>{};
 },
 set(o,k,v){o[k]=v;return true}
});
const generatePath=len=>Array.from({length:75},(_,i)=>{
 const f=i/74;return{x:330-195*f,y:120+65*f,s:len*f};
});
let active=new Set();
const ctx={g,Math,Number,clock:2.4,fxEnabled:true,selectedHero:0,
 clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),
 HERO_BALL_TRAILS:[
  {main:'#d8efa1',soft:'#95b96e',accent:'#f4f8d1'},
  {main:'#f2e9dd',soft:'#c9bdaf',accent:'#c86e6b'},
  {main:'#f5be76',soft:'#78c2d9',accent:'#e995c2'}],
 has:k=>active.has(k),ballProjectionDrop:r=>24+r*1.25,
 SKILLS:{},balls:[],foes:[],hitFlashes:[],barrelBlasts:[],bazookaBlasts:[],
 fx:[],itemPickupFX:[],knockVisualPosition:z=>z,
 flameTongue(){flameTips++},
 drawElectricArc(points,alpha,scale){arcs.push({points,alpha,scale})}};
vm.createContext(ctx);
vm.runInContext(sample+heroTrail+halo+skills+flame+pierce+lighting,ctx);
for(const len of [170,190]){
 const p=generatePath(len),ball={x:p[0].x,y:p[0].y,held:false};
 const before=gradients.length;
 vm.runInContext('drawTrailGroundReflections('+JSON.stringify(ball)+','+(len===190?12:8)+','+JSON.stringify(p)+')',ctx);
 const newGlows=gradients.slice(before);
 const expectedSamples=Math.min(20,Math.max(2,Math.ceil((len-4)/11)+1));
 assert(newGlows.length===expectedSamples*2,'every portion of the complete trail receives two soft pools');
 assert(newGlows.every(x=>x.scaleY===.82),'reflections retain thick, non-line oval geometry');
 assert(Math.abs(newGlows.at(-1).y-(p.at(-1).y+30))<.01,
  'floor reflection reaches the original tail endpoint, still displaced 30px down');
 assert(Math.abs(newGlows[0].y-(p[0].y+30+65*4/len))<.02,
  'floor reflection starts near ball on the exact original trail path');
 assert(newGlows.some(x=>x.stops[0][1].startsWith('rgba(192,234,112,')),
  'normal hero color is preserved');
}
const p=generatePath(190),ball={x:p[0].x,y:p[0].y,held:false};
vm.runInContext('drawTrailEdgeHalo('+JSON.stringify(ball)+',12,'+JSON.stringify(p)+')',ctx);
const h=strokes.at(-1);
assert(h.blur===4&&h.alpha<=.25,'base ribbon edge only has subtle soft feathering');
assert(Math.abs(h.points.at(-1)[0]-p.at(-1).x)<.01,
 'halo follows the entire source trail length');
strokes.length=0;active=new Set(['pierce','power','fire']);
vm.runInContext('drawBallSkillTrail('+JSON.stringify(ball)+',12,'+JSON.stringify(p)+')',ctx);
assert(strokes.length>28,'skill streaks are closer together than the old 13px gaps');
assert(strokes[0].points.length>15,'continuous uninterrupted skill color core covers the trajectory');
assert(Math.abs(strokes[0].points.at(-1)[0]-p.at(-1).x)<.01,
 'skill color core reaches exact same original trail endpoint');
assert(strokes[0].blur===3,'skill trail core is softly feathered');
vm.runInContext('drawBurningTrailFlames('+JSON.stringify(ball)+',12,'+JSON.stringify(p)+')',ctx);
assert(flameTips>=30,'fire tongues are spaced more closely along entire trail');
vm.runInContext('drawPierceTrailLightning('+JSON.stringify(ball)+',12,'+JSON.stringify(p)+')',ctx);
assert(arcs.length>2,'piercing main lightning and forks still render');
const main=arcs[0].points;
assert(main.length>23,'piercing main path uses densely sampled vertices');
assert(Math.abs(main.at(-1).x-p.at(-1).x)<.01&&Math.abs(main.at(-1).y-p.at(-1).y)<.01,
 'piercing main path reaches the same original trail tip, including power');
ctx.fxEnabled=false;strokes.length=0;const prior=gradients.length;
vm.runInContext('drawTrailEdgeHalo('+JSON.stringify(ball)+',12,'+JSON.stringify(p)+');drawTrailGroundReflections('+JSON.stringify(ball)+',12,'+JSON.stringify(p)+')',ctx);
assert(strokes.length===0&&gradients.length===prior,'optional soft effects respect FX-off');
console.log('PASS: full-length 170/190px continuous ribbons, dense energy, soft FX-only halo and extended floor reflections.');
