'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const requests=[];
class Image{
 constructor(){this.naturalWidth=900;this.naturalHeight=1420;}
 set src(url){requests.push(url);}
}
const window={};
vm.runInNewContext(fs.readFileSync('dist/assets/stages/stage-backgrounds-v57.js','utf8'),{window,Image});
const art=window.ZZStageArt;
assert.deepEqual(requests,['assets/stages/bg-01.webp']);
art.retain(14,-1);art.load(14);art.load(14);
assert.deepEqual(requests.slice(1),['assets/stages/bg-15-v66-orthographic.webp']);
art.images[14].onload();
assert(art.ready[14]);
art.load(15);
assert.equal(requests[2],'assets/stages/bg-16.webp');
assert(art.loading[15]);
const stale=art.images[15];
art.retain(0,-1);stale.onload();
assert.equal(art.ready[15],false);
for(let i=0;i<art.count;i++){
 art.load(i);
 assert(fs.existsSync('dist/'+requests.at(-1)));
 art.images[i].onerror();
 assert.equal(art.loading[i],false);
}
