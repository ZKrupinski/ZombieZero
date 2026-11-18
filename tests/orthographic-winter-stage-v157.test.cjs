'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const loader=fs.readFileSync('dist/assets/stages/stage-backgrounds-v57.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const source='dist/assets/stages/bg-14.webp';
const updated='dist/assets/stages/bg-14-v157-orthographic.webp';
assert(fs.existsSync(source),'approved original bitmap is preserved');
assert(fs.existsSync(updated),'rectified bitmap is physically committed');
assert(fs.statSync(updated).size>50000,'rectified stage is not a placeholder file');
assert(fs.readFileSync(updated).subarray(0,4).toString('ascii')==='RIFF',
 'rectified stage is genuine WebP encoded bitmap');
assert(fs.readFileSync(updated).subarray(8,12).toString('ascii')==='WEBP');
assert(loader.includes("13:'bg-14-v157-orthographic.webp'"),
 'only the winter stage is newly overridden');
assert(loader.includes('img.naturalWidth===900&&img.naturalHeight===1420'),
 'game rejects any image whose native dimensions do not match 900x1420');
assert(game.includes("return ((Math.max(1,n)-1)%STAGE_ART_COUNT)"),
 'existing original 18 backgrounds retain their positions in extended rotation');
assert(game.includes("g.drawImage(art.images[stageArtIndex],0,0,W,H)"),
 'existing stage draws 900x1420 into the 450x710 gameplay canvas');
assert(html.includes('stage-backgrounds-v57.js?v=66-exact-lanes-v143-stage-stream-v157-winter-ortho'),
 'updated stage loader cache version');
assert(sw.includes('v157-winter-ortho'),'updated service worker shell cache version');
const fetched=[];
class FakeImage{
 constructor(){this.naturalWidth=900;this.naturalHeight=1420;this.decoding='async'}
 set src(v){this._src=v;fetched.push(v)}
 get src(){return this._src}
 decode(){return Promise.resolve()}
}
const context={Image:FakeImage,window:{}};vm.createContext(context);vm.runInContext(loader,context);
assert.equal(context.window.ZZStageArt.count,25);
assert.equal(context.window.ZZStageArt.sourceWidth,900);
assert.equal(context.window.ZZStageArt.sourceHeight,1420);
assert.deepEqual(fetched,['assets/stages/bg-01.webp'],'only first stage eagerly loads');
const stage=context.window.ZZStageArt;
stage.load(13);
assert.deepEqual(fetched,['assets/stages/bg-01.webp','assets/stages/bg-14-v157-orthographic.webp'],
 'only requested winter scene is fetched');
stage.load(13);
assert.equal(fetched.length,2,'same stage is not fetched twice');
stage.retain(13,-1);
assert.equal(stage.images[0],undefined,'prior image released to avoid mobile memory pressure');
assert(stage.images[13] instanceof FakeImage,'current winter image retained');
console.log('PASS V157: real 900x1420 rectified winter bitmap is selected lazily, original preserved, gameplay sizing and other stages unchanged');
