'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const a=game.indexOf('function heroPoisonTintStrength(){'),b=game.indexOf('function player(){',a);
assert(a>0&&b>a,'color-strength and bitmap helper definitions');
const c=game.indexOf('function updatePoisonStatus(dt){'),d=game.indexOf('function shotTouchesHero(',c);
assert(c>0&&d>c,'poison recovery function');
const draws=[],ctx={
 Math,poison:0,poisonGrace:0,groggyTime:0,POISON_MAX:100,POISON_DECAY:5.5,
 poisonFlash:0,poisonGaugeAlpha:0,
 growth:()=>0,
 g:{
  globalAlpha:1,filter:'none',saved:[],
  save(){this.saved.push({alpha:this.globalAlpha,filter:this.filter})},
  restore(){const old=this.saved.pop();this.globalAlpha=old.alpha;this.filter=old.filter},
  drawImage(...args){draws.push({args,alpha:this.globalAlpha,filter:this.filter})}
 }
};
vm.createContext(ctx);
vm.runInContext(game.slice(a,b)+game.slice(c,d),ctx);
const run=source=>vm.runInContext(source,ctx);
run('drawHeroBitmap("hero",0,0,192,192,10,10,108,108)');
assert.equal(draws.length,1,'no poisoned overlay on the original RGB artwork');
assert.equal(draws[0].filter,'none','true original color, no experience-based hue rotation');
draws.length=0;
run('poison=34;drawHeroBitmap("hero",0,0,192,192,10,10,108,108)');
assert.equal(draws.length,2,'one extra translucent overlay on projectile block');
assert.equal(draws[0].filter,'none','original pass always first');
assert(draws[1].filter.includes('hue-rotate(42deg)'),'lime recolor only on the overlay');
assert(draws[1].alpha>.2&&draws[1].alpha<.35,'first shot changes color just a little');
draws.length=0;
run('poison=68;drawHeroBitmap("hero")');
assert(draws[1].alpha>.5&&draws[1].alpha<.6,'additional damage increases green');
draws.length=0;
run('poison=100;groggyTime=1.8;drawHeroBitmap("hero")');
assert.equal(draws[1].alpha,1,'fully green precisely during groggy');
run('updatePoisonStatus(1.9)');
assert.equal(ctx.groggyTime,0,'groggy ends');
assert.equal(ctx.poison,0,'recovery resets poisoning immediately');
draws.length=0;
run('drawHeroBitmap("hero")');
assert.equal(draws.length,1,'recovered character returns immediately to untouched sprite');
assert(!game.includes("g.filter='hue-rotate(85deg)'"),'no XP-based permanent mechanic recolor');
assert(!game.includes("g.filter='hue-rotate(35deg)'"),'no XP-based permanent regular hero recolor');
assert(game.includes('drawHeroBitmap(atlas,')&&game.includes('drawHeroBitmap(sprite.image,'),
 'approved animation, legacy sprite and mechanic share poison tint logic');
const idle={naturalWidth:768,naturalHeight:384},swing={...idle},still={naturalWidth:297,naturalHeight:300};
Object.assign(ctx,{selectedHero:3,drawTrashContact(){},car:200,VIEW_DELTA:0,clock:.25,heroAttackTime:0,
 HERO_ATTACK_DURATION:.42,has:()=>false,hero:()=>({paddle:60}),gearBonus:()=>0,window:{},balls:[],PY:600,
 $:id=>({'wrench-idle':idle,'wrench-swing':swing,'mechanic-art':still})[id]});
run(game.slice(b,game.indexOf('\nfunction ',b+1)));
ctx.poison=34;
function checkFrame(image,x,y){
 draws.length=0;run('player()');
 assert.equal(draws.length,2,'Wrench base sprite and tint overlay');
 assert.equal(draws[0].args[0],image);
 if(image!==still)assert.deepEqual(draws[0].args.slice(1,5),[x,y,192,192]);
}
checkFrame(idle,384,0);
ctx.balls=[{x:200,y:588,vx:0,vy:200}];
checkFrame(swing,576,0);
ctx.heroAttackTime=.42;
checkFrame(swing,0,192);
ctx.heroAttackTime=.04;
checkFrame(swing,576,192);
swing.naturalWidth=0;
checkFrame(still);
assert(css.includes('v242: the selection spotlight itself must not cast a persistent green hue'));
assert(html.includes('v242-poison-tint')&&/garage\.css\?v=(10-clean-tint|11-v243-compact-dock-stats|12-v244-five-portrait-dock|13-v245-clear-top-centered-icons|14-v248-complete-hero-cards|15-v254-gameover-reel)/.test(html));
assert(/v24[2-5]-(poison-tint|layout-stats-dock|five-portrait-no-dock-box|clear-top-centered-icons)/.test(sw));
console.log('PASS v242: hero RGB authentic when clean, gradual lime layers, fully green only when groggy, instant recovery and no XP tint.');
