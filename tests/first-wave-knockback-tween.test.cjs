'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const noop=()=>{},els={},ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,addEventListener:noop,setAttribute:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop},localStorage:{getItem:()=>0,setItem:noop},
 Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,
 Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`
function check(v,msg){if(!v)throw Error(msg)}
const near=(a,b)=>Math.abs(a-b)<1e-6;
const foe=(x,y=140)=>({x,y,w:33,h:44,hp:9,max:9,kind:0,form:0,flash:0,
 seed:1.25,burn:0,burnTick:0,spreadTick:0,row:1,col:0});
start();serve();
check(foes.length===18,'stage 1 is two rows of nine, rather than 27 zombies');
check(foes.every(z=>z.max===2),'opening zombies need two ordinary hits');
check(!supportAvailable()&&supportChance()===0,'no stage-one bazooka spam');
wave=2;rack();
check(foes.length===27&&foes.every(z=>z.max===2),'stage 2 gradually increases crowd');
check(!supportAvailable(),'second stage also has no random supply');
wave=3;rack();clock=100;lastSupportAt=0;
check(foes.some(z=>!z.boss&&z.max===3),'full durability starts at stage 3');
check(supportAvailable(),'later waves may receive tactical emergency support');
wave=4;rack();mode='playing';clock=100;lastSupportAt=0;
foes=[foe(100,435)];balls=[newBall(220,400,0,-350,false)];
updateEmergencySupport(3.1);
check(items.some(i=>i.k==='bazooka'),'later critical danger receives one support');
check(supportDropsThisWave===1,'first successful automatic support consumes wave quota');
items=[];clock+=100;
check(!supportAvailable(),'same-stage support cannot reappear after long cooldown');
wave=5;rack();check(supportDropsThisWave===0,'new stage resets support quota');
foes=[foe(100),foe(146),foe(193)];items=[];mode='playing';
const a=foes[0],b=foes[1],thirdZombie=foes[2],old=a.x;
damage(a,1,false,{x:300,y:0});
check(a.x>old+30&&b.x>146&&thirdZombie.x>193,'actual 3-zombie force chain still resolves safely');
check(near(knockVisualPosition(a).x,old),'first rendered frame starts at old position, not final position');
updateEnemyVisuals(.08);
const middle=knockVisualPosition(a).x;
check(middle>old+2&&middle<a.x-0.1,'after five frames zombie has actually moved, but not teleported');
updateEnemyVisuals(.12);
check(near(knockVisualPosition(a).x,a.x),'sprite reaches collider in .20 seconds');
updateEnemyVisuals(.13);
check(near(knockVisualPosition(a).x,a.x),'no late visual snap after trail ends');
// A second hit during tween continues from the already rendered point.
foes=[foe(100),foe(146),foe(193)];
damage(foes[0],1,false,{x:300,y:0});
updateEnemyVisuals(.07);
const rendered=knockVisualPosition(foes[0]).x;
damage(foes[0],1,false,{x:300,y:0});
check(near(knockVisualPosition(foes[0]).x,rendered),'repeated hits restart smoothly without discontinuity');
console.log('PASS: two-row tutorial, HP ramp, stage-capped bazooka and tweened/interruptible collision-chain displacement');
`,sandbox);
