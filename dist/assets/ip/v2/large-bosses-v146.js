// ZOMBIE ZERO v147 — dedicated right-diagonal 8-frame strips for both new bosses.
// Preserve the approved 8x5 atlas for idle/front/left/hit/death. No mirroring.
(function(){
'use strict';
const DIR='assets/ip/v2/bosses/';
const SPECS=[
 {id:'water_jug',name:'대형 생수통 좀비',bossForm:2,file:'water_jug-v146.png',rightFile:'water_jug-right-v147.webp',height:110},
 {id:'large_trash',name:'큰 쓰레기 좀비',bossForm:3,file:'large_trash-v146.png',rightFile:'large_trash-right-v147.webp',height:154}
];
const COLS=8,ROWS=5,CELL=256;
const CLIPS={idle:0,down:1,left:2,right:1,hit:3,death:4};
const fresh=s=>({...s,image:null,ready:false,loading:false,failed:false,
 rightImage:null,rightReady:false,rightLoading:false,rightFailed:false,
 attempts:0,rightAttempts:0});
const cache=SPECS.map(fresh);
function retain(form){
 for(let i=0;i<cache.length;i++)if(i+2!==form&&cache[i].image)cache[i]=fresh(SPECS[i]);
}
function requestRight(entry){
 if(entry.rightReady||entry.rightLoading||entry.rightFailed)return;
 entry.rightLoading=true;entry.rightAttempts++;
 const img=new Image();
 entry.rightImage=img;img.decoding='async';
 img.onload=()=>{
  if(img.naturalWidth!==COLS*CELL||img.naturalHeight!==CELL){
   entry.rightFailed=true;entry.rightLoading=false;return;
  }
  const finish=()=>{entry.rightReady=true;entry.rightLoading=false};
  if(typeof img.decode==='function')img.decode().then(finish,finish);
  else finish();
 };
 img.onerror=()=>{
  entry.rightFailed=true;entry.rightLoading=false;
  // One missing response must not permanently suppress a new species.
  if(entry.rightAttempts<3&&typeof setTimeout==='function')
   setTimeout(()=>{if(cache[entry.bossForm-2]!==entry)return;entry.rightFailed=false;requestRight(entry)},750*entry.rightAttempts);
 };
 img.src=DIR+entry.rightFile;
}
function requestByForm(form){
 const entry=cache[form-2];
 if(!entry)return;
 // Both sheets are requested together, only for the upcoming boss stage.
 requestRight(entry);
 if(entry.ready||entry.loading||entry.failed)return;
 entry.loading=true;entry.attempts++;
 entry.death={};
 window.ZZDeathStrips?.load(entry.death,entry.id+'-death');
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
 img.onerror=()=>{
  entry.failed=true;entry.loading=false;
  if(entry.attempts<3&&typeof setTimeout==='function')
   setTimeout(()=>{if(cache[form-2]!==entry)return;entry.failed=false;requestByForm(form)},750*entry.attempts);
 };
 img.src=DIR+entry.file+(entry.attempts>1?'?v=470-retry-'+entry.attempts:'');
}
function readyByForm(form){return !!cache[form-2]?.ready}
function available(z){return !!z?.boss&&readyByForm(z.bossForm)}
function drawFrame(ctx,img,row,col,z,height){
 const width=height;
 const x=z.x+z.w/2-width/2,y=z.y+z.h+2-height;
 ctx.save();
 if(z.flash>0)ctx.filter='brightness(1.9) saturate(1.14)';
 ctx.drawImage(img,col*CELL,row*CELL,CELL,CELL,x,y,width,height);
 ctx.restore();
}
function draw(ctx,z,seconds){
 if(!z?.boss||!cache[z.bossForm-2])return false;
 const entry=cache[z.bossForm-2];
 if(!available(z)){
  requestByForm(z.bossForm);
  if(entry.rightReady){drawFrame(ctx,entry.rightImage,0,0,z,entry.height);return true}
  return window.ZZObjectSprite?.drawBossStandby?.(ctx,z)===true;
 }
 const recoil=z.hitHold>0||(z.recoil||0)>.02;
 const dir=z.moveDir<-.3?'left':z.moveDir>.3?'right':'down';
 const fps=recoil?14:6.6;
 const seed=Number.isFinite(z.seed)?z.seed:0;
 const col=Math.floor((Math.max(0,seconds)*fps+seed*1.7)%COLS);
 // Right diagonal is an independent 8x1 atlas, not a flip or front-row duplicate.
 if(!recoil&&dir==='right'&&entry.rightReady)
  drawFrame(ctx,entry.rightImage,0,col,z,entry.height);
 else drawFrame(ctx,entry.image,recoil?CLIPS.hit:CLIPS[dir],col,z,entry.height);
 return true;
}
function drawDeath(ctx,z,elapsed,duration){
 if(!available(z))return false;
 const entry=cache[z.bossForm-2];
 const t=Math.max(0,Math.min(1,elapsed/Math.max(.001,duration)));
 const col=Math.min(COLS-1,Math.floor(t*COLS));
 const height=entry.height+Math.sin(t*Math.PI)*12;
 if(entry.death?.strip){
  window.ZZDeathStrips.draw(ctx,entry.death.strip,col,z.x+z.w/2-height/2,z.y+z.h+2-height,height);
 }else drawFrame(ctx,entry.image,CLIPS.death,col,z,height);
 return true;
}
window.ZZLargeBossSprites={SPECS,cache,CLIPS,COLS,ROWS,retain,requestByForm,readyByForm,available,draw,drawDeath};
})();
