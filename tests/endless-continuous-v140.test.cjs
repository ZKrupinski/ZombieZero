'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const noop=()=>{},els={},saved={};
const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,onclick:noop,setAttribute:noop,addEventListener:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}resume(){}createBuffer(n,len,sr){return{getChannelData:()=>new Float32Array(len)}}createBufferSource(){return{connect:noop,start:noop,stop:noop}}createDelay(){return{delayTime:{value:0},connect:noop}}createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},window:{AudioContext:AudioMock,addEventListener:noop},localStorage:{getItem:k=>saved[k]||null,setItem:(k,v)=>{saved[k]=v}},Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);
const r=expr=>vm.runInContext(expr,sandbox);
const game=fs.readFileSync('dist/game.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');
r("start('endless')");
assert.equal(r('wave'),51);
assert.equal(r('foes.length'),36,'endless begins with a complete 4x9 formation');
assert.equal(r('new Set(foes.map(z=>z.form)).size'),8,'all canonical zombie types appear in the packed cast');
assert.equal(r('Math.max(...foes.map(z=>z.max))'),3,'opening enemies stay easy to defeat despite large numbers');
assert(!r('foes.some(z=>z.boss)'),'boss appears later');
const artBefore=r('stageArtIndex');
r("active.fire=7;foes=foes.slice(0,5);update(.016)");
assert.equal(r('mode'),'playing','replenishment must not enter clear-state');
assert.equal(r('wave'),52,'next endless wave advances automatically');
assert.notEqual(r('stageArtIndex'),artBefore,'scene background changes with replenishment');
assert(r('foes.length')>=30,'new zombies fill the empty slots');
assert(r('foes.filter(z=>Number.isFinite(z.arrivalTime)).length')>=20,'replenishments have a staggered fade-in');
assert(r('active.fire')>0,'existing powerup is preserved');
assert.equal(r('balls.length'),1,'existing ball is preserved');
assert.equal(r('endlessSurvival'),0,'survival countdown does not run before serve');
r("foes=[];update(.016)");
assert.equal(r('mode'),'playing','empty board must not display stage-result');
assert.equal(r('wave'),53);
assert(r('foes.some(z=>z.boss)'),'third endless group includes a boss');
assert(!game.includes("if(runMode==='endless'){beginClear()"),'endless never uses campaign clear modal');
const bossWave=r('wave');
r("foes=foes.filter(z=>z.boss);update(.016)");
assert.equal(r('wave'),bossWave,'remaining boss blocks fresh reinforcements');

// The emergency assist is reserved for the final approach AFTER the solo
// boss returns from its single retreat and survives near the defense line.
r("foes[0].mercyUsed=true;foes[0].mercyDescending=true;foes[0].y=DEFENSE_Y-foes[0].h-20;updateEmergencySupport(9)");
assert.equal(r("has('bazooka')"),false,'no rescue while boss is returning');
r("delete foes[0].mercyDescending;foes[0].y=DEFENSE_Y-foes[0].h-46;updateEmergencySupport(9)");
assert.equal(r("has('bazooka')"),false,'no rescue too far from the defense line');
r("foes[0].y=DEFENSE_Y-foes[0].h-34;updateEmergencySupport(3.4)");
assert.equal(r("has('bazooka')"),false,'boss must linger in danger for 3.5s');
r('updateEmergencySupport(.2)');
assert.equal(r("has('bazooka')"),true,'critical boss approach finally triggers citizen rockets');
assert.equal(r('endlessEmergencyUsed'),true);
r("updateBazooka(.016)");
assert.equal(r('rockets.length'),1,'the citizen launches the bazooka');

// Survival begins with serve, excludes pauses, and is retained on the result
// screen (the only results screen for endless is the final GAME OVER).
r("start('endless');update(1.2)");
assert.equal(r('endlessSurvival'),0,'waiting to serve cannot farm survival time');
r('serve();update(.5)');
const elapsed=r('endlessSurvival');
assert(elapsed>.4,'serving starts survival timer');
r('pause();update(10)');
assert.equal(r('endlessSurvival'),elapsed,'pause freezes survival');
r('pause();update(.5)');
assert(r('endlessSurvival')>elapsed,'timer resumes with the game');
r("endlessSurvival=83.2;hud();end('TEST OVER')");
assert.equal(r('mode'),'over');
assert.equal(el('result-stage-label').textContent,'생존 시간');
assert.equal(el('result-stage').textContent,'01:23');
assert(el('result-cleared').textContent.includes('최장 01:23'));
assert.equal(saved['zz-endless-best-seconds'],'83.2','personal survival best persists');
assert.equal(el('endless').textContent,'메인 메뉴');
r("start('endless')");
assert.equal(r('endlessSurvival'),0,'new run starts a fresh clock');
r("start('campaign')");
assert.equal(r('combatStage()'),1,'campaign stage and difficulty remain intact');
assert.equal(r('foes.length'),18,'campaign opening remains two rows');
assert(html.includes('id="result-stage-label"'),'results header is dynamic');
console.log('PASS v140: 8 enemy kinds/36 bodies, scene fade/refill without clear state, intact balls/skills, post-return 3.5s rescue, survival HUD/result/best/pause and unchanged campaign.');
