'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('dist/assets/stages/stage-backgrounds-v57.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const packed=fs.readFileSync('dist/assets/stages/bg-09-18-v57-stored.zip');
assert(js.includes("fetch(archive).then"),'the game reads one verified packed WebP bundle');
assert(!js.includes('.webp.b64')&&!js.includes('data:image/webp;base64'),
 'no legacy text image decoder may be used');
assert(html.includes('stage-backgrounds-v57.js?v=66-exact-lanes'));
assert(sw.includes("'./assets/stages/stage-backgrounds-v57.js'"));
assert(sw.includes("'./assets/stages/bg-09-18-v57-stored.zip'"));
assert(sw.includes('zombie-zero-shell-v87-projected-ground-reflection'));
assert(game.includes('const STAGE_ART_COUNT=18;'));
assert(game.includes('const STAGE_FADE_SECONDS=.9;'));
assert(game.includes('const ROAD_LEFT=36,ROAD_RIGHT=414'),
 'existing playfield collision boundaries must remain untouched');
assert(game.includes('if(!newReady&&!oldReady){proceduralBackground();return}'),
 'missing background still renders previous procedural road');

async function main(){
 const images=[],created=[],revoked=[],fetches=[];
 class FakeImage{
  constructor(){this.naturalWidth=900;this.naturalHeight=1420;this.decoding='';images.push(this)}
  set src(v){
   this._src=v;
   if(v.startsWith('blob:'))this.onload();
  }
  get src(){return this._src}
 }
 const window={};
 const URL={
  createObjectURL(blob){created.push(blob);return 'blob:stage-'+created.length},
  revokeObjectURL(url){revoked.push(url)}
 };
 const fetch=(url)=>{
  fetches.push(url);
  return Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(
   packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength))});
 };
 vm.runInNewContext(js,{window,Image:FakeImage,URL,Blob,fetch});
 await new Promise(resolve=>setImmediate(resolve));
 const art=window.ZZStageArt;
 assert.equal(art.count,18);
 assert.equal(art.version,57);
 assert.deepEqual([art.sourceWidth,art.sourceHeight],[900,1420]);
 assert.equal(images.length,18);
 assert.equal(fetches.length,1,'fetch archive only once');
 assert.equal(fetches[0],'assets/stages/bg-09-18-v57-stored.zip?v=57-gameplay-camera');
 for(let i=0;i<8;i++){
  assert.equal(images[i].src,'assets/stages/bg-'+String(i+1).padStart(2,'0')+
   '.webp?v=45-original-scenes','first eight scenes are not replaced');
  images[i].onload();assert.equal(art.ready[i],true);
 }
 assert.equal(created.length,8,'only 8 remaining ZIP entries become blob images');
 assert.equal(images[8].src,'assets/stages/bg-09-v66-orthographic.webp?v=66-exact-lanes');
 assert.equal(images[14].src,'assets/stages/bg-15-v66-orthographic.webp?v=66-exact-lanes');
 assert.equal(revoked.length,8,'release the eight remaining ZIP Blob URLs');
 assert(created.every(blob=>blob.type==='image/webp'&&blob.size>100000),
  'every stage uses the real original compressed WebP pixel data');
 for(let i=8;i<18;i++){
  if(i===8||i===14)images[i].onload();
  assert.equal(art.ready[i],true,'stage '+(i+1)+' loaded and correctly sized');
  if(i!==8&&i!==14)
   assert.equal(images[i].src,'blob:stage-'+(i-7-(i>8?1:0)-(i>14?1:0)));
 }
 images[8].naturalWidth=899;images[8].onload();
 assert.equal(art.ready[8],false,'wrong source width is rejected');
 images[9].onerror();
 assert.equal(art.ready[9],false,'bad art uses procedural fallback');

 // Archive failures must never produce an uncaught asynchronous exception.
 const failed={};
 const rejected=()=>Promise.reject(new Error('offline archive missing'));
 vm.runInNewContext(js,{window:failed,Image:FakeImage,URL,Blob,fetch:rejected});
 await new Promise(resolve=>setImmediate(resolve));
 assert(failed.ZZStageArt.ready.slice(8).every(x=>x===false),
  'all ten new scenes fail safely if archive is missing');
 console.log('PASS: original 8 and packed 8 preserved; orthographic stage 09 and 15, ready/fallback, 18-wave loop and unchanged physics.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
