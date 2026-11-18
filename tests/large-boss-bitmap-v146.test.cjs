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
 set src(p){
  this._src=p;
  this.naturalHeight=p.endsWith('.webp')?256:1280;
  requested.push(this);
 }
 get src(){return this._src}
}
const w={window:{},Image:FakeImage,Math};
vm.createContext(w);vm.runInContext(source,w);
const pack=w.window.ZZLargeBossSprites;
assert.equal(pack.SPECS.length,2);
assert.deepEqual(Array.from(pack.SPECS,x=>x.bossForm),[2,3]);
assert.equal(requested.length,0,'boss PNG and right atlas both stay lazy');
const calls=[],ctx={save(){},restore(){},drawImage(...args){calls.push(args)}};
for(const [form,name] of [[2,'water_jug'],[3,'large_trash']]){
 const initial=requested.length;
 pack.requestByForm(form);
 assert.equal(requested.length,initial+2,'main and right atlases prefetch together at boss transition');
 const main=requested.find(x=>x.src.endsWith(name+'-v146.png'));
 const right=requested.find(x=>x.src.endsWith(name+'-right-v147.webp'));
 assert(main&&right,'both actual files requested');
 assert.equal(pack.readyByForm(form),false);
 main.onload();
 assert.equal(pack.readyByForm(form),true,'boss is drawable as soon as main atlas is decoded');
 const z={boss:true,bossForm:form,x:125,y:80,w:66,h:88,hitHold:0,recoil:0,moveDir:-1,seed:0,flash:0};
 assert.equal(pack.draw(ctx,z,0),true);
 let a=calls.at(-1);assert.equal(a[0],main);assert.equal(a[1],0);assert.equal(a[2],2*256,'left diagonal retains approved art');
 z.moveDir=1;
 pack.draw(ctx,z,0);a=calls.at(-1);
 assert.equal(a[0],main);assert.equal(a[2],256,'front bitmap is temporary while separate right sheet loads');
 right.onload();
 pack.draw(ctx,z,0);a=calls.at(-1);
 assert.equal(a[0],right,'right diagonal uses dedicated independent bitmap');
 assert.equal(a[1],0);assert.equal(a[2],0,'first right frame from standalone 8x1');
 pack.draw(ctx,z,.25);a=calls.at(-1);
 assert(a[1]>=256,'animated right row advances through independent frames');
 z.hitHold=.1;
 pack.draw(ctx,z,0);a=calls.at(-1);
 assert.equal(a[0],main);assert.equal(a[2],3*256,'hit uses original atlas, not right walk');
 pack.drawDeath(ctx,z,.9,1);a=calls.at(-1);
 assert.equal(a[0],main);assert.equal(a[2],4*256,'death uses original atlas');
 assert(a[7]>0&&a[8]>0);
 const sameCount=requested.length;pack.requestByForm(form);
 assert.equal(requested.length,sameCount,'both decoded atlases reused from cache');
}
for(const name of ['water_jug','large_trash']){
 const file='dist/assets/ip/v2/bosses/'+name+'-right-v147.webp';
 assert(fs.existsSync(file),'right-diagonal bitmap must be committed: '+name);
 const buf=fs.readFileSync(file);
 assert.equal(buf.toString('ascii',0,4),'RIFF','WebP RIFF header');
 assert.equal(buf.toString('ascii',8,12),'WEBP','WebP signature');
 assert.equal(buf.toString('ascii',12,16),'VP8X','WebP alpha-compatible extended container');
 const width=buf[24]+(buf[25]<<8)+(buf[26]<<16)+1;
 const height=buf[27]+(buf[28]<<8)+(buf[29]<<16)+1;
 assert.equal(width,2048,'eight 256px right-diagonal frames');
 assert.equal(height,256,'single separated action strip');
}
assert.ok(!sw.includes("'./assets/ip/v2/bosses/water_jug-right-v147.webp'"),'right images must remain lazy');
assert.ok(!sw.includes("'./assets/ip/v2/bosses/large_trash-right-v147.webp'"),'new assets must not be eagerly precached');
for(const name of ['water_jug','large_trash']){
 const file='dist/assets/ip/v2/bosses/'+name+'-v146.png';
 if(!fs.existsSync(file))continue; // Asset bundle is provided separately.
 const buf=fs.readFileSync(file);
 assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(buf.readUInt32BE(16),2048);
 assert.equal(buf.readUInt32BE(20),1280);
 assert.equal(buf[25],6,'RGBA');
}
console.log('PASS: four bosses, unique right-diagonal bitmap strips for both, lazy decode, no mirror/vector fallback');
