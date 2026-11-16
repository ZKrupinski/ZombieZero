'use strict';
// v91: runtime geometry equivalence and operation-count QA. CI intentionally
// avoids wall-clock FPS assertions; those are hardware/browser dependent.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8');
const fxSrc=fs.readFileSync('dist/fx-renderer.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=91-render-performance-preserve-visuals'));
assert(html.includes('fx-renderer.js?v=91-texture-sub-upload'));
assert(sw.includes('zombie-zero-shell-v91-render-performance-preserve-visuals'));
const section=(a,b)=>{
 const start=src.indexOf(a),end=src.indexOf(b,start+a.length);
 assert(start>=0&&end>start,'missing function section '+a);
 return src.slice(start,end);
};
const sampleSource=section('function sampleBallTrail(','function drawHeroBallTrail(');
const drawRibbonSource=section('function drawHeroBallTrail(','// V90:');
const cacheSource=section('let trailRenderFrame=0;','// Projected reflections sit below');
const renderSource=section('function draw(){','function frame(');
assert(renderSource.includes('trailRenderFrame++'),'each real frame resets cache lifetime');
assert(renderSource.includes('const trailPath=getBallRenderTrailPath(b,r)'),
 'ball sprite and trail receive cached frame geometry');
assert(src.includes('drawTrailGroundReflections(b,radius,getBallRenderTrailPath(b,radius))'),
 'floor reflections share the SAME frame geometry');
assert(src.includes('for(let i=Math.max(0,fx.length-12);i<fx.length;i++)'),
 'effect loop avoids an array copy every frame');
assert(!src.includes('fx.slice(-12)'),'effect slices no longer allocate');
// Compare every returned sample against the previous linear implementation,
// including before/after trail ends and random arc-length positions.
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
function oldSample(path,d){
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i];if(b.s<d)continue;
  const t=clamp((d-a.s)/Math.max(.001,b.s-a.s),0,1);
  return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
 }
 return path[path.length-1]||null;
}
const sampleCtx={clamp,Math};vm.createContext(sampleCtx);
vm.runInContext(sampleSource,sampleCtx);
const base=Array.from({length:82},(_,i)=>({
 x:213-Math.sin(i*.23)*19+i*1.6,
 y:255+Math.cos(i*.16)*25+i*.85,
 s:i*2.27}));
for(let k=0;k<1450;k++){
 const d=(k*73.019%205)-15;
 const old=oldSample(base,d);
 const cur=sampleCtx.sampleBallTrail(base,d);
 assert(Math.abs(old.x-cur.x)<1e-11&&Math.abs(old.y-cur.y)<1e-11,
  'every optimized arc-length interpolation matches original pixel coordinates');
 if(d>base.at(-1).s)assert.strictEqual(cur,base.at(-1),
  'out-of-range tail preserves original object contract');
}
assert.deepEqual(sampleCtx.sampleBallTrail([],8),null);
assert.strictEqual(sampleCtx.sampleBallTrail([base[0]],5),base[0]);
// Operation-count comparison is deterministic regardless of CPU speed.
let reads=0;const measured=base.map(p=>({
 x:p.x,y:p.y,
 get s(){reads++;return p.s}
}));
reads=0;oldSample(measured,178);const linearReads=reads;
reads=0;sampleCtx.sampleBallTrail(measured,178);const binaryReads=reads;
assert(binaryReads<=12&&linearReads>=75&&linearReads/binaryReads>=5,
 'binary lookup must reduce length comparisons by >=5x on long trails');
// Verify new zero-temporary-array ribbon has the exact old polygon vertices.
function oldRibbon(path,r){
 const left=[],right=[],n=path.length-1,len=Math.max(1,path[n].s);
 for(let i=0;i<=n;i++){
  const p=path[i],a=path[Math.max(0,i-1)],z=path[Math.min(n,i+1)];
  const dx=a.x-z.x,dy=a.y-z.y,m=Math.hypot(dx,dy)||1;
  const taper=clamp((len-p.s)/Math.min(17,len*.3),0,1);
  const half=Math.min(r*.76,11)*(1-.2*p.s/len)*(.2+.8*taper);
  left.push([p.x-dy/m*half,p.y+dx/m*half]);
  right.push([p.x+dy/m*half,p.y-dx/m*half]);
 }
 return left.concat(right.reverse());
}
const collected=[];
const canvasContext={
 createLinearGradient(){return{addColorStop(){}}},
 save(){},restore(){},beginPath(){},closePath(){},fill(){},
 moveTo(x,y){collected.push([x,y])},
 lineTo(x,y){collected.push([x,y])}
};
const geomCtx={g:canvasContext,clamp,Math,selectedHero:0,
 HERO_BALL_TRAILS:[{main:'#d8efa1',soft:'#95b96e'}]};
vm.createContext(geomCtx);vm.runInContext(drawRibbonSource,geomCtx);
for(const radius of [8,12]){
 collected.length=0;
 vm.runInContext('drawHeroBallTrail({x:210,y:240},'+radius+','+JSON.stringify(base)+')',geomCtx);
 const original=oldRibbon(base,radius);
 assert.deepEqual(collected,original,'optimized ribbon must have bit-identical polygon vertices');
}
assert(!drawRibbonSource.includes('const left=[],right=[]'),
 'ribbon no longer allocates two per-vertex object arrays');
// Weak per-render memoization: one build, same path identity, recompute only
// after frame increment / radius change / different ball.
let geometryBuilds=0;
const memoCtx={Math,WeakMap,buildBallTrailPath(b,r){
 geometryBuilds++;return[{x:b.x,y:b.y,s:0},{x:b.x-r,y:b.y,s:r}];
}};
const firstBall={x:210,y:250},secondBall={x:130,y:220};
memoCtx.firstBall=firstBall;memoCtx.secondBall=secondBall;
vm.createContext(memoCtx);vm.runInContext(cacheSource,memoCtx);
const cached1=vm.runInContext('getBallRenderTrailPath(firstBall,8)',memoCtx);
assert.strictEqual(vm.runInContext('getBallRenderTrailPath(firstBall,8)',memoCtx),cached1);
assert(geometryBuilds===1,'same ball/frame computes only one path');
vm.runInContext('getBallRenderTrailPath(secondBall,8)',memoCtx);
assert(geometryBuilds===2,'second ball gets distinct path');
vm.runInContext('trailRenderFrame++',memoCtx);
assert.notStrictEqual(vm.runInContext('getBallRenderTrailPath(firstBall,8)',memoCtx),cached1);
assert(geometryBuilds===3,'new frame cannot use previous-position trail geometry');
vm.runInContext('getBallRenderTrailPath(firstBall,12)',memoCtx);
assert(geometryBuilds===4,'power-ball radius invalidates memoized geometry');
// Exercise the FXRenderer using a tiny fake WebGL1 device: no framebuffer
// reallocations after init, four blur passes and one upload per composite.
const alloc=[],uploads=[],passes=[];
const gl=new Proxy({}, {get(o,k){
 if(k in o)return o[k];
 if(k==='texImage2D')return(...args)=>alloc.push(args);
 if(k==='texSubImage2D')return(...args)=>uploads.push(args);
 if(k==='drawArrays')return(...args)=>passes.push(args);
 if(k==='getShaderParameter'||k==='getProgramParameter')return()=>true;
 if(k==='getShaderInfoLog')return()=>null;
 if(k==='checkFramebufferStatus')return()=>36053;
 if(k==='getUniformLocation')return()=>({});
 if(k==='getAttribLocation')return()=>0;
 if(k==='isContextLost')return()=>false;
 if(k==='getContextAttributes')return()=>({alpha:true});
 if(k.startsWith('create'))return()=>({});
 if(k==='FRAMEBUFFER_COMPLETE')return 36053;
 return()=>{};
}});
const c2d={save(){},restore(){},setTransform(){},clearRect(){}};
let canvasCount=0;
const doc={createElement(tag){
 assert(tag==='canvas');canvasCount++;
 const id=canvasCount;
 return{width:0,height:0,addEventListener(){},
  getContext(type){return type==='webgl'?gl:c2d}};
}};
const runtime={window:{},document:doc,Math,Float32Array,Error,String};
vm.createContext(runtime);vm.runInContext(fxSrc,runtime);
const renderer=new runtime.window.FXRenderer(450,710);
assert(renderer.gl===gl,'fake WebGL context initialized successfully: '+String(renderer.reason));
assert(alloc.length===2,'only two texture allocations during renderer initialization');
assert(alloc[0][3]===450&&alloc[0][4]===710,'source texture matches full-size native canvas');
assert(alloc[1][3]===225&&alloc[1][4]===355,'intermediate remains half-size');
const surface={canvas:{width:450,height:710},globalAlpha:1,save(){},restore(){},setTransform(){},drawImage(){}};
for(let i=0;i<4;i++){renderer.begin();renderer.dirty=true;renderer.composite(surface)}
assert(uploads.length===4,'one sub-image upload per frame');
assert(uploads.every(args=>args[2]===0&&args[3]===0&&args[8]===renderer.source),
 'source pixel upload uses preallocated texture at origin');
assert(alloc.length===2,'zero GPU texture reallocation during four representative frames');
assert(passes.length===16,'original two-radius four-pass bloom quality maintained');
assert(renderer.settings.bloom===1&&renderer.settings.add===.6&&renderer.settings.radius===12,
 'existing bloom strength, additive gain and blur radius unchanged');
assert(fxSrc.includes("target.filter='blur(12px)'"),
 'non-WebGL fallback remains identical');
console.log('PASS: mathematically identical trail samples and ribbon polygons; >=5x fewer length reads, 1 path build/ball/frame, no per-frame WebGL reallocation, same bloom passes.');
