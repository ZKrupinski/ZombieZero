'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
const a=source.indexOf('function updateLooseHordeFacing(');
const b=source.indexOf('function updateLooseHordeParade(',a);
const ctx={Math};vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);
const f=ctx.updateLooseHordeFacing,dt=1/60,m={z:{moveDir:0}};
for(let i=0;i<120;i++){
 f(m,(i%2?1:-1)*.08,.2,dt);
 assert.equal(m.z.moveDir,0,'tiny collision slip cannot swap atlas row');
}
for(let i=0;i<30;i++)f(m,1.1,.15,dt);
assert.equal(m.z.moveDir,1);
for(let i=0;i<10;i++){
 f(m,0,0,dt);assert.equal(m.z.moveDir,1,'brief wall stop retains facing');
}
for(let i=0;i<35;i++)f(m,-1.1,.15,dt);
assert.equal(m.z.moveDir,-1,'sustained turn still changes facing');
for(let i=0;i<40;i++)f(m,0,0,dt);
assert.equal(m.z.moveDir,0,'settled zombie returns to front');
assert(source.includes('updateLooseHordeFacing(m,z.x-oldX,z.y-oldY,step);'));
assert(fs.readFileSync('dist/index.html','utf8').includes('v341-horde-stable-facing'));
assert(fs.readFileSync('dist/sw.js','utf8').includes('v341-horde-stable-facing'));
console.log('PASS v341: stable directional sprites during tiny collision slips, brief stops, sustained turns and settling.');
