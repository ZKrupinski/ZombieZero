// Each strip trims the same transparent margins from every frame.
(function(){
 'use strict';
 const geometry={
  "big_zombie-critical":[512, 118, 68, 275, 281, 12],
  "big_zombie-normal":[512, 120, 124, 254, 234, 12],
  "black_barrel-critical":[384, 13, 13, 359, 358, 8],
  "black_barrel-normal":[384, 13, 13, 358, 358, 8],
  "black_brain_cube-critical":[384, 13, 13, 358, 358, 8],
  "black_brain_cube-normal":[384, 13, 13, 358, 358, 8],
  "cardboard_box-critical":[384, 14, 15, 356, 355, 8],
  "cardboard_box-normal":[384, 13, 13, 358, 358, 8],
  "large_trash-death":[256, 0, 0, 256, 256, 8],
  "red_barrel-critical":[384, 13, 13, 359, 358, 8],
  "red_barrel-normal":[384, 13, 13, 359, 358, 8],
  "red_brain_cube-critical":[384, 13, 13, 358, 358, 8],
  "red_brain_cube-normal":[384, 13, 13, 359, 358, 8],
  "trash_bag-death":[168, 5, 0, 163, 143, 8],
  "trash_can-critical":[512, 171, 156, 170, 208, 12],
  "trash_can-normal":[512, 166, 174, 179, 190, 12],
  "volume_bag-death":[168, 10, 9, 158, 139, 8],
  "water_bottle-death":[168, 13, 0, 155, 131, 8],
  "water_jug-death":[256, 0, 3, 256, 252, 8],
  "wooden_crate-critical":[384, 13, 13, 359, 358, 8],
  "wooden_crate-normal":[384, 13, 14, 358, 357, 8],
  "yellow_brain_cube-critical":[384, 13, 13, 358, 357, 8],
  "yellow_brain_cube-normal":[384, 14, 14, 357, 357, 8]
 };
 const root='assets/ip/deaths-v307/';
 function load(entry,key,fallback){
  const [side,left,top,width,height,count]=geometry[key];
  const image=new Image();
  image.decoding='async';
  image.onerror=()=>fallback?.();
  image.onload=()=>{
   if(image.naturalWidth!==width*count||image.naturalHeight!==height){
    fallback?.();
    return;
   }
   entry.strip={image,side,left,top,width,height};
   entry.ready=true;
  };
  image.src=root+key+'.webp';
 }
 function draw(ctx,strip,frame,x,y,side){
  const scale=side/strip.side;
  ctx.drawImage(strip.image,frame*strip.width,0,strip.width,strip.height,
   x+strip.left*scale,y+strip.top*scale,strip.width*scale,strip.height*scale);
 }
 window.ZZDeathStrips={root,load,draw};
})();
