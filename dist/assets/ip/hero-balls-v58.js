/* ZOMBIE ZERO v58 – approved transparent 8-frame bitmap balls. */
(function(){
 'use strict';
 if(typeof Image==='undefined'||typeof window==='undefined')return;
 const files=['hero-ball-tennis-v58.png','hero-ball-baseball-v58.png','hero-ball-toy-v58.png'];
 const images=[],ready=[false,false,false];
 window.ZZHeroBallsV58={images,ready,columns:4,rows:2,count:8,version:58};
 files.forEach((file,i)=>{
  const img=new Image();images[i]=img;img.decoding='async';
  img.onload=()=>{ready[i]=img.naturalWidth===1774&&img.naturalHeight===887};
  img.onerror=()=>{ready[i]=false};
  img.src='assets/ip/'+file+'?v=58-3d-bitmap-balls';
 });
})();
