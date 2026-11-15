/* ZOMBIE ZERO – 18 illustrated 900×1420 stage scenes, v57.
 * Keep original backgrounds 01–08 exactly as before; backgrounds 09–18
 * are the user's final corrected gameplay camera designs.
 *
 * 09–18 are lossless-bytes WebP payloads in a single STORED (uncompressed)
 * ZIP bundle: browser-side unwrapping never re-encodes the bitmap pixels.
 * One compact 2.1 MB fetch works offline through the existing service worker.
 * Any invalid/missing image uses the existing procedural background fallback;
 * stage order, 0.9s transitions, game collisions, and physics are unchanged.
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
  img.onload=()=>{ready[i]=img.naturalWidth===900&&img.naturalHeight===1420;};
  img.onerror=()=>{ready[i]=false;};
  if(i<8)img.src='assets/stages/bg-'+String(i+1).padStart(2,'0')+'.webp?v=45-original-scenes';
 }
 const archive='assets/stages/bg-09-18-v57-stored.zip?v=57-gameplay-camera';
 fetch(archive).then(response=>{
  if(!response.ok)throw Error('stage archive HTTP '+response.status);
  return response.arrayBuffer();
 }).then(buffer=>{
  const data=new DataView(buffer);
  const bytes=new Uint8Array(buffer);
  let off=0,count=0;
  while(off+30<=bytes.length&&data.getUint32(off,true)===0x04034b50){
   const flags=data.getUint16(off+6,true);
   const compression=data.getUint16(off+8,true);
   const compressed=data.getUint32(off+18,true);
   const uncompressed=data.getUint32(off+22,true);
   const nameLen=data.getUint16(off+26,true);
   const extraLen=data.getUint16(off+28,true);
   const payload=off+30+nameLen+extraLen,stop=payload+compressed;
   if(flags&8||compression!==0||compressed!==uncompressed||stop>bytes.length)
    throw Error('invalid stored ZIP WebP entry');
   const name=String.fromCharCode.apply(null,bytes.subarray(off+30,off+30+nameLen));
   const match=/^bg-(0[9]|1[0-8])\.webp$/.exec(name);
   if(!match)throw Error('unexpected image name '+name);
   const i=Number(match[1])-1;
   const url=URL.createObjectURL(new Blob([bytes.subarray(payload,stop)],{type:'image/webp'}));
   const img=images[i];
   img.onload=()=>{
    ready[i]=img.naturalWidth===900&&img.naturalHeight===1420;
    URL.revokeObjectURL(url);
   };
   img.onerror=()=>{ready[i]=false;URL.revokeObjectURL(url);};
   img.src=url;
   off=stop;
   count++;
  }
  if(count!==10)throw Error('missing stage background in archive: '+count+'/10');
 }).catch(()=>{
  // The existing game renderer handles missing stage art using its fallback.
  for(let i=8;i<18;i++)if(!images[i].complete)ready[i]=false;
 });
})();