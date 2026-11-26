'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/game.js','utf8'),start=src.indexOf('const screenShake='),stop=src.indexOf('const feedbackDiagnostics=',start);
for(const strength of [.28,.4,.55,.9,1.4,2.15,2.9,4.6,5.2])for(const zombie of [false,true]){
 let now=1000;const h=new Function('time',`let cameraKick=0,lastCameraFeedback=0;const performance={now:time};${src.slice(start,stop)};return {cameraFeedback,cameraOffset,screenShake}`)(()=>now);
 h.cameraFeedback(strength,zombie);
 const old=(strength<.5?.45:Math.min(5.2,(1.7+2.4*strength)*.65))*(zombie?.82:1);
 const life=(strength>=4?90:strength>=2?75:60)*(zombie?.8:1);
 assert(Math.abs(h.screenShake.power-old*1.15)<1e-9);
 assert.equal(h.screenShake.until,1000+life);
 now+=life;assert.equal(h.cameraOffset(),null);
 h.cameraFeedback(strength,zombie);assert.equal(h.screenShake.started,1000);
 now+=45;h.cameraFeedback(strength,zombie);assert.equal(h.screenShake.started,now);
}
console.log('PASS V417: all camera impulses +15% amplitude; timing and recovery unchanged.');
