'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const noop=()=>{},elements={},renderCtx=new Proxy({},{get:(t,k)=>t[k]??noop,set:(t,k,v)=>(t[k]=v,true)});
function el(id){return elements[id]??={textContent:'',innerHTML:'',style:{},hidden:false,onclick:noop,setAttribute:noop,addEventListener:noop,getContext:()=>renderCtx,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}resume(){}createBuffer(n,l,s){return{getChannelData:()=>new Float32Array(l)}}createBufferSource(){return{connect:noop,start:noop,stop:noop}}createDelay(){return{delayTime:{value:0},connect:noop}}createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}}
const window={AudioContext:AudioMock,addEventListener:noop,shadowOps:[],spriteOps:[]};
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},window,localStorage:{getItem:()=>null,setItem:noop},Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/fortress-mode.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);
const run=code=>vm.runInContext(code,sandbox);
run("drawHardGroundShadow=function(...args){window.shadowOps.push(args)};zombie=function(z){window.spriteOps.push(z)}");
function assertCampaignStage(stage,bossExpected){
 window.shadowOps.length=0;window.spriteOps.length=0;
 const actors=run('foes.length');
 assert(actors>0,'stage '+stage+' creates a formation');
 assert.equal(run("foes.some(z=>Number.isFinite(z.arrivalTime))"),false,'campaign never staggers sprites');
 assert.equal(run('foes.some(z=>z.boss)'),bossExpected,'campaign boss rhythm unchanged');
 run('drawWorldGroundShadows()');
 assert.equal(window.shadowOps.length,actors,'exactly one cast shadow per living zombie');
 assert(window.shadowOps.every(args=>Math.abs(args[5]-(args[3]===15?.34:.31))<1e-8),'all living cast shadows are visible at normal opacity');
 run('for(const z of foes)drawStruckZombie(z)');
 assert.equal(window.spriteOps.length,actors,'all matching zombie sprites appear in the same render');
 assert(window.spriteOps.every(z=>z&&Number.isFinite(z.x)&&Number.isFinite(z.y)));
}
run("start('campaign')");
assert.equal(run('wave'),1);
assertCampaignStage(1,false);
run("mode='clearing';advanceStage()");
assert.equal(run('wave'),2);
assert.equal(run('mode'),'playing');
assertCampaignStage(2,false);
run("mode='clearing';advanceStage()");
assert.equal(run('wave'),3);
assertCampaignStage(3,true);
for(const mode of ['campaign','mini','fortress','endless']){
 run("start("+JSON.stringify(mode)+")");
 run("particles.push({t:.5});fx.push({t:0,life:1});enemyDeaths.push({t:0});hitFlashes.push({t:0});ballContactFX.push({t:0});cameraKick=4");
 if(mode==='endless')run("mode='endlessShift';endlessShiftSpawned=true;refillEndlessWave()");
 else run("mode='clearing';advanceStage()");
 assert.equal(run('particles.length+fx.length+enemyDeaths.length+hitFlashes.length+ballContactFX.length+cameraKick'),0,mode+' starts with a clean arena');
}
run("start('endless');mode='endlessShift';endlessShiftSpawned=true;refillEndlessWave()");
assert.equal(run("foes.some(z=>Number.isFinite(z.arrivalTime))"),true,'endless alone uses delayed fade');
window.shadowOps.length=0;
run('drawWorldGroundShadows()');
assert.equal(window.shadowOps.length,0,'endless preappearance shadows remain absent');
console.log('PASS: campaign stage 1/2 and boss 3 show sprites and ground shadows together; endless arrival fade remains synchronized.');
