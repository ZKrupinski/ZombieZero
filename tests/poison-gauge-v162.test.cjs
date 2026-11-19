'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8'),html=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('v162-small-fading-gauge')&&sw.includes('v162-small-fading-gauge'),'browser and offline cache refresh');
assert(game.includes('drawCarGroundShadow();player();drawPoisonGauge();'),'small meter is drawn over hero body, never behind artwork');
const isolate=(a,b)=>{const start=game.indexOf(a),end=game.indexOf(b,start+a.length);assert(start>=0&&end>start);return game.slice(start,end)};
const gauge=isolate('function drawPoisonGauge(){','function drawGroggyFeedback(){');
const updater=isolate('function updatePoisonStatus(dt){','function shotTouchesHero(');
const calls=[],g={
 globalAlpha:1,save(){this.previousAlpha=this.globalAlpha},restore(){this.globalAlpha=this.previousAlpha},
 fillRect(x,y,w,h){calls.push({x,y,w,h,fill:this.fillStyle,alpha:this.globalAlpha})}
};
const state={g,Math,mode:'playing',clock:0,PY:584,car:225,selectedHero:0,poison:0,POISON_MAX:100,
 POISON_DECAY:5.5,poisonGrace:0,groggyTime:0,poisonFlash:0,poisonGaugeAlpha:0};
vm.createContext(state);vm.runInContext(updater+gauge,state);
const run=(s)=>vm.runInContext(s,state);
run('drawPoisonGauge()');assert.equal(calls.length,0,'clean hero has no visible meter or backdrop');
run('poison=55;updatePoisonStatus(.10);drawPoisonGauge()');
assert(state.poisonGaugeAlpha>.7&&state.poisonGaugeAlpha<1,'damage fades in the meter');
assert(calls.length>3,'poison draws backing and rising fill');
const back=calls.find(x=>x.fill==='rgba(8,28,18,0.42)');
assert(back&&back.w===10&&back.h===22,'backplate dimensions roughly half old 13x43');
assert.equal(back.x,255,'Ace gauge sits just right of ear');
assert.equal(back.y,540,'ear-side gauge is raised above the vehicle');
calls.length=0;run('selectedHero=1;drawPoisonGauge()');
assert.equal(calls.find(x=>x.fill==='rgba(8,28,18,0.42)').x,255,'Ruby gauge stays by right ear');
calls.length=0;run('selectedHero=2;drawPoisonGauge()');
assert.equal(calls.find(x=>x.fill==='rgba(8,28,18,0.42)').x,185,'Ria gauge sits by left ear');
assert.equal(calls.find(x=>x.fill==='rgba(8,28,18,0.42)').y,540,'Ria gauge uses the same raised ear height');
assert(back.alpha>0&&back.alpha<1,'base and entire gauge are translucent while fading');
const fill=calls.find(x=>x.fill==='#88ff32');assert(fill&&fill.h>0&&fill.h<20,'bottom-up green fill retained');
calls.length=0;run('poison=0;updatePoisonStatus(.10);drawPoisonGauge()');
assert(state.poisonGaugeAlpha<.5&&calls.length>0,'poison removal fades out rather than abrupt pop');
calls.length=0;run('updatePoisonStatus(.5);drawPoisonGauge()');
assert.equal(state.poisonGaugeAlpha,0,'no permanent empty plate');assert.equal(calls.length,0,'zero poison draws nothing');
run('poison=100;groggyTime=1.2;updatePoisonStatus(.016);drawPoisonGauge()');
assert(calls.some(x=>x.fill==='#d3ff46'),'groggy stays conspicuously highlighted');
const old=state.poisonGaugeAlpha;run('mode="menu";drawPoisonGauge()');assert.equal(state.poisonGaugeAlpha,old,'menu never mutates gauge opacity');
console.log('PASS v163: half-size ear-adjacent gauge, Ria left/Ace and Ruby right, translucent backing, zero poison hidden, fade in/out, groggy');
