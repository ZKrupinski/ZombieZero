'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const garageSrc=fs.readFileSync('dist/garage.js','utf8');
const ui=fs.readFileSync('dist/garage-ui.js','utf8');
const ctx=vm.createContext({window:{}});
vm.runInContext(garageSrc,ctx);
const g=ctx.window.ZZGarage;
const hero={speed:480,paddle:82,damage:1,lives:3};
const stats=(id,level)=>{
 const part=g.parts.find(x=>x.id===id);
 const data=g.blank();
 data.levels[id]=level;
 data.loads[0][part.slot]=id;
 g.load(0,data);
 return {data,boost:g.combatStats(),rows:g.heroStats(hero,data,null,0),text:g.partBenefits(part,level)};
};
const groups={
 grip:['attack','guard'],
 wide:['attack','guard','resist'],
 cushion:['guard','resist'],
 heavy:['attack','guard'],
 steer:['attack','guard','speed'],
 filter:['resist','speed']
};
for(const [id,attributes] of Object.entries(groups)){
 const x=stats(id,0);
 for(const key of attributes)assert(x.boost[key]>0,id+' should increase '+key+' at level 0');
 assert(x.text.stat.includes(' · '),id+' must advertise 2+ actual permanent buffs');
 assert(x.text.unique.length>5,id+' must preserve its original special ability');
 const higher=stats(id,5);
 assert(attributes.some(key=>higher.boost[key]>x.boost[key]),id+' must gain actual stats by upgrading');
}
for(const [id,required] of [['wide',3],['cushion',3],['heavy',4],['filter',3]]){
 assert.equal(stats(id,required-1).boost.lives,0,id+' heart unlock cannot arrive early');
 const upgraded=stats(id,required);
 assert.equal(upgraded.boost.lives,1,id+' unlock grants 1 maximum heart');
 assert.equal(upgraded.rows[2].bonus,1,id+' must update visible health stat');
 assert(upgraded.text.stat.includes('체력 +1♥'),id+' inspector must show heart reward');
}
const data=g.blank();
data.levels={wide:3,heavy:4,filter:3};
data.loads[1]={0:'wide',1:'heavy',2:'filter'};
g.load(1,data);
assert.equal(g.combatStats().lives,3,'three equipped slots can each add one heart');
const ruby=g.heroStats({speed:720,paddle:46,damage:1,lives:3},data,null,1);
assert.equal(ruby[2].base+ruby[2].bonus,6,'character starts at base lives plus bonus');
assert.equal(g.heroStats(hero,data,null,0)[2].bonus,0,'other heroes do not inherit heart gear');
assert.equal(g.heroStatMarkup(hero,data,null,1).includes('체력(최대 하트)'),true);
assert(game.includes('const maxHeroLives=()=>hero().lives+Math.max(0,garageCombat().lives||0)'),
 'life bonus must be read from equipped modules');
assert.equal((game.match(/lives=maxHeroLives\(\)/g)||[]).length,2,
 'both game start and retry must use equipped max hearts');
assert.equal((game.match(/lives=Math.min\(maxHeroLives\(\),lives\+1\)/g)||[]).length,2,
 'campaign and endless 5-wave healing must respect equipped max hearts');
assert(game.includes('const driveSpeed=hero().speed*(1+(garageCombat().speed||0)/100)'),
 'combined equipment speed must affect real movement');
assert(game.includes('const moduleAttack=1+garageCombat().attack/100'),
 'combined attack must affect real damage');
assert(game.includes('garageCombat().resist/100'),
 'combined resistance must affect real poison');
assert(game.includes('combatStats?.()?.guard'),
 'combined guard must affect catch reach');
assert(ui.includes('garage-part-stat-tags')&&ui.includes('최대 하트'),
 'garage visual interface must explain multiple stats and heart meaning');
console.log('PASS v311: 6 equipment types with real multiple stat buffs; heart upgrades, per-hero loadouts, actual battle use');
