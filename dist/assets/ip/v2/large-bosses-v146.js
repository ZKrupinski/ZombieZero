// ZOMBIE ZERO v146 — large bitmap bosses (approved 8-frame action strips).
// The original right-diagonal artwork was not supplied: NEVER horizontally mirror.
(function(){
'use strict';
const DIR='assets/ip/v2/bosses/';
const SPECS=[
 {id:'water_jug',name:'대형 생수통 좀비',bossForm:2,file:'water_jug-v146.png',height:110},
 {id:'large_trash',name:'큰 쓰레기 좀비',bossForm:3,file:'large_trash-v146.png',height:116}
];
const COLS=8,ROWS=5,CELL=256;
const CLIPS={idle:0,down:1,left:2,right:1,hit:3,death:4};
const cache=SPECS.map(s=>({...s,image:null,ready:false,loading:false,failed:false}));
function requestByForm(form){
 const entry=cache[form-2];
 if(!entry||entry.ready||entry.loading||entry.failed)return;
 entry.loading=true;
 const img=new Image();
 entry.image=img;img.decoding='async';
 img.onload=()=>{
  if(img.naturalWidth!==COLS*CELL||img.naturalHeight!==ROWS*CELL){
   entry.failed=true;entry.loading=false;return;
  }
  const finish=()=>{entry.ready=true;entry.loading=false};
  if(typeof img.decode==='function')img.decode().then(finish,finish);
  else finish();
 };
 img.onerror=()=>{entry.failed=true;entry.loading=false};
 img.src=DIR+entry.file;
}
function readyByForm(form){return !!cache[form-2]?.ready}
function available(z){return !!z?.boss&&readyByForm(z.bossForm)}
function drawFrame(ctx,img,row,col,z,height){
 const width=height; // All 256px cells are square; preserve perspective without mirroring.
 const x=z.x+z.w/2-width/2,y=z.y+z.h+2-height;
 ctx.save();
 if(z.flash>0)ctx.filter='brightness(1.9) saturate(1.14)';
 ctx.drawImage(img,col*CELL,row*CELL,CELL,CELL,x,y,width,height);
 ctx.restore();
}
function draw(ctx,z,seconds){
 if(!available(z))return false;
 const entry=cache[z.bossForm-2];
 const recoil=z.hitHold>0||(z.recoil||0)>.02;
 const dir=z.moveDir<-.3?'left':z.moveDir>.3?'right':'down';
 const row=recoil?CLIPS.hit:CLIPS[dir];
 const fps=recoil?14:6.6;
 const seed=Number.isFinite(z.seed)?z.seed:0;
 const col=Math.floor((Math.max(0,seconds)*fps+seed*1.7)%COLS);
 drawFrame(ctx,entry.image,row,col,z,entry.height);
 return true;
}
function drawDeath(ctx,z,elapsed,duration){
 if(!available(z))return false;
 const entry=cache[z.bossForm-2];
 const t=Math.max(0,Math.min(1,elapsed/Math.max(.001,duration)));
 const col=Math.min(COLS-1,Math.floor(t*COLS));
 drawFrame(ctx,entry.image,CLIPS.death,col,z,entry.height+Math.sin(t*Math.PI)*12);
 return true;
}
window.ZZLargeBossSprites={SPECS,cache,CLIPS,COLS,ROWS,requestByForm,readyByForm,available,draw,drawDeath};
})();
