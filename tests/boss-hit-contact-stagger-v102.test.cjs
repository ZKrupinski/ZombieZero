'use strict';
// v102 boss contact regression: one hit per physical overlap, independent
// multi-ball hits, normal boss movement resumes under sustained contact.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('v102-boss-contact'));
assert(sw.includes('v102-boss-contact'));
assert(game.includes('const BOSS_STAGGER_REARM=.65;'));
assert(game.includes('b.pierceContacts.add(z);'),'both solid and piercing record contacts');
assert(game.includes('if(b.pierceContacts.has(z)||(!piercing&&b.lastHit===z&&b.hitLock>0))continue;'));
assert(!game.includes("if(k==='pierce')for(const b of balls)b.pierceContacts?.clear();"),
 'no expiry-based duplicate hits while still inside the boss');
const noop=()=>{},elems={},ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return elems[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),
 setPointerCapture:noop}}
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},
 Path2D:class{},requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,
 Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(game+`
function verify(ok,msg){if(!ok)throw Error(msg)}
const bossAt=(x=192,y=290)=>({
 x,y,w:66,h:88,hp:200,max:200,boss:true,form:3,bossForm:0,
 kind:4,seed:0,flash:0,burn:0,burnTick:0,spreadTick:0,
 bossHomeY:y,bossNextMove:clock+99
});
start();serve();active={};mode='playing';clock=0;
let boss=bossAt();
foes=[boss];balls=[newBall(225,327,0,190,false)];
const ball=balls[0];
for(let i=0;i<12;i++)update(.016);
verify(boss.hp===199,
 'One non-piercing ball STARTING INSIDE a 66x88 boss must not score repeated hits during overlap: '+boss.hp);
verify(ball.pierceContacts.has(boss),'ball keeps contact while physically overlapping boss');
// The record is removed only when the ball actually leaves the rectangle.
ball.y=boss.y-23;ball.vy=-190;update(.016);
verify(!ball.pierceContacts.has(boss),'full separation clears contact record');
// A new physical entry can hit again (no global invulnerability).
ball.y=boss.y+26;ball.vy=190;ball.hitLock=0;update(.016);
verify(boss.hp===198,'after separation, a fresh contact damages normally');
// Two DIFFERENT balls can each legitimately land one hit.
boss=bossAt();foes=[boss];balls=[
 newBall(221,327,0,190,false),newBall(229,327,0,190,false)];
update(.016);
verify(boss.hp===198,'two distinct balls both damage the boss once');
verify(balls.every(b=>b.pierceContacts.has(boss)),'each ball tracks independent overlap');
// Once the first stun starts, repeated hits must not extend its 0.19s freeze.
boss=bossAt(192,120);foes=[boss];balls=[newBall(50,540,0,-300,false)];
clock=0;damage(boss,1,false,{x:30,y:120});
const firstShakeEnd=boss.hitShakeUntil;
clock=.09;damage(boss,1,false,{x:30,y:120});
verify(Math.abs(boss.hitShakeUntil-firstShakeEnd)<.00001,
 'rapid second boss hit does not restart the stun timer');
// Clear approach lane and set an explicit safe movement destination.
boss.bossGoalX=305;boss.bossGoalY=120;boss.bossHomeY=120;
const initialX=boss.x;
for(let i=0;i<95;i++){
 clock+=.016;
 if(i%5===0)damage(boss,1,false,{x:30,y:120});
 march(.016);
}
verify(boss.x>initialX+30,
 'boss MUST move despite valid hit effects every .08 seconds: '+(boss.x-initialX));
verify(boss.hp<198,'multiple REAL balls/independent contact still cause damage');
// Original boss sizes, speeds, 2x piercing damage, and stun length unchanged.
verify(HIT_FREEZE_BOSS===.19&&BOSS_SWEEP_SPEED===118,
 'preserve original first-hit hitstop and patrol speed');
verify(newBall().pierceContacts instanceof Set,'all new balls retain contact set');
console.log('PASS: boss no repeated overlap hits, independent multi-ball damage, fresh re-contact, movement after stagger cooldown.');
`,sandbox);
