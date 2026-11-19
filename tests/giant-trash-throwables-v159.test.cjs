'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const game=fs.readFileSync('dist/game.js','utf8');
const loader=fs.readFileSync('dist/assets/ip/v2/throwables-v159.js','utf8');
const bossLoader=fs.readFileSync('dist/assets/ip/v2/large-bosses-v146.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
const path='dist/assets/ip/v2/throwables-36-v159.png';
const png=fs.readFileSync(path);
assert.equal(crypto.createHash('sha256').update(png).digest('hex'),
 '703d45a500d2fa00e589e4d1be87477a8d06e38d44fca235d744aeccc61bac5a',
 'actual approved 36 projectile source must be used intact, no re-creation/downscaling');
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16),1536);assert.equal(png.readUInt32BE(20),1024);
assert.equal(png[25],6,'PNG retains RGBA alpha, not baked checkerboard');
assert(html.includes('throwables-v159.js?v=159-approved-36-sprites'));
assert(html.indexOf('throwables-v159.js')<html.indexOf('game.js?v=93-'));
assert(sw.includes('./assets/ip/v2/throwables-v159.js'));
assert(!sw.includes("'./assets/ip/v2/throwables-36-v159.png'"),
 '1.6MB sprite sheet stays on-demand to avoid startup stalls');
assert(bossLoader.includes("rightFile:'large_trash-right-v147.webp',height:154"));
const drawCalls=[];
class FakeImage{
 constructor(){this.naturalWidth=1536;this.naturalHeight=1024}
 set src(v){this._src=v;this.onload?.()}
 get src(){return this._src}
 decode(){return Promise.resolve()}
}
const imageContext={window:{},Image:FakeImage,Math,Promise};
vm.createContext(imageContext);vm.runInContext(loader,imageContext);
const art=imageContext.window.ZZThrowablesV159;art.request();
(async()=>{
 await Promise.resolve();await Promise.resolve();
 assert(art.ready,'sprite loader asynchronously decodes the approved PNG');
 const ctx={save(){},restore(){},translate(){},rotate(){},
   drawImage(...args){drawCalls.push(args)}};
 for(const slot of [0,5,6,17,35])assert(art.draw(ctx,slot,100,100,38,0));
 assert.equal(drawCalls.length,5);
 assert.equal(drawCalls[0][1],0);
 assert.equal(drawCalls[0][2],0);
 assert.equal(drawCalls[1][1],5*256);
 assert.equal(drawCalls[2][2],1024/6);
 assert.equal(drawCalls[4][1],5*256);
 assert.equal(drawCalls[4][2],5*(1024/6));
 assert.equal(drawCalls[4][3],256);
 assert.equal(drawCalls[4][4],1024/6);
 assert(Math.abs(drawCalls[4][8]-38/1.5)<.001,'original sprite proportions are preserved');
 const noop=()=>{},els={},rendered=[];
 const cv=new Proxy({drawImage(...x){rendered.push(x)}},
  {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
 const el=id=>els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
  addEventListener:noop,setAttribute:noop,getContext:()=>cv,
  getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop};
 class AudioMock{
  constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
  resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
  createBufferSource(){return{connect:noop,start:noop,stop:noop}}
  createDelay(){return{delayTime:{value:0},connect:noop}}
  createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}
  createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
  createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
 }
 const spriteCalls=[],throwable={request(){spriteCalls.push(['load'])},
  draw(ctx,kind,x,y,size,rot){spriteCalls.push(['draw',kind,x,y,size,rot]);return true}};
 const mockBoss={cache:[{loading:false},{loading:false}],requestByForm:noop,
  readyByForm:()=>false,draw:()=>false,available:()=>false};
 const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
  window:{AudioContext:AudioMock,addEventListener:noop,
   ZZLargeBossSprites:mockBoss,ZZThrowablesV159:throwable},
  localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
  requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,
  Math:Object.create(Math),console};
 vm.createContext(sandbox);
 vm.runInContext(game+`
 function check(b,msg){if(!b)throw Error(msg)}
 start();serve();wave=12;rack();let boss=foes.find(z=>z.boss);
 check(boss&&boss.bossForm===3,'stage 12 shows large-trash boss');
 check(boss.hp===155&&boss.max===155,'boss HP is 3.6x normal and saved correctly');
 check(boss.w===112&&boss.h===124,'large rectangular physical hitbox avoids easy misses');
 check(enemySpeed(boss)<marchBase()*.56,'boss is a slow large target, not a dodger');
 foes=[boss];clock=75;boss.throwAt=clock-.1;
 updateBossTrashShots(.016);
 check(boss.throwWindup===.75,'telegraphed windup begins before launch');
 check(bossTrashShots.length===0,'no instant citizen kill while telegraphing');
 const victim=boss.throwTarget;check(!!victim&&victim.alive,'target is a living civilian');
 const heldKind=boss.throwKind;
 check(heldKind>=0&&heldKind<36,'boss uses a real approved sprite kind');
 drawBossTrashShots();
 updateBossTrashShots(.75);
 check(bossTrashShots.length===1,'boss launches one real projectile');
 check(bossTrashShots[0].kind===heldKind,'windup-held visual matches thrown sprite');
 check(victim.alive,'victim survives until impact, not telegraph or midpoint');
 updateBossTrashShots(.4);check(victim.alive,'projectile still in flight');
 drawBossTrashShots();
 updateBossTrashShots(1.2);
 check(bossTrashShots.length===0,'projectile removed after hit');
 check(!victim.alive&&victim.dying===.8,'impact actually kills the target');
 check(bubbles.some(b=>b.citizen===victim),'same citizen hit dialog is used');
 updateCrowd(.2);
 check(victim.dying<.8,'original victim death animation advances after boss kill');
 resetCitizens();check(citizens.every(p=>p.alive),'new game restores all citizens');
 // The shield protects a citizen if it is active on projectile arrival.
 active={shield:5};boss.throwTarget=citizens[1];boss.throwKind=32;boss.throwWindup=.01;
 boss.throwAt=clock+100;
 updateBossTrashShots(.03);check(bossTrashShots.length===1,'shield test projectile launched');
 updateBossTrashShots(2);
 check(citizens[1].alive,'shield blocks an incoming trash shot');
 active={};boss.throwWindup=0;boss.throwAt=clock+100;
 // Citizen and giant boss share a shuffled, non-repeating selection of all 36.
 throwableBag.length=0;
 const samples=Array.from({length:36},()=>nextThrowableKind());
 check(new Set(samples).size===36&&Math.min(...samples)===0&&Math.max(...samples)===35,
  'every approved item is visited once per shuffle cycle');
 junk=[];crowdTimer=-1;
 updateCrowd(.016);
 check(junk.length===1&&junk[0].kind>=0&&junk[0].kind<36,'ordinary citizen throws new item atlas');
 drawJunk();
 check(bossTrashShots.length===0,'no lingering boss shots after shield impact');
 start('endless');serve();wave=62;rack();boss=foes.find(z=>z.boss);
 check(boss?.bossForm===3&&boss.hp>155,'endless boss retains tank durability and rotation');
 check(bossTrashShots.length===0,'endless wave resets all old throws');
 console.log('PASS V159: giant slow/HP trash boss, telegraph/projectile/citizen sacrifice, shield, 36 nonrepeating sprite throws, campaign/endless');
 `,sandbox);
 assert(spriteCalls.some(x=>x[0]==='load'),'approved PNG loading requested at game start');
 assert(spriteCalls.some(x=>x[0]==='draw'),'same approved bitmap rendered for projectiles');
 console.log('PASS V159: exact original PNG alpha, six-by-six atlas frames, correct proportions and lazy preload');
})().catch(err=>{console.error(err);process.exitCode=1});