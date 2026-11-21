// ZOMBIE ZERO v235 — approved 36 throwable sprites, 6x6 RGBA contact sheet.
// Integer cell cuts + transparent padding prevent sampling adjacent items.
// Full opaque silhouettes are preserved right up to the frame boundary;
// only small, remote, disconnected border scraps are eligible for removal.
// The original approved PNG is never changed.
(function(){
'use strict';
const FILE='assets/ip/v2/throwables-36-v159.png';
const COLS=6,ROWS=6,WIDTH=1536,HEIGHT=1024;
const CELL_W=WIDTH/COLS,CELL_H=HEIGHT/ROWS;
const FRAME_H=Math.ceil(CELL_H),PAD=12;
let image=null,ready=false,loading=false,attempts=0,failed=false;
let preparedFrames=null;

// Never apply a broad edge-alpha fade: real lids, handles and corners extend
// right to the source cell border. Work only on DISCONNECTED, small fragments
// clearly separated from the main silhouette. The main group is never touched.
function clearDetachedBorderDebris(pixels,actualHeight){
 const w=pixels.width,rgba=pixels.data;
 const count=w*actualHeight,labels=new Int16Array(count),queue=new Int32Array(count);
 const parts=[];let next=0;
 for(let y=0;y<actualHeight;y++)for(let x=0;x<w;x++){
  const start=y*w+x;
  if(labels[start]||rgba[start*4+3]<24)continue;
  const id=++next;let head=0,tail=1;
  queue[0]=start;labels[start]=id;
  const part={id,count:0,x0:x,x1:x,y0:y,y1:y};
  while(head<tail){
   const k=queue[head++],px=k%w,py=(k-px)/w;part.count++;
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
 const gap=(lo1,hi1,lo2,hi2)=>Math.max(0,lo1-hi2-1,lo2-hi1-1);
 for(const p of parts){
  if(p===main)continue;
  const border=p.x0<=10||p.x1>=w-11||p.y0<=10||p.y1>=actualHeight-11;
  const separated=gap(p.x0,p.x1,main.x0,main.x1)>15||
                  gap(p.y0,p.y1,main.y0,main.y1)>15;
  const tiny=p.count<Math.min(256,Math.max(35,main.count*.025));
  if(border&&separated&&tiny)discard[p.id]=1;
 }
 // Delete only known orphan islands; NEVER alter alpha of any main-body pixel.
 // Low-alpha antialiasing fringes are also removed inside each island's own
 // bounding rectangle, with no proximity-based changes around the main body.
 if(!discard.includes(1)&&!discard.some(v=>v))return;
 for(const p of parts){
  if(!discard[p.id])continue;
  for(let y=Math.max(0,p.y0-1);y<=Math.min(actualHeight-1,p.y1+1);y++)
   for(let x=Math.max(0,p.x0-1);x<=Math.min(w-1,p.x1+1);x++){
    const k=y*w+x,id=labels[k],a=rgba[k*4+3];
    if(discard[id]||(id===0&&a>0&&a<24))rgba[k*4+3]=0;
   }
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
   tile.width=CELL_W+PAD*2;tile.height=FRAME_H+PAD*2;
   const ctx=tile.getContext?.('2d',{willReadFrequently:true});
   if(!ctx||typeof ctx.drawImage!=='function'||
      typeof ctx.getImageData!=='function'||typeof ctx.putImageData!=='function')return null;
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(bitmap,col*CELL_W,sourceY,CELL_W,actualHeight,
                 PAD,PAD,CELL_W,actualHeight);
   const data=ctx.getImageData(PAD,PAD,CELL_W,actualHeight);
   clearDetachedBorderDebris(data,actualHeight);
   ctx.putImageData(data,PAD,PAD);
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
 if(tile){
  // Padding must NOT reduce the object size. The original image still occupies
  // exactly w × h; transparent margins are drawn outside that rectangle.
  const px=PAD*w/CELL_W,py=PAD*h/FRAME_H;
  ctx.drawImage(tile,-w/2-px,-h/2-py,w+2*px,h+2*py);
 }
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
 get preparedFrameCount(){return preparedFrames?.length||0},
 get framePadding(){return PAD}
};
})();