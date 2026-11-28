/* ZOMBIE ZERO citizen cast v41. 8 unique voxel citizens, 4 frames each.
   1024x512 transparent indexed PNG, 128x128 cells, columns=characters,
   rows=animation frames. Cheer sheet and sacrifice/counterattack sheet share
   exact sprite baselines. Graceful procedural fallback until both are ready. */
(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined')return;
 const cast={ready:false,cheer:null,attack:null,count:8,frames:4,cell:128};
 window.ZZCitizenCast=cast;
 let pending=2,failed=false;
 function load(name,file){
  const img=new Image();img.decoding='async';
   cast[name]=img; // v80: expose in-flight sprite to scene preloader
  img.onload=()=>{
   if(img.naturalWidth!==1024||img.naturalHeight!==512)failed=true;
   cast[name]=img;
   pending--;
   cast.ready=pending===0&&!failed;
  };
  img.onerror=()=>{failed=true;pending--;cast.ready=false;};
  img.src='assets/ip/'+file+'?v=41-voxel-citizens';
 }
 load('cheer','citizen-cheer-v41.png');
 load('attack','citizen-sacrifice-v41.png');
})();

/* v480 integration candidate: approved individual 8x3 sheets, 256px source cells.
 * Only switch when all 18 load successfully; keep v41 art otherwise.
 * Source PNGs must be supplied separately, numbered 01 through 18.
 */
(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined'||typeof document==='undefined')return;
 const cast={ready:false,cell:128,sheets:new Array(18),count:18};
 window.ZZCitizenCast18=cast;
 let index=0;
 function loadNext(){
  if(index===18){cast.ready=true;return;}
  const i=index++,img=new Image();img.decoding='async';
  img.onload=()=>{
   if(img.naturalWidth!==2048||img.naturalHeight!==768){cast.sheets=[];return;}
   const sheet=document.createElement('canvas');sheet.width=1024;sheet.height=384;
   const ctx=sheet.getContext('2d');if(!ctx){cast.sheets=[];return;}
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,1024,384);
   cast.sheets[i]=sheet;loadNext();
  };
  img.onerror=()=>{cast.sheets=[];};
  img.src='assets/ip/citizens-v480/citizen-'+String(i+1).padStart(2,'0')+'.png';
 }
 loadNext();
})();
