// ZOMBIE ZERO · Bitmap palette variants for the approved canonical green mascot.
// Preserve the original PNG alpha, all poses, eyes, eyebrows and red clothing.
// Recolor green body pixels only, once at atlas load (not every render frame).
(function(){
 'use strict';
 const tones=[
  {name:'클래식 그린',rgb:null,weight:.55},
  {name:'모스 그린',rgb:[151,169,99],weight:.18},
  {name:'씨글라스 민트',rgb:[94,183,163],weight:.14},
  {name:'스모키 블루',rgb:[116,152,188],weight:.09},
  {name:'더스티 라벤더',rgb:[162,141,177],weight:.04}
 ];
 function paletteFor(z){
  if((z?.form??0)!==0||z?.boss)return 0;
  if(Number.isInteger(z.paletteVariant))return Math.max(0,Math.min(tones.length-1,z.paletteVariant));
  const seed=Number.isFinite(z?.seed)?z.seed:0;
  if(seed<=0)return 0;
  const u=(Math.sin(seed*12.9898+78.233)*43758.5453)%1;
  const r=u<0?u+1:u;
  let cumulative=0;
  for(let i=0;i<tones.length;i++){
   cumulative+=tones[i].weight;
   if(r<cumulative)return i;
  }
  return tones.length-1;
 }
 function recolorGreen(data,target){
  if(!target)return data;
  for(let i=0;i<data.length;i+=4){
   if(!data[i+3])continue;
   const r=data[i],g=data[i+1],b=data[i+2];
   const excess=Math.min(g-r,g-b);
   // Green material vs red shirt, neutral whites, pupils and dark outlines.
   if(excess<11||g<43)continue;
   const blend=Math.max(0,Math.min(1,(excess-10)/25))*.96;
   const brightness=Math.max(.38,Math.min(1.48,(r*.24+g*.66+b*.10)/139));
   for(let c=0;c<3;c++){
    const source=data[i+c],shade=target[c]*brightness;
    data[i+c]=Math.max(0,Math.min(255,Math.round(source*(1-blend)+shade*blend)));
   }
  }
  return data;
 }
 function variants(source){
  const out=[source];
  if(typeof document==='undefined'||typeof document.createElement!=='function'||
     !source?.naturalWidth||!source?.naturalHeight)return out;
  try {
   const w=source.naturalWidth,h=source.naturalHeight;
   const base=document.createElement('canvas');base.width=w;base.height=h;
   const context=base.getContext('2d',{willReadFrequently:true});
   if(!context)return out;
   context.drawImage(source,0,0);
   const original=context.getImageData(0,0,w,h).data;
   for(let i=1;i<tones.length;i++){
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const dest=canvas.getContext('2d');
    if(!dest)break;
    const pixels=dest.createImageData(w,h);
    pixels.data.set(original);
    recolorGreen(pixels.data,tones[i].rgb);
    dest.putImageData(pixels,0,0);
    out[i]=canvas;
   }
  }catch(_){/* Canvas readback blocked: fall back to original sprites. */}
  return out;
 }
 window.ZZGreenPalette={tones,paletteFor,recolorGreen,variants};
})();
