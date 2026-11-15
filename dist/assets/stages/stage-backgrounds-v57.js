/* ZOMBIE ZERO – 18 illustrated 2x scene backgrounds (900×1420), v57.
 * Stages 01–08 retain their approved original art; 09–18 use corrected
 * gameplay-camera scenes with left/right walls and a clear zombie road.
 * Each background is a real compressed WebP image, loaded directly.
 * Loading is nonblocking: any missing frame keeps the previous stage or
 * falls back to the game's existing procedural road. No collision changes.
 */
(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined')return;
 const themes=[
  '네온 사이버 시티','새벽 항구','네온 놀이공원','바이오랩',
  '햇살의 폐허 정원','황금 농장','달빛 숲','사막 전초기지',
  '햇살 도심 대로','비 오는 네온 상점가','봄날 교외 공원',
  '가을 캠퍼스 광장','사막 폐차장','눈 덮인 겨울 주택가',
  '해안 항구 창고','달빛 숲 캠핑장','석양 고층 옥상',
  '식생에 잠긴 폐허 쇼핑몰'
 ];
 const images=new Array(18),ready=new Array(18).fill(false);
 const art={images,ready,themes,count:18,sourceWidth:900,sourceHeight:1420,version:57};
 window.ZZStageArt=art;
 for(let i=0;i<18;i++){
  const img=new Image();
  img.decoding='async';
  images[i]=img;
  img.onload=()=>{
   ready[i]=img.naturalWidth===900&&img.naturalHeight===1420;
  };
  img.onerror=()=>{ready[i]=false;};
  const name='bg-'+String(i+1).padStart(2,'0')+'.webp';
  const revision=i<8?'45-original-scenes':'57-playfield-camera';
  img.src='assets/stages/'+name+'?v='+revision;
 }
})();
