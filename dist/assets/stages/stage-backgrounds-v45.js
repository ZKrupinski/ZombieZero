/* ZOMBIE ZERO – 18 illustrated 2× resolution backgrounds (900×1420).
   All art is bitmap, not procedural geometry. Each stage rotates themes.
   Keep loading non-blocking: the legacy road remains the fallback if a file
   is missing or has not finished loading. GitHub Pages SW precaches all 18. */
(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined')return;
 const themes=[
  '네온 사이버 시티','새벽 항구','네온 놀이공원','바이오랩',
  '햇살의 폐허 정원','황금 농장','달빛 숲','사막 전초기지',
  '햇살 도심 대로', '비 오는 네온 상점가', '봄날 교외 공원', '가을 캠퍼스 광장', '사막 폐차장', '눈 덮인 겨울 주택가', '해안 항구 창고', '달빛 숲 캠핑장', '석양 고층 옥상', '식생에 잠긴 폐허 쇼핑몰'
 ];
 const images=new Array(18),ready=new Array(18).fill(false);
 const art={images,ready,themes,count:18,sourceWidth:900,sourceHeight:1420};
 window.ZZStageArt=art;
 for(let i=0;i<18;i++){
  const img=new Image();
  img.decoding='async';
  images[i]=img;
  img.onload=()=>{
   ready[i]=img.naturalWidth===900&&img.naturalHeight===1420;
  };
  img.onerror=()=>{ready[i]=false;};
  if(i<8){
   img.src='assets/stages/bg-'+String(i+1).padStart(2,'0')+'.webp?v=45-eighteen-scenes';
  }else{
   // These are byte-identical WebP images stored as reversible base64 text.
   // GitHub's text-file endpoint supports binary art without changing the pixels.
   // The browser decodes the data URI into a normal bitmap Image object.
   const path='assets/stages/bg-'+String(i+1).padStart(2,'0')+'.webp.b64?v=45-eighteen-scenes';
   fetch(path).then(response=>{
    if(!response.ok)throw Error('stage image '+(i+1)+' HTTP '+response.status);
    return response.text();
   }).then(encoded=>{
    img.src='data:image/webp;base64,'+encoded.trim();
   }).catch(()=>{ready[i]=false;});
  }
 }
})();
