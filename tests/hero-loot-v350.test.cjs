'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
new vm.Script(source);
const profileStart=source.indexOf('const HERO_LOOT_PROFILES='),profileEnd=source.indexOf('function stageLootLimit()');
const ctx=vm.createContext({Math,selectedHero:0});
vm.runInContext(source.slice(profileStart,profileEnd),ctx);
const profiles=vm.runInContext('HERO_LOOT_PROFILES',ctx);
const skills=['dual','triple','power','fire','slow','pierce','shield'];
for(const p of profiles)assert.equal(skills.reduce((sum,k)=>sum+p[k],0),100);
const pool=skills.filter(k=>k!=='fire');
const counts=profiles.map(p=>{
 const result=Object.fromEntries(skills.map(k=>[k,0]));
 for(let i=0;i<10000;i++){
  const u=(i+.5)/10000;
  if(u<p.fire/100)result.fire++;
  else result[ctx.weightedLoot(pool,p,[],[],false,(u-p.fire/100)/(1-p.fire/100))]++;
 }
 for(const k of skills)assert(Math.abs(result[k]-100*p[k])<=1,k+' probability');
 return result;
});
assert(counts[4].pierce>30*counts[4].fire,'Scarlett piercing dominates flame');
assert.equal(profiles[4].pity,0,'Scarlett fire not forced by generic pity');
assert(counts[1].triple>counts[0].triple&&counts[2].fire>counts[0].fire);
assert(counts[3].dual+counts[3].shield>counts[0].dual+counts[0].shield);
assert.equal(ctx.weightedLoot(['shield'],profiles[4],[],[],false,.99),'shield');
assert.equal(ctx.weightedLoot([],profiles[4]),null);
console.log('PASS: five distinct 100% skill profiles; deterministic probability coverage, signature styles, eligible-only selection');
