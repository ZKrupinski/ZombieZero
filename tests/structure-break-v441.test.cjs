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
box.tickStructureDebris(.65/1.15);box.drawStructureDebris(ctx);
assert(Math.abs(structureDebris[0].t-.65)<1e-9,'visual clock runs 15% faster');
assert.equal(draws.length,80);
const pieces=structureDebris.flatMap(b=>b.pieces);
for(let i=0;i<pieces.length;i++){
 const p=pieces[i],[x,y]=draws[i];
 assert(Math.abs(x-p.x)<=15,'compact horizontal spread at 650ms');
 assert(y>p.y&&y-p.y<80,'all fragments still scatter down, locally');
 assert(Math.abs(y-(p.y+p.vy*.65+114.8*.65*.65))<1e-8,'unchanged vertical trajectory at equal visual age');
 assert(Math.abs(p.vx)<=22.5&&Math.abs(p.vy)<=36,'bounded launch speed');
 assert(Math.abs(p.spin)<=8,'original rotation retained');
}
draws.length=0;box.tickStructureDebris(.35/1.15);box.drawStructureDebris(ctx);
assert(draws.length>0,'debris retains the original lifetime');
assert(draws.every(([x,y])=>Math.abs(x-122)<40&&y<400),'late debris stays closer to destruction point');
box.tickStructureDebris(.41/1.15);assert.equal(structureDebris.length,0);
const pose=box.moleImpactPose({moleHit:.28*(1-.34),moleHitSide:-1});
assert(pose.x<0&&pose.height<.7&&pose.width>1.15);
const rest=box.moleImpactPose({moleHit:0,moleHitSide:1});
assert(Math.abs(rest.x)<.00001&&Math.abs(rest.height-1)<.00001);
assert(s.includes('if(hit.hp<=0)spawnStructureBreak(hit,hpBefore);'));
assert(s.includes('if(hit.hp<=0){removeStructure(hit);destroyedThisStage++'));
assert(s.includes('structureDebris.length=0;queued='));
console.log('PASS v466: five bitmap debris kinds, narrow spread, identical fall path, 15% faster playback, recoil, collider removal');
