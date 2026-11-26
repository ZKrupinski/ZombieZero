'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/game.js','utf8'),start=src.indexOf('const screenShake='),stop=src.indexOf('const feedbackDiagnostics=',start);
let now=1000;
const h=new Function('time',`let cameraKick=0,lastCameraFeedback=0;const performance={now:time};${src.slice(start,stop)};return {cameraFeedback,cameraOffset,screenShake}`)(()=>now);
h.cameraFeedback(1.4,true);
assert.equal(h.screenShake.until,1048);
now=1010;h.cameraFeedback(4.6,true,true);
assert.equal(h.screenShake.power,6.56);assert.equal(h.screenShake.until,1094);assert.equal(h.screenShake.started,1010);
for(now=1011;now<1139;now++){
 h.cameraFeedback(4.6,true,true);h.cameraFeedback(5.2,false);h.cameraFeedback(4.6,true);
 assert.equal(h.screenShake.started,1010);assert.equal(h.screenShake.until,1094);
 if(now>=1094)assert.equal(h.cameraOffset(),null);
}
now=1139;h.cameraFeedback(1.4,true);assert.equal(h.screenShake.until,1187);
now=1190;h.cameraFeedback(4.6,true,true);assert.equal(h.screenShake.until,1274);
now=1320;h.cameraFeedback(4.6,true);assert.equal(h.screenShake.until,1392);assert.equal(h.screenShake.power,5.2*.82);
assert(src.includes('criticalLabel=true;\n   criticalPopups.push('));
assert(src.includes("if(kind==='critical'&&criticalLabel)cameraFeedback(cfg.s,true,true)"));
assert(src.includes("'powerHit':'hit'),criticalLabel);"));
console.log('PASS V416: displayed critical label restores 6.56px amplitude, 84ms duration, normal hits unchanged, no stacking.');
