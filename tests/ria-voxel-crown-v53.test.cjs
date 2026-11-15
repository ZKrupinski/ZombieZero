'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/assets/ip/hero-car-attack.js','utf8');
const draw=[],clear=[],facets=[],voxels=[],writes={};
let points=[];
const context={
 imageSmoothingEnabled:true,fillStyle:'#000',
 save(){},restore(){},
 drawImage(...a){draw.push(a)},
 clearRect(...a){clear.push(a)},
 beginPath(){points=[]},
 moveTo(x,y){points.push([x,y])},
 lineTo(x,y){points.push([x,y])},
 closePath(){},
 fill(){facets.push({color:this.fillStyle,points:points.slice()})},
 fillRect(x,y,w,h){voxels.push({color:this.fillStyle,x,y,w,h})}
};
const buffer={width:0,height:0,getContext:()=>context,toBlob:cb=>cb({type:'image/png'})};
class FakeImage{
 constructor(){this.naturalWidth=1536;this.naturalHeight=576;this.decoding='';}
 set src(v){this._src=v;}
 get src(){return this._src;}
}
const dom={createElement(type){assert.equal(type,'canvas');return buffer},
 documentElement:{dataset:{},style:{setProperty(k,v){writes[k]=v}}}};
const win={URL:{createObjectURL:()=> 'blob:ria-faceted-crown'}};
vm.runInNewContext(source,{Image:FakeImage,window:win,document:dom});
const art=win.ZZHeroCarAttack;art.image.onload();
assert.equal(art.ready,true);
assert.equal(art.liamReframed,true);
assert.equal(art.riaHeadroomVersion,53);
assert.equal(buffer.width,1536);assert.equal(buffer.height,576);
assert.equal(context.imageSmoothingEnabled,false,'no interpolation blurring cube corners');
assert.equal(draw.length,9,'one original full atlas + 8 real Ria sprite cell copies');
assert.equal(clear.length,1,'only the red-haired third row is cleared');
assert.deepEqual(clear[0],[0,384,1536,192]);
assert.equal(facets.length,8*4,'every one of eight Ria frames has four planar top/front/right facets');
assert.equal(voxels.length,8*3,'each roof keeps crisp small square voxel texture');
for(let i=0;i<8;i++){
 const a=draw[i+1];assert.deepEqual(a.slice(1,5),[192*i,384,192,192]);
 assert.deepEqual(a.slice(5),[192*i+7,402,179,179],'integer scaling and car baseline stay unchanged');
 const f=facets.slice(i*4,i*4+4),v=voxels.slice(i*3,i*3+3);
 assert.deepEqual(f.map(x=>x.color),['#d54849','#f16b5b','#eb5e52','#b6323e']);
 for(const poly of f){
  assert(poly.points.length>=4);
  for(const [x,y] of poly.points)assert(x>=i*192&&x<(i+1)*192&&y>=399&&y<=415,
   'faceted Ria roof stays in its original frame with 15px blank top margin');
 }
 for(const px of v)assert(px.x>=i*192&&px.x+px.w<(i+1)*192&&px.y>=399&&px.y+px.h<576);
}
assert.equal(writes['--zz-hero-car-frames'],'url("blob:ria-faceted-crown")',
 'title/results hero card uses exact same corrected atlas as actual gameplay');
console.log('PASS: 8 Ria frames have a wide faceted crown integrated into original hair, crisp corners, no row bleed and stable wheels.');
