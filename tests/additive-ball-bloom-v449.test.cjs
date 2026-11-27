'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/game.js','utf8');
const section=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)+a.length));
let calls=[],builds=0,blooms=0,maskOps=[],stack=[];
const g={globalAlpha:1,globalCompositeOperation:'source-over',save(){stack.push([this.globalAlpha,this.globalCompositeOperation])},restore(){[this.globalAlpha,this.globalCompositeOperation]=stack.pop()},drawImage(img,...args){calls.push({img,op:this.globalCompositeOperation,alpha:this.globalAlpha,args})}};
const document={createElement(){builds++;return {getContext(){return {globalCompositeOperation:'source-over',createRadialGradient(){return{addColorStop(){}}},fillRect(){maskOps.push(this.globalCompositeOperation)},drawImage(){maskOps.push(this.globalCompositeOperation)}}}}}};
const env={g,document,fxEnabled:true,skills:[],has:k=>env.skills.includes(k),captureBloom(fn){blooms++;fn()}};
vm.createContext(env);vm.runInContext(section('const SKILL_TRAIL_RAMPS=','const BURN_GROUND_COLOR=')+section('const skillBallTintCache=','function drawHeroBallSprite('),env);
for(let hero=0;hero<5;hero++){
 const img={hero};const frames=hero===4?8:1;
 for(let frame=0;frame<frames;frame++)for(let mask=1;mask<8;mask++){
  env.skills=['fire','pierce','power'].filter((_,i)=>mask&(1<<i));
  calls=[];const before=builds;
  assert(env.drawSkillTintedFrame(img,frame*96,0,96,96,-12,-12,24,24));
  assert.equal(builds,before+1);assert.equal(calls.length,3);
  assert.equal(calls[0].img,img);assert.equal(calls[0].op,'source-over');assert.equal(calls[0].alpha,1);
  assert.equal(calls[1].op,'lighter');assert.equal(calls[1].alpha,1);
  assert.equal(calls[2].op,'lighter');assert.equal(calls[2].alpha,.48);assert.equal(calls[1].img,calls[2].img);
  assert.deepEqual(maskOps.slice(-2),['source-over','destination-in']);
  assert.equal(g.globalCompositeOperation,'source-over');assert.equal(g.globalAlpha,1);
  env.drawSkillTintedFrame(img,frame*96,0,96,96,-12,-12,24,24);
  assert.equal(builds,before+1,'cached emission reused on later frames');
 }
 env.skills=[];calls=[];assert.equal(env.drawSkillTintedFrame(img,0,0,96,96,0,0,24,24),false);assert.equal(calls.length,0);
}
env.skills=['pierce'];env.fxEnabled=false;assert.equal(env.drawSkillTintedFrame({},0,0,96,96,0,0,24,24),false);
assert.equal(builds,84);assert.equal(blooms,168);
console.log('PASS v449: 5 heroes, 7 elemental combinations, 8 gem frames; untouched base, alpha-clipped ADD emission, shared bloom, cache reuse, FX-off parity.');
