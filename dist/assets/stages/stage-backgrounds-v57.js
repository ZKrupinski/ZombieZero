/* Stage scenes are requested individually and decoded before the crossfade. */
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
 // Approved orthographic bitmap replacements. Fixed visual road edges x=72 and 828.
 const override={8:'bg-09-v66-orthographic.webp',14:'bg-15-v66-orthographic.webp'};
 const images=new Array(18),ready=new Array(18).fill(false);
 const loading=new Array(18).fill(false);
 function load(i){
  if(images[i])return;
  const img=images[i]=new Image();
  loading[i]=true;
  img.decoding='async';
  img.onload=async()=>{
   try{
    if(img.decode)await img.decode();
    if(images[i]===img)ready[i]=img.naturalWidth===900&&img.naturalHeight===1420;
   }catch{/* Use the existing background fallback. */}
   finally{if(images[i]===img)loading[i]=false;}
  };
  img.onerror=()=>{if(images[i]===img){ready[i]=false;loading[i]=false;}};
  const file=override[i]||'bg-'+String(i+1).padStart(2,'0')+'.webp';
  img.src='assets/stages/'+file;
 }
 function retain(current,previous){
  for(let i=0;i<images.length;i++){
   if(i===current||i===previous)continue;
   images[i]=undefined;ready[i]=false;loading[i]=false;
  }
 }
 window.ZZStageArt={images,ready,loading,load,retain,themes,count:18,sourceWidth:900,sourceHeight:1420,version:143};
 load(0); // The character picker displays the first campaign scene.
})();
