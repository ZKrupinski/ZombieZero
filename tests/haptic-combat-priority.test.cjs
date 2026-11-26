'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../dist/game.js'),'utf8');
const start=source.indexOf('const FEEDBACK_PRESETS={');
const stop=source.indexOf('// Game options: persisted device vibration toggle',start);
assert(start>=0&&stop>start,'Cannot find actual shipped feedback dispatcher');
const dispatcher=source.slice(start,stop);
let now=1000;
const patterns=[];
const make=new Function('env',`
 let lastCameraFeedback=0,cameraKick=0,lastBuzz=0,buzzLockedUntil=0,buzzPriority=0,hapticsEnabled=true;
 const performance={now:()=>env.now()},navigator={vibrate:p=>env.vibrate(p)};
 const document={hidden:false,querySelector:()=>null},vibrationTestStatus=null,window={};
 ${dispatcher}
 return {feedback,stats:feedbackDiagnostics,presets:FEEDBACK_PRESETS};
`);
const h=make({now:()=>now,vibrate:pattern=>{patterns.push(pattern);return true}});
for(const [name,time] of [
 ['wall',1000],['hit',1010],['wall',1030],['hit',1180],
 ['critical',1260],['item',1300],['bossHit',1800],['kill',2250]
]){now=time;h.feedback(name)}
assert.deepEqual(patterns,[28,105,105,[180,48,210],145,[115,36,105]],
 'Zombie hit must override wall noise; critical must survive item events');
assert.equal(h.stats.hits,5);
assert.equal(h.stats.hitAccepted,5);
assert.equal(h.stats.hitBlocked,0);
assert(h.presets.hit.v>=95,'A regular hit must be palpable on most Android motors');
assert(source.includes("else feedback(critical?'critical'"),'Actual zombie damage path is missing haptics');
console.log('PASS: zombie hit, kill, critical and boss vibrations survive collision arbitration');


// Sustained camera impulse regression: normal zombie impact must be visible
// across several rendered frames, even if FX visuals are disabled.
const begin=source.indexOf('const screenShake=');
const finish=source.indexOf('const feedbackDiagnostics=',begin);
assert(begin>=0&&finish>begin,'Sustained camera impulse not found');
let clockMs=1000;
const cameraHarness=new Function('time',`
 let cameraKick=0,lastCameraFeedback=0;
 const performance={now:()=>time()};
 ${source.slice(begin,finish)}
 return {cameraFeedback,cameraOffset};
`)(()=>clockMs);
cameraHarness.cameraFeedback(1.4);
let visible=0;
for(const t of [1000,1016,1032,1048,1064,1080]){
 clockMs=t;
 const p=cameraHarness.cameraOffset();
 if(p&&Math.hypot(p.x,p.y)>1.2)visible++;
}
assert(visible>=2,'Normal zombie hits must visibly shake the screen for multiple frames');
clockMs=1200;
cameraHarness.cameraFeedback(4.6);
const q=cameraHarness.cameraOffset();
assert(q&&Math.hypot(q.x,q.y)>2.5,'Critical impact must exceed normal contact shake');
console.log('PASS: sustained camera shake independent of graphics FX');
