'use strict';
// The original approved WHITE 50L in-game sprite is the only target.
// Test the real per-pixel alpha choker; it must never redraw the zombie.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root='dist/assets/ip/v2/';
const src=fs.readFileSync(root+'elite-zombies-v145.js','utf8');
const original=fs.readFileSync(root+'elites/volume-bag-v145.png');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert.equal(original.length,1693436,'approved original white 50L PNG bytes remain untouched');
assert.equal(original.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(original.readUInt32BE(16),1344);
assert.equal(original.readUInt32BE(20),1176);
assert(src.includes("file:'volume-bag-v145.png'"),'source approved atlas, never generated replacement');
assert(src.includes('function trimVolumeBagFrame(imageData)'),'50L-specific sharp-alpha cleanup available');
assert(src.includes('function isolateVolumeBagAtlas(img)'),'cleaned copy of existing 8x7 atlas');
assert(src.includes('if(kind===1){try{s.cleanImage=isolateVolumeBagAtlas(img)}'),
 'only white 50L elite gets the matte-choke; black bag and bottle art stay intact');
const i=src.indexOf('function trimVolumeBagFrame(imageData){');
const j=src.indexOf('function isolateVolumeBagAtlas(img){',i);
assert(i>=0&&j>i);
const context={Uint8Array,Math};
vm.createContext(context);vm.runInContext(src.slice(i,j),context);
const w=28,h=28,px=new Uint8ClampedArray(w*h*4);
function set(x,y,alpha,r=239,g=234,b=231){
 const k=(y*w+x)*4;px[k]=r;px[k+1]=g;px[k+2]=b;px[k+3]=alpha;
}
for(let y=7;y<=19;y++)for(let x=8;x<=19;x++)set(x,y,255,119,148,162);
for(let y=7;y<=19;y++){set(7,y,160,245,245,245);set(6,y,140,251,251,251);set(5,y,85);}
set(2,2,180);set(3,3,40); // disconnected blurry fog
const before=px.slice();
context.testImage={width:w,height:h,data:px};
vm.runInContext('trimVolumeBagFrame(testImage)',context);
const a=(x,y)=>px[(y*w+x)*4+3];
assert.equal(a(12,12),255,'fully opaque WHITE trash bag unchanged');
assert.equal(a(8,12),255,'body silhouette itself is not eroded');
assert(a(7,12)<160&&a(7,12)>0,'nearest fringe becomes thin antialias instead of white haze');
assert.equal(a(6,12),0,'2px outer glow/matte is removed');
assert.equal(a(5,12),0,'wider low-opacity haze removed');
assert.equal(a(2,2),0,'isolated fog completely removed');
assert.equal(a(3,3),0,'detached low-alpha dust removed');
for(let k=0;k<px.length;k+=4){
 assert.equal(px[k],before[k],'original red channel preserved');
 assert.equal(px[k+1],before[k+1],'original green channel preserved');
 assert.equal(px[k+2],before[k+2],'original blue channel preserved');
}
assert(src.includes('const ATLAS_COLS=8,ATLAS_ROWS=7'),
 'all original 56 frames and animation mapping preserved');
assert(src.includes('frame(ctx,s.cleanImage||s.image,row,col')&&
 src.includes('frame(ctx,cache[z.eliteKind].cleanImage||img,CLIPS.death'),
 'real playable idle/walk/attack/hit AND death use the same cleaned 50L image');
assert(html.includes('elite-zombies-v145.js?v=253-original-50l-sharp-alpha'),
 'game entrypoint loads only the latest 50L cleanup loader');
assert(sw.includes('v253-original-50l-sharp-alpha'),
 'mobile offline cache refreshes cleaned original atlas');
console.log('PASS v253: existing original 50L white bag ONLY, opaque colors/poses kept, 2px white fringe eliminated, 56 frames and death retained.');
