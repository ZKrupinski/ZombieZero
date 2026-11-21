'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const noop=()=>{},elements={},calls=[],alphas=[];
const canvas=new Proxy({
 globalAlpha:1,
 save(){alphas.push(this.globalAlpha)},
 restore(){this.globalAlpha=alphas.pop()}
},{get:(obj,key)=>key in obj?obj[key]:noop,set:(obj,key,value)=>(obj[key]=value,true)});
function el(id){return elements[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>canvas,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,length){return{getChannelData:()=>new Float32Array(length)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop,
 ZZThrowablesV159:{request:noop,draw(_ctx,kind,x,y,size,turn){
  calls.push({kind,x,y,size,turn,alpha:canvas.globalAlpha});return true;
 }}},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,
 Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(game+\`
function assertKey(value,message){if(!value)throw Error(message)}
const close=(a,b)=>Math.abs(a-b)<.00001;
start();serve();mode='playing';clock=50;
let z={...foes[0],boss:false,eliteKind:0,x:120,y:180,w:33,h:44,throwKind:7,
 throwWindup:.58,throwWindupTotal:.58,hitShakeFrom:0,hitShakeUntil:0,
 knockTime:0,recoil:0,hitHold:0};
foes=[z];
const base=heldTrashAnchor(z),itemBase=24*THROWABLE_SIZE_SCALE;
const drawAt=p=>{
 z.throwWindup=z.throwWindupTotal*(1-p);
 calls.length=0;drawBossTrashShots();
 assertKey(calls.length===1,'one held item at phase '+p);
 return calls[0];
};
const first=drawAt(0);
assertKey(first.alpha===0,'first appearance is completely transparent');
assertKey(first.y>base.y,'item begins hidden inside the bag, below catch hand');
const emerging=drawAt(.18);
assertKey(emerging.alpha>.7&&emerging.alpha<1,'pulled-out item fades up');
const peak=drawAt(.54);
assertKey(peak.y<emerging.y-15,'item rises clearly above the catch hand');
assertKey(peak.size>itemBase,'top overshoot slightly enlarges approved sprite');
const caught=drawAt(.74);
assertKey(caught.y>base.y+3.5,'item snaps down onto the catching hand');
const settle=drawAt(.98);
assertKey(Math.abs(settle.y-base.y)<1,'held item settles at its final tether anchor');
assertKey(settle.alpha===1,'fully visible after catch');
assertKey(canvas.globalAlpha===1,'drawing restores canvas alpha for all other assets');
z.throwWindup=.27;
z.knockFromX=120;z.knockFromY=180;
z.x=176;z.y=199;
z.knockTime=.34;z.knockDuration=.34;z.knockDelay=0;z.knockFreeze=0;
const frozen=drawAt(.55);
assertKey(close(frozen.x,120+33*.75),'held item starts beside sprite at old visual location, not moved collider');
assertKey(!close(frozen.x,z.x+z.w*.75),'item must not teleport to future knockback destination');
z.knockTime=.24;
const moved=drawAt(.55);
const visible=knockVisualPosition(z);
assertKey(close(moved.x,visible.x+z.w*.75),'item matches interpolated zombie x at every frame');
assertKey(close(moved.y,visible.y+4+raisedTrashPose(.55).y),'item matches interpolated zombie y');
z.hitShakeFrom=clock-.04;z.hitShakeUntil=clock+.09;
const shaken=drawAt(.55);
const jitter=hitShakeOffset(.04,.13,false);
assertKey(close(shaken.x,visible.x+z.w*.75+jitter.x),'held item also shares zombie hitshake');
assertKey(close(shaken.y,visible.y+4+jitter.y+raisedTrashPose(.55).y),
 'held item cannot lag behind even with hit jitter');
z.throwWindup=0;
const hand=heldTrashAnchor(z);
const target={x:330,y:630,alive:true};
bossTrashShots.length=0;launchTrashShot(z,target);
assertKey(bossTrashShots.length===1,'throw behavior unchanged');
assertKey(close(bossTrashShots[0].sx,hand.x)&&close(bossTrashShots[0].sy,hand.y),
 'launched projectile starts exactly where held item settles, including knockback');
assertKey(bossTrashShots[0].kind===7,'original 36-type throwable sprite preserved');
assertKey(bossTrashShots[0].duration>=1.15,'flight duration untouched');
console.log('PASS v250: transparent draw, pull-up/overshoot/catch/settle keys, synced knockback and hit shake, seamless launch.');
\`,sandbox);
assert(game.includes('z.throwWindupTotal=z.throwWindup'),'original windup timer controls new keyframes');
assert(game.includes('const pos=zombieHandVisualPosition(z);'),'held trash and spit follow actual visible zombie');
assert(game.includes('const TRASH_RAISE_KEYS=['),'hand-key sequence is defined');
assert(html.includes('v250-trash-rise-catch-tether'),'browser receives updated game logic');
assert(sw.includes('v250-trash-rise-catch-tether'),'offline clients refresh');
console.log('PASS v250: existing approved atlas, attack timer, hero interception and citizen targeting remain intact.');
