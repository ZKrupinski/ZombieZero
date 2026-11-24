'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/game.js','utf8'),start=src.indexOf('const screenShake='),stop=src.indexOf('const feedbackDiagnostics=',start);
const make=()=>new Function('time',`let cameraKick=0,lastCameraFeedback=0;const performance={now:time};${src.slice(start,stop)};return {cameraFeedback,cameraOffset,screenShake}`);
let now=1000;const normal=make()(()=>now),zombie=make()(()=>now);
normal.cameraFeedback(1.4);zombie.cameraFeedback(1.4,true);
assert(Math.abs(zombie.screenShake.power/normal.screenShake.power-.82)<1e-9);
assert.equal(zombie.screenShake.until-now,80);assert.equal(normal.screenShake.until-now,100);
for(now=1010;now<=1100;now+=10){zombie.cameraFeedback(1.4,true);assert.equal(zombie.screenShake.started,1000)}
now=1085;assert.equal(zombie.cameraOffset(),null);
now=1110;zombie.cameraFeedback(1.4,true);assert.equal(zombie.screenShake.started,1110);
now=1120;zombie.cameraFeedback(4.6,true);assert.equal(zombie.screenShake.started,1120);
assert.equal(zombie.screenShake.until,1240);
now=1300;zombie.cameraFeedback(1.3);assert.equal(zombie.screenShake.until,1400);
assert(src.includes('cameraFeedback(cfg.s,COMBAT_FEEDBACK_KINDS.has(kind))'));
console.log('PASS: zombie shake -18% amplitude, -20% duration, chain recovery, stronger hits, unchanged player camera');
