// ZOMBIE ZERO v237 — reconstructed 6×6 throwable atlas.
// Unlike the historic 1536×1024 collage, this has genuine 256×256 cells
// and no fractional source rectangles. 28 corrected, 8 original preserved.
// Draw the recovered source centered at the historic scale, not enlarged.
(function(){
'use strict';
const FILE='assets/ip/v2/throwables-36-v237.png';
const COLS=6,ROWS=6,CELL_W=256,CELL_H=256,PAD=8;
let image=null,ready=false,loading=false,failed=false,tries=0,frames=null;
function isolate(bitmap){
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
 const tiles=[];
 for(let id=0;id<36;id++){
  const tile=document.createElement('canvas');
  tile.width=CELL_W+PAD*2;tile.height=CELL_H+PAD*2;
  const ctx=tile.getContext?.('2d');
  if(!ctx||typeof ctx.drawImage!=='function')return null;
  // Separate texture uploads prevent cross-cell bilinear bleed during rotations.
  ctx.drawImage(bitmap,(id%6)*CELL_W,Math.floor(id/6)*CELL_H,
    CELL_W,CELL_H,PAD,PAD,CELL_W,CELL_H);
  tiles.push(tile);
 }
 return tiles;
}
function request(){
 if(ready||loading||tries>=3)return;
 loading=true;tries++;
 const pic=new Image();pic.decoding='async';image=pic;
 pic.onload=()=>{
  if(pic.naturalWidth!==1536||pic.naturalHeight!==1536){
   loading=false;failed=true;return;
  }
  const finish=()=>{
   if(image!==pic)return;
   try{frames=isolate(pic)}catch(err){frames=null;console.warn('Throwable atlas isolation fallback:',err)}
   ready=true;loading=false;failed=false;
  };
  if(typeof pic.decode==='function')pic.decode().then(finish,finish);
  else finish();
 };
 pic.onerror=()=>{
  if(pic!==image)return;
  loading=false;failed=true;
  if(tries<3&&typeof setTimeout==='function')
    setTimeout(request,Math.min(2000,400*tries));
 };
 pic.src=FILE;
}
function draw(ctx,kind,x,y,size,angle=0){
 if(!ready||!Number.isFinite(kind)||!Number.isFinite(x)||!Number.isFinite(y)||
    !Number.isFinite(size)||size<=0)return false;
 const id=((Math.floor(kind)%36)+36)%36;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);
 const tile=frames?.[id];
 const scale=size/CELL_W,drawSize=CELL_W*scale;
 if(tile){
  const edge=PAD*scale;
  ctx.drawImage(tile,-drawSize/2-edge,-drawSize/2-edge,
     drawSize+edge*2,drawSize+edge*2);
 }else{
  ctx.drawImage(image,(id%COLS)*CELL_W,Math.floor(id/COLS)*CELL_H,
   CELL_W,CELL_H,-drawSize/2,-drawSize/2,drawSize,drawSize);
 }
 ctx.restore();return true;
}
window.ZZThrowablesV159={request,draw,COLS,ROWS,CELL_W,CELL_H,
 get image(){return image},get ready(){return ready},
 get failed(){return failed},get preparedFrameCount(){return frames?.length||0},
 get framePadding(){return PAD},artVersion:237};
})();
