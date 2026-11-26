'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('dist/fortress-mode.js','utf8');
const begin=s.indexOf('function moleImpactPose('),end=s.indexOf('// Devices act only when',begin);
assert(begin>=0&&end>begin);
const structureDebris=[],structureDebrisArt=new Map(),art={};
const box={Math,structureDebris,structureDebrisArt,MAX_HP:30,BARRICADE_FRAME:56,stage:1,
 structureSize:()=>44,bitmapTiles:()=>art,parts:art,
 document:{createElement:()=>({getContext:()=>({drawImage(){}})})},paintMachine(){}};
vm.createContext(box);vm.runInContext(s.slice(begin,end),box);
for(const kind of ['wall','bollard','ice','lure','saw'])box.spawnStructureBreak({kind,id:3,x:100,y:200,raised:true},4);
assert.equal(structureDebris.length,5);assert.equal(structureDebrisArt.size,5);
for(const b of structureDebris)assert.equal(b.pieces.length,16);
const draws=[],ctx={save(){},restore(){},translate(x,y){draws.push([x,y])},rotate(){},drawImage(){}};
box.tickStructureDebris(.65);box.drawStructureDebris(ctx);
assert.equal(draws.length,80);assert(draws.every(([x,y])=>y>230),'all fragments scatter down under gravity');
box.tickStructureDebris(.76);assert.equal(structureDebris.length,0);
const pose=box.moleImpactPose({moleHit:.28*(1-.34),moleHitSide:-1});
assert(pose.x<0&&pose.height<.7&&pose.width>1.15);
const rest=box.moleImpactPose({moleHit:0,moleHitSide:1});
assert(Math.abs(rest.x)<.00001&&Math.abs(rest.height-1)<.00001);
assert(s.includes('if(hit.hp<=0)spawnStructureBreak(hit,hpBefore);'));
assert(s.includes('if(hit.hp<=0){removeStructure(hit);destroyedThisStage++'));
assert(s.includes('structureDebris.length=0;queued='));
console.log('PASS v441: five bitmap debris kinds, downward flight, expiry, recoil, collider removal');
