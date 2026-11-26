'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
new vm.Script(source);
const block=source.slice(source.indexOf('const SKILL_TRAIL_RAMPS='),source.indexOf('const BURN_GROUND_COLOR='))+source.slice(source.indexOf('function drawBurningOverlays()'),source.indexOf('function drawBallVanish()'));
function render(count,tier,enabled=true,cached=true){
 const log={base:0,bloom:0,blur:0,captures:0,stamps:0,atlasDraws:0,alloc:0,colors:new Set(),images:[]};let pass='base';
 const g={save(){},restore(){},translate(){},scale(){},fillRect(){log[pass]++},
 drawImage(...a){log[pass]++;log.images.push(a)},set shadowBlur(v){if(v>0)log.blur++}};
 const doc={createElement(){log.alloc++;const c={width:0,height:0,getContext(){return {
  drawImage(){log.atlasDraws++},fillRect(){log.stamps++;log.colors.add(this.fillStyle)},
  shadowBlur:0,globalAlpha:1
 }}};return c}};
 const foes=Array.from({length:count},(_,i)=>({x:20+i*15,y:100,w:22,h:28,burn:1,seed:i,miniScale:.5}));
 const env={g,foes,clock:1,fxEnabled:enabled,perfTier:tier,burningCount:()=>count,knockVisualPosition:z=>z,
 luminous(draw,bloom=draw){log.captures++;pass='base';draw();pass='bloom';bloom();}};
 if(cached)env.document=doc;
 vm.createContext(env);vm.runInContext(block+'\ndrawBurningOverlays()',env);
 if(cached&&count&&enabled){
  const alloc=log.alloc,stamps=log.stamps,draws=log.atlasDraws;
  vm.runInContext('clock+=.05;drawBurningOverlays()',env);
  assert.equal(log.alloc,alloc);assert.equal(log.stamps,stamps);assert.equal(log.atlasDraws,draws);
 }
 return log;
}
for(const [count,tier] of [[1,0],[6,0],[3,1],[1,2],[72,2]]){
 const r=render(count,tier);
 assert.equal(r.base,2*count);assert.equal(r.bloom,2*count);
 assert.equal(r.stamps,5);assert.equal(r.atlasDraws,64*35);assert.equal(r.blur,0);
 assert.deepEqual([...r.colors],['#c90009','#ed3503','#ff8610','#ffcb18','#fff15b']);
 assert(r.images.every(a=>a.length===9&&a[3]===80&&a[4]===64));
 const fallback=render(count,tier,true,false);
 assert.equal(fallback.base,35*count);assert.equal(fallback.bloom,35*count);assert(fallback.blur>0);
}
assert.equal(render(0,2).captures,0);
assert.equal(render(6,2,false).captures,0);
// Exact unquantized full-detail geometry against the original formula.
const env={};vm.createContext(env);vm.runInContext(block,env);
for(const boss of [false,true])for(const time of [0,.2,1.7]){
 const actual=[];env.boss=boss;env.time=time;env.actual=actual;
 vm.runInContext('burningFlameGeometry(boss,40,50,time,2,(...p)=>actual.push(p))',env);
 const expected=[];
 for(let column=-3;column<=3;column++){
  const x=40+column*(boss?10:6),wave=.5+.5*Math.sin(time*24+column*3.7+2);
  const height=(boss?41:24)*(.65+.35*wave)*(1-.09*Math.abs(column));
  for(let step=0;step<5;step++){
   const span=Math.max(2,(boss?7:5)-step*.65);
   expected.push([Math.round(x-span/2+Math.sin(time*15+column*2+step)*2),Math.round(50-height*(step/5)),Math.ceil(span),boss?8:5,step]);
  }
 }
 assert.equal(JSON.stringify(actual),JSON.stringify(expected));
}
console.log('PASS V365: full original 35-pixel geometry at every detail tier, orange/yellow/white tips retained, one cached draw per zombie per pass, no new allocation after warmup.');
