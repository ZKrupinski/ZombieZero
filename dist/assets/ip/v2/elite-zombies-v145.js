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

/* V224: The original water-bottle atlas has some neighboring-frame fragments
   visible along cell edges. Repack ONLY that elite into a transparent canvas.
   Work on each 168px cell separately; retain the character's main connected
   silhouette and its close detached details, discard remote islands/cap bleed.
   Death fragments in the last row are retained unless they originate at
   a frame border. Never alter/resize the approved original source PNG. */
function cleanBottleFrame(imageData,row){
 const w=imageData.width,h=imageData.height,rgba=imageData.data;
 const size=w*h,labels=new Int16Array(size),queue=new Int32Array(size),groups=[];
 const alphaAt=i=>rgba[i*4+3];
 let nextId=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const origin=y*w+x;
  if(labels[origin]||alphaAt(origin)<18)continue;
  const id=++nextId;let head=0,tail=1;
  queue[0]=origin;labels[origin]=id;
  const c={id,count:0,x0:w,y0:h,x1:0,y1:0};
  while(head<tail){
   const index=queue[head++],cx=index%w,cy=(index-cx)/w;
   c.count++;
   if(cx<c.x0)c.x0=cx;if(cx>c.x1)c.x1=cx;
   if(cy<c.y0)c.y0=cy;if(cy>c.y1)c.y1=cy;
   for(let yy=Math.max(0,cy-1);yy<=Math.min(h-1,cy+1);yy++)
    for(let xx=Math.max(0,cx-1);xx<=Math.min(w-1,cx+1);xx++){
     const k=yy*w+xx;
     if(!labels[k]&&alphaAt(k)>=18){labels[k]=id;queue[tail++]=k}
    }
  }
  groups.push(c);
 }
 if(!groups.length)return;
 const main=groups.reduce((a,b)=>!a||b.count>a.count?b:a,null);
 const kept=new Uint8Array(nextId+1);
 kept[main.id]=1;
 const padX=Math.max(4,Math.round(w*.035)),padY=Math.max(5,Math.round(h*.045));
 const boxGap=(lo1,hi1,lo2,hi2)=>Math.max(0,lo1-hi2-1,lo2-hi1-1);
 for(const c of groups){
  if(c===main)continue;
  const edge=c.x0<padX||c.x1>=w-padX||c.y0<padX||c.y1>=h-padY;
  const dx=boxGap(c.x0,c.x1,main.x0,main.x1);
  const dy=boxGap(c.y0,c.y1,main.y0,main.y1);
  if(row===CLIPS.death){
   // Death debris intentionally separates; only remove edge-origin scraps.
   if(!edge&&c.count>=3)kept[c.id]=1;
  }else if(!edge&&c.count>=Math.max(5,main.count*.002)&&
    dx<=Math.max(6,w*.045)&&dy<=Math.max(8,h*.055)){
   // Bottle cap, eyes and limbs remain if adjacent to the main figure.
   kept[c.id]=1;
  }
 }
 // Keep soft alpha fringes immediately attached to real shapes, but never
 // the isolated islands belonging to neighboring atlas cells.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=y*w+x,id=labels[k];
  if(id&&kept[id])continue;
  if(!id&&alphaAt(k)>0&&x>=3&&x<w-3&&y>=3&&y<h-5){
   let near=false;
   for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1)&&!near;yy++)
    for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++)
     if(kept[labels[yy*w+xx]]){near=true;break}
   if(near)continue;
  }
  rgba[k*4+3]=0;
 }
}
function isolateBottleAtlas(img){
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
 const w=img.naturalWidth/ATLAS_COLS,h=img.naturalHeight/ATLAS_ROWS;
 if(!Number.isInteger(w)||!Number.isInteger(h))return null;
 const output=document.createElement('canvas'),tile=document.createElement('canvas');
 output.width=img.naturalWidth;output.height=img.naturalHeight;
 tile.width=w;tile.height=h;
 const dest=output.getContext('2d'),ctx=tile.getContext('2d',{willReadFrequently:true});
 if(!dest||!ctx||!ctx.getImageData||!ctx.putImageData)return null;
 for(let row=0;row<ATLAS_ROWS;row++)for(let col=0;col<ATLAS_COLS;col++){
  ctx.clearRect(0,0,w,h);
  ctx.drawImage(img,col*w,row*h,w,h,0,0,w,h);
  const pixels=ctx.getImageData(0,0,w,h);
  cleanBottleFrame(pixels,row);
  ctx.putImageData(pixels,0,0);
  dest.drawImage(tile,col*w,row*h);
 }
 return output;
}

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
   const success=()=>{if(kind===2){try{s.cleanImage=isolateBottleAtlas(img)}catch(error){console.warn('Water-bottle atlas isolation unavailable:',error)}}s.ready=true;s.loading=false};
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
 const fw=(img.naturalWidth||img.width)/ATLAS_COLS,fh=(img.naturalHeight||img.height)/ATLAS_ROWS;
 ctx.drawImage(img,col*fw,row*fh,fw,fh,x,y,w,h);
}
function draw(ctx,z,seconds){
 if(!available(z))return false;
 const s=cache[z.eliteKind];
 let row=CLIPS.down;
 if(z.hitHold>0||(z.recoil||0)>.02)row=CLIPS.hit;
 else if(((z.eliteKind===0||z.eliteKind===1)&&z.throwWindup>0)||z.spitWindup>0)row=CLIPS.attack;
 else if(z.eliteMotion&&(z.eliteMotion.t<0||
          z.eliteMotion.tag==='dash'||z.eliteMotion.tag==='charge'))row=CLIPS.attack;
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
 frame(ctx,s.cleanImage||s.image,row,col,x,y,w,h);ctx.restore();
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
 ctx.save();frame(ctx,cache[z.eliteKind].cleanImage||img,CLIPS.death,col,x,y,w,h);ctx.restore();
 return true;
}
window.ZZEliteSprites={cache,SPECS,CLIPS,request,requestForStage,available,draw,drawDeath};
})();