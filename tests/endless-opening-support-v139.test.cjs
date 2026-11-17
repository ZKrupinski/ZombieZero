'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const noop=()=>{},els={},ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,onclick:noop,setAttribute:noop,addEventListener:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}resume(){}createBuffer(n,len,sr){return{getChannelData:()=>new Float32Array(len)}}createBufferSource(){return{connect:noop,start:noop,stop:noop}}createDelay(){return{delayTime:{value:0},connect:noop}}createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},window:{AudioContext:AudioMock,addEventListener:noop},localStorage:{getItem:()=>null,setItem:noop},Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);
const run=s=>vm.runInContext(s,sandbox);
run("start('endless')");
assert.equal(run('wave'),51);
assert.equal(run('combatStage()'),6,'first endless wave should be mid-early difficulty');
assert.equal(run('foes.length'),36,'opening uses all four rows');
assert.equal(run('new Set(foes.map(z=>z.form)).size'),8,'all eight approved enemy forms are present');
assert(run('Math.max(...foes.map(z=>z.max))')<=3,'packed opening keeps HP forgiving');
assert.equal(run('foes.some(z=>z.boss)'),false,'no first-wave boss');
const openingSpeed=run('marchBase()');
run("wave=52;rack()");
assert.equal(run('foes.some(z=>z.boss)'),false,'wave two remains boss-free');
run("wave=53;rack()");
assert.equal(run('foes.some(z=>z.boss)'),true,'first boss arrives on endless wave three');
assert(run('foes.find(z=>z.boss).hp')<=64,'first boss is not a stage 50 boss');
run("wave=70;rack()");
assert(run('combatStage()')>6,'endless difficulty rises over time');
run("start('campaign');wave=50;rack()");
assert(openingSpeed<run('marchBase()')*.65,'endless opening speed significantly below campaign 50');
assert.equal(run('combatStage()'),50,'campaign difficulty unchanged');
assert.equal(run('foes.some(z=>z.boss)'),false,'campaign boss rhythm unchanged');

// Before the emergency, all citizens are gone and all pickup slots are full.
// Old behavior could neither drop an item nor activate support, indefinitely.
run("start('endless');for(const p of citizens)p.alive=false;foes[0].y=DEFENSE_Y-foes[0].h-70;items=[{k:'shield',x:40,y:200},{k:'dual',x:140,y:200},{k:'fire',x:240,y:200}];updateEmergencySupport(2.1)");
assert.equal(run('endlessEmergencyUsed'),true,'danger activates automatic support');
assert.equal(run("has('bazooka')"),true,'support auto-equips without touching pickup');
assert.equal(run('citizens.filter(p=>p.alive).length'),1,'a civilian returns to operate the bazooka');
assert.equal(run('supportDropsThisWave'),1,'emergency is counted only once');
run('updateBazooka(.016)');
assert.equal(run('rockets.length'),1,'citizen fires even before the held ball is served');
run('updateEmergencySupport(3)');
assert.equal(run('supportDropsThisWave'),1,'no duplicate emergency');
run("start('endless');foes[0].y=DEFENSE_Y-foes[0].h-70;items=[{k:'bazooka',x:300,y:200}];supportDropsThisWave=1;updateEmergencySupport(2.1)");
assert.equal(run("has('bazooka')"),true,'pending uncollected support converts to automatic fire');
assert.equal(run("items.some(i=>i.k==='bazooka')"),false,'consumed pickup is removed');

// Ordinary campaign remains pickup-based and requires an active, served ball.
run("start('campaign');wave=5;rack();foes[0].y=DEFENSE_Y-foes[0].h-70;updateEmergencySupport(4)");
assert.equal(run("has('bazooka')"),false,'campaign held-ball support not auto-activated');
run("balls[0].held=false;updateEmergencySupport(3.1)");
assert.equal(run("items.some(i=>i.k==='bazooka')"),true,'campaign still drops support item');
assert.equal(run("has('bazooka')"),false,'campaign still requires pickup');
console.log('PASS v139: gentle endless wave 1, delayed first boss, staged difficulty, automatic emergency citizen rockets, and unchanged campaign support.');
