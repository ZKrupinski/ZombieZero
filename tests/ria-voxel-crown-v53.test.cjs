'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const loader=fs.readFileSync('dist/assets/ip/hero-car-attack.js','utf8');
const atlasOps=[],clearOps=[],writes={};
const ctx={
 imageSmoothingEnabled:true,
 save(){},restore(){},
 drawImage(...args){atlasOps.push(args)},
 clearRect(...args){clearOps.push(args)}
};
const canvas={width:0,height:0,getContext:()=>ctx,toBlob:cb=>cb({type:'image/png'})};
class ImageMock{
 constructor(){this.naturalWidth=1536;this.naturalHeight=576;}
 set src(v){this._src=v;}
 get src(){return this._src;}
}
const dom={createElement(kind){assert.equal(kind,'canvas');return canvas},
 documentElement:{dataset:{},style:{setProperty(k,v){writes[k]=v}}}};
const win={URL:{createObjectURL:()=> 'blob:ria-original-textured-crown'}};
vm.runInNewContext(loader,{window:win,document:dom,Image:ImageMock});
const pack=win.ZZHeroCarAttack;pack.image.onload();
assert(pack.ready&&pack.liamReframed);
assert.equal(pack.riaHeadroomVersion,53);
assert.equal(ctx.imageSmoothingEnabled,false,'voxel corners stay crisp, without resample interpolation');
assert.deepEqual(clearOps,[[0,384,1536,192]],'only red-haired sprite row is cleared');
assert.equal(atlasOps.length,1+8*(1+28),'source atlas, eight original car images and 224 original-texture crown rows');
assert.equal(atlasOps[0].length,3,'original full bitmap retains all three characters');
const edges=[[93,132],[94,139],[100,147],[112,148],
             [112,150],[106,147],[115,152],[109,148]];
for(let i=0;i<8;i++){
 const begin=1+i*29,base=atlasOps[begin],rows=atlasOps.slice(begin+1,begin+29);
 assert.deepEqual(base.slice(1,5),[i*192,384,192,192],'the untouched original sprite is framed first');
 assert.deepEqual(base.slice(5),[i*192+7,402,179,179],'integer-pixel transform retains established jeep baseline');
 assert.equal(rows.length,28);
 const [l,r]=edges[i],minX=Math.max(0,l-32),maxX=Math.min(192,r+32),width=maxX-minX;
 for(let j=0;j<28;j++){
  const a=rows[j],t=j/27,srcY=384+2+Math.round(22*t);
  const widen=1+.22*Math.pow(1-t,1.1);
  const expectedWidth=Math.round(width*(179/192)*widen);
  assert.equal(a[1],i*192+minX,'hair source is from its own approved PNG cell');
  assert.equal(a[2],srcY,'the sampled hair texture follows real y=2..24');
  assert.equal(a[3],width);assert.equal(a[4],1,'one source pixel row, no new painted polygons');
  assert.equal(a[6],384+13+j);assert.equal(a[8],1,'the destination line stays within the old row');
  assert.equal(a[7],expectedWidth,'crown is widest at top and tapers into its original head contour');
  assert(a[5]>=i*192&&a[5]+a[7]<=(i+1)*192,'pixel-strip cannot leak across animation cells');
 }
 assert(rows[0][7]>rows[27][7],'the cuboid hair crown is broad at the upper roof, not a narrow perched hat');
}
assert.equal(writes['--zz-hero-car-frames'],'url("blob:ria-original-textured-crown")',
 'title/results and actual play use identical corrected Ria bitmap');
assert(!loader.includes('function facet('),'synthetic flat roof coloring is not used');
assert(loader.includes('ctx.imageSmoothingEnabled=false'),'no blurry cube edges');
console.log('PASS: eight Ria heads now use only original pixel colors with widened, raised cuboid crown; no other hero is modified.');
