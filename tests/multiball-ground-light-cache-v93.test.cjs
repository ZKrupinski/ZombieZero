'use strict';
// Deterministic v93 draw-operation QA; real FPS is browser/device dependent.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('game.js?v=93-multiball-light-cache'));
assert(sw.includes('zombie-zero-shell-v93-multiball-light-cache'));
assert(code.includes('baseAlpha*.68*fade*variation,30,.82,true)'));
function part(start,end){
 const a=code.indexOf(start),b=code.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'missing code block '+start);return code.slice(a,b);
}
const source=part('const TRAIL_LIGHT_STAMP_SIZE=','// V91: one geometry')+
 part('function drawProjectedLightSpill(','// V88: reflected light');
let stampGradients=0,liveGradients=0,draws=0,created=0;
const stops=[];
const stampCtx={createRadialGradient(){stampGradients++;return{addColorStop(x,c){stops.push([x,c])}}},fillRect(){}};
const g={globalAlpha:1,stack:[],save(){this.stack.push(this.globalAlpha)},
 restore(){this.globalAlpha=this.stack.pop()},translate(){},scale(){},beginPath(){},
 arc(){},fill(){},createRadialGradient(){liveGradients++;return{addColorStop(){}}},
 drawImage(img,x,y,w,h){draws++;assert.equal(img.width,192);
  assert.equal(img.height,192);assert.equal(w,h);assert(w>0)}};
const context={Math,WeakMap,g,fxEnabled:true,balls:Array.from({length:6},()=>({})),
 document:{createElement(name){assert.equal(name,'canvas');created++;
  return{width:0,height:0,getContext(){return stampCtx}}}}};
vm.createContext(context);vm.runInContext(source,context);
context.rgb=[192,234,112];
for(let i=0;i<20;i++)
 vm.runInContext('drawProjectedLightSpill(110,165,24,rgb,.28,30,.82,true)',context);
assert.equal(created,1,'one reusable stamp allocated for the hero trail color');
assert.equal(stampGradients,1,'only one static radial gradient across frames');
assert.equal(liveGradients,0,'multiball trail wake creates no live radial gradients');
assert.equal(draws,40,'same 20 outer + 20 inner soft pools');
assert.deepEqual(stops.map(s=>s[0]),[0,.29,.61,.84,1],'same falloff stops');
assert.equal(g.globalAlpha,1,'globalAlpha restored after each stamp');
context.balls=[{}];draws=0;
for(let i=0;i<20;i++)
 vm.runInContext('drawProjectedLightSpill(110,165,24,rgb,.28,30,.82,true)',context);
assert.equal(liveGradients,0,'single ball also avoids live gradients');
assert.equal(draws,40,'single ball retains both cached light pools');
assert.equal(created,1,'single ball reuses existing color stamp');
draws=0;
context.balls=[{},{}];context.fxEnabled=false;
vm.runInContext('drawProjectedLightSpill(110,165,24,rgb,.28,30,.82,true)',context);
assert.equal(draws,0,'FX-off draws no stamps');
assert(code.includes('drawTrailEdgeHalo(b,r,trailPath,.72)'),'trail bloom unchanged');
assert(fs.readFileSync('dist/fx-renderer.js','utf8').includes('bloom:1,radius:12'),'shader strength unchanged');
console.log('PASS: single and multi-ball share a cached color mask, both light pools and glow/bloom preserved.');
