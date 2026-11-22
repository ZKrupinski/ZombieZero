'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const base='dist/assets/ip/';
const html=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('dist/garage.css','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const items=[
 ['wrench-idle-v264.webp',768,384,'253bf3a9e82a5ce73d4ebfaea49a72517df79ee5'],
 ['wrench-swing-v264.webp',768,384,'eb3f1efef23c09aff08c088f2f63cb3d95206b7c'],
 ['wrench-mid-v261.webp',192,192,'0c1439fa176911ec6470886b33c1e27d2a35c8fe']
];
for(const [name,w,h,checksum] of items){
 const data=fs.readFileSync(base+name);
 assert.equal(data.toString('ascii',0,4),'RIFF',name+' is a WebP RIFF');
 assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.equal(data.toString('ascii',12,16),'VP8X',name+' carries transparency');
 assert.equal(1+data.readUIntLE(24,3),w,'approved atlas width');
 assert.equal(1+data.readUIntLE(27,3),h,'approved atlas height');
 assert.equal(crypto.createHash('sha1').update(data).digest('hex'),checksum,
  name+' is exactly the processed approved white-haired buggy sheet');
 assert(data.length>10_000,'asset not empty');
}
assert.match(html,/id="wrench-idle" src="assets\/ip\/wrench-idle-v264\.webp\?v=302-approved-buggy"/);
assert.match(html,/id="wrench-swing" src="assets\/ip\/wrench-swing-v264\.webp\?v=302-approved-buggy"/);
assert.match(html,/id="mechanic-art" src="assets\/ip\/wrench-mid-v261\.webp\?v=263-v302-approved-buggy"/);
assert.equal((css.match(/wrench-mid-v261\.webp\?v=263-v302-approved-buggy/g)||[]).length,3,'selection/result/garage share new portrait');
assert.match(sw,/v302-approved-wrench-art/,'service worker cache reloaded');
assert(game.includes("const sheet=$(swinging?'wrench-swing':'wrench-idle')"),'gameplay uses both new animation sheets');
assert(game.includes('(frame%4)*192,Math.floor(frame/4)*192,192,192'),'8 frames packed in 4x2 grid');
assert(game.includes("const size=124"),'hero gameplay size and wheel anchoring unchanged');
assert(game.includes("if(selectedHero===3 && $('wrench-ball-art')"),'steel ball identity untouched');
console.log('PASS v302: actual approved Wrench/buggy PNG converted to three sharp transparent WebP assets, 8 idle + 8 attack frames and matching garage/selection portrait');
