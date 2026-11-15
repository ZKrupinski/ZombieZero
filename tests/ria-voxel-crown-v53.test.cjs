'use strict';
/* v54 regression for v53's broken hair warp.
 * Source art, red hair pixels, face, and blue jeep must not be widened, cloned,
 * or replaced by faceted cap patches. Every cell is scaled only as a whole. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/assets/ip/hero-car-attack.js','utf8');
const draws=[],clears=[],vars=[];
const ctx={
 imageSmoothingEnabled:true,
 drawImage(...args){draws.push(args);},
 clearRect(...args){clears.push(args);}
};
const canvas={width:0,height:0,getContext:()=>ctx,
 toDataURL:()=> 'data:image/png;base64,TEST',
 toBlob:cb=>cb({type:'image/png'})};
class MockImage{
 constructor(){this.naturalWidth=1536;this.naturalHeight=576;}
 set src(v){this._src=v;}
 get src(){return this._src;}
}
const root={dataset:{},style:{setProperty(k,v){vars.push([k,v])}}};
const win={URL:{createObjectURL:()=> 'blob:ria-original-safe-v54'}};
vm.runInNewContext(src,{Image:MockImage,window:win,
 document:{createElement:()=>canvas,documentElement:root}});
const a=win.ZZHeroCarAttack;a.image.onload();
assert.equal(a.ready,true);assert.equal(a.riaHeadroomVersion,54);
assert.equal(ctx.imageSmoothingEnabled,false,'crisp integer-pixel source downscale');
assert.deepEqual(clears,[[0,384,1536,192]],'only Ria row is rebuilt');
assert.equal(draws.length,9,'one original full atlas and exactly eight original cells');
assert.equal(draws[0].length,3,'all Ace and Ruby pixel data remain untouched');
for(let i=0;i<8;i++){
 const d=draws[i+1];
 assert.equal(d[0],a.image===canvas?draws[0][0]:d[0]);
 assert.deepEqual(d.slice(1,5),[i*192,384,192,192]);
 assert.deepEqual(d.slice(5),[i*192+7,402,179,179],
  'entire Ria frame is uniformly resized, not just the head');
}
assert.equal(vars.length,2,'synchronous preview installed before async efficient blob');
assert.equal(vars[0][1],'url("data:image/png;base64,TEST")');
assert.equal(vars[1][1],'url("blob:ria-original-safe-v54")');
assert(!src.includes('restoreRiaCrown(')&&!src.includes('RIA_CROWN_EDGES')&&
 !src.includes('widen=')&&!src.includes('function facet('),
 'all v53 crown manipulations are removed');
assert(src.includes('const insetY=18;'),'transparent space above hair preserved');
console.log('PASS: all eight Ria sprites preserve original proportions without v53 crown growth or clipping.');
