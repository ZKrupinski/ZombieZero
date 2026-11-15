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
assert.equal(pack.riaHeadroomVersion,53);
assert(source.includes('const insetY=18'),'the entire eight-cell row receives 18px top headroom');
assert(source.includes('const size=Math.round(CELL*.93)'),'Ria uses the corrected 93% source scale');
assert.equal(pack.image,out);
assert.equal(out.width,1536);
assert.equal(out.height,576);
assert.equal(ops.length,2+8*(1+28)); // one full atlas, one clear and 8×(sprite + 28 source-textured hair scanlines)
assert.equal(ops[0][0],'drawImage');
assert.deepEqual(ops[1].slice(0,5),['clearRect',0,384,1536,192]);
for(let i=0;i<8;i++){
 const base=2+i*29;
 const call=ops[base];
 assert.equal(call[0],'drawImage');
 assert.equal(call[2],i*192); // source frame x
 assert.equal(call[3],384);   // Liam's own source row
 assert.equal(call[4],192);
 assert.equal(call[5],192);
 assert.ok(Math.abs(call[6]-(i*192+7))<0.0001); // 7px integer offset keeps sharp voxel edges
 assert.equal(call[7],402);   // Ria moved 4px down for visible headroom
 assert.ok(Math.abs(call[8]-179)<0.0001);
 assert.ok(Math.abs(call[9]-179)<0.0001);
 const rows=ops.slice(base+1,base+29);
 assert.equal(rows.length,28,'28 measured hair scanlines reconstructed in each frame');
 for(let n=0;n<rows.length;n++){
  const a=rows[n];
  assert.equal(a[0],'drawImage');
  assert.equal(a[5],1,'source is one original pixel row per hair scanline');
  assert.equal(a[7],384+13+n,'restored crown starts at y=13 and reconnects at y=40');
  assert.equal(a[9],1,'each crown row lands on an integer pixel');
  assert(a[2]>=i*192&&a[2]+a[4]<=(i+1)*192,'source copy stays within Ria frame');
  assert(a[6]>=i*192&&a[6]+a[8]<=(i+1)*192,'output cannot bleed into adjacent animation frame');
 }
}
assert.equal(vars['--zz-hero-car-frames'],'url("blob:corrected-liam")');
assert.match(css,/background-image:var\(--zz-hero-car-frames,/);
assert.match(css,/clip-path:inset\(0 0 5px 0\)/); // unchanged Ace/Ruby bleed mask
assert.match(css,/row-2\{background-position:0 -192px;clip-path:none\}/); // Liam-only unmask
assert(source.includes('ctx.imageSmoothingEnabled=false;'),'Ria edges are not blurred by interpolation');
assert(source.includes('restoreRiaCrown(ctx,i,sx,sy,insetX,size);'),'all Ria frames get the voxel crown');
assert(source.includes('const RIA_CROWN_EDGES=['),'crown uses measured per-frame source alpha bounds');
assert(source.includes('const widen=1+.22*Math.pow(1-t,1.1);'),'textured upper hair is widened gradually to the original contour');
assert(!source.includes('function facet('),'no artificial flat-color polygon roof pasted over Ria');
console.log('PASS: Ria 8 frames: 18px headroom, 179px crisp scale, 28 actual textured hair rows per frame and no synthetic hat.');
