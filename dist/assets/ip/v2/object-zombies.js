// ZOMBIE ZERO · Original object zombies (128×128 transparent sprite atlases).
// 9 characters × 30 frames; Green Zombie has a separate approved animation.
(function(){
'use strict';
const root='assets/ip/v2/';
const normal=['green_zombie','red_barrel','black_barrel','red_brain_cube','cardboard_box','wooden_crate','black_brain_cube','yellow_brain_cube'];
const bosses=['big_zombie','trash_can','big_zombie','trash_can'];
const names={red_barrel:'드럼통 좀비 · 레드',black_barrel:'드럼통 좀비 · 블랙',red_brain_cube:'브레인 큐브 · 레드',cardboard_box:'일회용 포장 박스 좀비',wooden_crate:'나무 상자 좀비',black_brain_cube:'브레인 큐브 · 블랙',yellow_brain_cube:'브레인 큐브 · 옐로',big_zombie:'빅 좀비',trash_can:'쓰레기통 좀비'};
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
function drawFrame(ctx,img,z,frame,opacity=1,volume=0){
 const src=frameRect(frame);
 const w=z.w+8*(z.boss?2:1),h=z.h+14*(z.boss?2:1);
 const x=z.x+(z.w-w)/2,y=z.y-6*(z.boss?2:1);
 ctx.save();ctx.globalAlpha*=opacity;
 if(z.flash>0)ctx.filter='brightness(1.5)';
 const v=Math.max(0,Math.min(1,volume));
 ctx.translate(x+w/2,y+h);ctx.scale(1+v*.03,1-v*.035);ctx.translate(-w/2,-h);
 ctx.drawImage(img,...src,0,0,w,h);ctx.restore();
}
function draw(ctx,z,seconds){const entry=images[keyFor(z)];if(!entry?.ready)return false;drawFrame(ctx,entry.image,z,getFrame(z,seconds));return true}
function drawDeath(ctx,z,critical,elapsed,duration){const entry=images[keyFor(z)];if(!entry?.ready)return false;
 const t=Math.min(1,Math.max(0,elapsed/Math.max(.001,duration)));
 const first=critical?28:26,second=first+1;
 const blend=Math.min(1,Math.max(0,(t-.35)/.35));
 if(blend<1)drawFrame(ctx,entry.image,{...z,flash:0},first,1-blend,t*.5);
 if(blend>0)drawFrame(ctx,entry.image,{...z,flash:0},second,blend,t*.6);
 return true;
}
window.ZZObjectSprite={images,names,normal,bosses,frames,keyFor,available,draw,drawDeath};
})();