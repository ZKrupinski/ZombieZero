'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const game=fs.readFileSync('dist/game.js','utf8');
const loader=fs.readFileSync('dist/assets/ip/v2/elite-zombies-v145.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
assert(game.includes('THROWABLE_SIZE_SCALE=1.824'),'approved enlarged throwable size');
assert(game.includes('TRASH_SHOT_CAP=2'),'shared in-flight projectile cap');
assert(html.includes('elite-zombies-v145.js?v=161-elite-spit')&&html.includes('v160-larger-elite-throws'));
assert(sw.includes('v160-larger-elite-throws'));
const atlas={window:{},Image:class{},Math};vm.createContext(atlas);vm.runInContext(loader,atlas);
const art=atlas.window.ZZEliteSprites,calls=[],gfx={save(){},restore(){},drawImage(...a){calls.push(a)}};
for(let k=0;k<3;k++){art.cache[k].ready=true;art.cache[k].image={naturalWidth:1344,naturalHeight:1176}}
let z={eliteKind:0,boss:false,x:120,y:150,w:33,h:44,seed:0,moveDir:0,throwWindup:.5,flash:0,hitHold:0,recoil:0};
art.draw(gfx,z,0);assert.equal(calls.at(-1)[2],4*168,'black bag attack animation on throw');
z.eliteKind=1;art.draw(gfx,z,0);assert.equal(calls.at(-1)[2],4*168,'50L bag attack animation');
z.eliteKind=2;art.draw(gfx,z,0);assert.notEqual(calls.at(-1)[2],4*168,'bottle remains nonthrowing');
const noop=()=>{},els={},sizes=[];
const cv=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
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
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop,
 ZZEliteSprites:{cache:[{ready:true},{ready:true},{ready:true}],requestForStage:noop,available:()=>false,draw:()=>false,drawDeath:()=>false},
 ZZLargeBossSprites:{cache:[{loading:false},{loading:false}],requestByForm:noop,readyByForm:()=>false,draw:()=>false,available:()=>false},
 ZZThrowablesV159:{request:noop,draw:(g,k,x,y,size)=>(sizes.push(size),true)}},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console,sizes};
vm.createContext(sandbox);
vm.runInContext(game+`
 {
 function check(b,msg){if(!b)throw Error(msg)}
 start();serve();
 let black={...foes[0],eliteKind:0,boss:false,x:120,y:180,w:33,h:44,seed:0,hitHold:0,recoil:0,moveDir:0,throwAt:0};
 let white={...foes[1],eliteKind:1,boss:false,x:220,y:180,w:33,h:44,seed:0,hitHold:0,recoil:0,moveDir:0,throwAt:0};
 let bottle={...foes[2],eliteKind:2,boss:false,x:320,y:180,w:33,h:44,seed:0,hitHold:0,recoil:0,moveDir:0,throwAt:0};
 foes=[black,white,bottle];clock=40;eliteTrashSharedReadyAt=0;
 updateBossTrashShots(.016);
 check(black.throwWindup===.58,'black throw starts with telegraph');
 check(!white.throwWindup,'no simultaneous elite volley');
 check(!bottle.throwWindup,'bottle elite cannot throw');
 black.throwTarget=citizens[0]; // Keep the vintage impact test clear of the moving hero's catch box.
 const target=black.throwTarget,kind=black.throwKind;
 check(target?.alive&&kind>=0&&kind<36,'approved sprite and living target');
 check(moveElite(black,.016),'windup prevents elite movement');
 drawBossTrashShots();check(sizes.at(-1)>24,'larger held trash');
 updateBossTrashShots(.58);
 check(bossTrashShots.length===1,'black throw after windup');
 check(bossTrashShots[0].kind===kind,'held item matches flying item');
 check(target.alive,'no instant citizen death');
 drawBossTrashShots();check(sizes.at(-1)>22,'larger flying item');
 updateBossTrashShots(3);
 check(!target.alive&&bossTrashShots.length===0,'impact kills citizen then clears shot');
 clock=70;eliteTrashSharedReadyAt=0;black.throwAt=clock+100;
 white.throwAt=0;updateBossTrashShots(.016);
 check(white.throwWindup===.8,'white bag longer windup');
 const victim=white.throwTarget;
 active={shield:5};updateBossTrashShots(.8);
 check(bossTrashShots.length===1,'white bag launches trash');
 updateBossTrashShots(3);check(victim.alive,'shield blocks trash');
 check(bossTrashShots.length===0,'shield clears shot');
 rack();check(!bossTrashShots.length,'wave clears trash');
 console.log('PASS v160 trash-scale, elite animations, thrown attacks, pacing, citizen damage and shield');
 }
 `,sandbox);
