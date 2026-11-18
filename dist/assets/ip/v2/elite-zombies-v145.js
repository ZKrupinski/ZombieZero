// ZOMBIE ZERO v145 — approved everyday-object elite zombies.
// One 8-column x 7-row atlas per species. Transparent bitmap art, not SVG.
(function(){
'use strict';
const DIR='assets/ip/v2/elites/';
const SPECS=[
 {id:'trash_bag',name:'검은 쓰레기봉투',unlock:3,file:'trash-bag-v145.png'},
 {id:'volume_bag',name:'종량제봉투 50L',unlock:5,file:'volume-bag-v145.png'},
 {id:'water_bottle',name:'소형 생수병',unlock:7,file:'water-bottle-v145.png'}
];
const ATLAS_COLS=8,ATLAS_ROWS=7,READY_MIN_WIDTH=1024;
const CLIPS={idle:0,down:1,left:2,right:3,attack:4,hit:5,death:6};
const cache=SPECS.map(s=>({...s,image:null,ready:false,failed:false,loading:false}));
function request(kind){
 const s=cache[kind];
 if(!s||s.loading||s.ready||s.failed)return;
 s.loading=true;
 const img=new Image();s.image=img;img.decoding='async';
 img.onload=()=>{
   const valid=img.naturalWidth>=READY_MIN_WIDTH &&
     img.naturalHeight>=896 &&
     Math.abs(img.naturalWidth/img.naturalHeight-ATLAS_COLS/ATLAS_ROWS)<.025;
   if(!valid){s.failed=true;s.loading=false;return}
   const success=()=>{s.ready=true;s.loading=false};
   if(typeof img.decode==='function')img.decode().then(success,success);
   else success();
 };
 img.onerror=()=>{s.failed=true;s.loading=false};
 img.src=DIR+s.file;
}
function requestForStage(stage){
 for(let i=0;i<cache.length;i++)if(stage>=cache[i].unlock)request(i);
}
function available(z){return !z?.boss&&Number.isInteger(z?.eliteKind)&&!!cache[z.eliteKind]?.ready}
function frame(ctx,img,row,col,x,y,w,h){
 const fw=img.naturalWidth/ATLAS_COLS,fh=img.naturalHeight/ATLAS_ROWS;
 ctx.drawImage(img,col*fw,row*fh,fw,fh,x,y,w,h);
}
function draw(ctx,z,seconds){
 if(!available(z))return false;
 const s=cache[z.eliteKind];
 let row=CLIPS.down;
 if(z.hitHold>0||(z.recoil||0)>.02)row=CLIPS.hit;
 else if(Number.isFinite(z.breakoutTime)&&z.breakoutTime<.20)row=CLIPS.attack;
 else if(z.moveDir<-.3)row=CLIPS.left;
 else if(z.moveDir>.3)row=CLIPS.right;
 const speed=row===CLIPS.hit?16:row===CLIPS.attack?13:7.1;
 const seed=Number.isFinite(z.seed)?z.seed:0;
 const col=Math.floor((seconds*speed+seed*1.4)%8);
 // Preserve original 33x44 collision, bottom-center anchored to the feet.
 const h=56,w=h*(s.image.naturalWidth/8)/(s.image.naturalHeight/7);
 const x=z.x+z.w/2-w/2,y=z.y+z.h+2-h;
 ctx.save();if(z.flash>0)ctx.filter='brightness(1.7) saturate(1.1)';
 frame(ctx,s.image,row,col,x,y,w,h);ctx.restore();
 return true;
}
function drawDeath(ctx,z,elapsed,duration){
 if(!available(z))return false;
 const img=cache[z.eliteKind].image;
 const t=Math.max(0,Math.min(1,elapsed/Math.max(.001,duration)));
 const col=Math.min(7,Math.floor(t*8));
 // One normal explosion clip for both ordinary and critical kills.
 // Enlarging the presentation rectangle gives the final debris room;
 // never rotate/squash the bitmap or its collapse animation.
 const h=col<2?56:56+Math.sin((col-1)/6*Math.PI)*15;
 const w=h*(img.naturalWidth/8)/(img.naturalHeight/7);
 const x=z.x+z.w/2-w/2,y=z.y+z.h+2-h;
 ctx.save();frame(ctx,img,CLIPS.death,col,x,y,w,h);ctx.restore();
 return true;
}
window.ZZEliteSprites={cache,SPECS,CLIPS,request,requestForStage,available,draw,drawDeath};
})();