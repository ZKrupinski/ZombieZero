'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root='dist/assets/ip/v2/elite-zombies-v145.js';
const expectedAssets=[
 ['trash-bag-v145.png',1537571],
 ['volume-bag-v145.png',1693436],
 ['water-bottle-v145.png',1529756]
];
for(const [file,bytes] of expectedAssets){
 const asset=fs.readFileSync('dist/assets/ip/v2/elites/'+file);
 assert.equal(asset.length,bytes,'approved original bitmap length: '+file);
 assert.equal(asset.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG signature: '+file);
 assert.equal(asset.readUInt32BE(16),1344,'8 columns / full resolution: '+file);
 assert.equal(asset.readUInt32BE(20),1176,'7 rows / full resolution: '+file);
 assert.equal(asset.readUInt8(25),6,'RGBA transparency channel: '+file);
}
const loader=fs.readFileSync(root,'utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const requested=[];
class FakeImage{
 constructor(){this.naturalWidth=1344;this.naturalHeight=1176;}
 set src(value){this.path=value;requested.push(this);}
}
const world={window:{},Image:FakeImage,Math};
vm.createContext(world);
vm.runInContext(loader,world);
const elite=world.window.ZZEliteSprites;
assert.equal(elite.SPECS.length,3);
assert.deepEqual(Array.from(elite.SPECS,s=>s.unlock),[3,5,7]);
elite.requestForStage(2);assert.equal(requested.length,0);
elite.requestForStage(3);assert.equal(requested.length,1);
requested[0].onload();assert.equal(elite.cache[0].ready,true);
const g={drawCalls:[],save(){},restore(){},drawImage(...args){this.drawCalls.push(args)}};
const z={x:42,y:72,w:33,h:44,kind:0,form:0,eliteKind:0,moveDir:0,seed:0,recoil:0,hitHold:0,flash:0};
assert.equal(elite.draw(g,z,0),true);
assert.equal(g.drawCalls.at(-1)[3],1344/8);
z.moveDir=-1;elite.draw(g,z,0);
assert.equal(g.drawCalls.at(-1)[2],2*(1176/7));
z.moveDir=1;elite.draw(g,z,0);
assert.equal(g.drawCalls.at(-1)[2],3*(1176/7));
const before=g.drawCalls.length;
assert.equal(elite.drawDeath(g,z,.3,.72),true);
assert.equal(g.drawCalls.length,before+1);
assert.equal(g.drawCalls.at(-1)[2],6*(1176/7));
const start=game.indexOf('const ELITE_FIRST_STAGES=');
const end=game.indexOf('function stageRoster(',start);
assert.ok(start>0&&end>start,'registration function exists');
const ctx={window:world.window,Math,zombieHP:(f,kind)=>3+kind,runMode:'campaign'};
vm.createContext(ctx);
vm.runInContext(game.slice(start,end),ctx);
const actors=()=>Array.from({length:30},(_,i)=>({form:i<6?7:0,boss:false,row:Math.floor(i/9),col:i%9,kind:0,hp:3,max:3}));
ctx.actors=actors();ctx.stage=3;
vm.runInContext('insertEliteZombies(actors,stage)',ctx);
assert.equal(ctx.actors.filter(z=>z.eliteKind===0).length,1);
assert.equal(ctx.actors.filter(z=>z.form===7).length,6,'existing enemies preserved');
elite.requestForStage(5);requested[1].onload();
ctx.actors=actors();ctx.stage=5;
vm.runInContext('insertEliteZombies(actors,stage)',ctx);
assert.equal(ctx.actors.filter(z=>Number.isInteger(z.eliteKind)).length,2);
assert.ok(ctx.actors.some(z=>z.eliteKind===1),'newly unlocked bag appears');
elite.requestForStage(7);requested[2].onload();
ctx.actors=actors();ctx.stage=7;
vm.runInContext('insertEliteZombies(actors,stage)',ctx);
assert.ok(ctx.actors.some(z=>z.eliteKind===2),'water bottle appears at stage 7');
assert.match(html,/elite-zombies-v145\.js/);
assert.match(game,/ZZEliteSprites\.drawDeath/);
assert.match(game,/prepareStageArt\(wave\+1\)/);
console.log('v145 3-elite loader, front/diagonal sprites, normal death, wave spawn & lazy load OK');
