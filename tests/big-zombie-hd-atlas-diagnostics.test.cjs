'use strict';
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const png=fs.readFileSync('dist/assets/ip/v2/big_zombie_hd.png');
let off=8,W=0,H=0,depth=0,type=0,idats=[];
while(off+12<=png.length){
 const len=png.readUInt32BE(off),kind=png.toString('ascii',off+4,off+8),p=off+8;
 if(kind==='IHDR'){W=png.readUInt32BE(p);H=png.readUInt32BE(p+4);depth=png[p+8];type=png[p+9];}
 if(kind==='IDAT')idats.push(png.subarray(p,p+len));
 off=p+len+4;if(kind==='IEND')break;
}
assert.equal(W,2048);assert.equal(H,1024);assert.equal(depth,8);assert.equal(type,6);
const source=zlib.inflateSync(Buffer.concat(idats)),stride=W*4,rgba=Buffer.allocUnsafe(stride*H),prior=Buffer.alloc(stride);
let off2=0;
for(let y=0;y<H;y++){
 const filter=source[off2++],row=rgba.subarray(y*stride,(y+1)*stride);
 for(let x=0;x<stride;x++){
  const v=source[off2++],a=x>=4?row[x-4]:0,b=prior[x],c=x>=4?prior[x-4]:0;
  const pred=a+b-c,pa=Math.abs(pred-a),pb=Math.abs(pred-b),pc=Math.abs(pred-c);
  row[x]=(v+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):pa<=pb&&pa<=pc?a:pb<=pc?b:c))&255;
 }
 prior.set(row);
}
for(let frame=0;frame<30;frame++){
 const sx=(frame%8)*256,sy=Math.floor(frame/8)*256;
 const mask=new Uint8Array(65536),seen=new Uint8Array(65536),queue=new Uint32Array(65536);
 let pixels=0,edge=0,full=[255,255,0,0];
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const a=rgba[((sy+y)*W+sx+x)*4+3],i=y*256+x;
  if(a>24){mask[i]=1;pixels++;full[0]=Math.min(full[0],x);full[1]=Math.min(full[1],y);full[2]=Math.max(full[2],x);full[3]=Math.max(full[3],y);if(x<9||x>246||y<9||y>246)edge++;}
 }
 const components=[];
 for(let i=0;i<65536;i++){
  if(!mask[i]||seen[i])continue;
  let loX=255,loY=255,hiX=0,hiY=0,count=0,head=0,tail=1;
  seen[i]=1;queue[0]=i;
  while(head<tail){
   const at=queue[head++],x=at%256,y=at>>>8;
   count++;loX=Math.min(loX,x);loY=Math.min(loY,y);hiX=Math.max(hiX,x);hiY=Math.max(hiY,y);
   for(let yy=Math.max(0,y-1);yy<=Math.min(255,y+1);yy++)
    for(let xx=Math.max(0,x-1);xx<=Math.min(255,x+1);xx++){
     const p=yy*256+xx;
     if(mask[p]&&!seen[p]){seen[p]=1;queue[tail++]=p;}
    }
  }
  if(count>=12)components.push({size:count,box:[loX,loY,hiX,hiY]});
 }
 components.sort((a,b)=>b.size-a.size);
 console.log('BLUE_FRAME '+frame+' n='+pixels+' edge='+edge+' box='+JSON.stringify(full)+' components='+JSON.stringify(components.slice(0,8)));
}
console.log('PASS: analyzed 30 big-zombie HD atlas cells and alpha islands');
