// ZOMBIE ZERO · final 8-frame ordinary / 10-frame critical green zombie death.
// Original approved PNG at ./assets/ip/green-death.png, 480x96, 48x48 cells.
// Visual only: does not touch collision, scoring, wave progression or loot.
(function(){
 'use strict';
 const image=new Image(); image.decoding='async';
 const pack={
   image,ready:false,cell:48,
   normal:{row:0,count:8,frameMs:65,duration:.520},
   critical:{row:1,count:10,frameMs:58,duration:.580},
   draw(ctx,z,isCritical,t,scale=1){
     if(!pack.ready)return false;
     const clip=isCritical?pack.critical:pack.normal;
     const f=Math.min(clip.count-1,Math.max(0,Math.floor(t*1000/clip.frameMs)));
     // The art pivot is approximately the middle of the feet. At render scale
     // 1, the visible width is ~34px and height ~48px on the 450x710 board.
     const x=z.x+z.w/2-32*scale,y=z.y+z.h-60*scale;
     ctx.drawImage(image,f*48,clip.row*48,48,48,x,y,64*scale,64*scale);
     return true;
   }
 };
 window.ZZGreenDeath=pack;
 image.onload=()=>{pack.ready=image.naturalWidth===480&&image.naturalHeight===96};
 image.onerror=()=>{pack.ready=false};
 image.src='assets/ip/green-death.png';

 // In-game review control (same atlas/frame timings as real lethal-hit path).
 // The user can inspect the animation before obtaining a power-up in play.
 function setupReview(){
   const open=document.getElementById('death-demo-open');
   const dialog=document.getElementById('death-demo-dialog');
   const close=document.getElementById('death-demo-close');
   const normal=document.getElementById('death-demo-normal');
   const critical=document.getElementById('death-demo-critical');
   const canvas=document.getElementById('death-demo-canvas');
   if(!open||!dialog||!close||!normal||!critical||!canvas)return;
   const c=canvas.getContext('2d');
   if(!c)return;
   let current='critical',began=0,request=0,active=false;
   const actor={x:176,y:115,w:33,h:44};
   function drawFrame(now){
     if(!active)return;
     c.clearRect(0,0,canvas.width,canvas.height);
     c.fillStyle='#172235';c.fillRect(0,0,canvas.width,canvas.height);
     c.fillStyle='#25364a';for(let y=8;y<canvas.height;y+=44)c.fillRect(0,y,canvas.width,1);
     for(let x=8;x<canvas.width;x+=44)c.fillRect(x,0,1,canvas.height);
     const clip=pack[current],t=Math.min(clip.duration,Math.max(0,(now-began)/1000));
     if(pack.ready)pack.draw(c,actor,current==='critical',Math.min(t,clip.duration-.001),2.6);
     else{c.font='bold 15px sans-serif';c.textAlign='center';c.fillStyle='#f9e1a4';c.fillText('스프라이트 로딩 중…',canvas.width/2,canvas.height/2)}
     if(t<clip.duration||!pack.ready)request=requestAnimationFrame(drawFrame);
     else request=0;
   }
   function play(type){
     current=type;began=performance.now();active=true;
     if(request)cancelAnimationFrame(request);
     request=requestAnimationFrame(drawFrame);
   }
   open.addEventListener('click',()=>{dialog.showModal();play('critical')});
   normal.addEventListener('click',()=>play('normal'));
   critical.addEventListener('click',()=>play('critical'));
   function stop(){active=false;if(request)cancelAnimationFrame(request);request=0}
   close.addEventListener('click',()=>dialog.close());
   dialog.addEventListener('close',stop);
   if(new URLSearchParams(window.location.search).get('demo')==='death'){
     // Direct visual QA link: opens the actual game's sprite playback controls.
     requestAnimationFrame(()=>{dialog.showModal();play('critical')});
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupReview,{once:true});
 else setupReview();
})();
