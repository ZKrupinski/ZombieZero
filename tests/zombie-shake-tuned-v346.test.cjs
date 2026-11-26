'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/game.js','utf8'),start=src.indexOf('const screenShake='),stop=src.indexOf('const feedbackDiagnostics=',start);
const make=()=>new Function('time',`let cameraKick=0,lastCameraFeedback=0;const performance={now:time};${src.slice(start,stop)};return {cameraFeedback,cameraOffset,screenShake}`);
let now=1000;const normal=make()(()=>now),zombie=make()(()=>now);
normal.cameraFeedback(1.4);zombie.cameraFeedback(1.4,true);
assert(Math.abs(zombie.screenShake.power/normal.screenShake.power-.82)<1e-9);
assert.equal(zombie.screenShake.until-now,48);assert.equal(normal.screenShake.until-now,60);
assert(Math.abs(normal.screenShake.power-(1.7+2.4*1.4)*.65)<1e-9);
for(now=1001;now<1048;now++){zombie.cameraFeedback(now%2?1.4:4.6,true);assert.equal(zombie.screenShake.started,1000);assert.equal(zombie.screenShake.until,1048);assert(zombie.screenShake.power<=5.2*.82)}
for(now=1048;now<1093;now++){zombie.cameraFeedback(5.2);assert.equal(zombie.cameraOffset(),null);assert.equal(zombie.screenShake.started,1000)}
now=1093;zombie.cameraFeedback(4.6,true);assert.equal(zombie.screenShake.until,1165);
now=1100;const first=zombie.cameraOffset(),second=zombie.cameraOffset();assert.deepEqual(first,second,'camera sampling does not depend on rendering FPS');
for(now=1101;now<1210;now++){zombie.cameraFeedback(5.2);assert.equal(zombie.screenShake.until,1165)}
now=1210;zombie.cameraFeedback(1.3);assert.equal(zombie.screenShake.until,1270);
assert(src.includes('cameraFeedback(cfg.s,COMBAT_FEEDBACK_KINDS.has(kind))'));
console.log('PASS V415: shorter/lighter camera, bounded strongest hit, forced recovery even during stacked hits, stable time-based sampling.');
