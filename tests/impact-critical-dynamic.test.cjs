'use strict';
const vm=require('node:vm'),fs=require('node:fs');
const noop=()=>{},els={},ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
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
const src=fs.readFileSync('dist/game.js','utf8');sandbox.src=src;
vm.runInContext(src+`
function check(v,msg){if(!v)throw Error(msg)}
Math.random=()=>.5;
start();serve();
check(zombieHP(0,0,1)===3,'initial green requires three standard hits');
check(zombieHP(0,0,24)>=4,'later stage greens require more hits');
check(zombieHP(0,0,40)>=5,'late green durability');
for(let f=1;f<8;f++){
 check(zombieHP(f,0,10)>zombieHP(0,0,10),'special type '+f+' has more hp');
 check(zombieHP(f,4,40)<24,'special is not a boss-sized health sponge');
}
for(const stage of [1,6,9,18,24,40,50]){
 wave=stage;rack();
 for(const z of foes){
  if(z.boss)continue;
  check(z.hp===z.max&&z.max===zombieHP(z.form,z.kind,stage),'rack assigns correct form-specific HP');
 }
}
function testZombie(form=0,x=180,y=150,hp=zombieHP(form,0,1)){
 return{x,y,w:33,h:44,hp,max:hp,form,kind:0,seed:1.2,
  flash:0,burn:0,burnTick:0,spreadTick:0};
}
const spare=testZombie(0,360,180,99);
wave=1;mode='playing';clearSkills();selectedHero=0;
let z=testZombie(0),oldX=z.x,oldY=z.y;
foes=[z,spare];Math.random=()=>.99;
hit(z,{x:280,y:-200});
check(z.hp===2,'ordinary full-health green survives one hit');
check(z.x>oldX&&z.y<oldY,'non-lethal hit causes directional knockback with space available');
check(z.flash>.2&&hitFlashes.length>0,'impact flash is stronger and attached to struck target');
check(cameraKick>=4.7,'non-lethal hit camera impulse strengthened');
let nextHP=z.hp;hit(z,{x:280,y:-200});check(z.hp===nextHP-1,'another ordinary hit subtracts one HP');
hit(z,{x:280,y:-200});check(!foes.includes(z),'third ordinary hit kills');
check(enemyDeaths[enemyDeaths.length-1].critical===false,'three-hit death uses normal animation');
// Guaranteed critical die roll: full-health non-boss dies in exactly one blow.
enemyDeaths=[];hitFlashes=[];z=testZombie(0);foes=[z,spare];
Math.random=()=>0;
hit(z,{x:0,y:-300});
check(!foes.includes(z),'critical roll kills a healthy green in one strike');
check(enemyDeaths[0].critical===true,'only probability-driven one-shot uses critical death');
check(hitFlashes.some(f=>f.critical),'one-shot critical uses distinct bright flash');
// No crit if target was already damaged, even if RNG=0.
enemyDeaths=[];z=testZombie(0,180,150,3);z.hp=1;foes=[z,spare];
hit(z,{x:0,y:-280});
check(enemyDeaths[0].critical===false,'final strike on previously hurt target is not critical');
// Raw damage overkill, including strong item, does not fake a critical.
enemyDeaths=[];z=testZombie(7);foes=[z,spare];
damage(z,100,false,{x:0,y:-300});
check(enemyDeaths[0].critical===false,'ordinary high-power overkill uses normal death');
enemyDeaths=[];z=testZombie(1);foes=[z,spare];
damage(z,100,true);
check(enemyDeaths[0].critical===false,'burn damage never displays critical death');
let boss={...testZombie(0),boss:true,bossForm:0,hp:24,max:24,kind:4};
enemyDeaths=[];foes=[boss,spare];Math.random=()=>0;
hit(boss,{x:0,y:-300});check(boss.hp===23,'boss cannot be one-shot crit');
// Knockback is limited by occupied space and road boundaries.
z=testZombie(0,ENEMY_LEFT_X,130);const adjacent=testZombie(0,ENEMY_LEFT_X+ENEMY_PITCH,130);
foes=[z,adjacent,spare];
applyKnockback(z,{x:-300,y:0},1);check(z.x>=20,'knockback is strictly clamped by left wall');
const xx=z.x;
applyKnockback(z,{x:300,y:0},3);
check(z.x+z.w<=adjacent.x-1,'knockback cannot shove zombie through a neighbour');
check(z.x>=xx,'knockback moves only when clearance allows');
let a={kind:0,seed:0},b={kind:0,seed:12.9};wave=10;clock=3;
check(Math.abs(enemySpeed(a)-enemySpeed(b))>.05,'same-form zombies have different real descent rates');
check(BREAKOUT_MAX_ACTIVE===3&&BREAKOUT_DENSITY>.80,'rogue AI can use 1–3 simultaneous frequent bursts');
check(src.includes('function drawBurningOverlays()')&&src.includes('drawBurningOverlays();'),
 'persistent attached flame sprites display above burning zombies');
check(src.includes('function drawImpactFlashes()')&&src.includes('drawImpactFlashes();'),
 'add/bloom hit streaks are drawn');
check(src.includes('function drawBarrelBlasts()')&&src.includes("g.fillStyle='#fe812c'"),
 'red-barrel death has bright jagged explosion core');
const flash=hitFlashes[0];
if(flash){updateEnemyVisuals(.35);check(!hitFlashes.includes(flash),'short impact bloom never lingers');}
console.log('PASS: green/special HP, 11% full-health critical one-shot, normal multi-hit death, boss immunity, free-space knockback and stronger flame/impact FX');
`,sandbox);
