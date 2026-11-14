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
check(FIRE_DROP_CHANCE===.20&&FIRE_DROP_COOLDOWN===24,'fire visible but not continuous');
check(FIRE_DROP_STAGE_GAP===2&&FIRE_PITY_STAGES===3,'fire arrives by third eligible stage');
check(LOOT_DROP_CHANCE===.19&&LOOT_MAX_VISIBLE===2&&LOOT_MAX_STAGE===3,
 'fewer simultaneous/total items');
check(SKILLS.fire.duration===10,'fireball still shorter than previous 14s');
check(FIRE_MAX_ACTIVE===5&&FIRE_SPREAD_DEPTH===1,'simultaneous and propagation depth capped');
check(FIRE_TICK_DAMAGE===.75&&FIRE_TICK_INTERVAL===1.05&&FIRE_DURATION===2.4,
 'fire damage remains weaker');
const corpse={x:120,y:100,w:33,h:44,max:4,boss:false};
Math.random=()=>0;items=[];clock=100;wave=3;rack();
drop(corpse);
check(items.length===1&&items[0].k==='fire','fire guaranteed after no fire in first three stages');
check(fireDropsThisWave===1&&lastFireDropWave===3&&lastFireDropAt===100,'fire wave and time recorded');
items=[];drop(corpse);
check(items.every(i=>i.k!=='fire'),'second fire blocked in same wave');
clock+=3;wave=4;rack();items=[];drop(corpse);
check(items.every(i=>i.k!=='fire'),'next immediate wave must not spam fire');
clock+=25;wave=5;rack();items=[];drop(corpse);
check(items.some(i=>i.k==='fire'),'fire can reappear with a low roll after two stages and time cooldown');
items=[];clock+=31;wave=6;rack();drop(corpse);
check(items.every(i=>i.k!=='fire'),'one intervening wave is insufficient');
clock+=31;wave=8;rack();items=[];drop(corpse);
check(items.some(i=>i.k==='fire'),'another three-stage dry streak guarantees fire');
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
console.log('PASS: 3-wave fire pity with 2-stage/24s separation, 2 visible pickups, 4-stage item cap, weaker DOT and bounded one-hop spread');
`,sandbox);
