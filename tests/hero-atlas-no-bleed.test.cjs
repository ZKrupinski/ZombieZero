'use strict';
// Catch *pixel content* bleeding from one playable hero's row into the next.
// Previous Ruby 8-frame row had red Liam hair fragments ~20 pixels below her
// pink car even though the CSS sprite source coordinates were technically right.
const fs=require('node:fs');
const zlib=require('node:zlib');
const assert=require('node:assert/strict');
const data=fs.readFileSync('dist/assets/ip/hero-car-attack.png');
assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
let ptr=8,w=0,h=0,depth=0,colorType=0,trans=null;
const idat=[];
while(ptr<data.length){
 const n=data.readUInt32BE(ptr),kind=data.toString('ascii',ptr+4,ptr+8);
 const body=data.subarray(ptr+8,ptr+8+n);ptr+=12+n;
 if(kind==='IHDR'){w=body.readUInt32BE(0);h=body.readUInt32BE(4);depth=body[8];colorType=body[9];}
 else if(kind==='tRNS')trans=body;
 else if(kind==='IDAT')idat.push(body);
 else if(kind==='IEND')break;
}
assert.equal(w,1536);assert.equal(h,576);
assert.equal(depth,8);assert.equal(colorType,3,'bitmap remains indexed with alpha, preserving original art');
assert(trans?.some(a=>a===0),'source has true transparent pixels');
const raw=zlib.inflateSync(Buffer.concat(idat)),stride=w;
const pixels=Buffer.alloc(w*h);let off=0,prev=Buffer.alloc(w);
for(let y=0;y<h;y++){
 const filter=raw[off++],row=Buffer.alloc(w);
 for(let x=0;x<w;x++){
  const v=raw[off++],left=x?row[x-1]:0,above=prev[x],upLeft=x?prev[x-1]:0;
  let predictor=0;
  if(filter===1)predictor=left;
  else if(filter===2)predictor=above;
  else if(filter===3)predictor=Math.floor((left+above)/2);
  else if(filter===4){
   const p=left+above-upLeft,pa=Math.abs(p-left),pb=Math.abs(p-above),pc=Math.abs(p-upLeft);
   predictor=pa<=pb&&pa<=pc?left:pb<=pc?above:upLeft;
  }else assert.equal(filter,0,'supported indexed PNG row filter');
  row[x]=(v+predictor)&255;
 }
 row.copy(pixels,y*w);prev=row;
}
assert.equal(off,raw.length,'all PNG pixel bytes accounted for');
const visible=(x,y)=> (trans[pixels[y*w+x]]??255)>15;
const count=(x0,y0,x1,y1)=>{
 let n=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(visible(x,y))n++;
 return n;
};
for(let frame=0;frame<8;frame++){
 const x0=frame*192,x1=x0+192;
 // Frame content is always above the validated blank separator.
 assert.equal(count(x0,179,x1,192),0,'Ace frame '+frame+' has no Ruby overflow');
 assert.equal(count(x0,192+179,x1,384),0,
   'Ruby frame '+frame+' cannot contain the next red-haired Liam character');
 assert.equal(count(x0,384+179,x1,576),0,'Liam frame '+frame+' has clean lower border');
 for(let hero=0;hero<3;hero++){
  const y0=hero*192;
  assert(count(x0,y0,x1,y0+179)>2800,
   'hero '+hero+' frame '+frame+' retains original character, vehicle and attack art');
 }
}
const css=fs.readFileSync('dist/style.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const loader=fs.readFileSync('dist/assets/ip/hero-car-attack.js','utf8');
assert(css.includes('clip-path:inset(0 0 5px 0)'),'selection portrait crops away neighbor interpolation');
assert(css.includes('hero-car-attack.png?v=40-aligned-heroes'),'selection card requests new clean atlas');
assert(loader.includes('hero-car-attack.png?v=40-aligned-heroes'),'actual gameplay requests same clean atlas');
assert(html.includes('hero-car-attack.js?v=40-aligned-heroes'),'new loader bypasses old cache');
assert(html.includes('style.css?v=40-voxel-heart-hud'),'new selection styles bypass old cache');
console.log('PASS: all 24 hero/vehicle/attack frames preserved, zero cross-row hair bleed, clean portrait and gameplay cache');
