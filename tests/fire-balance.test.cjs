'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const noop=()=>{},elements={},drawCtx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return elements[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>drawCtx,
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
function check(c,m){if(!c)throw Error(m)}
start();serve();
check(FIRE_DROP_CHANCE===.025&&FIRE_DROP_COOLDOWN===30,'fire drop only 2.5% after item drop, 30s cooldown');
check(SKILLS.fire.duration===10,'fireball shorter than previous 14s');
check(FIRE_MAX_ACTIVE===5&&FIRE_SPREAD_DEPTH===1,'simultaneous and propagation depth capped');
check(FIRE_TICK_DAMAGE===.75&&FIRE_TICK_INTERVAL===1.05&&FIRE_DURATION===2.4,
 'fire damage reduced to around 1.5HP total over 2.4s');
function forceDrop(){
 const seq=[.1,.5,0,.25];
 Math.random=()=>seq.length?seq.shift():.5;
 drop({x:120,y:100,w:33,h:44,max:4,boss:false});
 return items[items.length-1]?.k;
}
items=[];clock=100;wave=10;rack();
check(forceDrop()==='fire','fire remains possible on the rare drop roll');
check(fireDropsThisWave===1&&lastFireDropAt===100,'first pickup exhausts wave quota');
items=[];check(forceDrop()!=='fire','second fire drop blocked within same wave');
for(let i=0;i<12;i++){items=[];check(forceDrop()!=='fire','wave quota blocks repeated attempts')}
clock+=2;wave=11;rack();items=[];
check(forceDrop()!=='fire','new wave still respects cross-wave cooldown');
clock+=31;wave=12;rack();items=[];
check(forceDrop()==='fire','fire can drop again after 30s in a new wave');
clock+=40;wave=13;rack();items=[];active.fire=10;
check(forceDrop()!=='fire','fire may not drop while fire effect is active');
active={};wave=14;rack();items=[{k:'fire'}];
check(forceDrop()!=='fire','fire cannot pile up while one pickup is on the road');
items=[];wave=15;rack();clock+=40;
check(forceDrop()==='fire','later stage still permits an occasional fire pickup');
items=[];clearSkills();
// Enemy circle in an empty lane: separate targets 47px apart, so only
// first-generation direct flames can reach one extra target.
function foe(x,y=100){
 return {x,y,w:33,h:44,hp:9,max:9,kind:0,form:0,seed:2,
  flash:0,burn:0,burnTick:0,spreadTick:0,row:1,col:Math.floor(x/45)};
}
Math.random=()=>.5;mode='playing';wave=10;foes=[foe(30),foe(77),foe(124),foe(171),foe(218),foe(265),foe(312)];
balls=[newBall(400,450,0,0,false)];clock=0;rack(); // reset stage but use custom chain geometry
foes=[foe(30),foe(77),foe(124),foe(171),foe(218),foe(265),foe(312)];
check(ignite(foes[0]),'direct ignition works');
const originalBurn=foes[0].burn;check(!ignite(foes[0])&&foes[0].burn===originalBurn,
 'repeated fire exposure does not refresh already burning targets');
for(let i=0;i<11;i++)update(.1);
check(foes[0].burn>0&&foes[1].burn>0,'single hop fire still propagates to adjacent target');
check(foes[1].burnDepth===1&&foes[2].burn===0,'second generation is forbidden');
for(let i=0;i<10;i++)update(.1);
check(foes[2].burn===0,'no spread beyond one hop even after multiple seconds');
check(foes[0].hp>=7.5&&foes[0].hp<9,'DOT is weaker but meaningful');
mode='playing';foes=[foe(30),foe(77),foe(124),foe(171),foe(218),foe(265),foe(312)];
let ignitions=foes.filter(z=>ignite(z));
check(ignitions.length===FIRE_MAX_ACTIVE,'global flame count hard-capped at five');
check(!ignite(foes[6]),'additional flames blocked even with a new source');
let before=foes.filter(z=>z.burn>0).length;
for(let i=0;i<12;i++)update(.1);
check(foes.filter(z=>z.burn>0).length<=FIRE_MAX_ACTIVE,'no spread bypasses active-fire cap');
check(before===5,'five burning zombies before tick');
// A red barrel may still explode vividly, but directly lights only
// the three nearest enemy collision boxes rather than an entire crowd.
const barrel={...foe(120,160),form:1,hp:1,max:1};
const victims=[foe(90,162),foe(145,162),foe(120,208),foe(80,200),foe(170,200),foe(220,220)];
foes=[barrel,...victims];barrelBlasts=[];items=[];mode='playing';
damage(barrel,1);
check(!foes.includes(barrel),'barrel death persists');
check(barrelBlasts.length===1,'red barrel explosion visuals retained');
check(foes.filter(z=>z.burn>0).length===FIRE_BARREL_TARGETS,
 'barrel detonation directly ignites only three nearby enemies');
check(foes.every(z=>z.burn<=0||z.burnDepth===0),'barrel flame source is root level');
console.log('PASS: rare one-per-wave fire pickup with 30s cooldown, 10s effect, weaker DOT, 5 concurrent burns and one-hop spread, three-target barrel ignition');
`,sandbox);
