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
