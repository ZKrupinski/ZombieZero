'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const game=fs.readFileSync('dist/game.js','utf8');
const loader=fs.readFileSync('dist/assets/ip/v2/elite-zombies-v145.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
assert(game.includes('function shotTouchesHero('));
assert(game.includes('function updatePoisonStatus('));
assert(game.includes('function projectilePressure('));
assert(game.includes('function drawNeonSpit('));
assert(html.includes('v161-neon-spit-poison')&&/elite-zombies-v145\.js\?v=(161-elite-spit|253-original-50l-sharp-alpha)/.test(html));
assert(sw.includes('v161-neon-spit-poison'));
assert(loader.includes('z.spitWindup>0)row=CLIPS.attack'));
const noop=()=>{},els={};
const cv=new Proxy({}, {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
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
const sprite={cache:[{ready:true},{ready:true},{ready:true}],requestForStage:noop,
 available:()=>false,draw:()=>false,drawDeath:()=>false};
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop,ZZEliteSprites:sprite,
 ZZLargeBossSprites:{cache:[{loading:false},{loading:false}],requestByForm:noop,
  readyByForm:()=>false,draw:()=>false,available:()=>false},
 ZZThrowablesV159:{request:noop,draw:()=>true}},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(game+`
{
 const check=(ok,message)=>{if(!ok)throw Error(message)};
 start();serve();
 check(projectilePressure()===0&&projectileFlightCap()===2,'campaign easy opening');
 wave=50;check(projectilePressure()===1&&projectileFlightCap()===5,'campaign late-stage pressure');
 start('endless');serve();
 check(projectilePressure()<.1&&projectileFlightCap()===2,'endless starts gently');
 wave=100;check(projectilePressure()===1&&projectileFlightCap()===5,'endless late waves grow dense');
 wave=59;rack();const boss=foes.find(z=>z.boss);
 check(boss,'endless boss setup');
 const elites=foes.filter(z=>Number.isInteger(z.eliteKind));
 check(elites.length===3&&elites.every(spitThrower),'every elite eligible to spit');
 for(const z of foes){z.throwAt=1e9;z.spitAt=1e9;}
 boss.spitAt=0;clock=40;spitSharedNextAt=0;
 updateBossTrashShots(.016);
 check(boss.spitWindup>.4,'boss advertises green spit windup');
 const spitVictim=boss.spitTarget;
 updateBossTrashShots(.6);
 check(bossTrashShots.length===1&&bossTrashShots[0].type==='spit','boss fires actual spit projectile');
 check(spitVictim.alive,'citizen not killed at firing time');
 bossTrashShots.length=0;
 const p=citizens[9],make=type=>({type,sx:car,sy:PY-100,tx:car,ty:PY+100,
  citizen:p,t:.4,duration:1,arc:0,kind:0});
 for(const type of ['trash','spit']){bossTrashShots.push(make(type));updateBossTrashShots(.1)}
 check(!bossTrashShots.length&&p.alive,'hero physically blocks both kinds before citizen');
 check(poison===POISON_TRASH+POISON_SPIT,'different poison weights');
 bossTrashShots.push(make('spit'));updateBossTrashShots(.1);
 bossTrashShots.push(make('spit'));updateBossTrashShots(.1);
 check(groggyTime>1&&poison===100,'repeated blocks trigger groggy and fill gauge');
 target=315;keys.ArrowRight=true;update(.016);
 check(car===225&&target===225,'groggy freezes hero in place');
 updatePoisonStatus(2);check(groggyTime===0&&poison<100,'hero recovers, poison settles');
 active={shield:5};const prior=poison;
 bossTrashShots.push(make('spit'));updateBossTrashShots(.1);
 check(poison===prior&&p.alive,'shielded block does not poison hero');
 active={};bossTrashShots.push({...make('spit'),sx:50,tx:50,citizen:citizens[0],t:.95});
 updateBossTrashShots(.1);check(!citizens[0].alive,'unblocked green spit hits citizen');
 rack();check(poison===0&&groggyTime===0&&!bossTrashShots.length,'next wave clears poison, groggy and projectiles');
 console.log('PASS V161: elite/boss spit, escalating mode pressure, swept hero intercept, poison-groggy, shield and citizen impact');
}
`,sandbox);
