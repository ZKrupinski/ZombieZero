'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');

const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const root='art/approved/scarlet-original-30665.png';
assert(fs.existsSync(root),'user-approved 1254px reference must be kept in source control');
assert.equal(sha(root),'989c9e2b9f4c6b8be262e6dc8acca72a7824af8d6426835e314fd9830e328629',
 'reference may not be replaced by a redrawn/off-model illustration');
const source=fs.readFileSync(root);
assert.equal(source.toString('hex',0,8),'89504e470d0a1a0a','approved master is a PNG');
assert.equal(source.readUInt32BE(16),1254);
assert.equal(source.readUInt32BE(20),1254);
const assets=[
 ['scarlet-idle-v276.webp',768,384,'ceddff8d1c954d3eb9ee5163108d738d7f8a2d9441b25b9add95b1bb7bd74110'],
 ['scarlet-attack-v276.webp',768,384,'7105867eb01a67f8db7e9d1c081cbff4bbee23f9b98a4770aa7916bd1a0749a8'],
 ['scarlet-portrait-v276.webp',256,256,'451b38d8a6b84f6bba1c72458178aca0466d5fa318392d76d6c8c9809989a1d0']
];
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const ui=fs.readFileSync('dist/garage-ui.js','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
for(const [name,w,h,hash] of assets){
 const path='dist/assets/ip/'+name;
 assert.equal(sha(path),hash,name+' must use the clean source-based art, not the old checkerboard atlas');
 const buf=fs.readFileSync(path);
 assert.equal(buf.toString('ascii',0,4),'RIFF');
 assert.equal(buf.toString('ascii',8,12),'WEBP');
 assert.equal(buf.toString('ascii',12,16),'VP8X');
 assert(buf[20]&16,name+' retains true alpha transparency');
 assert.equal(buf[24]+(buf[25]<<8)+(buf[26]<<16)+1,w,name+' pixel width');
 assert.equal(buf[27]+(buf[28]<<8)+(buf[29]<<16)+1,h,name+' pixel height');
 assert(html.includes('src="assets/ip/'+name+'"'),name+' is actually loaded by the game');
 assert(sw.includes("'./assets/ip/"+name+"'"),name+' is cached for offline play');
}
assert(ui.includes('scarlet-portrait-v276.webp'),'garage uses reference-matched static portrait');
assert(css.includes('scarlet-portrait-v276.webp'),'character selection uses full original portrait');
assert(!html.includes('scarlet-idle-v275.webp')&&!html.includes('scarlet-attack-v275.webp'),
 'do not render previous inaccurate cutout sprites');
assert(html.includes('v276-exact-master-clean-alpha')&&sw.includes('v276-exact-master-clean-alpha'),
 'new resource files and app shell must invalidate the 2026-11-22 service worker');
console.log('PASS v276: approved original SHA256, 192x192 clean-alpha animation cells, fixed portrait and cache version');
