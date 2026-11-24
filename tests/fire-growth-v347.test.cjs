'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8'),prog=fs.readFileSync('dist/progression.js','utf8');
const table=[[82,52,2,5],[104,65,3,7],[128,80,4,9],[152,95,5,12],[176,110,6,16],[200,130,8,20]];
const profileSrc=prog.slice(prog.indexOf(' const FIRE_GROWTH='),prog.indexOf(' function rescueKills(){'));
const gameSrc=src.slice(src.indexOf('const FIRE_MAX_ACTIVE='),src.indexOf('function fireTargetsNear('));
const env=vm.createContext({window:{},foes:[],fxEnabled:true,clock:0,mini:false,isMiniHorde:()=>env.mini});
vm.runInContext('(()=>{const MAX_LEVEL=5,int=(v,a,b)=>Math.max(a,Math.min(b,Math.floor(v))),level=()=>0;'+profileSrc+';window.ZZProgression={fireProfile};})()',env);
const run=s=>vm.runInContext(s,env);
const api=env.window.ZZProgression;for(let l=0;l<6;l++)assert.deepEqual(Object.values(api.fireProfile(l)),table[l]);
vm.runInContext(gameSrc,env);
for(let l=0;l<6;l++){
 run('foes=Array.from({length:24},(_,i)=>({x:i*2,y:0,w:10,h:10,burn:0}));fireWaves.length=0');
 assert.equal(run('applyFireImpact(foes[0],5,5,'+l+')'),table[l][2]);
 assert.equal(run('fireWaves[0].radius'),table[l][0]);
 run('for(const z of foes)ignite(z,0,'+l+')');assert.equal(run('burningCount()'),table[l][3]);
 assert.equal(run('foes[0].burnGrowthLevel'),l);
}
run('foes=[{x:0,y:0,w:10,h:10,burn:0},{x:100,y:0,w:10,h:10,burn:0},{x:180,y:0,w:10,h:10,burn:0}]');
assert.equal(run('applyFireImpact(foes[0],5,5,0)'),1);
run('foes.forEach(z=>z.burn=0)');assert.equal(run('applyFireImpact(foes[0],5,5,5)'),3);
env.mini=true;run('foes.forEach(z=>z.burn=0);fireWaves.length=0');assert.equal(run('applyFireImpact(foes[0],5,5,5)'),2);
assert.equal(run('fireWaves[0].radius'),120);
assert(src.includes('fireProfile(level).spreadRadius*fireRangeScale()'));
assert(src.includes('if((z.burnDepth||0)<FIRE_SPREAD_DEPTH)'));
assert(src.includes('FIRE_TICK_DAMAGE=.75')&&src.includes('FIRE_DURATION=2.4'));
console.log('PASS: fire profile all ranks, actual impact radius and caps, mini scale, unchanged DOT and one-hop rule');
