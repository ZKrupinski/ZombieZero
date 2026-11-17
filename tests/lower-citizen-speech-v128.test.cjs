'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(game.includes('y:p.y-86'),'save/return/special speech lowers 14px');
assert(game.includes('const y=p.y-61+stagger['),'ambient cheer keeps V128 baseline with randomized lower offsets');
assert(game.includes('Math.abs(p.x-car)>76'),'citizens near the car can cheer but not crowd its center');
assert(game.includes('const centralClearance=q.event?56:26'),
 'event bubbles keep safe spacing, ambient bubbles allow only near-edge overlap');
assert(game.includes('const edge=q.event?67:34'),
 'ambient text stays away from hero while overlapping vehicle edge slightly');
assert(game.includes('q.event?H-57-h:H-45-h'),
 'normal cheers receive extra 12px of downward room, event messages retain V128 clamp');
const start=game.indexOf('// V79: speech placement');
const v128=game.indexOf('// V128: Drop speech 14px');
const end=game.indexOf('function drawBubbles(){',v128);
assert(v128>=0&&end>v128,'standalone bubble layout and fixed pointer available');
const source=game.slice(v128,end);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const ctx={Math,Number,W:450,H:710,PY:584,car:225,clamp};
vm.createContext(ctx);vm.runInContext(source,ctx);
const ambient={x:241,y:621,w:124,event:undefined,carAtBirth:225,citizen:{x:303,y:682}};
const normal=vm.runInContext('citizenBubbleLayout('+JSON.stringify(ambient)+',225)',ctx);
const afterCarMoves=vm.runInContext('citizenBubbleLayout('+JSON.stringify(ambient)+',390)',ctx);
assert.deepEqual(JSON.parse(JSON.stringify(normal)),JSON.parse(JSON.stringify(afterCarMoves)),
 'car movement still cannot move an existing speech bubble');
assert.equal(normal.y,621,'bubble is really 14px lower than previous 607px position');
assert.equal(normal.x,259,'only the central 26px safe zone is cleared');
assert(normal.x<225+56&&normal.x>225+26,'balloon overlaps only the right outer car edge');
const endPointer=vm.runInContext('citizenBubblePointer('+JSON.stringify(ambient)+',citizenBubbleLayout('+JSON.stringify(ambient)+'))',ctx);
assert.equal(endPointer.tipY-normal.y-normal.h,16,'pointer remains short, never stretched');
assert(Math.abs(endPointer.tipX-endPointer.baseX)<=8,'pointer never stretches sideways');
const event={...ambient,event:'return',y:596,h:46};
const special=vm.runInContext('citizenBubbleLayout('+JSON.stringify(event)+')',ctx);
assert(special.x>=225+56||special.x+special.w<=225-56,
 'larger two-line return/save bubbles avoid the whole car');
assert.equal(special.y,596,'special return/save cue is also lowered 14px');
for(const q of [ambient,event]){
 const place=vm.runInContext('citizenBubbleLayout('+JSON.stringify(q)+')',ctx);
 assert(place.x>=22&&place.x+place.w<=428,'speech stays inside the 450px canvas');
 assert(place.y>=100&&place.y+place.h<=710-(q.event?57:45),'speech stays above the citizen area');
}
assert(game.includes("const initialCar=Number.isFinite(q.carAtBirth)?q.carAtBirth:carX"),
 'original car-at-birth anchor must remain');
assert(game.includes('drawActiveItemIcons();drawBubbles();'),
 'speech still renders on top of car for subtle overlap');
assert(html.includes('v128-lower-citizen-speech'),'fresh game script loaded');
assert(sw.includes('v128-lower-citizen-speech'),'offline PWA cache refreshed');
console.log('PASS v128: all speech 14px lower, subtle car-edge cover, safe event callouts, unchanged anchor and short tail.');
