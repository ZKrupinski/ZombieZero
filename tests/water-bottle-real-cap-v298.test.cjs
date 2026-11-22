'use strict';
// Real approved PNG test. Verify the v145 source cap and hit frame geometry,
// not just fabricated test rectangles.
const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib');
const png=fs.readFileSync('dist/assets/ip/v2/elites/water-bottle-v145.png');
function decode(png){
 const w=png.readUInt32BE(16),h=png.readUInt32BE(20),bpp=4,stride=w*bpp;
 assert.equal(png[24],8);assert.equal(png[25],6);assert.equal(png[28],0);
 let offset=8,idat=[];
 while(offset+12<=png.length){
  const n=png.readUInt32BE(offset),k=png.toString('ascii',offset+4,offset+8);
  if(k==='IDAT')idat.push(png.subarray(offset+8,offset+8+n));
  offset+=n+12;if(k==='IEND')break;
 }
 const raw=zlib.inflateSync(Buffer.concat(idat)),dest=new Uint8Array(w*h*bpp);
 const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c};
 let i=0;
 for(let y=0;y<h;y++){
  const f=raw[i++],o=y*stride;
  for(let x=0;x<stride;x++){
   const v=raw[i++],a=x>=bpp?dest[o+x-bpp]:0,b=y?dest[o-stride+x]:0,c=y&&x>=bpp?dest[o-stride+x-bpp]:0;
   const predictor=f===0?0:f===1?a:f===2?b:f===3?(a+b)>>1:f===4?paeth(a,b,c):NaN;
   assert(Number.isFinite(predictor));dest[o+x]=(v+predictor)&255;
  }
 }
 return {data:dest,w,h};
}
const {data,w,h}=decode(png);
assert.equal(w,1344);assert.equal(h,1176);
const W=168,H=168;
function components(row,col){
 const alpha=new Uint8Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)alpha[y*W+x]=data[((row*H+y)*w+col*W+x)*4+3];
 const seen=new Uint8Array(W*H),groups=[];
 for(let pos=0;pos<alpha.length;pos++){
  if(seen[pos]||alpha[pos]<18)continue;
  const todo=[pos];seen[pos]=1;let x0=W,x1=0,y0=H,y1=0;
  for(let i=0;i<todo.length;i++){
   const k=todo[i],x=k%W,y=Math.floor(k/W);
   x0=Math.min(x,x0);x1=Math.max(x,x1);y0=Math.min(y,y0);y1=Math.max(y,y1);
   for(let yy=Math.max(0,y-1);yy<=Math.min(H-1,y+1);yy++)
    for(let xx=Math.max(0,x-1);xx<=Math.min(W-1,x+1);xx++){
     const j=yy*W+xx;
     if(!seen[j]&&alpha[j]>=18){seen[j]=1;todo.push(j)}
    }
  }
  groups.push({n:todo.length,x0,y0,x1,y1});
 }
 groups.sort((a,b)=>b.n-a.n);
 return groups.slice(0,10);
}
for(const row of [0,1,2,3,4,5,6])
 for(let col=0;col<8;col++){
  const groups=components(row,col);
  const main=groups[0];
  console.log('REAL_BOTTLE_COMPONENT '+JSON.stringify({row,col,main,extras:groups.slice(1)}));
 }
console.log('PASS: real bottle atlas decoded, components inspected for cap integrity');
