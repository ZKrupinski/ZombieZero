'use strict';
const fs=require('node:fs'),zlib=require('node:zlib');
const data=fs.readFileSync('dist/assets/ip/v2/trash_can_hd.png');
let p=8,idats=[],width=0,height=0;
while(p<data.length){
 const len=data.readUInt32BE(p),type=data.toString('ascii',p+4,p+8),begin=p+8;
 if(type==='IHDR'){width=data.readUInt32BE(begin);height=data.readUInt32BE(begin+4);}
 if(type==='IDAT')idats.push(data.subarray(begin,begin+len));
 p=begin+len+4;if(type==='IEND')break;
}
if(width!==2048||height!==1024)throw Error('wrong atlas');
const scan=zlib.inflateSync(Buffer.concat(idats)),stride=width*4;
const rgba=Buffer.allocUnsafe(stride*height),prev=Buffer.alloc(stride);
let off=0;
for(let y=0;y<height;y++){
 const f=scan[off++],row=rgba.subarray(y*stride,(y+1)*stride);
 for(let x=0;x<stride;x++){
  const v=scan[off++],a=x>=4?row[x-4]:0,b=prev[x],c=x>=4?prev[x-4]:0;
  const pred=a+b-c,pa=Math.abs(pred-a),pb=Math.abs(pred-b),pc=Math.abs(pred-c);
  const predictor=pa<=pb&&pa<=pc?a:pb<=pc?b:c;
  row[x]=(v+(f===0?0:f===1?a:f===2?b:f===3?Math.floor((a+b)/2):predictor))&255;
 }
 prev.set(row);
}
for(let frame=0;frame<30;frame++){
 const startX=(frame%8)*256,startY=Math.floor(frame/8)*256;
 const alpha=new Uint8Array(65536);
 let edge=0,opaque=0,bounds=[255,255,0,0];
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const a=rgba[((startY+y)*width+startX+x)*4+3];
  const idx=y*256+x;alpha[idx]=a>48?1:0;
  if(a>48){opaque++;bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);
   bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);
   if(x<8||x>247||y<8||y>247)edge++}
 }
 const seen=new Uint8Array(65536),components=[];
 for(let index=0;index<65536;index++){
  if(!alpha[index]||seen[index])continue;
  let count=0,lowX=255,lowY=255,highX=0,highY=0;
  const q=[index];seen[index]=1;
  for(let k=0;k<q.length;k++){
   const v=q[k],x=v%256,y=v>>>8;count++;
   lowX=Math.min(lowX,x);lowY=Math.min(lowY,y);
   highX=Math.max(highX,x);highY=Math.max(highY,y);
   for(const other of [v-257,v-256,v-255,v-1,v+1,v+255,v+256,v+257]){
    if(other<0||other>=65536||!alpha[other]||seen[other])continue;
    const ox=other%256,oy=other>>>8;
    if(Math.abs(ox-x)>1||Math.abs(oy-y)>1)continue;
    seen[other]=1;q.push(other)
   }
  }
  if(count>=8)components.push({size:count,box:[lowX,lowY,highX,highY]});
 }
 components.sort((a,b)=>b.size-a.size);
 console.log('TRASH_FRAME '+frame+' alpha='+opaque+' edge='+edge+' full='+JSON.stringify(bounds)
 +' components='+JSON.stringify(components.slice(0,7)));
}
