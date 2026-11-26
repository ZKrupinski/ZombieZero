'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const game=fs.readFileSync('dist/game.js','utf8');
const mod=fs.readFileSync('dist/fortress-mode.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
// The builder freezes the combat update loop, so queues must be erased
// before mode='building', rather than relying on natural FX expiration.
const anchor='function clearStageVisuals(){';
const a=game.indexOf(anchor),b=game.indexOf('\nfunction advanceStage(){',a);
assert(a>0&&b>a,'intermission cleanup helper exists');
const helper=game.slice(a,b);
const state=new Function(`
 let particles=[1],ballVanish=[1],criticalPopups=[1],itemPickupFX=[1],fx=[1];
 let enemyDeaths=[1],enemyPieces=[1],barrelBlasts=[1],hitFlashes=[1];
 let ballContactFX=[1],trashContactFX=[1];
 let junk=[1],bossTrashShots=[1],rockets=[1],bazookaBlasts=[1],items=[1];
 const dodgeGhosts=[1],standRetreat=[1];
 let clearBurst=8,cheerTime=9,swing=2,heroAttackTime=3,cameraKick=5;
 const screenShake={until:999,power:7};
 let poisonFlash=4,resistFlash=4,failureScene={t:3};
 const citizens=[{shooting:3},{shooting:2}];
 const fortressWalls={count:5},fortressStock=17;
 ${helper}
 clearStageVisuals();
 return {
  queues:[particles,ballVanish,criticalPopups,itemPickupFX,fx,
   enemyDeaths,enemyPieces,barrelBlasts,hitFlashes,ballContactFX,trashContactFX,
   junk,bossTrashShots,rockets,bazookaBlasts,items,dodgeGhosts,standRetreat],
  counters:[clearBurst,cheerTime,swing,heroAttackTime,cameraKick,
   screenShake.until,screenShake.power,poisonFlash,resistFlash],
  failureScene,citizens,fortressWalls,fortressStock
 };
`)();
assert(state.queues.every(q=>Array.isArray(q)&&q.length===0),
 'no previous-stage impact, projectile, debris or celebration FX survive the build screen');
assert(state.counters.every(n=>n===0),'screen flashes, hits, shake and cheering stopped');
assert.equal(state.failureScene,null);
assert(state.citizens.every(c=>c.shooting===0),'no lingering citizen projectile animation');
assert.deepEqual(state.fortressWalls,{count:5},'existing barricades persist');
assert.equal(state.fortressStock,17,'barricade materials remain untouched');
const advance=game.slice(game.indexOf('function advanceStage(){'),
 game.indexOf('// Switch the background',game.indexOf('function advanceStage(){')));
assert(advance.indexOf('clearStageVisuals()')>=0 && advance.indexOf('clearStageVisuals()')<advance.indexOf('wave++;'));
assert(advance.indexOf('clearStageVisuals()')<advance.indexOf('fortress.begin(foes,wave)'));
assert(advance.includes("if(isFortress()&&fortress){"),'barricade mode still prepares construction');
assert(mod.includes('MAX_HP=30'),'walls have 2.5x the original 12 HP');
const ids=['fortress-builder','fortress-actions','fortress-confirm','fortress-cancel',
 'fortress-ready','fortress-stock','fortress-tip','fortress-build-count',
 'fortress-supply','fortress-preview-summary','fortress-tool'];
const e={};
for(const id of ids)e[id]={hidden:false,style:{},dataset:{},addEventListener(k,v){this[k]=v},
 setAttribute(){},getBoundingClientRect(){return {left:0,top:0,width:450,height:710}}};
const document={getElementById:k=>e[k],createElement:()=>({getContext:()=>null})},w={};
new Function('window','document',mod)(w,document);
const f=w.ZZFortress,c={getBoundingClientRect:()=>({left:0,top:0,width:450,height:710}),
 setPointerCapture(){}};
const p={clientX:49,clientY:94,pointerId:1,button:0};
f.reset();f.begin([],1);f.down(p,c);f.up(p,c);e['fortress-confirm'].click();
assert.equal(f.getWallHP(0,0),30);
const z={x:41,y:90,w:16,h:22};
for(let i=0;i<29;i++){
 z.x=41;z.y=90;f.resolve(z,41,57,.79,()=>{});
}
assert.equal(f.getWallHP(0,0),1,'normal zombie needs 30 bites to destroy');
z.x=41;z.y=90;f.resolve(z,41,57,.79,()=>{});
assert.equal(f.getWallCount(),0);
assert.equal(f.getPendingRefund(),1,'destroyed cube still refunds exactly one material');
f.begin([],2);assert.deepEqual(f.getSupply(),{refund:1,bonus:8,healed:0});
assert(html.includes('src="fortress-mode.js?v='),'versioned barricade module is loaded');
assert(html.includes('v320-clear-effects-strong-walls'),'main game script cache invalidated');
assert(sw.includes('v320-clear-effects-strong-walls'),'PWA cache invalidated');
console.log('PASS v320: frozen battle FX erased before building, all walls/materials persistent, 30-HP bite threshold and refunds.');
