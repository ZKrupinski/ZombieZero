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

/* v480: 18 approved distinct citizens, 8 frames × 3 rows.
   128px square cells. Bounded parallel loading; original v41 fallback on failure. */
(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined')return;
 const cast={ready:false,loading:true,cell:128,sheets:new Array(18),count:18};
 window.ZZCitizenCast18=cast;
 let index=0,loaded=0;
 function loadNext(){
  if(!cast.loading||index>=18)return;
  const i=index++,img=new Image();img.decoding='async';
  img.onload=()=>{
   if(!cast.loading)return;
   if(img.naturalWidth!==1024||img.naturalHeight!==384){fail();return;}
   cast.sheets[i]=img;
   if(++loaded===18){cast.ready=true;cast.loading=false;return;}
   loadNext();
  };
  function fail(){cast.loading=false;cast.ready=false;cast.sheets=[];}
  img.onerror=fail;
  img.src='assets/ip/citizens-v480/citizen-'+String(i+1).padStart(2,'0')+'.webp';
 }
 for(let i=0;i<3;i++)loadNext();
})();
