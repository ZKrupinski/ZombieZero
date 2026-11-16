// ZOMBIE ZERO · Original object zombies (128×128 transparent sprite atlases).
// 9 characters × 30 frames; Green Zombie has a separate approved animation.
(function(){
'use strict';
const root='assets/ip/v2/';
const normal=['green_zombie','red_barrel','black_barrel','red_brain_cube','cardboard_box','wooden_crate','black_brain_cube','yellow_brain_cube'];
const bosses=['big_zombie','trash_can','big_zombie','trash_can'];
const names={red_barrel:'드럼통 좀비 · 레드',black_barrel:'드럼통 좀비 · 블랙',red_brain_cube:'브레인 큐브 · 레드',cardboard_box:'일회용 포장 박스 좀비',wooden_crate:'나무 상자 좀비',black_brain_cube:'브레인 큐브 · 블랙',yellow_brain_cube:'브레인 큐브 · 옐로',big_zombie:'빅 좀비',trash_can:'쓰레기통 좀비'};
// Median non-transparent character height within the 128px source frames.
// Source images are square; gameplay draw must be UNIFORM scale on both axes.
// A 41×58 rectangular destination previously crushed the cubes horizontally.
const artHeight={red_barrel:100.5,black_barrel:100,red_brain_cube:103,
 cardboard_box:92,wooden_crate:102,black_brain_cube:101,
 yellow_brain_cube:103,big_zombie:105,trash_can:102.5};
const images={},highResBosses=new Set(['big_zombie','trash_can']);
// V74: Actual HD trash-can atlas QA revealed detached neighbor fragments
// in frames 19, 22, 24, 25 (not mere linear-filter bleeding).
// Clean ONLY these four 256px cells, preserving the source atlas and all
// other bosses/death debris. The dominant 8-connected alpha island is the
// character; isolated extraneous fragments do not belong to it.
const TRASH_CAN_BLEED_FRAMES=[19,22,24,25];
const BLUE_BOSS_BLEED_FRAMES=[10,19]; // Side fragments during diagonal walk.
function cleanBossHDFrame(atlas,frame){
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
 try{
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx||typeof ctx.getImageData!=='function'||typeof ctx.putImageData!=='function')return null;
  ctx.clearRect?.(0,0,256,256);
  ctx.drawImage(atlas,(frame%8)*256,Math.floor(frame/8)*256,256,256,0,0,256,256);
  const image=ctx.getImageData(0,0,256,256),rgba=image.data;
  const labels=new Uint16Array(65536),queue=new Uint32Array(65536);
  let count=0,largestLabel=0,largestSize=0,component=0;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
   const start=y*256+x;
   if(rgba[start*4+3]<24||labels[start])continue;
   component++;let head=0,tail=1,size=0;
   labels[start]=component;queue[0]=start;
   while(head<tail){
    const pixel=queue[head++],px=pixel%256,py=pixel>>>8;
    size++;
    for(let yy=Math.max(0,py-1);yy<=Math.min(255,py+1);yy++)
     for(let xx=Math.max(0,px-1);xx<=Math.min(255,px+1);xx++){
      const index=yy*256+xx;
      if(!labels[index]&&rgba[index*4+3]>=24){
       labels[index]=component;queue[tail++]=index;
      }
     }
   }
   if(size>largestSize){largestSize=size;largestLabel=component;}
  }
  // Do not risk dropping a damaged/empty asset or an unusual frame.
  if(largestSize<4000||!largestLabel)return null;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
   const i=y*256+x,p=i*4;
   if(!rgba[p+3]||labels[i]===largestLabel)continue;
   // Preserve anti-aliased fringes up to 2px around the main character,
   // but remove every disconnected alpha island (including its fringe).
   let touchesMain=false;
   for(let yy=Math.max(0,y-2);yy<=Math.min(255,y+2)&&!touchesMain;yy++)
    for(let xx=Math.max(0,x-2);xx<=Math.min(255,x+2);xx++)
     if(labels[yy*256+xx]===largestLabel){touchesMain=true;break;}
   if(!touchesMain){rgba[p]=0;rgba[p+1]=0;rgba[p+2]=0;rgba[p+3]=0;count++;}
  }
  if(!count)return null;
  ctx.putImageData(image,0,0);
  return canvas;
 }catch{return null;} // Strict fallback to untouched approved HD image.
}
for(const key of Object.keys(names)){
 const image=new Image(),entry=images[key]={image,ready:false,failed:false,hd:null};
 image.decoding='async';
 image.onload=()=>{entry.ready=image.naturalWidth===1024&&image.naturalHeight===512;entry.failed=!entry.ready};
 image.onerror=()=>{entry.failed=true};
 image.src=root+key+'.png';
 // Dedicated high-density source frames. The original 128px animation
 // remains available until the 2048×1024 HD boss atlas finishes loading.
 if(highResBosses.has(key)){
  const hiImage=new Image(),hd=entry.hd={image:hiImage,ready:false,failed:false};
  hiImage.decoding='async';
  hiImage.onload=()=>{hd.ready=hiImage.naturalWidth===2048&&hiImage.naturalHeight===1024;hd.failed=!hd.ready;
   if(hd.ready&&(key==='trash_can'||key==='big_zombie')){
    hd.cleanFrames={};
    const damaged=key==='trash_can'?TRASH_CAN_BLEED_FRAMES:BLUE_BOSS_BLEED_FRAMES;
    for(const frame of damaged){
     const isolated=cleanBossHDFrame(hiImage,frame);
     if(isolated)hd.cleanFrames[frame]=isolated;
    }
   }
  };
  hiImage.onerror=()=>{hd.failed=true};
  hiImage.src=root+key+'_hd.png';
 }
}
const keyFor=z=>z.boss?bosses[z.bossForm??0]:normal[z.form??0];
const available=z=>{const entry=images[keyFor(z)];return !!(entry?.ready||z.boss&&entry?.hd?.ready)};
const activeImage=z=>{
 const entry=images[keyFor(z)];
 return z.boss&&entry?.hd?.ready?entry.hd.image:entry?.ready?entry.image:null;
};
const frames={down:[0,8],left:[8,8],right:[16,8],hurt:[24,2],normal:[26,2],critical:[28,2]};
// All walking clips run around 6.4 fps (previously 9 fps). A stable
// per-zombie seed offsets the loop by up to eight frames and gently varies
// its speed by +/-8%; identical species no longer step in exact lockstep.
// Hit and finisher timing deliberately remain unchanged.
const walkTiming=z=>{
 const seed=Number.isFinite(z.seed)?Math.max(0,z.seed):0;
 return {fps:6.4*(.92+.16*((seed*.61803398875)%1)),
         phase:((seed*.41421356237)%1)*8};
};
const getFrame=(z,seconds)=>{
 if((z.recoil||0)>.02){const elapsed=Math.max(0,.22-(z.recoil||0));return 24+Math.min(1,Math.floor(elapsed/.11))}
 const direction=z.moveDir<-.3?'left':z.moveDir>.3?'right':'down';
 const group=frames[direction],timing=walkTiming(z);
 return group[0]+Math.floor((Math.max(0,seconds)*timing.fps+timing.phase)%group[1]);
};
function groupFor(frame){return frame<8?'down':frame<16?'left':frame<24?'right':frame<26?'hurt':frame<28?'normal':'critical'}
function imageGeometry(z,img){
 const id=keyFor(z),hd=z.boss&&img?.naturalWidth===2048&&img?.naturalHeight===1024;
 return {
  cell:hd?256:128,
  geom:hd?window.ZZBossSpriteGeometry?.[id]:window.ZZSpriteGeometry?.[id]
 };
}
function sourceRect(z,frame,img=null){
 const {cell,geom}=imageGeometry(z,img);
 const group=groupFor(frame);
 // Per-action alpha bounds and the uniform walk bounds are held steady
 // across animation frames so each high-res boss retains its foot pivot.
 const b=geom?.[group]||[0,0,cell,cell];
 return [(frame%8)*cell+b[0],Math.floor(frame/8)*cell+b[1],b[2],b[3]];
}
function frameImage(z,frame,img=null){
 const image=img||activeImage(z);
 const id=keyFor(z);
 if(!highResBosses.has(id)||!image||image.naturalWidth!==2048)return image;
 return images[id]?.hd?.cleanFrames?.[frame]||image;
}
function drawFrame(ctx,img,z,frame,opacity=1){
 const {cell,geom}=imageGeometry(z,img),id=keyFor(z);
 const rect=sourceRect(z,frame,img),walk=geom?.walkUnion||[0,0,cell,cell];
 // One scale on BOTH axes. Small characters are deliberately wide enough to
 // read at game scale, while the 55px lanes are never grossly occluded.
 // Pack the 9-column horde edge-to-edge while limiting wider boxes to 56px.
 // Both axes use the same scale so cube shape/face proportions are intact.
 const desiredHeight=z.boss?(id==='big_zombie'?104:98):Math.min(66,61*walk[3]/walk[2]);
 const scale=z.boss?desiredHeight/walk[3]:
   Math.min(desiredHeight/walk[3],55/walk[3],43/walk[2]);
 const x=z.x+z.w/2-(rect[2]*scale)/2;
 const y=z.y+z.h+2-rect[3]*scale;
 ctx.save();ctx.globalAlpha*=opacity;
 if(z.flash>0)ctx.filter='brightness(2.1) saturate(1.3)';
 // The corrected 256px frame has the same local source bounds and world pivot.
 // Trash-can 19/22/24/25 and blue giant 10/19 use isolated alpha cells.
 const frameArt=frameImage(z,frame,img);
 if(frameArt!==img){
  const localRect=[rect[0]%cell,rect[1]%cell,rect[2],rect[3]];
  ctx.drawImage(frameArt,...localRect,x,y,rect[2]*scale,rect[3]*scale);
 }else ctx.drawImage(img,...rect,x,y,rect[2]*scale,rect[3]*scale);
 ctx.restore();
}
function draw(ctx,z,seconds){const img=activeImage(z);if(!img)return false;drawFrame(ctx,img,z,getFrame(z,seconds));return true}
// v96 P1: ORIGINAL-ART-only eight-step death atlas for red/yellow brain cubes.
// Do NOT palette-shift the green mascot: those source characters have exposed
// top brains, integrated red/yellow shells and NO black hair or top cap.
// Bake once on an offscreen canvas, then render ONE texture draw per death.
const P1_BRAIN_DEATH_KEYS=new Set(['yellow_brain_cube','red_brain_cube']);
const P1_DEATH_CELL=256,P1_DEATH_FRAMES=8,P1_DEATH_FEET_Y=194;
const p1DeathAtlases=new Map();
function buildP1BrainDeathAtlas(img,critical){
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
 try {
  const atlas=document.createElement('canvas');
  atlas.width=P1_DEATH_CELL*P1_DEATH_FRAMES;atlas.height=P1_DEATH_CELL;
  const cx=atlas.getContext('2d');
  if(!cx||typeof cx.drawImage!=='function')return null;
  for(let f=0;f<P1_DEATH_FRAMES;f++){
   const x=f*P1_DEATH_CELL+P1_DEATH_CELL/2;
   const y=P1_DEATH_FEET_Y-121;
   if(f<4){
    // Front pose, original hurt, original death key A, original key B.
    const frame=f===0?0:f===1?24:critical?26+f:24+f;
    // In critical sequence f=2/3 -> original 28/29, not green art.
    const original=critical&&f>=2?28+(f-2):frame;
    cx.drawImage(img,(original%8)*128,Math.floor(original/8)*128,128,128,x-64,y,128,128);
    continue;
   }
   const frame=critical?29:27;
   const t=(f-3)/(P1_DEATH_FRAMES-4);
   // Nine independent, transparent source-art panels. We spread real atlas
   // pixels in place instead of painting a new black cap/hair silhouette.
   for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    const sx=col*42,sy=row*42,sw=col===2?44:42,sh=row===2?44:42;
    const dx=(col-1)*(critical?45:33)*t+Math.sin((row*3+col+1)*2.2)*4*t;
    const dy=(row-1)*(critical?37:27)*t-(critical?10:5)*t;
    const px=x-64+sx+sw/2+dx,py=y+sy+sh/2+dy;
    const rot=(col-1)*t*.18+(row-1)*t*.11+
     Math.sin(row*5+col*3+1)*t*.09;
    cx.save();cx.translate(px,py);cx.rotate(rot);
    cx.drawImage(img,(frame%8)*128+sx,Math.floor(frame/8)*128+sy,sw,sh,
     -sw/2,-sh/2,sw,sh);
    cx.restore();
   }
   if(critical){
    // Bright pink brain uses ORIGINAL critical pose 28. Never recolor or
    // invent the wrong green mascot's separate brown/black hair part.
    cx.save();cx.translate(x,P1_DEATH_FEET_Y-121-10*t);
    cx.rotate(.06*t);
    cx.drawImage(img,4*128+43,3*128+3,42,37,-21,2,42,37);
    cx.restore();
   }
  }
  return atlas;
 }catch{return null} // Preserve the original 2-keyframe renderer.
}
function drawP1BrainDeath(ctx,img,z,critical,elapsed,duration){
 const id=keyFor(z);
 if(!P1_BRAIN_DEATH_KEYS.has(id)||!img)return false;
 const key=id+(critical?':critical':':normal');
 let atlas=p1DeathAtlases.get(key);
 if(!atlas){
  atlas=buildP1BrainDeathAtlas(img,critical);
  if(!atlas)return false;
  p1DeathAtlases.set(key,atlas);
 }
 const t=Math.max(0,Math.min(1,elapsed/Math.max(.001,duration)));
 const frame=Math.min(P1_DEATH_FRAMES-1,Math.floor(t*P1_DEATH_FRAMES));
 // Same uniform scale and bottom-center pivot as the normal live sprite.
 const walk=window.ZZSpriteGeometry?.[id]?.walkUnion||[0,0,128,128];
 const height=Math.min(66,61*walk[3]/walk[2]);
 const scale=Math.min(height/walk[3],55/walk[3],43/walk[2]);
 const x=z.x+z.w/2-(P1_DEATH_CELL/2)*scale;
 const y=z.y+z.h+2-P1_DEATH_FEET_Y*scale;
 ctx.save();ctx.globalAlpha*=1;
 ctx.drawImage(atlas,frame*P1_DEATH_CELL,0,P1_DEATH_CELL,P1_DEATH_CELL,
  x,y,P1_DEATH_CELL*scale,P1_DEATH_CELL*scale);
 ctx.restore();
 return true;
}
// V97 P1: use six 8x256 transparent PNG atlas strips, not a green-tinted
// cube or v96's temporary pixel disassembly. Store per-file image once.
const P1_FINISHED_DEATH_KEYS=['yellow_brain_cube','red_brain_cube','red_barrel'];
const P1_FINISHED_DEATH_CELL=256;
const p1FinishedDeaths={};
for(const id of P1_FINISHED_DEATH_KEYS){
 const pair=p1FinishedDeaths[id]={};
 for(const kind of ['normal','critical']){
  const img=new Image(),asset=pair[kind]={image:img,ready:false,failed:false};
  img.decoding='async';
  img.onload=()=>{
   asset.ready=img.naturalWidth===2048&&img.naturalHeight===256;
   asset.failed=!asset.ready;
  };
  img.onerror=()=>{asset.failed=true;asset.ready=false};
  img.src='assets/ip/v2/p1-deaths/'+id+'-'+kind+'-v97.png';
 }
}
function drawP1FinishedDeath(ctx,z,critical,elapsed,duration,livingAtlas){
 const id=keyFor(z);
 const clip=p1FinishedDeaths[id]?.[critical?'critical':'normal'];
 if(!clip?.ready)return false;
 const t=Math.max(0,Math.min(1,elapsed/Math.max(.001,duration)));
 const f=Math.min(7,Math.floor(t*8));
 const size=88+(critical?33:19)*Math.pow(t,1.3);
 const dx=z.x+z.w/2-size/2;
 const dy=z.y+z.h+2-size*(215/256);
 const blend=Math.max(0,Math.min(1,elapsed/.055));
 if(blend<1&&livingAtlas)
  drawFrame(ctx,livingAtlas,{...z,flash:0},0,1-blend);
 if(blend>0){
  ctx.save();ctx.globalAlpha*=blend;
  ctx.drawImage(clip.image,f*P1_FINISHED_DEATH_CELL,0,256,256,
   dx,dy,size,size);
  ctx.restore();
 }
 return true;
}
// v100: user-approved P2 eight-frame RGBA atlases, normal + critical.
// V98 off-style assets stay deleted. This version uses the newly approved
// source sheets; if any file fails to load, original two-key death art runs.
const P2_FINISHED_DEATH_KEYS=['black_brain_cube','cardboard_box','wooden_crate','black_barrel'];
const P2_FINISHED_DEATH_CELL=256;
const p2FinishedDeaths={};
for(const id of P2_FINISHED_DEATH_KEYS){
 const pair=p2FinishedDeaths[id]={};
 for(const kind of ['normal','critical']){
  const image=new Image(),entry=pair[kind]={image,ready:false,failed:false};
  image.decoding='async';
  image.onload=()=>{
   entry.ready=image.naturalWidth===2048&&image.naturalHeight===256;
   entry.failed=!entry.ready;
  };
  image.onerror=()=>{entry.ready=false;entry.failed=true};
  image.src='assets/ip/v2/p2-deaths/'+id+'-'+kind+'-v100.png';
 }
}
function drawP2FinishedDeath(ctx,z,critical,elapsed,duration,livingAtlas){
 const id=keyFor(z);
 const clip=p2FinishedDeaths[id]?.[critical?'critical':'normal'];
 if(!clip?.ready)return false;
 const t=Math.max(0,Math.min(1,elapsed/Math.max(.001,duration)));
 const f=Math.min(7,Math.floor(t*8));
 // 10px padded 256px cells; the intact original body is ~50px across,
 // while the final large fragments expand to ~120px at full critical.
 const size=96+(critical?42:28)*Math.pow(t,1.15);
 const x=z.x+z.w/2-size/2;
 const y=z.y+z.h+2-size*(224/256);
 const blend=Math.max(0,Math.min(1,elapsed/.055));
 if(blend<1&&livingAtlas)drawFrame(ctx,livingAtlas,{...z,flash:0},0,1-blend);
 if(blend>0){
  ctx.save();ctx.globalAlpha*=blend;
  ctx.drawImage(clip.image,f*P2_FINISHED_DEATH_CELL,0,256,256,x,y,size,size);
  ctx.restore();
 }
 return true;
}
// v103 P3: four ORIGINAL-HD-derived boss PNG strips (12 x 512px each).
// One drawImage per lethal frame. Never alter boss collision/hit/stagger rules.
// If PNG is late/unavailable, the original authored 2-key boss death is used.
const P3_BOSS_DEATH_KEYS=['big_zombie','trash_can'];
const P3_DEATH_CELL=512,P3_DEATH_FRAMES=12,P3_DEATH_FEET_Y=354;
const p3BossDeaths={};
for(const id of P3_BOSS_DEATH_KEYS){
 const pair=p3BossDeaths[id]={};
 for(const kind of ['normal','critical']){
  const image=new Image(),entry=pair[kind]={image,ready:false,failed:false};
  image.decoding='async';
  image.onload=()=>{
   entry.ready=image.naturalWidth===P3_DEATH_CELL*P3_DEATH_FRAMES&&
    image.naturalHeight===P3_DEATH_CELL;
   entry.failed=!entry.ready;
  };
  image.onerror=()=>{entry.ready=false;entry.failed=true};
  image.src='assets/ip/v2/p3-deaths/'+id+'-'+kind+'-v103.png';
 }
}
function drawP3BossDeath(ctx,z,critical,elapsed,duration,livingAtlas){
 if(!z.boss)return false;
 const id=keyFor(z);
 const asset=p3BossDeaths[id]?.[critical?'critical':'normal'];
 if(!asset?.ready)return false;
 const t=Math.max(0,Math.min(1,elapsed/Math.max(.001,duration)));
 const f=Math.min(P3_DEATH_FRAMES-1,Math.floor(t*P3_DEATH_FRAMES));
 // Same live-boss height and centered foot pivot, including slots 2/3.
 const walk=window.ZZBossSpriteGeometry?.[id]?.walkUnion;
 const footHeight=walk?.[3]||230;
 const desiredHeight=id==='big_zombie'?104:98;
 const scale=desiredHeight/footHeight;
 const width=P3_DEATH_CELL*scale;
 const x=z.x+z.w/2-width/2;
 const y=z.y+z.h+2-P3_DEATH_FEET_Y*scale;
 const blend=Math.max(0,Math.min(1,elapsed/.055));
 if(blend<1&&livingAtlas)
  drawFrame(ctx,livingAtlas,{...z,flash:0},0,1-blend);
 if(blend>0){
  ctx.save();ctx.globalAlpha*=blend;
  ctx.drawImage(asset.image,f*P3_DEATH_CELL,0,P3_DEATH_CELL,P3_DEATH_CELL,
   x,y,width,width);
  ctx.restore();
 }
 return true;
}
function drawDeath(ctx,z,critical,elapsed,duration){const img=activeImage(z);if(!img)return false;
 if(drawP3BossDeath(ctx,z,critical,elapsed,duration,img))return true;
 if(drawP1FinishedDeath(ctx,z,critical,elapsed,duration,img))return true;
 if(drawP2FinishedDeath(ctx,z,critical,elapsed,duration,img))return true;
 if(drawP1BrainDeath(ctx,img,z,critical,elapsed,duration))return true;
 const t=Math.min(1,Math.max(0,elapsed/Math.max(.001,duration)));
 const first=critical?28:26,second=first+1;
 const blend=Math.min(1,Math.max(0,(t-.35)/.35));
 if(blend<1)drawFrame(ctx,img,{...z,flash:0},first,1-blend);
 if(blend>0)drawFrame(ctx,img,{...z,flash:0},second,blend);
 return true;
}
window.ZZObjectSprite={images,names,normal,bosses,frames,keyFor,available,draw,drawDeath,sourceRect,drawFrame,getFrame,walkTiming,activeImage,imageGeometry,frameImage,p1DeathAtlases,buildP1BrainDeathAtlas,p1FinishedDeaths,drawP1FinishedDeath,p2FinishedDeaths,drawP2FinishedDeath,p3BossDeaths,drawP3BossDeath};
})();