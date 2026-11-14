'use strict';
const vm=require('node:vm'),fs=require('node:fs');
const noop=()=>{},elements={},ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return elements[id]??={textContent:'',innerHTML:'',style:{},hidden:false,addEventListener:noop,setAttribute:noop,
 getContext:()=>ctx,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop},localStorage:{getItem:()=>0,setItem:noop},
 Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`
function check(value,msg){if(!value)throw Error(msg)}
const enemy=(x,y)=>({x,y,w:33,h:44,hp:20,max:20,kind:1,form:0,
 row:2,col:4,seed:0,flash:0,burn:0,burnTick:0,spreadTick:0});
start();serve();
check(SKILLS.pierce.duration===10,'new timed piercing item is part of pickup table');
check(CRITICAL_GREEN_CHANCE===.15&&CRITICAL_SPECIAL_CHANCE===.09,'baseline critical odds mildly increased');
check(Object.keys(SKILLS).includes('pierce'),'pierce can appear in normal item pool');
clearSkills();active.pierce=10;mode='playing';clock=0;
const targets=[enemy(208.5,359),enemy(208.5,295),enemy(208.5,230)];
const dummy=enemy(34,155);
foes=[...targets,dummy];
balls=[newBall(225,435,0,-450,false)];
const ball=balls[0],beforeV=ball.vy;
for(let i=0;i<45;i++)update(.016);
check(ball.vy===beforeV,'piercing ball retains its direction through multiple zombies');
check(targets.every(z=>z.hp===18),'3 separate enemies receive exactly 2x critical damage on one pass');
check(criticalPopups.length>=3,'3 unique piercing critical announcements are created');
check(targets.every(z=>foes.includes(z)),'piercing is not unintended instant one-shot kill');
check(ball.pierceContacts.size<=1,'collision contacts are removed when the ball leaves a target');
check(has('pierce'),'piercing remains active for its full timed window');
// A long overlap must not repeatedly drain an enemy's health.
foes=[enemy(208.5,290),dummy];balls=[newBall(225,333,0,-190,false)];
const overlap=foes[0];
for(let i=0;i<8;i++)update(.016);
check(overlap.hp===18,'staying inside one collider does not damage every substep');
// Bosses receive critical *damage*, but are never auto-killed.
const boss={...enemy(191,290),boss:true,form:3,max:100,hp:100,kind:4,w:66,h:88};
foes=[boss,dummy];balls=[newBall(225,391,0,-360,false)];
for(let i=0;i<16;i++)update(.016);
check(boss.hp===98&&foes.includes(boss),'boss takes exactly one 2x critical hit per crossing');
// Once the pickup times out, enemy hits return to ordinary bounce behavior.
foes=[enemy(208.5,334),dummy];balls=[newBall(225,385,0,-420,false)];
active.pierce=.001;
for(let i=0;i<7;i++)update(.016);
check(!has('pierce')&&balls[0].vy>0,'expiration restores standard ball reflection');
// Extra ball expiration is a visible vanish, without consuming a heart.
clearSkills();balls=[newBall(225,420,0,-350,false)];activate('dual');
check(balls.length===2,'multi-ball setup');
const hearts=lives;active.dual=.001;update(.016);
check(balls.length===1&&lives===hearts,'extra ball expires but does not lose a life');
check(ballVanish.some(q=>q.reason==='expire'&&q.life>.4),'extra ball visually dissolves at world position');
// An individual dropped ball has a distinct pink disappearance, no life loss
// while another ball remains active.
foes=[enemy(208.5,200),dummy];
balls=[newBall(100,735,0,400,false),newBall(300,450,0,-350,false)];
update(.016);
check(balls.length===1&&lives===hearts,'one lost ball with another alive has no life penalty');
check(ballVanish.some(q=>q.reason==='lost'),'lost ball gets dedicated impact effect');
draw(); // particles, vanishes, and critical texts must render without exceptions
check(SKILLS.pierce.desc.includes('크리티컬'),'skill help describes guaranteed critical damage');
console.log('PASS: 3+ genuine enemy pierces, per-target de-duplication, boss-safe 2x critical, regular bounce on expiry, and visible extra/lost ball dissolves');
`,sandbox);
