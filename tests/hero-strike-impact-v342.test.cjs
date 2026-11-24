'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
const a=source.indexOf('// V342: Hero-only'),b=source.indexOf('function player(){',a);
const ctx={car:225,W:450,clock:10,selectedHero:0,Math,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);
const state=()=>vm.runInContext('heroStrikeVisual',ctx);
ctx.triggerHeroStrike(240);assert.equal(state().offset,0);
assert(ctx.heroStrikePose(.01,0).flash>0);
ctx.triggerHeroStrike(302);assert(state().offset>=45);
assert.equal(ctx.car,225,'visual strike never moves collision center');
ctx.triggerHeroStrike(150);assert(state().offset<=-45);
assert.equal(ctx.heroStrikePose(.032,50).shift,50);
assert.equal(ctx.heroStrikePose(.28,50).shift,0);
ctx.triggerHeroStrike(302,false);assert.equal(state().offset,0);
assert(source.includes("ballImpact(b,'y',-1,'paddle');swing=.22;heroAttackTime=HERO_ATTACK_DURATION;if(typeof triggerHeroStrike==='function')triggerHeroStrike(b.x)"));
assert(source.includes("Math.abs(b.x-car)<hero().paddle+radius/2+growth('sweetSpot')*2+gearBonus('wide')"));
assert(source.includes('drawHeroStrikePresentation();drawBazooka();'));
assert(fs.readFileSync('dist/index.html','utf8').includes('v342-hero-strike-impact'));
assert(fs.readFileSync('dist/sw.js','utf8').includes('v342-hero-strike-impact'));
console.log('PASS v342: center strike, quick side lunge, return, flash and unchanged collision center.');


// Exercise actual presentation in both paths. Shadow and status must render
// exactly once; afterimages can draw only the hero, never a second gauge.
const events=[];
Object.assign(ctx,{mode:'playing',g:{globalAlpha:1,save(){},restore(){},translate(){},filter:''},
 drawCarGroundShadow:()=>events.push('shadow'),player:()=>events.push('hero'),
 drawPoisonGauge:()=>events.push('poison'),drawGroggyFeedback:()=>events.push('groggy')});
ctx.clock=20;ctx.triggerHeroStrike(302);ctx.clock+=.05;
ctx.drawHeroStrikePresentation();
assert.deepEqual(events,['hero','hero','hero','shadow','hero','poison','groggy']);
events.length=0;ctx.clock+=.3;ctx.drawHeroStrikePresentation();
assert.deepEqual(events,['shadow','hero','poison','groggy']);

// V343: pose and offset remain held during contact, while live center moves.
ctx.heroAttackTime=.42;ctx.car=225;ctx.clock=30;ctx.triggerHeroStrike(302);
for(const age of [.033,.05,.10,.146]){
 ctx.clock=30+age;
 assert.equal(ctx.heroStrikeFrame(1),4);
 assert.equal(ctx.heroStrikePose(age,50).shift,50);
}
assert.equal(ctx.heroStrikePose(.01,50).flash,0);
assert(ctx.heroStrikePose(.033,50).flash>0);
ctx.car=250;ctx.clock=30.08;assert.equal(ctx.heroStrikeFrame(1),4);
assert.equal(ctx.car,250);
ctx.clock=30.25;assert(ctx.heroStrikeFrame(1)>4);
ctx.clock=31;ctx.triggerHeroStrike(250);assert.equal(ctx.heroStrikeFrame(0),4);
assert(fs.readFileSync('dist/index.html','utf8').includes('v343-impact-pose-hold'));
assert(fs.readFileSync('dist/sw.js','utf8').includes('v343-impact-pose-hold'));
