'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('dist/game.js','utf8');
new vm.Script(code);new vm.Script(fs.readFileSync('dist/fx-renderer.js','utf8'));
const grid=vm.runInNewContext(code.slice(code.indexOf('function makeFoeGrid('),code.indexOf('function march(dt)'))+'\nmakeFoeGrid');
let seed=42;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
const actors=Array.from({length:144},()=>({x:rand()*400,y:rand()*500,w:10+rand()*60,h:10+rand()*65}));
const index=grid(actors);
for(let n=0;n<300;n++){
 const x=rand()*440,y=rand()*540,w=rand()*40,h=rand()*40,min=Math.floor(rand()*144)-1;
 const exact=actors.flatMap((z,i)=>i>min&&x<z.x+z.w&&x+w>z.x&&y<z.y+z.h&&y+h>z.y?[i]:[]);
 const candidates=Array.from(index.query(x,y,w,h,min));
 assert.deepEqual(candidates,[...new Set(candidates)].sort((a,b)=>a-b));
 assert.deepEqual(candidates.filter(i=>{const z=actors[i];return x<z.x+z.w&&x+w>z.x&&y<z.y+z.h&&y+h>z.y}),exact);
}
console.log('PASS V349: ordered broad phase matches exact contacts in 300 queries; syntax valid');
