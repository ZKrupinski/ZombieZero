'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../dist/game.js'),'utf8');
const start=source.indexOf('const FEEDBACK_PRESETS={');
const stop=source.indexOf('// A direct user-tap test',start);
assert(start>=0&&stop>start,'Cannot find actual shipped feedback dispatcher');
const dispatcher=source.slice(start,stop);
let now=1000;
const patterns=[];
const make=new Function('env',`
 let lastCameraFeedback=0,cameraKick=0,lastBuzz=0,buzzLockedUntil=0,buzzPriority=0;
 const performance={now:()=>env.now()},navigator={vibrate:p=>env.vibrate(p)};
 const document={hidden:false,querySelector:()=>null},vibrationTestStatus=null,window={};
 ${dispatcher}
 return {feedback,stats:feedbackDiagnostics,presets:FEEDBACK_PRESETS};
`);
const h=make({now:()=>now,vibrate:pattern=>{patterns.push(pattern);return true}});
for(const [name,time] of [
 ['car',1000],['hit',1010],['wall',1030],['hit',1180],
 ['critical',1260],['racket',1300],['bossHit',1800],['kill',2250]
]){now=time;h.feedback(name)}
assert.deepEqual(patterns,[45,105,105,[180,48,210],145,[115,36,105]],
 'Zombie hit must override car noise; critical must survive wall/paddle events');
assert.equal(h.stats.hits,5);
assert.equal(h.stats.hitAccepted,5);
assert.equal(h.stats.hitBlocked,0);
assert(h.presets.hit.v>=95,'A regular hit must be palpable on most Android motors');
assert(source.includes("else feedback(critical?'critical'"),'Actual zombie damage path is missing haptics');
console.log('PASS: zombie hit, kill, critical and boss vibrations survive collision arbitration');
