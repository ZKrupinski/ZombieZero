// ZOMBIE ZERO · Canonical green mascot, normal/down-left/down-right 8-frame
// animation, 128x128 transparent source frame, front-dominant elevated camera.
// Gameplay collision and damage are controlled by game.js, NOT by the bitmap.
(function(){
 'use strict';
 const image=new Image();
 image.decoding='async';
 const pack={
   image,ready:false,failed:false,cell:128,
   groups:{down:[0,8],left:[8,8],right:[16,8],hurt:[24,2]},
   getFrame(z,t){
     if((z.recoil||0)>.015)return 24+Math.min(1,Math.floor(Math.max(0,.22-z.recoil)/.11));
     const vx=z.moveDir||0;
     const [start,count]=vx<-.3?pack.groups.left:vx>.3?pack.groups.right:pack.groups.down;
     return start+Math.floor((Math.max(0,t)*1000/110+(z.seed||0)*2.15)%count);
   },
   draw(ctx,z,t){
     if(!pack.ready)return false;
     const frame=pack.getFrame(z,t);
     // The source is 128×128, with 116px median visible character height.
     // Keep a SINGLE uniform scale: never squeeze the cubic head into 41×58.
     const uniformScale=52/116;
     const side=128*uniformScale;
     const x=z.x+z.w/2-64*uniformScale;
     const y=z.y+z.h-120*uniformScale;
     ctx.save();
     if(z.flash>0)ctx.filter='brightness(1.55)';
     ctx.drawImage(image,(frame%8)*128,Math.floor(frame/8)*128,128,128,x,y,side,side);
     ctx.restore();
     return true;
   }
 };
 window.ZZGreenWalk=pack;
 image.onload=()=>{pack.ready=image.naturalWidth===1024&&image.naturalHeight===512;pack.failed=!pack.ready};
 image.onerror=()=>{pack.failed=true;pack.ready=false};
 image.src='assets/ip/v2/green_zombie.png';
})();