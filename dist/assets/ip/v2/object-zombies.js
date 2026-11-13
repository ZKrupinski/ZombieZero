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
const getFrame=(z,seconds)=>{
 if((z.recoil||0)>.02){const elapsed=Math.max(0,.22-(z.recoil||0));return 24+Math.min(1,Math.floor(elapsed/.11))}
 const direction=z.moveDir<-.3?'left':z.moveDir>.3?'right':'down';
 const group=frames[direction],offset=z.seed||0;
 return group[0]+(Math.floor((seconds*9+offset*2.15)%group[1])%group[1]);
};
function frameRect(frame){return [(frame%8)*128,Math.floor(frame/8)*128,128,128]}
function drawFrame(ctx,img,z,frame,opacity=1){
 const src=frameRect(frame),id=keyFor(z);
 // Calibrated visible height: normal ~52px, big boss ~98px, bin boss ~92px.
 // Pixel-perfect WORLD anchor: source feet pivot is (64,120) in every 128px cell.
 // Draw a square source into a square destination: never stretch a cube.
 const desiredHeight=z.boss?(id==='big_zombie'?98:92):52;
 const uniformScale=desiredHeight/(artHeight[id]||104);
 const side=128*uniformScale;
 const x=z.x+z.w/2-64*uniformScale;
 const y=z.y+z.h-120*uniformScale;
 ctx.save();ctx.globalAlpha*=opacity;
 if(z.flash>0)ctx.filter='brightness(1.5)';
 ctx.drawImage(img,...src,x,y,side,side);
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
window.ZZObjectSprite={images,names,normal,bosses,frames,keyFor,available,draw,drawDeath};
})();