'use strict';
// v84: hard silhouette shadows + soft additive light spill, with functional
// cyan-white jagged lightning on the piercing ball and its curved trail.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=88-trail-hit-floor-light'),'new assets bypass stale caches');
assert(sw.includes('zombie-zero-shell-v88-trail-hit-floor-light'),'offline assets refresh');
function section(a,b){
 const start=code.indexOf(a),end=code.indexOf(b,start+a.length);
 assert(start>=0&&end>start,'missing source boundary '+a);
 return code.slice(start,end);
}
const shadow=section('function drawHardGroundShadow(','function rect(');
assert(!shadow.includes('blur(')&&shadow.includes('g.lineTo('),'hard-edged polygons, no blur');
assert(shadow.includes('drawWorldGroundShadows')&&shadow.includes('drawBallSoftShadow'),
 'zombies and ball use distinct shadow shapes');
const render=section('function draw(){','function frame(');
assert(render.includes('background();drawWorldGroundShadows();drawCrowd()'),
 'world polygons drawn above terrain and below characters');
assert(render.includes('drawCarGroundShadow();player()'),
 'car shadow uses measured wheel contact before body render');
assert(render.includes('fxRenderer.composite(g);drawEffectLightSpills()'),
 'smooth light spill renders after sprite/effect composite, below the HUD');
assert(render.includes('drawPierceTrailLightning(b,r,trailPath)'),
 'jagged cyan electricity follows path');
assert(render.includes('drawPierceBallLightning(b,r,false);\n  drawHeroBallSprite'),
 'rear arcs behind unchanged ball bitmap');
assert(render.includes('drawPierceBallLightning(b,r,true)'),
 'foreground arcs wrap over unchanged ball bitmap');
assert(code.includes('drawHardGroundShadow(p.x,p.y+21'),
 'citizen shadows retain foot anchors');
assert(code.includes('drawHardGroundShadow(item.x+2,item.y+FALLING_ITEM_SIZE*.48'),
 'power-up pickups cast small polygon shadows');
assert(code.includes("has('power')?12:8"),'powered ball radius remains 1.5x normal');
assert(code.includes('const CHAIN_KNOCK_STEP=.14'),'hit ripple timing preserved');
const calls={strokes:[],shadows:[],arcs:0,glows:0,frames:0},state={};
const g=new Proxy(state,{get(o,k){
 if(k in o)return o[k];
 if(k==='stroke')return ()=>{calls.strokes.push({color:o.strokeStyle,blur:o.shadowBlur})};
 if(k==='fill')return ()=>{calls.frames++};
 if(k==='lineTo')return (x,y)=>{calls.arcs++;if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('nonfinite electric vertex')};
 if(k==='createRadialGradient')return ()=>{calls.glows++;return {addColorStop(){}}};
 return ()=>{};
 },set(o,k,v){o[k]=v;return true}});
let active=new Set(['pierce']);
const context={g,Math,clock:1.22,fxEnabled:true,has:k=>active.has(k),clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),balls:[],foes:[],enemyDeaths:[],hitFlashes:[],barrelBlasts:[],bazookaBlasts:[],W:450,H:710};
vm.createContext(context);
const electric=section('function drawElectricArc(','// V76: per-ball rotational inertia');
const pathHelpers=section('function sampleBallTrail(','function drawHeroBallTrail(');
vm.runInContext(pathHelpers+electric+shadow,context);
const path=Array.from({length:18},(_,i)=>({x:210-i*3,y:290+i*5,s:i*7}));
const ball={x:210,y:290,vx:300,vy:-400,held:false};
vm.runInContext('drawPierceBallLightning('+JSON.stringify(ball)+',8,false);drawPierceBallLightning('+JSON.stringify(ball)+',8,true);drawPierceTrailLightning('+JSON.stringify(ball)+',8,'+JSON.stringify(path)+');',context);
assert(calls.strokes.some(x=>x.color==='#45c8ff'&&x.blur>0),'soft blue outer lightning glow');
assert(calls.strokes.some(x=>x.color==='#f0ffff'&&x.blur===0),'bright sharp internal filament');
assert(calls.arcs>=30,'multiple branched zigzag vertices drawn');
const prior=calls.strokes.length;
active=new Set(['power','fire']);
vm.runInContext('drawPierceTrailLightning('+JSON.stringify(ball)+',12,'+JSON.stringify(path)+')',context);
assert(calls.strokes.length===prior,'lightning disabled when pierce not equipped');
active.add('pierce');
vm.runInContext('drawPierceTrailLightning('+JSON.stringify(ball)+',12,'+JSON.stringify(path)+')',context);
assert(calls.strokes.length>prior,'lightning works with fire/power simultaneously');
const before=calls.glows;
vm.runInContext('drawSoftLightSpill(190,290,35,[80,197,255],.23)',context);
assert(calls.glows>before,'soft diffuse light rendered separately from hard shadows');
console.log('PASS: clear hard-edged world polygons, soft glow, layered electric arcs, simultaneous skills and fixed gameplay.');
