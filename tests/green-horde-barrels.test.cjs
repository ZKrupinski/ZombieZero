'use strict';
const vm=require('node:vm'),fs=require('node:fs');
const noop=()=>{},elements={},ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return elements[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
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
const src=fs.readFileSync('dist/game.js','utf8');
vm.runInContext(src+`
function check(v,msg){if(!v)throw Error(msg)}
function composition(stage){
 wave=stage;rack();
 const ordinary=foes.filter(z=>!z.boss),count=form=>ordinary.filter(z=>z.form===form).length;
 const slotCount=ordinary.length,nonGreen=ordinary.filter(z=>z.form!==0).length;
 check(ordinary.length>0,'ordinary formation present');
 check(nonGreen<=Math.floor(slotCount*.42),'never overpopulate rare types');
 check(count(0)>slotCount/2,'green is the majority at stage '+stage);
 check(count(1)<=2,'at most two red barrels at stage '+stage);
 for(const z of ordinary)check(ZOMBIE_FORMS[z.form].unlock<=stage,'no locked enemy at stage '+stage);
 if(stage%3===0)check(foes.filter(z=>z.boss).length===1,'boss retained at '+stage);
 return {green:count(0),barrel:count(1),yellow:count(7),red:count(3),black:count(6),
   blackBarrel:count(2),card:count(4),wood:count(5),total:ordinary.length};
}
start();serve();
Math.random=()=>.42;
let a=composition(1);check(a.green===a.total&&a.yellow===0,'stage 1 entirely green');
a=composition(3);check(a.green===a.total,'early boss wave remains green');
a=composition(4);check(a.yellow===1&&a.red===0&&a.black===0,'yellow introduced first');
a=composition(6);check(a.barrel===1&&a.yellow===1,'rare red barrel enters as a new tactical piece');
a=composition(8);check(a.yellow===2&&a.barrel===1,'yellow gradually grows to two');
a=composition(9);check(a.red===1&&a.black===0,'red brain introduced second');
a=composition(15);check(a.yellow===3&&a.red===1,'yellow reaches three without overwhelming green');
a=composition(16);check(a.red===2&&a.black===1,'black brain introduced third');
a=composition(18);check(a.barrel===2,'barrel stays limited to two');
a=composition(24);check(a.card===1,'packaging type remains a single cameo');
a=composition(28);check(a.wood===1,'wooden crate remains a single cameo');
a=composition(32);check(a.blackBarrel===1,'black barrel remains a single cameo');
a=composition(35);check(a.yellow===3&&a.red===3&&a.black===3,'late-stage colored cast only 2–3 each');
a=composition(50);check(a.barrel===2&&a.green>a.total*.58,'50th stage retains densely green formation');
a=composition(51);check([2,3].includes(a.yellow)&&[2,3].includes(a.red)&&[2,3].includes(a.black),'endless boss stage keeps only 2–3 each on reduced normal slots');
for(const stage of [1,4,6,9,16,24,35,50,80]){
 let previous=null;
 for(const roll of [.01,.23,.5,.79,.99]){
  Math.random=()=>roll;
  const n=composition(stage);
  const roster=[n.green,n.barrel,n.yellow,n.red,n.black,n.blackBarrel,n.card,n.wood].join('/');
  check(previous===null||previous===roster,'roster quota not dependent on RNG at '+stage);
  previous=roster;
 }
}
// A lethal barrel hit ignites nearby colliders, emits a blast and removes the
// barrel once. No direct AoE hit-point loss; DOT and chain reactions do damage.
Math.random=()=>.5;
wave=20;rack();mode='playing';barrelBlasts=[];fx=[];particles=[];
const barrel={x:120,y:140,w:33,h:44,hp:1,max:1,kind:0,form:1,flash:0,burn:0,burnTick:0,spreadTick:0};
const near={x:170,y:142,w:33,h:44,hp:5,max:5,kind:4,form:0,flash:0,burn:0,burnTick:0,spreadTick:0};
const far={x:315,y:260,w:33,h:44,hp:5,max:5,kind:4,form:0,flash:0,burn:0,burnTick:0,spreadTick:0};
foes=[barrel,near,far];
damage(barrel,1);
check(!foes.includes(barrel),'barrel dies once');
check(near.burn>0&&far.burn===0,'barrel explosion ignites only nearby zombies');
check(near.hp===5&&far.hp===5,'blast spreads fire instead of unrequested instant AoE damage');
check(barrelBlasts.length===1&&fx.length>0&&particles.length>0,'vivid explosion and sound cue queued');
check(barrelBlasts[0].life>0&&barrelBlasts[0].t===0,'blast animation starts at death');
const blast=barrelBlasts[0];
updateEnemyVisuals(.25);check(blast.t>.2,'live explosion animated');
updateEnemyVisuals(.3);check(!barrelBlasts.includes(blast),'explosion visuals are temporary');
balls=[newBall(225,430,0,-320,false)];
near.y=140;near.burnTick=0;clock=breakoutNextCheck-1;
update(.78);check(near.hp<5,'existing flame DOT continues to damage nearby zombie');
// A barrel killed by fire still explodes; the blast can ignite a secondary.
const b2={...barrel,x:170,y:180,hp:1,burn:3,burnTick:0,spreadTick:0};
const secondary={...near,x:230,y:180,hp:5,burn:0,burnTick:0,spreadTick:0};
foes=[b2,secondary,far];barrelBlasts=[];
damage(b2,1,true);
check(secondary.burn>0&&barrelBlasts.length===1,'barrel killed by fire detonates as well');
// A normal or black barrel kill must not trigger red barrel explosion.
const nonRed={...barrel,x:130,y:140,form:2,hp:1};
foes=[nonRed,far];barrelBlasts=[];
damage(nonRed,1);check(barrelBlasts.length===0,'other zombie types do not detonate');
// Paused gameplay freezes ongoing explosion timers.
barrelBlasts=[{x:100,y:90,t:0,life:.46}];mode='paused';
update(.33);check(barrelBlasts[0].t===0,'pause holds barrel explosion animation');
console.log('PASS: green-majority stage progression, yellow -> red -> black 1/2/3, rare barrels, all 50 waves, DOT ignition and finite death blast');
`,sandbox);
