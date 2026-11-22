// ZOMBIE ZERO · 8-frame v95 front-facing remastered normal / critical death.
// 768x128 RGBA PNG strips (8 x 96px), original fallback 480x96 kept.
// Visual only: does not touch collision, scoring, wave progression or loot.
(function(){
 'use strict';
 const image=new Image(); image.decoding='async';
 // V121: Repair neutral-white, semi-transparent pixels only on the outer
 // boundary of CRITICAL death frames. Interior white eyes/brain highlights,
 // color grading and alpha of other materials stay untouched.
 function cleanCriticalFringePixels(data,w,h){
   if(!data||data.length!==w*h*4||w<3||h<3)return 0;
   const original=new Uint8ClampedArray(data);
   let changed=0;
   for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
     const i=(y*w+x)*4,a=original[i+3];
     if(a<12||a>251)continue;
     const r=original[i],g=original[i+1],b=original[i+2];
     const light=Math.min(r,g,b),spread=Math.max(r,g,b)-light;
     if(light<185||spread>48)continue;
     // Do not blend neighboring frames in the 8 x 96-pixel atlas.
     const frameLeft=Math.floor(x/96)*96,frameRight=frameLeft+95;
     let exposed=false,inner=-1,innerAlpha=a;
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
       if(!dx&&!dy)continue;
       const xx=x+dx,yy=y+dy;
       if(xx<frameLeft||xx>frameRight||yy<0||yy>=h)continue;
       const n=(yy*w+xx)*4,na=original[n+3];
       if(na<=24)exposed=true;
       const nr=original[n],ng=original[n+1],nb=original[n+2];
       const neutral=Math.min(nr,ng,nb)>=185&&Math.max(nr,ng,nb)-Math.min(nr,ng,nb)<=48;
       if(na>innerAlpha+24&&!neutral){inner=n;innerAlpha=na;}
     }
     if(!exposed)continue;
     if(inner>=0){
       // Pull matted white RGB toward adjacent opaque silhouette material.
       data[i]=Math.round(r*.30+original[inner]*.70);
       data[i+1]=Math.round(g*.30+original[inner+1]*.70);
       data[i+2]=Math.round(b*.30+original[inner+2]*.70);
       data[i+3]=Math.round(a*.80);
     }else{
       // Isolated pale fringe with no colored interior: fade it cleanly.
       data[i+3]=Math.round(a*.38);
     }
     changed++;
   }
   return changed;
 }
 function cleanCriticalFringeBitmap(bitmap){
   if(typeof document==='undefined'||typeof document.createElement!=='function')return bitmap;
   const w=bitmap.naturalWidth||bitmap.width,h=bitmap.naturalHeight||bitmap.height;
   if(w!==768||h!==128)return bitmap;
   try{
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
     const c=canvas.getContext('2d',{willReadFrequently:true});if(!c)return bitmap;
     c.drawImage(bitmap,0,0);
     const frame=c.getImageData(0,0,w,h);
     if(!cleanCriticalFringePixels(frame.data,w,h))return bitmap;
     c.putImageData(frame,0,0);
     return canvas;
   }catch(_){return bitmap}
 }
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
       const bitmap=(z.halfLidded&&art.halfLidded?.[selected])||art.variants[selected]||art.image;
       // First 65 ms crossfade the exact live colored character into frame 0.
       // No silhouette pop, especially for moss/mint/blue/lavender zombies.
       const blend=Math.max(0,Math.min(1,t/.065));
       if(blend<1&&window.ZZGreenWalk?.ready){
         ctx.save();ctx.globalAlpha=(ctx.globalAlpha??1)*(1-blend);
         window.ZZGreenWalk.draw(ctx,z,0);ctx.restore();
       }
       ctx.save();ctx.globalAlpha=(ctx.globalAlpha??1)*blend;
       ctx.drawImage(bitmap,f*96,0,96,128,x,y,width,height);
       if(z.brownHair&&art.hair.complete&&art.hair.naturalWidth===768)
         ctx.drawImage(art.hair,f*96,0,96,128,x,y,width,height);
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
   part.hair=new Image();
   part.hair.decoding='async';
   part.hair.src='assets/ip/green-death-'+kind+'-v95-chestnut.webp';
   part.halfLidded=window.ZZGreenPalette?.loadHalfLidded?.(new Image(),
     'assets/ip/green-death-'+kind+'-v95-half-lid.webp',768,128,
     kind==='critical'?cleanCriticalFringeBitmap:null);
   part.image.decoding='async';
   part.image.onload=()=>{
     part.ready=part.image.naturalWidth===768&&part.image.naturalHeight===128;
     if(part.ready){
       part.variants=window.ZZGreenPalette?.variants(part.image)||[part.image];
       // Run once after palette baking, never during sprite animation.
       if(kind==='critical')part.variants=part.variants.map(cleanCriticalFringeBitmap);
       pack.ready=true;
     }
   };
   part.image.onerror=()=>{part.ready=false};
   // V121: critical edges decontaminated once after loading; original PNG retained.
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
