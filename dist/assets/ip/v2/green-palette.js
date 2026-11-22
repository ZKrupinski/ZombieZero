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
 function loadExpression(image,src,w,h,finish){
  const result=[];
  image.decoding='async';
  image.onload=()=>{
   if(image.naturalWidth!==w||image.naturalHeight!==h)return;
   const colors=variants(image);
   result.push(...(finish?colors.map(finish):colors));
  };
  image.src=src;
  return result;
 }

 // v290: Stable, eyebrow-safe expressions.
 // Work entirely INSIDE the existing eye whites / pupils. Never paint eyebrows,
 // outline pixels or transparent gutters; reject a whole animated pose if eye
 // tracking becomes unreliable, rather than alternating edited/neutral frames.
 function createFaceExpressions(source){
  if(typeof document==='undefined'||!source?.naturalWidth)return {};
  const w=source.naturalWidth,h=source.naturalHeight;
  if(w!==1024||h!==512)return {}; // Full walking atlas only: dying/exploding stays original.
  const cell=128,cols=w/cell,rows=h/cell;
  let original;
  try{
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const c=canvas.getContext('2d',{willReadFrequently:true});if(!c)return {};
   c.drawImage(source,0,0);original=c.getImageData(0,0,w,h);
  }catch(_){return {}}
  const src=original.data;
  const at=(x,y)=>(y*w+x)*4;
  function isWhite(x,y){
   const i=at(x,y),r=src[i],g=src[i+1],b=src[i+2];
   return src[i+3]>=210&&r>=175&&g>=177&&b>=155&&
    Math.max(r,g,b)-Math.min(r,g,b)<68;
  }
  function isPupil(x,y){
   const i=at(x,y),r=src[i],g=src[i+1],b=src[i+2];
   return src[i+3]>=210&&r>=90&&r>g*1.55&&r>b*1.17;
  }
  function isSkin(x,y){
   const i=at(x,y),r=src[i],g=src[i+1],b=src[i+2];
   return src[i+3]>=210&&g>r+17&&g>b+8&&g>55;
  }
  function detect(fx,fy){
   // Only the upper face, never teeth or bright accessories.
   const x0=fx+Math.round(cell*.14),x1=fx+Math.round(cell*.87);
   const y0=fy+Math.round(cell*.30),y1=fy+Math.round(cell*.69);
   const seen=new Uint8Array(cell*cell),hits=[];
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const root=(y-fy)*cell+x-fx;
    if(seen[root]||!isWhite(x,y))continue;
    const queue=[root];seen[root]=1;
    let minX=x,maxX=x,minY=y,maxY=y;
    for(let i=0;i<queue.length;i++){
     const id=queue[i],px=fx+(id%cell),py=fy+Math.floor(id/cell);
     minX=Math.min(minX,px);maxX=Math.max(maxX,px);
     minY=Math.min(minY,py);maxY=Math.max(maxY,py);
     for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const xx=px+dx,yy=py+dy;
      if(xx<x0||xx>=x1||yy<y0||yy>=y1)continue;
      const ni=(yy-fy)*cell+xx-fx;
      if(seen[ni]||!isWhite(xx,yy))continue;
      seen[ni]=1;queue.push(ni);
     }
    }
    const ew=maxX-minX+1,eh=maxY-minY+1;
    if(queue.length>=10&&ew>=4&&eh>=4&&ew<=34&&eh<=32)
     hits.push({x:minX-fx,y:minY-fy,w:ew,h:eh,area:queue.length});
   }
   return hits.sort((a,b)=>b.area-a.area).slice(0,2).sort((a,b)=>a.x-b.x);
  }
  const median=arr=>arr.slice().sort((a,b)=>a-b)[Math.floor(arr.length/2)];
  const stable=[];
  for(let row=0;row<3;row++){
   const group=[];
   for(let col=0;col<cols;col++)group.push(detect(col*cell,row*cell));
   // Even a single missing component risks a visible eye-pop in an 8-frame walk.
   if(group.some(eyes=>eyes.length!==2))continue;
   const reference=[0,1].map(k=>({
    x:median(group.map(eyes=>eyes[k].x)),
    y:median(group.map(eyes=>eyes[k].y)),
    w:median(group.map(eyes=>eyes[k].w)),
    h:median(group.map(eyes=>eyes[k].h))
   }));
   const consistent=group.every(eyes=>eyes.every((eye,k)=>{
    const ref=reference[k];
    return Math.abs(eye.x-ref.x)<=5&&Math.abs(eye.y-ref.y)<=4&&
     Math.abs(eye.w-ref.w)<=5&&Math.abs(eye.h-ref.h)<=5;
   }));
   if(consistent)stable.push({row,group,reference});
  }
  // A stable skin sample from the adjacent existing green material for each
  // eye. Never sample the eyebrow itself; preserve source shading via distance.
  function skinColor(fx,fy,eye){
   for(const x of [eye.x-3,eye.x+eye.w+2,eye.x-6,eye.x+eye.w+5])
    for(const y of [eye.y+Math.floor(eye.h*.6),eye.y+Math.floor(eye.h*.3),eye.y+eye.h+2]){
     const px=fx+x,py=fy+y;
     if(px<fx||px>=fx+cell||py<fy||py>=fy+cell||!isSkin(px,py))continue;
     const i=at(px,py);return [src[i],src[i+1],src[i+2]];
    }
   return null;
  }
  function paint(out,eye,fx,fy,depth,lean){
   const color=skinColor(fx,fy,eye);
   if(!color)return;
   for(let dx=0;dx<eye.w;dx++){
    const curve=Math.abs((dx+.5)/eye.w-.5)*2;
    // Fixed normalized lid position within all frames of a direction.
    // Shallow corners avoid squared patches and random blinking edges.
    const edge=Math.max(1,Math.min(eye.h-2,Math.round(
      eye.h*(depth-.055*curve+lean*((dx+.5)/eye.w-.5)))));
    for(let dy=0;dy<=edge;dy++){
     const x=fx+eye.x+dx,y=fy+eye.y+dy;
     // Restrict to original eye paint only. This expressly excludes dark brows.
     if(!isWhite(x,y)&&!isPupil(x,y))continue;
     const i=at(x,y);
     const fold=dy===edge,weight=fold?.76:.97;
     for(let c=0;c<3;c++){
      // Subtle shaded seam; no new black line above the eye.
      const tone=fold?color[c]*.81:color[c];
      out[i+c]=Math.round(src[i+c]*(1-weight)+tone*weight);
     }
    }
   }
  }
  const expressions={};
  for(const kind of ['half-lid','raised-brow']){
   const pixels=new Uint8ClampedArray(src);
   for(const {row,group} of stable)for(let col=0;col<cols;col++){
    const eyes=group[col],fx=col*cell,fy=row*cell;
    for(let k=0;k<2;k++){
     // raised-brow is a legacy save-data key; the art is an asymmetric squint,
     // not an eyebrow pasted on top of the approved source brow.
     const sleepy=kind==='half-lid';
     const depth=sleepy?(k===0?.43:.39):(k===0?.29:.15);
     paint(pixels,eyes[k],fx,fy,depth,sleepy?.025:-.035);
    }
   }
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const c=canvas.getContext('2d');if(!c)continue;
   const data=c.createImageData(w,h);data.data.set(pixels);c.putImageData(data,0,0);
   expressions[kind]=variants(canvas);
  }
  return expressions;
 }

 window.ZZGreenPalette={tones,paletteFor,recolorGreen,variants,loadExpression,createFaceExpressions};
})();
