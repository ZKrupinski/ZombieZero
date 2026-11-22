'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('dist/index.html','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const garageSrc=fs.readFileSync('dist/garage.js','utf8');
const ui=fs.readFileSync('dist/garage-ui.js','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const progSrc=fs.readFileSync('dist/progression.js','utf8');

for(const [name,w,h] of [
 ['scarlet-idle-v275.webp',768,384],
 ['scarlet-attack-v275.webp',768,384],
 ['scarlet-diamond-v275.webp',384,192],
 ['scarlet-portrait-v275.webp',256,256]
]){
 const path='dist/assets/ip/'+name,buf=fs.readFileSync(path);
 assert(buf.length>8000,name+' contains actual image bytes');
 assert.equal(buf.toString('ascii',0,4),'RIFF',name+' has RIFF signature');
 assert.equal(buf.toString('ascii',8,12),'WEBP',name+' has WebP signature');
 assert.equal(buf.toString('ascii',12,16),'VP8X',name+' preserves full RGBA');
 assert.equal(buf[24]+(buf[25]<<8)+(buf[26]<<16)+1,w,name+' atlas width');
 assert.equal(buf[27]+(buf[28]<<8)+(buf[29]<<16)+1,h,name+' atlas height');
 assert(html.includes('src="assets/ip/'+name+'"'),name+' is loaded by the page');
 assert(sw.includes("'./assets/ip/"+name+"'"),name+' has offline pre-cache');
}
assert(html.includes('id="hero-4"'),'fifth hero button exists');
assert(game.includes("id:'scarlet',name:'스칼렛',role:'DIVA'"),'Scarlett has unique DIVA metadata');
assert(game.includes('selectedHero===4?{x:-35,y:-37}'),'gem launches beside handbag not face');
assert(game.includes('if(selectedHero===4){\n  // Same elevated front/side presentation'),'hero uses authored 192px bitmap');
assert(game.includes("sheet=$(attacking?'scarlet-attack':'scarlet-idle')"),'idle and swinging animation sheets switch');
assert(game.includes("const frame=Math.floor(clock*12)%8;"),'gem animates internal light independently');
assert(game.includes("if(selectedHero===4){\n  // Fixed round silhouette"),'gem draw skips bitmap rotation');
assert(game.includes("if(selectedHero===4){b.spinVelocity=0;b.spinAngle=0;return}"),'no orb rotation');
assert(game.includes("if(impact?.sparkle)burst("),'prism finisher has a small nonverbal flash');
assert(!game.includes("'PRISM!'")&&!game.includes("'SCARLET!'"),'no new floating hit text');
assert(ui.includes('i<3||i===4||(i===3&&progress.garage().mechanic)'),'Scarlett is available immediately, Wrench stays radio-locked');
assert(ui.includes('scarlet-portrait-v275.webp'),'garage uses actual artwork');
assert(css.includes('.hero-vehicle-portrait.row-4')&&css.includes('scarlet-portrait-v275.webp'),'five-card reel draws Scarlett');
assert(html.includes('v274-scarlet-diva')&&sw.includes('v274-scarlet-diva'),'new files cannot be hidden by stale cache');

const context=vm.createContext({window:{}});
vm.runInContext(garageSrc,context);
const garage=context.window.ZZGarage;
const modern=garage.blank();
assert.equal(modern.loads.length,5,'five per-hero equipment sets');
assert.equal(modern.xp.length,5,'fifth mastery slot saved');
garage.load(4,modern);
const ball={vx:250,vy:-360,returns:0,first:true};
for(let i=1;i<=6;i++){
 garage.strike(ball,4,.2);
 assert.equal(!!ball.gemReady,i%3===0,'every third successful paddle return charges gem');
 const impact={x:250,y:-360};
 garage.contact(ball,4,impact);
 if(i%3===0){
  assert(Math.abs(impact.power-1.45)<1e-10,'diamond finisher deals +45 percent on third return');
  assert.equal(impact.sparkle,true,'bonus receives a subtle shard flash');
 }else{
  assert.equal(impact.sparkle,undefined,'ordinary diamond returns retain their normal damage');
 }
 assert.equal(ball.gemReady,false,'charge consumed after first enemy hit');
}
modern.levels.heavy=1;modern.loads[4][1]='heavy';
garage.load(4,modern);
ball.returns=2;
garage.strike(ball,4,.2);
const combined={x:250,y:-360};garage.contact(ball,4,combined);
assert(Math.abs(combined.power-1.45*1.26)<1e-10,'DIVA unique ability stacks with gear upgrades');

const legacy={mechanic:true,tickets:3,badges:2,best:{},levels:{heavy:1},
 loads:[{}, {1:'heavy'}, {}, {}],xp:[3,4,5,6]};
let saved=null;
const storage={
 getItem:key=>key==='zz-growth-v1'?JSON.stringify({version:1,chips:99,levels:{},garage:legacy,claims:{}}):null,
 setItem:(key,value)=>{saved=value;}
};
const app=vm.createContext({window:{ZZGarage:garage},document:{getElementById:()=>null},
 localStorage:storage,console});
vm.runInContext(progSrc,app);
const progress=app.window.ZZProgression;
const migrated=progress.garage();
assert.equal(migrated.loads.length,5,'old saves receive empty fifth loadout');
assert.equal(migrated.xp.length,5,'old saves receive fifth mastery slot');
assert.equal(migrated.xp[3],6,'Wrench mastery preserved');
assert.equal(migrated.tickets,3,'existing radio tickets preserved');
assert.equal(progress.chips(),99,'old wallet preserved');
assert.equal(progress.garageAction('equip','heavy',4),true,'Scarlett can equip garage items');
assert.equal(progress.garage().loads[4][1],'heavy','new hero equipment persists');
assert(saved&&saved.includes('"heavy"'),'fifth-hero loadout saved');

console.log('PASS v274: 4 genuine RGBA WebP assets, five-hero menus and garage, animated still orb, DIVA three-return finisher, legacy save migration');

assert(html.includes('v275-approved-source')&&sw.includes('v275-approved-source'),'v275 art and web app cache reflect newly approved illustration');
assert(game.includes('g.globalAlpha=selectedHero===4?.42:1'),'Scarlet alone has a dimmer normal ball ribbon');
assert(game.includes('if(fxEnabled&&selectedHero!==4)luminous'),'Scarlet loses only the overpowering white halo, not other heroes\' FX');
console.log('PASS v275: newly illustrated transparent 192x192 frames, 256px portrait, round diamond, cache and legible trail');
