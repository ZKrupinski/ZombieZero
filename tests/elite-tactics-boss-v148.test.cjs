'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const game=fs.readFileSync('dist/game.js','utf8');
const eliteSource=fs.readFileSync('dist/assets/ip/v2/elite-zombies-v145.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(!game.includes('requestedBossForm%2'),'never replace a new boss with an old one while the image loads');
assert(game.includes('function nextBossArtLoading('),'boss transition waits for its requested bitmap');
assert(game.includes('requestBossForWave(wave+1)'),'prefetch exactly the next stage boss');
assert(game.includes('function moveElite(z,dt)'),'dedicated elite mobility exists');
assert(game.includes('eliteCorridorFree(z,dx,dy)'),'every dash/backstep has a swept collision corridor');
assert(html.includes('v148-elite-tactics-roster'),'new runtime not served from an obsolete script cache');
assert(sw.includes('v148-elite-tactics-roster'),'PWA receives matching fresh assets');
const noop=()=>{},els={};
const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
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
const calls=[];
const bossSprites={cache:[{loading:true},{loading:true}],readyByForm:()=>false,
 requestByForm:n=>calls.push(n),draw:()=>false,drawDeath:()=>false,available:()=>false};
const eliteSprites={cache:[{ready:true},{ready:true},{ready:true}],requestForStage:noop,
 draw:()=>false,drawDeath:()=>false,available:()=>false};
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop,ZZLargeBossSprites:bossSprites,
 ZZEliteSprites:eliteSprites},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(game+`
function check(ok,msg){if(!ok)throw Error(msg)}
start();serve();
wave=8;rack();check(calls.includes(2),'stage 8 queues the actual stage 9 water-jug boss before transition');
check(nextBossArtLoading(9),'transition sees the missing large-boss bitmap');
wave=9;rack();let boss=foes.find(z=>z.boss);
check(boss&&boss.bossForm===2,'campaign stage 9 always spawns water-jug boss, not a substituted big zombie');
check(boss.hp===39,'stage 9 boss HP eased to 39, original was 60');
const elite=foes.filter(z=>Number.isInteger(z.eliteKind));
check(elite.length===3,'high-level roster retains three elite units');
check(elite.every(z=>z.hp>=10&&z.hp<=29),'elite HP meaningfully raised, remains below boss');
wave=11;rack();check(calls.includes(3),'stage 11 queues the actual stage 12 large-trash boss');
wave=12;rack();boss=foes.find(z=>z.boss);
check(boss.bossForm===3&&boss.hp===43,'campaign stage 12 selects large-trash boss with reduced HP');
check(!isBossWave()===false,'stage 12 is a boss wave');
start('endless');serve();
for(const [w,form] of [[53,0],[56,1],[59,2],[62,3],[65,0]]){
 wave=w;rack();
 check(foes.find(z=>z.boss)?.bossForm===form,'endless rotation at internal wave '+w+' is boss '+form);
}
function solo(kind){
 const z={x:180,y:225,w:33,h:44,seed:2.2,row:2,col:3,hp:20,max:20,
   kind:0,form:0,eliteKind:kind,flash:0,recoil:0,hitHold:0,burn:0};
 foes=[z];balls=[{x:195,y:255,vy:-300,held:false}];
 clock+=5;z.eliteNextMove=clock-.01;return z;
}
function advanceSolo(z,count=100){
 const path=[];
 for(let i=0;i<count;i++){
  clock+=.016;moveElite(z,.016);
  path.push([z.x,z.y]);
  check(insideZombieRoad(z,{x:z.x,y:z.y}),'elite stays inside the painted road');
  check(Number.isFinite(z.x)&&Number.isFinite(z.y),'finite elite position');
 }
 return path;
}
let z=solo(0),p=advanceSolo(z);
check(p.some(q=>Math.abs(q[0]-180)>25&&q[1]>230),'black bag makes a fast diagonal gap dash');
check(!z.eliteMotion,'black bag settles before another cooldown');
z=solo(1);p=advanceSolo(z);
check(Math.min(...p.map(q=>q[1]))<210,'white 50L bag retreats at least 15px');
check(p.some(q=>q[1]>230),'white bag counter-charges after its backstep');
z=solo(2);p=advanceSolo(z);
check(Math.max(...p.map(q=>Math.abs(q[0]-180)))>30,'bottle makes an evasive lateral hop');
check(Math.min(...p.map(q=>q[1]))<218,'bottle dodge also steps backward');
check(p.some(q=>q[0]!==p[20][0]&&Math.abs(q[0]-180)<33),'bottle doubles back in zigzag');
z=solo(0);
const wallA={x:180-ENEMY_PITCH,y:225,w:33,h:44,boss:false};
const wallB={x:180+ENEMY_PITCH,y:225,w:33,h:44,boss:false};
foes=[z,wallA,wallB];
p=advanceSolo(z,80);
check(p.every(q=>Math.abs(q[0]-180)<1),'blocked elite never dashes through neighbors');
check(foes.every(a=>foes.every(b=>a===b||!zombieBoxesOverlap(a,a,b,b,0))),'blocked units never overlap');
z=solo(0);moveElite(z,.016);check(!!z.eliteMotion,'dash begins');
enemyReaction(z,1,{x:1,y:0},true);
check(!z.eliteMotion&&z.eliteNextMove>clock,'taking damage cancels dash and starts cooldown');
console.log('PASS v148: all four boss orders, prefetch, narrowed HP gap, 3 distinct elite move paths, collision, interruption');
`,sandbox);
const imageCalls=[],dummyImage={naturalWidth:1344,naturalHeight:1176};
class FakeImage{
 constructor(){this.naturalWidth=1344;this.naturalHeight=1176}
 set src(x){this.path=x}
}
const world={window:{},Image:FakeImage,Math};
vm.createContext(world);vm.runInContext(eliteSource,world);
const loader=world.window.ZZEliteSprites;
loader.cache[0].ready=true;loader.cache[0].image=dummyImage;
const canvas={save(){},restore(){},drawImage(...a){imageCalls.push(a)}};
const zombie={eliteKind:0,x:180,y:220,w:33,h:44,seed:0,moveDir:1,flash:0,
 eliteMotion:{t:-.1,tag:'dash'},hitHold:0,recoil:0,boss:false};
assert.equal(loader.draw(canvas,zombie,0),true);
assert.equal(imageCalls.at(-1)[2],4*(1176/7),'attack row telegraphs a new elite dash');
console.log('PASS v148: approved sprite attack row, no substitute art');
