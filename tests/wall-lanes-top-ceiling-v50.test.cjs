'use strict';
// v50: shared collision walls for 18 illustrated stage grounds, nine enemy lanes,
// reflective ball/zombie motion, and the first-spawn upper limit for knockback.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(!src.includes("'TAP TO SERVE'")&&!src.includes("textContent='TAP TO SERVE'"),'no bottom serve label');
assert(html.includes('game.js?v=73-obvious-elastic-ball'),'game script cache invalidated');
assert(sw.includes('zombie-zero-shell-v75-approved-bi'),'PWA cache invalidated');
const noop=()=>{},els={};
const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,addEventListener:noop,setAttribute:noop,
 getContext:()=>ctx,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop},navigator:{},localStorage:{getItem:()=>0,setItem:noop},
 Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(src+`
function check(ok,msg){if(!ok)throw Error(msg)}
check(ROAD_LEFT===36&&ROAD_RIGHT===414,'common bitmap road wall coordinates');
check(ENEMY_TOP_Y===70,'top bound is the first spawned enemy row');
check(ENEMY_COLUMNS===9&&ENEMY_LEFT_X===45&&ENEMY_PITCH===40.875,'dense nine-lane formation narrowed without removing enemies');
start();hud();
check($('status').textContent==='','no TAP TO SERVE before initial service');
check($('hud-heart-count').textContent==='×3','remaining life count unchanged');
check(citizens.length===18&&citizens.every(p=>p.x-10>=ROAD_LEFT&&p.x+10<=ROAD_RIGHT),
 'all original citizen save hitboxes remain reachable within the new corridor');
for(const n of [1,2,3,7,20,50]){
 wave=n;rack();
 const normal=foes.filter(z=>!z.boss);
 check(normal.every(z=>z.x>=zombieMinX()&&z.x<=zombieMaxX(z)),'stage '+n+' starts inside side walls');
 check(normal.every(z=>z.y>=ENEMY_TOP_Y),'stage '+n+' remains below first-spawn line');
}
wave=1;rack();mode='playing';
const sideTest=(x,vx,power=false)=>{
 active={};if(power)active.power=10;
 balls=[newBall(x,315,vx,0,false)];
 update(.02);
 const b=balls[0],radius=power?16:8;
 check(b.x>=ROAD_LEFT+radius&&b.x<=ROAD_RIGHT-radius,'ball never overlaps painted side wall');
 check(Math.sign(b.vx)===-Math.sign(vx),'ball rebounds from side wall');
};
sideTest(45,-350);
sideTest(405,350);
sideTest(53,-350,true);
sideTest(397,350,true);
active={};
const single=(x,y,row=0)=>({x,y,row,col:0,w:33,h:44,hp:10,max:10,kind:0,form:0,flash:0,burn:0,burnTick:0,spreadTick:0,seed:0});
let z=single(45,220);foes=[z];
check(applyKnockback(z,{x:-300,y:0},1)&&z.x>45,'left wall reflects knocked zombie back inward');
check(insideZombieRoad(z,z),'reflected zombie stays in the usable corridor');
z=single(372,220);foes=[z];
check(applyKnockback(z,{x:300,y:0},1)&&z.x<372,'right wall reflects knocked zombie back inward');
check(insideZombieRoad(z,z),'reflected right-side zombie is inside wall');
z=single(185,80);foes=[z];
check(applyKnockback(z,{x:0,y:-420},1),'small safe upward knock remains available');
check(z.y>=ENEMY_TOP_Y,'upward hit is capped to the first spawn line');
z=single(185,ENEMY_TOP_Y);foes=[z];
check(!applyKnockback(z,{x:0,y:-420},1),'enemies at spawn ceiling cannot be knocked above it');
check(z.y===ENEMY_TOP_Y,'upper cap is stable under repeat hits');
wave=20;rack();for(const enemy of foes)enemy.y+=240;
check(triggerLastStand(),'last-stand retreat still activates');
check(foes.every(e=>e.y>=ENEMY_TOP_Y-1e-5),'last stand never floats above first spawn line');
check(foes.every(e=>e.x>=zombieMinX()&&e.x<=zombieMaxX(e)),'last stand preserves horizontal wall clearance');
check(Math.max(...foes.map(e=>e.y+e.h))<DEFENSE_Y-100,'emergency resistance still creates time to recover');
wave=20;rack();check(triggerLastStand()===false,'last stand still only activates once per run');
start();wave=20;rack();
check(triggerLastStand(),'fresh last stand works at initial horde altitude');
check(foes.every(e=>e.y>=ENEMY_TOP_Y-1e-5),'near-spawn last stand respects 70px ceiling');
for(let i=0;i<8;i++)march(.016);
check(foes.every(e=>e.x>=zombieMinX()-1e-5&&e.x<=zombieMaxX(e)+1e-5),'regular movement stays clear of both walls');
`,sandbox);
console.log('PASS: no serve text, 9-column alignment, both ball radii rebound, two wall-rebound zombies, ceiling-bound knockback and last stand.');
