'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dist/assets/ip/v2/large-bosses-v146.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert.match(game,/const BOSS_FORMS=\['빅 좀비','쓰레기통 좀비','대형 생수통 좀비','큰 쓰레기 좀비'\]/);
assert.ok(html.includes('large-bosses-v146.js'));
assert.ok(sw.includes('./assets/ip/v2/large-bosses-v146.js'));
assert.ok(sw.includes('const boss='));
assert.ok(!sw.includes("'./assets/ip/v2/bosses/water_jug-v146.png'"),'large images must be fetched lazily');
assert.ok(!game.includes('function enemyHead('),'legacy procedural zombie artist removed');
assert.ok(!game.includes('function drawCriticalGreenDeath('),'legacy procedural death fallback removed');
assert.ok(!game.includes('function scatterEnemy('),'generic procedural fragments removed');
assert.ok(game.includes('window.ZZLargeBossSprites.drawDeath(g,d.z,elapsed,duration)'));
const requested=[];
class FakeImage {
 constructor(){this.naturalWidth=2048;this.naturalHeight=1280;this.decoding='async'}
 set src(p){this._src=p;requested.push(this)}
 get src(){return this._src}
}
const w={window:{},Image:FakeImage,Math};
vm.createContext(w);vm.runInContext(source,w);
const pack=w.window.ZZLargeBossSprites;
assert.equal(pack.SPECS.length,2);
assert.deepEqual(Array.from(pack.SPECS,x=>x.bossForm),[2,3]);
assert.equal(requested.length,0,'no eager PNG loading at script startup');
pack.requestByForm(2);assert.equal(requested.length,1);
assert.equal(pack.readyByForm(2),false);
requested[0].onload();assert.equal(pack.readyByForm(2),true);
pack.requestByForm(3);assert.equal(requested.length,2);
requested[1].onload();assert.equal(pack.readyByForm(3),true);
const calls=[],ctx={save(){},restore(){},drawImage(...args){calls.push(args)}};
for(const form of [2,3]){
 const z={boss:true,bossForm:form,x:125,y:80,w:66,h:88,hitHold:0,recoil:0,moveDir:-1,seed:0,flash:0};
 assert.equal(pack.draw(ctx,z,0),true);
 let a=calls.at(-1);assert.equal(a[1],0);assert.equal(a[2],2*256,'side walk uses separate source row');
 z.moveDir=1;pack.draw(ctx,z,0);a=calls.at(-1);
 assert.equal(a[2],256,'missing unique right walk falls back to front, NEVER mirrors details');
 z.hitHold=.1;pack.draw(ctx,z,0);a=calls.at(-1);assert.equal(a[2],3*256);
 pack.drawDeath(ctx,z,.9,1);a=calls.at(-1);assert.equal(a[2],4*256);
 assert(a[7]>0&&a[8]>0);
}
for(const name of ['water_jug','large_trash']){
 const file='dist/assets/ip/v2/bosses/'+name+'-v146.png';
 if(!fs.existsSync(file))continue; // Asset bundle is provided separately.
 const buf=fs.readFileSync(file);
 assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(buf.readUInt32BE(16),2048);
 assert.equal(buf.readUInt32BE(20),1280);
 assert.equal(buf[25],6,'RGBA');
}
console.log('PASS: 4-boss rotation, PNG-only renderer, deferred loading, no vector fallback');
