// ZOMBIE ZERO V159 — user-approved 36 throwable items, 6×6, real RGBA PNG.
// Shared by citizens and giant trash boss; no illustrated substitutes.
(function(){
'use strict';
const FILE='assets/ip/v2/throwables-36-v159.png';
const COLS=6,ROWS=6,WIDTH=1536,HEIGHT=1024;
const CELL_W=WIDTH/COLS,CELL_H=HEIGHT/ROWS;
let image=null,ready=false,loading=false,attempts=0,failed=false;
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
  const finish=()=>{if(image===candidate){ready=true;loading=false;failed=false}};
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
 ctx.drawImage(image,(slot%COLS)*CELL_W,Math.floor(slot/COLS)*CELL_H,
   CELL_W,CELL_H,-w/2,-h/2,w,h);
 ctx.restore();
 return true;
}
window.ZZThrowablesV159={
 request,draw,COLS,ROWS,CELL_W,CELL_H,
 get ready(){return ready},get failed(){return failed},
 get image(){return image}
};
})();