'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm');
const loader=fs.readFileSync('dist/assets/stages/stage-backgrounds-v57.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const index=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const approved=[
 ['zz-bg-new-01-mars_greenhouse.webp','d85e3a7ffa979284c908556da450f9696c9dd70ea83c0721abd04950af0cd92d'],
 ['zz-bg-new-02-abyssal_lab.webp','e3c1d4a1843ae9277ea17f41c06ab872609b4c4ecad57e7de0bfcd9924127363'],
 ['zz-bg-new-03-egyptian_temple.webp','8eb0645b11dc1bdd364409676c99c53a2c6c81eae8da60722155ed26b66a8155'],
 ['zz-bg-new-04-abandoned_arcade.webp','cdd482f7c069ae02cff355aa550f0d47c4894eeea2403b6c00633a1e486fd757'],
 ['zz-bg-new-05-cyber_subway.webp','ede7a15f879e3d3338bd4c749c0d45c2af3f055bcc9f0341e2a3801efc028028'],
 ['zz-bg-new-06-orbital_cargo.webp','383b92e75a027aadfe4f0de4507c6908e492bfc1a1bde2f27d5aae7994da93db'],
 ['zz-bg-new-07-fungal_crystal.webp','f65679effa64b666f73dfd230e06659ea61b2b2caddeaad316a6ce0ef325c54f'],
];
assert.equal(approved.length,7);
const seen=new Set();
for(const [file,sha] of approved){
 const buffer=fs.readFileSync('dist/assets/stages/'+file);
 assert.equal(buffer.subarray(0,4).toString('ascii'),'RIFF',file);
 assert.equal(buffer.subarray(8,12).toString('ascii'),'WEBP',file);
 assert.equal(buffer.subarray(12,16).toString('ascii'),'VP8 ',file);
 assert.equal(buffer.readUInt16LE(26)&0x3fff,900,file+' width');
 assert.equal(buffer.readUInt16LE(28)&0x3fff,1420,file+' height');
 assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'),sha,'original file bytes retained');
 assert(buffer.length>100000&&buffer.length<240000,'asset remains modest mobile size');
 assert(!sw.includes(file),'new scenes not eagerly stored in PWA install cache');
 seen.add(sha);
}
assert.equal(seen.size,7,'all new stage images visually distinct at byte level');
for(const bad of ['zz-bg-new-08-','zz-bg-new-09-','zz-bg-new-10-']){
 assert(!loader.includes(bad),'rejected images are never loaded');
}
assert(game.includes('const STAGE_ART_COUNT=25;'),'original eighteen + seven new backgrounds');
assert(index.includes('-v158-seven-arenas')&&sw.includes('-v158-seven-arenas'));
assert(loader.includes('img.naturalWidth===900&&img.naturalHeight===1420'));
const requested=[];
class FakeImage {
 constructor(){this.decoding='async';this.naturalWidth=900;this.naturalHeight=1420}
 set src(s){this._src=s;requested.push(s);}
 get src(){return this._src;}
 decode(){return Promise.resolve()}
}
const context={Image:FakeImage,window:{}};
vm.createContext(context);vm.runInContext(loader,context);
const stage=context.window.ZZStageArt;
assert.equal(stage.count,25);
assert.equal(stage.themes.length,25);
assert.equal(stage.images.length,25);
assert.equal(stage.ready.length,25);
assert.equal(stage.loading.length,25);
assert.deepEqual(requested,['assets/stages/bg-01.webp'],'only the title screen scene preloads');
for(let i=0;i<7;i++){
 stage.load(18+i);
 assert.equal(requested.at(-1),'assets/stages/'+approved[i][0],'new scene '+(i+19)+' source');
}
assert.equal(requested.length,8,'all seven new assets only loaded when called');
stage.load(18);
assert.equal(requested.length,8,'repeat requests do not load images again');
stage.retain(24,23);
for(let i=0;i<23;i++)assert.equal(stage.images[i],undefined,'expired background freed from memory');
assert(stage.images[23]&&stage.images[24],'last two backgrounds remain during crossfade');
stage.load(13);
assert.equal(requested.at(-1),'assets/stages/bg-14-v157-orthographic.webp','winter correction retained');
console.log('PASS V158: seven exact approved original WebP images, 900x1420, stages 19-25, 25-scene lazy rotation, no 8-10, winter untouched');
