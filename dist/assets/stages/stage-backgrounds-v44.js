/* ZOMBIE ZERO – 8 illustrated 2× resolution backgrounds (900×1420).
   All art is bitmap, not procedural geometry. Each stage rotates themes.
   Keep loading non-blocking: the legacy road remains the fallback if a file
   is missing or has not finished loading. GitHub Pages SW precaches all 8. */
(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined')return;
 const themes=[
  '네온 사이버 시티','새벽 항구','네온 놀이공원','바이오랩',
  '햇살의 폐허 정원','황금 농장','달빛 숲','사막 전초기지'
 ];
 const images=new Array(8),ready=new Array(8).fill(false);
 const art={images,ready,themes,count:8,sourceWidth:900,sourceHeight:1420};
 window.ZZStageArt=art;
 for(let i=0;i<8;i++){
  const img=new Image();
  img.decoding='async';
  images[i]=img;
  img.onload=()=>{
   ready[i]=img.naturalWidth===900&&img.naturalHeight===1420;
  };
  img.onerror=()=>{ready[i]=false;};
  img.src='assets/stages/bg-'+String(i+1).padStart(2,'0')+'.webp?v=44-stage-environments';
 }
})();
