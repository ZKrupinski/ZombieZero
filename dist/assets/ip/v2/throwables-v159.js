// ZOMBIE ZERO v234 — approved 36 throwable sprites, 6x6 RGBA contact sheet.
// The 1536x1024 PNG has non-integer row sizes; source artwork reaches 35/36
// frame borders. Isolate each item once into a separately transparent canvas
// so browser interpolation/rotation cannot sample adjacent frames.
// Original PNG (colors, objects and artwork) is never changed.
(function(){
'use strict';
const FILE='assets/ip/v2/throwables-36-v159.png';
const COLS=6,ROWS=6,WIDTH=1536,HEIGHT=1024;
const CELL_W=WIDTH/COLS,CELL_H=HEIGHT/ROWS;
const FRAME_H=Math.ceil(CELL_H);
let image=null,ready=false,loading=false,attempts=0,failed=false;
let preparedFrames=null;

// The art itself reaches beyond some contact-sheet boundaries. Taper only the
// edge alpha, preserving the entire interior: this avoids neighboring lids,
// handles, etc. while not adding outlines or changing approved colors.
function clearFrameEdges(pixels,actualHeight){
 const w=pixels.width,h=pixels.height,rgba=pixels.data;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,a=rgba[i+3];
  if(!a)continue;
  if(y>=actualHeight){rgba[i+3]=0;continue}
  const dx=Math.min(x,w-1-x),dy=Math.min(y,actualHeight-1-y);
  const fx=Math.max(0,Math.min(1,(dx-2)/7));
  const fy=Math.max(0,Math.min(1,(dy-2)/10));
  const opacity=fx*fy;
  if(opacity<1)rgba[i+3]=Math.round(a*opacity);
 }
 // Remove small disconnected edge fragments only. Preserve big shapes,
 // interior highlights and detached small objects that belong to a sprite.
 const count=w*h,labels=new Int16Array(count),queue=new Int32Array(count),parts=[];
 let next=0;
 for(let y=0;y<actualHeight;y++)for(let x=0;x<w;x++){
  const start=y*w+x;
  if(labels[start]||rgba[start*4+3]<24)continue;
  const id=++next;let head=0,tail=1;
  queue[0]=start;labels[start]=id;
  const part={id,count:0,x0:x,x1:x,y0:y,y1:y};
  while(head<tail){
   const k=queue[head++],px=k%w,py=(k-px)/w;
   part.count++;
   if(px<part.x0)part.x0=px;if(px>part.x1)part.x1=px;
   if(py<part.y0)part.y0=py;if(py>part.y1)part.y1=py;
   for(let yy=Math.max(0,py-1);yy<=Math.min(actualHeight-1,py+1);yy++)
    for(let xx=Math.max(0,px-1);xx<=Math.min(w-1,px+1);xx++){
     const t=yy*w+xx;
     if(!labels[t]&&rgba[t*4+3]>=24){labels[t]=id;queue[tail++]=t}
    }
  }
  parts.push(part);
 }
 if(parts.length<2)return;
 const main=parts.reduce((a,b)=>!a||b.count>a.count?b:a,null);
 const discard=new Uint8Array(next+1);
 const separation=(lo1,hi1,lo2,hi2)=>Math.max(0,lo1-hi2-1,lo2-hi1-1);
 for(const p of parts){
  if(p===main)continue;
  const border=p.x0<13||p.x1>=w-13||p.y0<15||p.y1>=actualHeight-15;
  const apart=separation(p.x0,p.x1,main.x0,main.x1)>8||
              separation(p.y0,p.y1,main.y0,main.y1)>8;
  if(border&&apart&&p.count<Math.max(90,main.count*.09))discard[p.id]=1;
 }
 for(let i=0;i<count;i++){
  const id=labels[i];
  if(id&&discard[id])rgba[i*4+3]=0;
 }
}
function isolateFrames(bitmap){
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
 const frames=[];
 for(let row=0;row<ROWS;row++){
  // All source and destination coordinates are now integer-aligned.
  const sourceY=Math.round(row*HEIGHT/ROWS);
  const sourceEndY=Math.round((row+1)*HEIGHT/ROWS);
  const actualHeight=sourceEndY-sourceY;
  for(let col=0;col<COLS;col++){
   const tile=document.createElement('canvas');
   tile.width=CELL_W;tile.height=FRAME_H;
   const ctx=tile.getContext?.('2d',{willReadFrequently:true});
   if(!ctx||typeof ctx.drawImage!=='function'||
      typeof ctx.getImageData!=='function'||typeof ctx.putImageData!=='function')return null;
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(bitmap,col*CELL_W,sourceY,CELL_W,actualHeight,
                 0,0,CELL_W,actualHeight);
   const data=ctx.getImageData(0,0,CELL_W,FRAME_H);
   clearFrameEdges(data,actualHeight);
   ctx.putImageData(data,0,0);
   frames.push(tile);
  }
 }
 return frames;
}
function request(){
 if(ready||loading||attempts>=3)return;
 loading=true;attempts++;
 const candidate=new Image();
 image=candidate;
 candidate.decoding='async';
 candidate.onload=()=>{
  if(candidate.naturalWidth!==WIDTH||candidate.naturalHeight!==HEIGHT){
   loading=false;failed=true;return;
  }
  const finish=()=>{
   if(image!==candidate)return;
   try{preparedFrames=isolateFrames(candidate)}
   catch(err){preparedFrames=null;console.warn('Throwable frame isolation unavailable:',err)}
   ready=true;loading=false;failed=false;
  };
  if(typeof candidate.decode==='function')candidate.decode().then(finish,finish);
  else finish();
 };
 candidate.onerror=()=>{
  if(image!==candidate)return;
  loading=false;failed=true;
  if(attempts<3&&typeof setTimeout==='function')
   setTimeout(()=>{failed=false;request()},Math.min(2000,400*attempts));
 };
 candidate.src=FILE;
}
function draw(ctx,kind,x,y,size,angle=0){
 if(!ready||!Number.isFinite(kind)||!Number.isFinite(x)||!Number.isFinite(y)||
    !Number.isFinite(size)||size<=0)return false;
 const slot=((Math.floor(kind)%36)+36)%36;
 const w=size,h=size*CELL_H/CELL_W;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);
 const tile=preparedFrames?.[slot];
 if(tile)ctx.drawImage(tile,-w/2,-h/2,w,h);
 else{
  // Non-canvas test environments and rare canvas-allocation failures.
  // Existing atlas route is preserved as a graceful fallback.
  ctx.drawImage(image,(slot%COLS)*CELL_W,Math.floor(slot/COLS)*CELL_H,
   CELL_W,CELL_H,-w/2,-h/2,w,h);
 }
 ctx.restore();
 return true;
}
window.ZZThrowablesV159={
 request,draw,COLS,ROWS,CELL_W,CELL_H,
 get ready(){return ready},get failed(){return failed},
 get image(){return image},
 get preparedFrameCount(){return preparedFrames?.length||0}
};
})();