'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/game.js','utf8'),start=src.indexOf('const FEEDBACK_PRESETS='),stop=src.indexOf('// Game options: persisted device vibration toggle',start);
let now=1000,random=.2;const pulses=[];
const h=new Function('env',`let cameraKick=0,lastCameraFeedback=0,lastBuzz=0,buzzLockedUntil=0,buzzPriority=0,hapticsEnabled=true;const car=130,PY=584;
const performance={now:env.now},navigator={vibrate:p=>{env.pulses.push(p);return true}},document={hidden:false},window={};const Math=Object.create(globalThis.Math);Math.random=env.random;
${src.slice(start,stop)};return {feedback,cameraOffset,heroCameraZoom,screenShake,FEEDBACK_PRESETS,overheadReturn,heroCameraSpring}`)({now:()=>now,random:()=>random,pulses});
h.feedback('critical',true);assert.equal(h.screenShake.until,1084);
now=1010;h.feedback('serve');assert.equal(h.screenShake.power,12);assert.equal(h.screenShake.until,1110);assert(h.screenShake.hero);assert.equal(h.screenShake.focusX,130);
assert.deepEqual(pulses,[[180,48,210],55]);
const zoom=h.heroCameraZoom();assert(Math.abs(zoom.scale-1.033)<1e-9);now=1028;assert(h.heroCameraZoom().scale<zoom.scale);assert.equal(zoom.y,399);assert(Math.abs((zoom.y+(599-zoom.y)*zoom.scale)-599-6.6)<1e-9,'serve framing shifts hero downward without changing world position');
for(now=1029;now<1155;now++){h.feedback('critical',true);h.feedback('racket');h.feedback('car');assert.equal(h.screenShake.started,1010);assert.equal(h.screenShake.until,1110)}
assert(h.heroCameraZoom().scale>1);assert.equal(h.cameraOffset(),null);assert.equal(pulses.length,2);
now=1160;h.feedback('hit');assert(h.heroCameraZoom().scale>1,'ordinary shake must not cancel return');now=1209;assert(h.heroCameraZoom().scale>1);now=1210;assert.equal(h.heroCameraZoom(),null);
now=1600;random=.9;h.feedback('racket');assert(Math.abs(h.heroCameraZoom().scale-1.0195)<1e-9);assert.equal(h.screenShake.power,9.5);assert.equal(h.screenShake.until,1700);
now=2200;h.feedback('car');assert(Math.abs(h.heroCameraZoom().scale-1.0195)<1e-9);assert.equal(h.screenShake.power,9.5);assert.equal(h.screenShake.until,2300);
now=2800;random=0;h.feedback('serve');assert.equal(h.screenShake.power,12);assert.equal(h.screenShake.until,2900);assert(Math.abs(h.heroCameraZoom().scale-1.03)<1e-9);
now=3400;random=.999;h.feedback('serve');assert(h.heroCameraZoom().scale>=1.03&&h.heroCameraZoom().scale<=1.045);
now=4000;random=0;h.feedback('racket');assert.equal(h.heroCameraZoom().scale,1.015);assert.equal(h.heroCameraZoom().y,399);assert(Math.abs((399+(599-399)*h.heroCameraZoom().scale)-599-3)<1e-9,'return framing shifts hero downward');now=4099;assert(h.heroCameraZoom().scale>1);now=4100;assert.equal(h.heroCameraZoom(),null);
now=4600;random=.999;h.feedback('racket');assert(h.heroCameraZoom().scale>=1.015&&h.heroCameraZoom().scale<=1.02);now=4700;assert.equal(h.heroCameraZoom(),null);
assert(src.includes("syncMulti();sfx('serve');feedback('serve')"));assert(src.includes("sfx('racket');feedback('racket',false,overhead)"));assert(src.includes("sfx('car');feedback('car',false,overhead)"));
for(const [vx,vy,expected] of [[0,400,true],[400,400,true],[-400,400,true],[401,400,false],[-401,400,false],[0,-400,false],[0,0,false]])assert.equal(h.overheadReturn(vx,vy),expected);
now=5200;random=.5;h.feedback('racket',false,true);
const deep=h.heroCameraZoom();assert.equal(deep.y,20);assert.equal(deep.scale,1.0175);
assert(Math.abs((deep.y+(599-deep.y)*deep.scale)-599-10.1325)<1e-9);
now=5250;assert(h.heroCameraZoom().scale<deep.scale);now=5300;assert(h.heroCameraZoom().scale>1);now=5379;assert(h.heroCameraZoom().scale>1);now=5380;assert.equal(h.heroCameraZoom(),null);
now=5800;h.feedback('car',false,true);assert.equal(h.heroCameraZoom().y,20);assert.equal(h.screenShake.zoomDuration,180);
now=6400;h.feedback('racket',false,false);assert.equal(h.heroCameraZoom().y,399);assert.equal(h.screenShake.zoomDuration,100);
now=7000;h.feedback('serve',false,true);assert.equal(h.heroCameraZoom().y,399);assert.equal(h.screenShake.zoomDuration,200);
// Spring remains separate from zoom and haptics. All three timings get
// an impact press, upward overshoot, smaller downward rebound and rest.
for(const [kind,overhead,duration,amplitude,tailMs] of [['racket',false,100,2.5,95],['racket',true,180,3.5,95],['car',false,100,2.5,95],['serve',false,200,4,120]]){
 now+=1000;const start=now;random=.5;h.feedback(kind,false,overhead);
 assert.equal(h.screenShake.zoomDuration,duration);
 const initial=h.heroCameraSpring(h.heroCameraZoom());assert.equal(initial.offset,amplitude);
 let minimum=0,maximum=0;
 for(let age=0;age<duration+tailMs;age++){
  now=start+age;const zoom=h.heroCameraZoom(),spring=h.heroCameraSpring(zoom);
  if(!spring)continue;
  const scale=zoom?.scale||1,top=(zoom?(1-scale)*zoom.y:0)+spring.offset;
  const bottom=top+710*scale;
  assert(spring.pivotY+(top-spring.pivotY)*spring.stretch<=1e-7,'no newly exposed top edge');
  assert(spring.pivotY+(bottom-spring.pivotY)*spring.stretch>=710-1e-7,'no newly exposed bottom edge');
  if(age>=duration){minimum=Math.min(minimum,spring.offset);maximum=Math.max(maximum,spring.offset)}
 }
 assert(minimum<-amplitude*.5&&maximum>0&&maximum<-minimum,'damped upward then smaller downward rebound');
 now=start+duration+tailMs;assert.equal(h.heroCameraSpring(null),null);
}
assert.equal(h.FEEDBACK_PRESETS.racket.v,25);assert.equal(h.FEEDBACK_PRESETS.car.v,25);assert.equal(h.FEEDBACK_PRESETS.serve.v,55);
h.screenShake.zoom=0;assert.equal(h.heroCameraSpring(null),null);
assert(src.includes('const spring=heroCameraSpring(zoom)'));
assert(src.includes('const overhead=overheadReturn(b.vx,b.vy),offset='));
assert(src.includes('const overhead=overheadReturn(b.vx,b.vy);upwardBounce'));
assert(src.includes('g.scale(zoom.scale,zoom.scale)'));assert(src.includes('drawBubbles();g.restore();drawDanger()'));
console.log('PASS V418: strike priority, bounded random zoom, strong haptics, unchanged HUD and non-stacking timing.');
