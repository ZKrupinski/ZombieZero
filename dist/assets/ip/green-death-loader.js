// ZOMBIE ZERO · 8-frame v95 front-facing remastered normal / critical death.
// 768x128 RGBA PNG strips (8 x 96px), original fallback 480x96 kept.
// Visual only: does not touch collision, scoring, wave progression or loot.
(function(){
 'use strict';
 const image=new Image(); image.decoding='async';
 const pack={
   image,ready:false,cell:48,variants:[image],
   // v95 remastered 8-frame 96x128 colorizable portraits, two separate
   // transparent PNGs. Retain the old atlas as an offline / load-error fallback.
   remaster:{
     normal:{image:new Image(),ready:false,variants:[],count:8},
     critical:{image:new Image(),ready:false,variants:[],count:8}
   },
   normal:{row:0,count:8,frameMs:65,duration:.520},
   critical:{row:1,count:10,frameMs:58,duration:.580},
   draw(ctx,z,isCritical,t,scale=1){
     const clip=isCritical?pack.critical:pack.normal;
     const palette=window.ZZGreenPalette;
     // IMPORTANT: use the SAME paletteFor(z) as ZZGreenWalk. The death queue
     // copies the actor's seed/paletteVariant, so no color reset on death.
     const selected=palette?.paletteFor(z)??0;
     const art=pack.remaster[isCritical?'critical':'normal'];
     if(art.ready){
       // 8 individually padded frames. The frame's geometry expands from a
       // 38px-wide intact body to a ~85px-wide outward burst; never crop.
       const f=Math.min(7,Math.max(0,Math.floor(t/clip.duration*8)));
       const width=100*scale,height=width*128/96;
       // Original 4800x800 authoring sheet's intact feet sit at y ~= 657.
       // Preserve the same foot pivot as live walk sprites for seamless swaps.
       const x=z.x+z.w/2-width/2;
       const y=z.y+z.h+2-height*(657/800);
       const bitmap=art.variants[selected]||art.image;
       // First 65 ms crossfade the exact live colored character into frame 0.
       // No silhouette pop, especially for moss/mint/blue/lavender zombies.
       const blend=Math.max(0,Math.min(1,t/.065));
       if(blend<1&&window.ZZGreenWalk?.ready){
         ctx.save();ctx.globalAlpha=(ctx.globalAlpha??1)*(1-blend);
         window.ZZGreenWalk.draw(ctx,z,0);ctx.restore();
       }
       ctx.save();ctx.globalAlpha=(ctx.globalAlpha??1)*blend;
       ctx.drawImage(bitmap,f*96,0,96,128,x,y,width,height);
       ctx.restore();
       return true;
     }
     if(!pack.ready)return false;
     // Legacy 8+10-frame art remains available while v95 PNGs load or fail.
     const f=Math.min(clip.count-1,Math.max(0,Math.floor(t*1000/clip.frameMs)));
     const x=z.x+z.w/2-32*scale,y=z.y+z.h-60*scale;
     const bitmap=pack.variants[selected]||image;
     ctx.drawImage(bitmap,f*48,clip.row*48,48,48,x,y,64*scale,64*scale);
     return true;
   }
 };
 window.ZZGreenDeath=pack;
 image.onload=()=>{pack.ready=image.naturalWidth===480&&image.naturalHeight===96;if(pack.ready)pack.variants=window.ZZGreenPalette?.variants(image)||[image]};
 image.onerror=()=>{pack.ready=false};
 image.src='assets/ip/green-death.png';
 for(const [kind,part] of Object.entries(pack.remaster)){
   part.image.decoding='async';
   part.image.onload=()=>{
     part.ready=part.image.naturalWidth===768&&part.image.naturalHeight===128;
     if(part.ready){
       part.variants=window.ZZGreenPalette?.variants(part.image)||[part.image];
       pack.ready=true;
     }
   };
   part.image.onerror=()=>{part.ready=false};
   // v112: baked alpha fringe removed offline; no per-frame cleanup cost.
   part.image.src='assets/ip/green-death-'+kind+'-v95.png'+'?v=112-sharp-alpha';
 }

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
     if(pack.ready)pack.draw(c,actor,current==='critical',Math.min(t,clip.duration-.001),pack.remaster[current].ready?1.28:2.6);
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
