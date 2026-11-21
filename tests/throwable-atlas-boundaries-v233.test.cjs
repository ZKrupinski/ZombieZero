'use strict';
// v233: decode the approved 36-projectile RGBA PNG and inspect its real
// frame-border alpha. Never modify or replace the approved original image.
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const png=fs.readFileSync('dist/assets/ip/v2/throwables-36-v159.png');
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
let ptr=8,w,h,depth,type;const idat=[];
while(ptr<png.length){
 const n=png.readUInt32BE(ptr),kind=png.toString('ascii',ptr+4,ptr+8);
 const d=png.subarray(ptr+8,ptr+8+n);ptr+=12+n;
 if(kind==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);depth=d[8];type=d[9]}
 else if(kind==='IDAT')idat.push(d);
 else if(kind==='IEND')break;
}
assert.equal(w,1536);assert.equal(h,1024);assert.equal(depth,8);assert.equal(type,6);
const raw=zlib.inflateSync(Buffer.concat(idat)),stride=w*4,alpha=new Uint8Array(w*h);
let pos=0,prev=Buffer.alloc(stride),totalAlpha=0,rowsVisited=0;
for(let y=0;y<h;y++){
 const filter=raw[pos++],row=Buffer.alloc(stride);
 for(let k=0;k<stride;k++){
  const v=raw[pos++],a=k>=4?row[k-4]:0,b=prev[k],c=k>=4?prev[k-4]:0;
  let p=0;
  if(filter===1)p=a;else if(filter===2)p=b;else if(filter===3)p=(a+b)>>1;
  else if(filter===4){const q=a+b-c,da=Math.abs(q-a),db=Math.abs(q-b),dc=Math.abs(q-c);p=da<=db&&da<=dc?a:db<=dc?b:c}
  else assert.equal(filter,0);
  row[k]=(v+p)&255;
 }
 for(let x=0;x<w;x++){const a=row[x*4+3];alpha[y*w+x]=a;if(a>18)totalAlpha++;}
 prev=row;rowsVisited++;
}
assert.equal(rowsVisited,h);assert.equal(pos,raw.length);
const sample=(x,y)=>alpha[y*w+x]>18?1:0;
let edgeCells=0;
for(let r=0;r<6;r++)for(let c=0;c<6;c++){
 const x0=c*256,x1=x0+256,y0=Math.round(r*h/6),y1=Math.round((r+1)*h/6);
 let total=0,top=0,bottom=0,left=0,right=0,minX=256,maxX=0,minY=y1-y0,maxY=0;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  if(!sample(x,y))continue;
  total++;
  const lx=x-x0,ly=y-y0;
  if(lx<minX)minX=lx;if(lx>maxX)maxX=lx;
  if(ly<minY)minY=ly;if(ly>maxY)maxY=ly;
  if(ly<7)top++;if(ly>=y1-y0-7)bottom++;
  if(lx<7)left++;if(lx>=249)right++;
 }
 if(top||bottom||left||right)edgeCells++;
 console.log('FRAME '+r+','+c+' pixels='+total+' bbox='+[minX,minY,maxX,maxY].join(',')+' edge(top,bottom,left,right)='+[top,bottom,left,right].join(','));
}
console.log('BOUNDARY_SUMMARY approved source='+w+'x'+h+' rows='+[0,1,2,3,4,5,6].map(r=>Math.round(r*h/6)).join(',')+' opaque='+totalAlpha+' framesWithEdgePixels='+edgeCells);
