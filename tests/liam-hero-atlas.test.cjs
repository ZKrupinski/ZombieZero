'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'dist/assets/ip/hero-car-attack.js'),'utf8');
const css=fs.readFileSync(path.join(root,'dist/style.css'),'utf8');
const ops=[],vars={};
class FakeImage {
 constructor(){this.naturalWidth=1536;this.naturalHeight=576;this.onload=null;this.onerror=null;}
 set src(value){this._src=value;}
 get src(){return this._src;}
}
const out={
 width:0,height:0,
 getContext:()=>({
  drawImage:(...args)=>ops.push(['drawImage',...args]),
  clearRect:(...args)=>ops.push(['clearRect',...args]),
  save:()=>{},restore:()=>{}, // real Canvas contexts support scanline crown transforms
  imageSmoothingEnabled:false,
  imageSmoothingQuality:'low',
 }),
 toBlob:(cb)=>cb({type:'image/png'})
};
const canvas={
 createElement:type=>{assert.equal(type,'canvas');return out;},
 documentElement:{
  dataset:{},
  style:{setProperty:(key,val)=>{vars[key]=val}}
 }
};
const sandbox={window:{URL:{createObjectURL:()=> 'blob:corrected-liam'}},document:canvas,Image:FakeImage};
vm.runInNewContext(source,sandbox);
const pack=sandbox.window.ZZHeroCarAttack;
assert.ok(pack);
assert.equal(pack.image.naturalWidth,1536);
pack.image.onload();
assert.equal(pack.ready,true);
assert.equal(pack.liamReframed,true);
assert.equal(pack.riaHeadroomVersion,54);
assert(source.includes('const insetY=18'),'the entire eight-cell row receives 18px top headroom');
assert(source.includes('const size=Math.round(CELL*.93)'),'Ria uses the corrected 93% source scale');
assert.equal(pack.image,out);
assert.equal(out.width,1536);
assert.equal(out.height,576);
assert.equal(ops.length,10); // one full atlas, one row clear and exactly 8 UNWARPED sprite cells
assert.equal(ops[0][0],'drawImage');
assert.deepEqual(ops[1].slice(0,5),['clearRect',0,384,1536,192]);
for(let i=0;i<8;i++){
 const call=ops[i+2];
 assert.equal(call[0],'drawImage');
 assert.equal(call[2],i*192); // source frame x
 assert.equal(call[3],384);   // Liam's own source row
 assert.equal(call[4],192);
 assert.equal(call[5],192);
 assert.ok(Math.abs(call[6]-(i*192+7))<0.0001); // 7px integer offset keeps sharp voxel edges
 assert.equal(call[7],402);   // Ria moved 4px down for visible headroom
 assert.ok(Math.abs(call[8]-179)<0.0001);
 assert.ok(Math.abs(call[9]-179)<0.0001);
}
assert.equal(vars['--zz-hero-car-frames'],'url("blob:corrected-liam")');
assert.match(css,/background-image:var\(--zz-hero-car-frames,/);
assert.match(css,/clip-path:inset\(0 0 5px 0\)/); // unchanged Ace/Ruby bleed mask
assert.match(css,/row-2\{background-position:0 -192px;clip-path:none\}/); // Liam-only unmask
assert(source.includes('ctx.imageSmoothingEnabled=false;'),'Ria edges are not blurred by interpolation');
assert(!source.includes('restoreRiaCrown('),'no hair warping, cloning or reshaping is allowed');
assert(!source.includes('const RIA_CROWN_EDGES='),'no content-dependent red-hair widening');
assert(source.includes("canvas.toDataURL('image/png')"),'sync padded mobile portrait while blob is pending');
console.log('PASS: 8 untouched Ria source images uniformly fitted with 18px top margin; other rows preserved.');
