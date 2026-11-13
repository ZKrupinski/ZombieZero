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
const images={};
for(const key of Object.keys(names)){
 const image=new Image();images[key]={image,ready:false,failed:false};
 image.decoding='async';
 image.onload=()=>{images[key].ready=image.naturalWidth===1024&&image.naturalHeight===512;images[key].failed=!images[key].ready};
 image.onerror=()=>{images[key].failed=true};
 image.src=root+key+'.png';
}
const keyFor=z=>z.boss?bosses[z.bossForm??0]:normal[z.form??0];
const available=z=>!!images[keyFor(z)]?.ready;
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
function sourceRect(z,frame){
 const id=keyFor(z),geom=window.ZZSpriteGeometry?.[id];
 const group=groupFor(frame);
 // The walk bounds are fixed across direction changes so no sideways jitter.
 const b=geom?.[group]||[0,0,128,128];
 return [(frame%8)*128+b[0],Math.floor(frame/8)*128+b[1],b[2],b[3]];
}
function drawFrame(ctx,img,z,frame,opacity=1){
 const id=keyFor(z);
 const rect=sourceRect(z,frame),walk=window.ZZSpriteGeometry?.[id]?.walkUnion||[0,0,128,128];
 // One scale on BOTH axes. Small characters are deliberately wide enough to
 // read at game scale, while the 55px lanes are never grossly occluded.
 // Pack the 9-column horde edge-to-edge while limiting wider boxes to 56px.
 // Both axes use the same scale so cube shape/face proportions are intact.
 const desiredHeight=z.boss?(id==='big_zombie'?104:98):Math.min(66,61*walk[3]/walk[2]);
 const scale=z.boss?desiredHeight/walk[3]:Math.min(desiredHeight/walk[3],56/walk[2]);
 const x=z.x+z.w/2-(rect[2]*scale)/2;
 const y=z.y+z.h+2-rect[3]*scale;
 ctx.save();ctx.globalAlpha*=opacity;
 if(z.flash>0)ctx.filter='brightness(1.5)';
 ctx.drawImage(img,...rect,x,y,rect[2]*scale,rect[3]*scale);
 ctx.restore();
}
function draw(ctx,z,seconds){const entry=images[keyFor(z)];if(!entry?.ready)return false;drawFrame(ctx,entry.image,z,getFrame(z,seconds));return true}
function drawDeath(ctx,z,critical,elapsed,duration){const entry=images[keyFor(z)];if(!entry?.ready)return false;
 const t=Math.min(1,Math.max(0,elapsed/Math.max(.001,duration)));
 const first=critical?28:26,second=first+1;
 const blend=Math.min(1,Math.max(0,(t-.35)/.35));
 if(blend<1)drawFrame(ctx,entry.image,{...z,flash:0},first,1-blend);
 if(blend>0)drawFrame(ctx,entry.image,{...z,flash:0},second,blend);
 return true;
}
window.ZZObjectSprite={images,names,normal,bosses,frames,keyFor,available,draw,drawDeath,sourceRect,drawFrame,getFrame,walkTiming};
})();