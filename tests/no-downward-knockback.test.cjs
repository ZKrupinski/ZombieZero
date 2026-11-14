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
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,
 Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`
function check(value,msg){if(!value)throw Error(msg)}
const enemy=(x,y=200,row=1)=>({x,y,w:33,h:44,hp:20,max:20,kind:0,form:0,
 seed:1.1,flash:0,burn:0,burnTick:0,spreadTick:0,row,col:Math.floor(x/46)});
const approx=(a,b)=>Math.abs(a-b)<1e-6;
start();serve();mode='playing';clock=10;
// Pure downward shots should damage and animate but never propel enemies
// closer to the defense line.
let a=enemy(120);foes=[a];const originalY=a.y;
check(!applyKnockback(a,{x:0,y:400},1),'pure downward impulse cannot shove');
check(approx(a.y,originalY),'pure downward contact leaves collider Y intact');
damage(a,1,false,{x:0,y:420});
check(a.hp===19&&approx(a.y,originalY),'downward shot still damages and flashes without advancing zombie');
check(!planKnockPush(a,0,10,new Map()),'low-level chain planner refuses positive Y');
check(approx(a.y,originalY),'rejected chain planner does not mutate collider');
// Diagonally downward impacts keep the horizontal force and zero vertical.
a=enemy(120);foes=[a];const firstY=a.y;
check(applyKnockback(a,{x:170,y:300},1),'down-right pushes sideways');
check(a.x>150&&approx(a.y,firstY),'down-right cannot push toward the defense line');
a=enemy(200);foes=[a];const secondY=a.y;
check(applyKnockback(a,{x:-150,y:300},1),'down-left pushes sideways');
check(a.x<170&&approx(a.y,secondY),'down-left cannot push toward the defense line');
// Up and horizontal are NOT weakened: their original near-40px strength stays.
a=enemy(120);foes=[a];check(applyKnockback(a,{x:0,y:-400},1),'upward knockback works');
check(a.y<=161,'vertical upward force retains its previous reach');
let chainSecond=enemy(146),chainThird=enemy(193);a=enemy(100);foes=[a,chainSecond,chainThird];
check(applyKnockback(a,{x:300,y:0},1),'horizontal multi-enemy chain remains active');
check(a.x>130&&chainSecond.x>146&&chainThird.x>193,'same horizontal force propagates to chain');
check([a,chainSecond,chainThird].every(z=>approx(z.y,200)),'horizontal chain does not alter any Y');
// An overlap repair must not shove an enemy down by a full knockback amount.
a=enemy(160,225,1);chainSecond=enemy(160,257,2);foes=[a,chainSecond];
const beforeA=a.y,beforeB=chainSecond.y;clock+=.1;
march(.016);
check(a.y<=beforeA+1&&chainSecond.y<=beforeB+1,
 'overlap repair cannot produce sudden Y+ snap; natural march <=1 px remains');
check(!zombieBoxesOverlap(a,a,chainSecond,chainSecond,0),'overlap solver still separates collisions');
// Integration: an actual downward-moving ball hit must reflect but NOT
// move the impacted enemy 40-50px toward the defensive line.
a=enemy(120,225);chainSecond=enemy(340,120);foes=[a,chainSecond];
balls=[newBall(136,209,0,430,false)];mode='playing';
const realY=a.y,oldHP=a.hp;
update(.033);
check(a.hp<oldHP,'top-down shot hits enemy in the real ball update loop');
check(a.y-realY<1,'real hit does not move enemy downward 50 px');
check(balls[0].vy<0,'regular ball still reflects off enemy after hit');
console.log('PASS: zero downward knockback on pure/diagonal/back-of-head hits, preserved 39px upward/sideways force, safe chain and real ball collision');
`,sandbox);
