'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
function source(from,to){
 const a=game.indexOf(from),b=game.indexOf(to,a);
 assert(a>=0&&b>a,'production renderer present: '+from);
 return game.slice(a,b);
}
const procedural=source('function proceduralBackground(){','const STAGE_ART_COUNT');
const background=source('function background(){','// V242:');
assert(!procedural.includes('strokeRect('),'procedural fallback has no playfield outline');
assert(!background.includes('strokeRect('),'bitmap stage has no skill-dependent arena outline');
assert(!game.includes('g.strokeRect(24,22,402,DEFENSE_Y-30)'),
 'all slow-skill cyan playfield rectangles removed');
assert(!game.includes('g.strokeRect(29,27,392,DEFENSE_Y-45)'),
 'no hidden fallback rectangle flashes during background loading');
assert(game.includes("const enemySlowRate=()=>has('slow')?SLOW_ENEMY_SPEED_RATE:1;"),
 'slowing enemy movement is unchanged');
assert(game.includes("const hostileShotSlowRate=()=>has('slow')?SLOW_HOSTILE_SHOT_RATE:1;"),
 'slowing hostile projectiles is unchanged');
assert(game.includes('const SLOW_ENEMY_SPEED_RATE=.10,SLOW_HOSTILE_SHOT_RATE=.10;'),
 'same slow intensity remains');
assert(game.includes('if(standDangerTime>0){'),
 'defense breach warning stays distinct from deleted debug border');
const lines=[];
const canvas={
 globalAlpha:1,fillStyle:'',strokeStyle:'',
 save(){},restore(){},
 drawImage(){lines.push('art')},
 fillRect(){lines.push('fill')},
 strokeRect(){lines.push('arena-border')},
};
const ctx={
 Math,g:canvas,W:450,H:710,DEFENSE_Y:565,wave:7,clock:32,
 stageArtIndex:6,previousArtIndex:-1,stageArtBlend:1,
 stageArtForWave:()=>6,setStageBackground(){throw Error('stage art should already be current')},
 STAGE_PLAYFIELD_VEIL:Array(25).fill(.25),
 window:{ZZStageArt:{ready:Array(25).fill(true),images:Array(25).fill({})}},
 rect(){lines.push('rect')},
 has:key=>key==='slow'
};
vm.createContext(ctx);
vm.runInContext(procedural+background,ctx);
// A supplied stage art while slow is active must not draw an arena rectangle.
vm.runInContext('background()',ctx);
assert(lines.includes('art'),'approved bitmap stage draws normally with slow');
assert(!lines.includes('arena-border'),'slow active does not outline the zombie field');
lines.length=0;
ctx.window.ZZStageArt.ready.fill(false);
vm.runInContext('background()',ctx);
assert(lines.includes('rect'),'procedural fallback remains available while background streams');
assert(!lines.includes('arena-border'),'stage transition/loading has no legacy debug box');
assert(html.includes('v255-no-slow-arena-box'),'browser receives new gameplay render file');
assert(sw.includes('v255-no-slow-arena-box'),'PWA users receive cache update');
console.log('PASS v255: slow effect does not draw temporary cyan arena outlines on bitmap or fallback stages; enemy slow, shots, defense rules intact.');
