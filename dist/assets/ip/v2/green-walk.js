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
     // Match all object zombies: slower steps, individual phase and +/-8% pace.
     const seed=Number.isFinite(z.seed)?Math.max(0,z.seed):0;
     const fps=6.4*(.92+.16*((seed*.61803398875)%1));
     const phase=((seed*.41421356237)%1)*8;
     return start+Math.floor((Math.max(0,t)*fps+phase)%count);
   },
   sourceRect(frame){
     const geom=window.ZZSpriteGeometry?.green_zombie||{};
     const group=frame<8?'down':frame<16?'left':frame<24?'right':'hurt';
     const b=geom[group]||[0,0,128,128];
     return [(frame%8)*128+b[0],Math.floor(frame/8)*128+b[1],b[2],b[3]];
   },
   draw(ctx,z,t){
     if(!pack.ready)return false;
     const frame=pack.getFrame(z,t),rect=pack.sourceRect(frame);
     const walk=window.ZZSpriteGeometry?.green_zombie?.walkUnion||[0,0,128,128];
     // 66px tall mascot: its face and cube almost touch adjacent 46px lanes.
     const scale=66/walk[3];
     const x=z.x+z.w/2-(rect[2]*scale)/2;
     const y=z.y+z.h+2-rect[3]*scale;
     ctx.save();
     if(z.flash>0)ctx.filter='brightness(1.55)';
     ctx.drawImage(image,...rect,x,y,rect[2]*scale,rect[3]*scale);
     ctx.restore();
     return true;
   }
 };
 window.ZZGreenWalk=pack;
 image.onload=()=>{pack.ready=image.naturalWidth===1024&&image.naturalHeight===512;pack.failed=!pack.ready};
 image.onerror=()=>{pack.failed=true;pack.ready=false};
 image.src='assets/ip/v2/green_zombie.png';
})();