'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
new vm.Script(source);
const block=source.slice(source.indexOf('function drawBurningOverlays()'),source.indexOf('function drawBallVanish()'));
function render(count,tier,enabled=true){
 const log={base:0,bloom:0,blur:0,captures:0};let pass='base';
 const g={save(){},restore(){},translate(){},scale(){},fillRect(){log[pass]++},set shadowBlur(v){if(v>0)log.blur++}};
 const foes=Array.from({length:count},(_,i)=>({x:20+i*15,y:100,w:22,h:28,burn:1,seed:i,miniScale:.5}));
 const env={g,foes,clock:1,fxEnabled:enabled,perfTier:tier,burningCount:()=>count,knockVisualPosition:z=>z,
 luminous(draw,bloom=draw){log.captures++;pass='base';draw();pass='bloom';bloom();}};
 vm.runInNewContext(block+'\ndrawBurningOverlays()',env);
 return log;
}
const full=render(1,0),dense=render(6,0),busy=render(3,1),severe=render(1,2);
assert.equal(full.base,35);assert.equal(full.bloom,35);assert(full.blur>0);
for(const [result,count] of [[dense,6],[busy,3],[severe,1]]){
 assert.equal(result.base,15*count);assert.equal(result.bloom,result.base);
 assert.equal(result.captures,1);assert.equal(result.blur,0);
}
assert.equal(render(0,2).captures,0);
assert.equal(render(6,2,false).captures,0);
console.log('PASS V351: burning enemies retain additive/Bloom capture at all quality levels, with sparse unblurred geometry during load');
