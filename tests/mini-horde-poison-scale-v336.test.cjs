'use strict';
// A small zombie throws a physically small projectile with proportionally
// weaker toxin, regardless of whether it is spit or a thrown piece of trash.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const begin=game.indexOf('function blockHostileShot(shot,x,y){');
const end=game.indexOf('function drawPoisonGauge(){',begin);
assert(begin>=0&&end>begin,'read original production projectile blocking code');
const fn=game.slice(begin,end);
const ctx={
 POISON_MAX:100,POISON_SPIT:34,POISON_TRASH:20,POISON_GROGGY_SECONDS:1.85,
 poison:0,poisonGrace:0,poisonFlash:0,groggyTime:0,
 filterReady:0,clock:0,car:225,target:225,PY:584,
 has:()=>false,gearBonus:()=>0,garageCombat:()=>({resist:0}),
 growth:()=>0,effect:()=>{},burst:()=>{},sfx:()=>{},feedback:()=>{},Math
};
vm.createContext(ctx);
vm.runInContext(fn,ctx);
const block=shot=>ctx.blockHostileShot(shot,225,540);
function clear(){ctx.poison=0;ctx.poisonGrace=0;ctx.poisonFlash=0;ctx.groggyTime=0}
clear();block({type:'spit',enemyScale:1});
assert.equal(ctx.poison,34,'normal campaign/endless spit remains 34');
clear();block({type:'trash',enemyScale:1});
assert.equal(ctx.poison,20,'normal campaign/endless trash remains 20');
clear();block({type:'spit'});
assert.equal(ctx.poison,34,'legacy hostile projectile without scale remains normal');
clear();block({type:'spit',enemyScale:.5});
assert.equal(ctx.poison,17,'MINI/BARRICADE spit adds exactly half of 34');
clear();block({type:'trash',enemyScale:.5});
assert.equal(ctx.poison,10,'MINI/BARRICADE thrown trash adds exactly half of 20');
clear();block({type:'spit',enemyScale:.5});block({type:'trash',enemyScale:.5});
assert.equal(ctx.poison,27,'both mini attack types accumulate without overwriting');
clear();for(let i=0;i<5;i++)block({type:'spit',enemyScale:.5});
assert.equal(ctx.poison,85,'mini toxin does not trigger groggy at five spit blocks');
assert.equal(ctx.groggyTime,0);
block({type:'spit',enemyScale:.5});
assert.equal(ctx.poison,100,'six mini spit blocks reach the unchanged 100 threshold');
assert(ctx.groggyTime>1,'groggy status remains functional');
clear();ctx.garageCombat=()=>({resist:20});
block({type:'spit',enemyScale:.5});
assert.equal(ctx.poison,13.6,'existing resistance still reduces the scaled payload');
ctx.garageCombat=()=>({resist:0});
clear();ctx.has=skill=>skill==='shield';block({type:'spit',enemyScale:.5});
assert.equal(ctx.poison,0,'shield still prevents toxin entirely');
ctx.has=()=>false;
assert(game.includes('enemyScale:z.miniScale||1,'),
 'thrown trash preserves the mini source scale at launch');
assert(game.includes('enemyScale:z.miniScale||1,spitScale:'),
 'spit preserves the mini source scale at launch');
assert(game.includes("const toxicPayload=(shot.type==='spit'?POISON_SPIT:POISON_TRASH)*(shot.enemyScale??1)"),
 'both projectile types scale dose only once');
assert(html.includes('-v336-mini-horde-poison-payload'),
 'new gameplay script version reaches cached clients');
assert(sw.includes('v336-mini-horde-poison-payload'),
 'PWA cache invalidated for scaled poison payload');
console.log('PASS v336: mini and barricade hostile toxin 50% (spit 17, trash 10); campaign/endless original, shield, resistance and groggy threshold unchanged.');
