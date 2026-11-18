'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const noop=()=>{},els={},drawImages=[];
const ctx=new Proxy({drawImage(...args){drawImages.push(args)}},
 {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}
 createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,
 Math:Object.create(Math),console,drawImages};
vm.createContext(sandbox);
vm.runInContext(source+`
function check(ok,msg){if(!ok)throw Error(msg)}
// First serve must trigger exactly the same approved attack atlas as a normal hit.
const idleAtlas={id:'idle'},attackAtlas={id:'attack'};
window.ZZHeroAnimationsV55={ready:true,idle:idleAtlas,attack:attackAtlas};
start();check(heroAttackTime===0&&balls[0].held,'held starting pose stays idle');
drawImages.length=0;player();
check(drawImages.at(-1)[0]===idleAtlas,'idle bitmap is displayed before first serve');
serve();
check(!balls[0].held&&balls[0].vy<0,'first serve launches immediately with original physics');
check(heroAttackTime===HERO_ATTACK_DURATION&&swing>0,'first serve starts weapon attack animation');
drawImages.length=0;player();
check(drawImages.at(-1)[0]===attackAtlas,'first serve draws approved weapon attack sprite');
heroAttackTime=0;drawImages.length=0;player();
check(drawImages.at(-1)[0]===idleAtlas,'hero returns to bitmap idle');
start('endless');serve();
check(heroAttackTime===HERO_ATTACK_DURATION,'endless first serve also swings');

function actor(form,eliteKind){
 return {form,eliteKind,x:180,y:220,w:33,h:44,row:2,col:4,
  kind:0,hp:16,max:16,seed:1.3,flash:0,recoil:0,hitHold:0,burn:0};
}
function setup(form,eliteKind){
 const z=actor(form,eliteKind);
 dodgeGhosts.length=0;
 foes=[z];balls=[newBall(z.x+z.w/2,300,0,-400,false)];
 active={};clock=50;return z;
}
let original=Math.random;Math.random=()=>0;
let bottle=setup(0,2);
check(!!reactiveThreat(bottle,balls[0],8),'projected incoming path is recognized before impact');
const initial=bottle.x;
tryReactiveDodges(.016);
check(!!bottle.eliteMotion&&bottle.eliteMotion.tag==='evade','small bottle performs quick reactive dodge');
check(Math.abs(bottle.x-initial)>0,'dodge moves its real hitbox in the current frame');
check(dodgeGhosts.length>0,'dodge creates a bitmap echo');
const ghosts=dodgeGhosts.length;
bottle.dodgeReadyAt=clock-1;
tryReactiveDodges(.016);
check(dodgeGhosts.length===ghosts,'one incoming ball cannot retrigger dodge on the same target');
const before=bottle.x;
for(let i=0;i<8;i++){clock+=.016;moveElite(bottle,.016);
 check(insideZombieRoad(bottle,{x:bottle.x,y:bottle.y}),'bottle remains in playfield');
}
check(Math.abs(bottle.x-before)>25,'bottle visibly sidesteps the path of the incoming ball');
check(!reactiveThreat(bottle,balls[0],8),'ball no longer targets the dodged collision box');

// Paper packaging is the light normal-form object, not a new substitute atlas.
let box=setup(4,undefined),boxBefore=box.x;
tryReactiveDodges(.016);
check(box.eliteMotion?.tag==='evade','paper box receives the same light-object reactive dodge');
for(let i=0;i<9;i++){clock+=.016;moveElite(box,.016);}
check(Math.abs(box.x-boxBefore)>27,'paper box slides across a real free gap');
check(!Number.isNaN(box.eliteNextMove),'paper cooldown never becomes NaN');
check(dodgeGhosts.length>0,'paper produces a visible bitmap echo');

// A slow heavy elite should not react as frequently as the paper and bottle.
Math.random=()=>.5;
let heavy=setup(0,1);
tryReactiveDodges(.016);
check(!heavy.eliteMotion,'heavy 50L bag remains deliberate at the same mid-range random roll');
check(dodgeGhosts.length===0,'no fake dodge echo without actual movement');

// Blocked exits suppress dodge, rather than granting invulnerability or teleporting.
Math.random=()=>0;
let blocked=setup(0,2);
foes=[blocked,
 {x:blocked.x-36,y:blocked.y,w:33,h:44,boss:false},
 {x:blocked.x+36,y:blocked.y,w:33,h:44,boss:false}];
tryReactiveDodges(.016);
check(!blocked.eliteMotion&&blocked.x===180,'blocked bottle cannot cross adjacent zombies');
check(dodgeGhosts.length===0,'blocked attempt does not create a fake ghost');
check(foes.every(a=>foes.every(b=>a===b||!zombieBoxesOverlap(a,a,b,b,0))),'no collision box interpenetration');

// Existing overlap still hits (not a dodge or silent invulnerability).
let contact=setup(0,2);
balls[0].x=contact.x+contact.w/2;balls[0].y=contact.y+contact.h/2;
check(reactiveThreat(contact,balls[0],8)===null,'overlapping ball cannot trigger dodge');

// No sprite echo leftovers after a stage refill, and no stale ghosts after expiry.
bottle=setup(0,2);tryReactiveDodges(.016);
check(dodgeGhosts.length>0,'ghost spawned');
updateEnemyVisuals(.25);check(!dodgeGhosts.length,'ghost fades within 0.25 seconds');
tryReactiveDodges(.016);rack();check(!dodgeGhosts.length,'next wave clears all echoes');
Math.random=original;
console.log('PASS V150: first serve hero attack atlas in both modes; predictive paper/bottle dodge; ghost, cooldown, collision and overlap');
`,sandbox);
assert(source.includes('drawCrowd();drawDodgeGhosts();'),'draw ghosts behind approved sprites');
assert(source.includes("sfx('evade')"),'evade sound connected to actual movement');
console.log('PASS V150: text/static contract for approved bitmap rendering');
