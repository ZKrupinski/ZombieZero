'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const begin=game.indexOf('function drawEnemyDeaths(){');
const end=game.indexOf('function zombie(z){',begin);
assert(begin>=0&&end>begin,'a single common zombie-death render pass exists');
const source=game.slice(begin,end);
assert(source.includes('progress<=.75?1:Math.max(0,(1-progress)*4)'),
 'only final 25% (last two of eight frames) should fade');
assert(source.includes('g.save()')&&source.includes('g.restore()'),
 'death alpha cannot leak into subsequent draw calls');
assert(html.includes('v155-death-fade')&&sw.includes('v155-death-fade'),
 'new script and PWA cache versions are served');
assert(source.includes('window.ZZLargeBossSprites.drawDeath(g,d.z,elapsed,duration)'));
assert(source.includes('window.ZZEliteSprites.drawDeath(g,d.z,elapsed,duration)'));
assert(source.includes('window.ZZObjectSprite.drawDeath(g,d.z,d.critical,elapsed,duration)'));
assert(source.includes('window.ZZGreenDeath.draw(g,d.z,d.critical,elapsed)'));
const calls=[];
const ctx={
  globalAlpha:.8,filter:'none',stack:[],
  save(){this.stack.push({globalAlpha:this.globalAlpha,filter:this.filter})},
  restore(){
   const state=this.stack.pop();
   assert(state,'restore requires a matching save');
   Object.assign(this,state);
  },
  translate(){},
};
function available(route){return z=>z.route===route}
function draw(route){return (g,z,...params)=>{
 calls.push({route,alpha:g.globalAlpha,params});
 return true;
}}
const world={
 g:ctx,
 enemyDeaths:[],
 window:{
  ZZLargeBossSprites:{available:available('boss'),drawDeath:draw('boss')},
  ZZEliteSprites:{available:available('elite'),drawDeath:draw('elite')},
  ZZObjectSprite:{available:available('object'),drawDeath:draw('object')},
  ZZGreenDeath:{ready:true,draw:draw('green')},
 },
 zombie(z){calls.push({route:'freeze',alpha:ctx.globalAlpha})},
 hitShakeOffset(){return {x:0,y:0}},
 Math,Number,
};
vm.createContext(world);
vm.runInContext(source,world);
for(const route of ['boss','elite','object','green']){
 let last=Infinity;
 for(const [t,expected] of [[0,.8],[.375,.8],[.7499,.8],[.75,.8],[.8125,.6],[.875,.4],[.9375,.2],[.99,.032]]){
  calls.length=0;
  world.enemyDeaths=[{z:{route,boss:route==='boss'},t,freeze:0,split:1,critical:true,spriteMode:true}];
  vm.runInContext('drawEnemyDeaths()',world,{timeout:1000});
  assert.equal(calls.length,1,route+' makes exactly one original bitmap draw at '+t);
  assert.equal(calls[0].route,route,'no sprite family is replaced');
  assert(Math.abs(calls[0].alpha-expected)<.00001,
   route+' final two animation frames have smooth fade at '+t+': '+calls[0].alpha);
  if(t>=.75)assert(calls[0].alpha<=last+.00001,
   route+' fade is strictly non-increasing');
  last=calls[0].alpha;
  assert.equal(ctx.globalAlpha,.8,'later game drawing is not faded');
  assert.equal(ctx.stack.length,0,'no saved render states are leaked');
 }
}
calls.length=0;
world.enemyDeaths=[{z:{route:'elite',boss:false},t:.04,freeze:.10,split:.72,critical:false,spriteMode:true}];
vm.runInContext('drawEnemyDeaths()',world,{timeout:1000});
assert.equal(calls[0]?.route,'freeze','impact freeze shows fully opaque live sprite');
assert.equal(calls[0]?.alpha,.8,'freeze is unchanged by death fade');
assert.equal(ctx.stack.length,0,'freeze preserves canvas save/restore');
calls.length=0;
world.enemyDeaths=[{z:{route:'object',boss:false},t:.10,freeze:.10,split:.62,critical:false,spriteMode:true}];
vm.runInContext('drawEnemyDeaths()',world,{timeout:1000});
assert.equal(calls[0]?.alpha,.8,'death starts fully visible after freeze');
assert.equal(ctx.globalAlpha,.8);
console.log('PASS V155: all four zombie bitmap-death routes fade smoothly only over final two frames; freeze remains opaque, no state leaks');
