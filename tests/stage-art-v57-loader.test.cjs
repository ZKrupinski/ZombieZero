'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('dist/assets/stages/stage-backgrounds-v57.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const images=[];
class TestImage{
 constructor(){this.naturalWidth=900;this.naturalHeight=1420;this.decoding='';images.push(this)}
 set src(v){this._src=v}
 get src(){return this._src}
}
const window={};
vm.runInNewContext(js,{window,Image:TestImage});
const art=window.ZZStageArt;
assert(art&&art.count===18&&art.version===57);
assert.equal(art.sourceWidth,900);
assert.equal(art.sourceHeight,1420);
assert.equal(art.images.length,18);
assert.equal(art.ready.length,18);
assert(art.ready.every(v=>v===false),'no image is ready until its WebP actually decodes');
for(let i=0;i<18;i++){
 const n=String(i+1).padStart(2,'0');
 assert.equal(art.images[i].src,
  'assets/stages/bg-'+n+'.webp?v='+(i<8?'45-original-scenes':'57-playfield-camera'));
 assert(sw.includes("'./assets/stages/bg-"+n+".webp'"),'native bitmap preloaded stage '+n);
}
assert(!js.includes('.webp.b64')&&!js.includes('data:image/webp;base64'),
 'no text-decoding or base64 URL path remains in production scene loader');
assert(html.includes('stage-backgrounds-v57.js?v=57-gameplay-camera'),
 'new stage loader is in production HTML');
assert(sw.includes("'./assets/stages/stage-backgrounds-v57.js'"));
assert(sw.includes('zombie-zero-shell-v57-gameplay-backgrounds'));
art.images[8].onload();
assert.equal(art.ready[8],true,'stage 9 becomes ready after correctly sized decode');
art.images[8].naturalWidth=1;
art.images[8].onload();
assert.equal(art.ready[8],false,'incorrect image size must not show a distorted scene');
art.images[9].onerror();
assert.equal(art.ready[9],false,'failed image remains unloaded for legacy procedural fallback');
assert(game.includes('const STAGE_ART_COUNT=18;'));
assert(game.includes('const STAGE_FADE_SECONDS=.9;'));
assert(game.includes('if(!newReady&&!oldReady){proceduralBackground();return}'));
assert(game.includes('const ROAD_LEFT=36,ROAD_RIGHT=414'),
 'previous shared physics corridor is not altered by image replacement');
console.log('PASS: stages 1-8 unchanged, direct WebP 9-18, dimensions, correct fallback, cache, 18-stage cycle, unchanged physics.');
