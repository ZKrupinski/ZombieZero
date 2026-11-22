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
  const w=source?.naturalWidth||source?.width,h=source?.naturalHeight||source?.height;
  if(typeof document==='undefined'||typeof document.createElement!=='function'||
     !w||!h)return out;
  try {
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

 // v291: Existing tinted-hair WebPs have opaque horizontal strips between
 // frames. Mask them by the actual source hair silhouette (not just a
 // rectangular crop) before the player can see them. Never tint eyebrows.
 const hairMaskCache=new WeakMap();
 function cleanHairOverlay(original,sheet){
  const w=original?.naturalWidth,h=original?.naturalHeight;
  if(w!==1024||h!==512||sheet?.naturalWidth!==w||sheet?.naturalHeight!==h||
     typeof document==='undefined')return null;
  try{
   const baseCanvas=document.createElement('canvas');baseCanvas.width=w;baseCanvas.height=h;
   const bc=baseCanvas.getContext('2d',{willReadFrequently:true});if(!bc)return null;
   bc.drawImage(original,0,0);
   const src=bc.getImageData(0,0,w,h).data;
   let mask=hairMaskCache.get(original);
   if(!mask){
    mask=new Uint8Array(w*h);
    for(let row=0;row<4;row++)for(let col=0;col<8;col++){
     const x0=col*128,y0=row*128,maxY=row===0?47:row===3?48:58;
     const seen=new Uint8Array(128*128),queue=[];
     const isCap=(x,y)=>{
      if(x<0||x>=128||y<0||y>=maxY)return false;
      const i=((y0+y)*w+x0+x)*4;
      const r=src[i],g=src[i+1],b=src[i+2];
      return src[i+3]>140&&Math.max(r,g,b)<126&&
       Math.max(r,g,b)-Math.min(r,g,b)<65;
     };
     // Seeds are on the original top cap, not on the floating eyebrow.
     for(let y=0;y<Math.min(26,maxY);y++)for(let x=18;x<111;x++){
      const key=y*128+x;
      if(isCap(x,y)&&!seen[key]){seen[key]=1;queue.push(key)}
     }
     for(let q=0;q<queue.length;q++){
      const id=queue[q],x=id%128,y=(id/128)|0;
      mask[(y0+y)*w+x0+x]=1;
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
       const xx=x+dx,yy=y+dy,at=yy*128+xx;
       if(xx<0||xx>=128||yy<0||yy>=maxY||seen[at]||!isCap(xx,yy))continue;
       seen[at]=1;queue.push(at);
      }
     }
    }
    hairMaskCache.set(original,mask);
   }
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return null;
   ctx.drawImage(sheet,0,0);
   const data=ctx.getImageData(0,0,w,h);
   for(let p=0;p<mask.length;p++){
    const i=p*4;
    // Keep original darkest outline. Do not let a tinted sheet recolor it.
    const lum=(src[i]+src[i+1]+src[i+2])/3;
    if(!mask[p]||lum<32) data.data[i+3]=0;
    else data.data[i+3]=Math.min(data.data[i+3],src[i+3]);
   }
   ctx.putImageData(data,0,0);
   return canvas;
  }catch(_){return null}
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
  function paint(out,eye,fx,fy,depth,lean,reference=eye,skinTone=null){
   // A static, flat voxel eyelid with a single baked height for the entire
   // eight-frame direction. No frame-dependent shaded seam or animated fold.
   const color=skinTone||skinColor(fx,fy,eye);
   if(!color)return;
   const cut=Math.max(1,Math.round(reference.h*depth));
   for(let dx=0;dx<eye.w;dx++){
    // Corners remain gently bevelled by the eye-white mask, never eyebrow ink.
    const left=Math.round(reference.w*.11);
    const cap=Math.max(1,Math.min(eye.h-2,cut-(dx<left||dx>=eye.w-left?1:0)));
    for(let dy=0;dy<=cap;dy++){
     const x=fx+eye.x+dx,y=fy+eye.y+dy;
     if(!isWhite(x,y)&&!isPupil(x,y))continue;
     const i=at(x,y);
     out[i]=color[0];out[i+1]=color[1];out[i+2]=color[2];
    }
   }
  }
  const expressions={};
  for(const kind of ['half-lid','raised-brow']){
   const pixels=new Uint8ClampedArray(src);
   for(const {row,group,reference} of stable)for(let col=0;col<cols;col++){
    const eyes=group[col],fx=col*cell,fy=row*cell;
    for(let k=0;k<2;k++){
     // raised-brow is a legacy save-data key; the art is an asymmetric squint,
     // not an eyebrow pasted on top of the approved source brow.
     const sleepy=kind==='half-lid';
     const depth=sleepy?(k===0?.38:.37):(k===0?.27:.14);
     paint(pixels,eyes[k],fx,fy,depth,0,reference[k],skinColor(0,row*cell,group[0][k]));
    }
   }
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const c=canvas.getContext('2d');if(!c)continue;
   const data=c.createImageData(w,h);data.data.set(pixels);c.putImageData(data,0,0);
   expressions[kind]=variants(canvas);
  }

  // v292: Four approved face concepts + two restrained combinations.
  // Art is synthesized once from the canonical 8x3 walk atlas. All edits
  // remain inside original opaque face material; no attached brow layer,
  // interpolation, frame-dependent randomization, or per-enemy canvas work.

  // v297: The red shape at y73..80 (front) / y64..71 (diagonal)
  // is the NOSE, NEVER the mouth. Real mouth = dark horizontal slit
  // immediately beneath it, with original white fangs at the two ends.
  // The perspective-specific regions below were mapped from canonical PNG:
  // front: ink x48..80/y81..84; left: x39..61/y69..80;
  // right: x67..89/y69..80. Only existing ink may become teeth.
  const MOUTH_ZONES=[
   {x0:44,x1:84,y0:76,y1:89,axis:'x'},
   {x0:35,x1:68,y0:68,y1:82,axis:'y'},
   {x0:64,x1:93,y0:68,y1:82,axis:'y'}
  ];
  function isMouthInk(x,y){
   const i=at(x,y),r=src[i],g=src[i+1],b=src[i+2];
   return src[i+3]>=230&&r<87&&g<87&&b<87;
  }
  function detectMouth(fx,fy,row){
   const zone=MOUTH_ZONES[row];
   if(!zone)return null;
   let x0=127,y0=127,x1=0,y1=0;
   let count=0;
   const byY={};
   for(let ly=zone.y0;ly<zone.y1;ly++)for(let lx=zone.x0;lx<zone.x1;lx++){
    if(!isMouthInk(fx+lx,fy+ly))continue;
    x0=Math.min(x0,lx);x1=Math.max(x1,lx);
    y0=Math.min(y0,ly);y1=Math.max(y1,ly);
    if(!byY[ly])byY[ly]=[];
    byY[ly].push(lx);count++;
   }
   if(count<19||x1-x0<5||y1-y0<2)return null;
   // Prevent a nearby black eyebrow, hair or clothing pixel being selected.
   if(row===0&&(y0<76||y1>88||x0<42||x1>87))return null;
   if(row===1&&(x0<33||x1>70||y0<68||y1>81))return null;
   if(row===2&&(x0<62||x1>94||y0<68||y1>81))return null;
   return {x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,byY,zone,inkCount:count};
  }
  // Ensure all eight frames of a direction have a real, coherent mouth.
  // No eye movement, nose color, or shirt shade is used as an anchor.
  const mouthsByRow={};
  for(const {row} of stable){
   const found=[];
   for(let col=0;col<cols;col++)found.push(detectMouth(col*cell,row*cell,row));
   if(found.some(v=>!v))continue;
   const mx=median(found.map(v=>v.x)),my=median(found.map(v=>v.y));
   if(found.every(v=>Math.abs(v.x-mx)<=5&&Math.abs(v.y-my)<=4))
    mouthsByRow[row]=found;
  }

  function makePixel(out,x,y,r,g,b){
   const i=at(x,y);
   if(src[i+3]<230)return;
   out[i]=Math.round(r);out[i+1]=Math.round(g);out[i+2]=Math.round(b);
  }
  // A fixed, six-row voxel heart. Unlike the previous cubic heart equation,
  // this has no floating-point cusp, highlight flare, antialias or dark rim.
  const HEART_PIXELS=[
   '011000110',
   '111101111',
   '111111111',
   '111111111',
   '011111110',
   '001111100',
   '000111000',
   '000010000'
  ];
  function heartEyes(out,fx,fy,eyes,reference){
   for(let k=0;k<eyes.length;k++){
    const eye=eyes[k],ref=reference?.[k]||eye;
    const cx=Math.round(eye.x+(eye.w-1)*.5);
    const cy=Math.round(eye.y+(eye.h-1)*.52);
    const whites=[];
    for(let y=eye.y;y<eye.y+eye.h;y++)
     for(let x=eye.x;x<eye.x+eye.w;x++)
      if(isWhite(fx+x,fy+y)){
       const i=at(fx+x,fy+y);whites.push([src[i],src[i+1],src[i+2]]);
      }
    if(!whites.length)continue;
    const shade=[0,1,2].map(c=>median(whites.map(v=>v[c])));
    // Erase EVERY old pink/red pupil fragment, not just the pure-red core.
    // Otherwise the leftover pink antialiasing looks like flames over a heart.
    for(let y=eye.y;y<eye.y+eye.h;y++)for(let x=eye.x;x<eye.x+eye.w;x++){
     const xx=fx+x,yy=fy+y,i=at(xx,yy);
     const r=src[i],g=src[i+1],b=src[i+2];
     const pink=src[i+3]>=210&&r>=97&&r>g*1.12&&r>b*1.11&&g<215;
     if(pink)makePixel(out,xx,yy,...shade);
    }
    // A legible 9x8 (or 7x7 for narrow diagonal eyes) heart. It remains
    // completely inside the original white eye without touching eyebrows.
    const sizeX=ref.w<13?7:9,sizeY=ref.h<12?7:8;
    for(let sy=0;sy<sizeY;sy++)for(let sx=0;sx<sizeX;sx++){
     const mx=Math.min(8,Math.floor((sx+.5)/sizeX*9));
     const my=Math.min(7,Math.floor((sy+.5)/sizeY*8));
     if(HEART_PIXELS[my][mx]!=='1')continue;
     const x=fx+cx+sx-Math.floor(sizeX/2);
     const y=fy+cy+sy-Math.floor(sizeY/2);
     if(x<fx+eye.x||x>=fx+eye.x+eye.w||
        y<fy+eye.y||y>=fy+eye.y+eye.h)continue;
     const i=at(x,y);
     // No painted heart outside the actual original eyeball.
     if(src[i+3]<210||(!isWhite(x,y)&&!isPupil(x,y)))continue;
     makePixel(out,x,y,230,91,125);
    }
   }
  }

  function extraTeeth(out,fx,fy,mouth){
   if(!mouth)return;
   // The two outer ivory teeth already belong to the approved original.
   // Add only 2-3 central teeth on the true black slit. For diagonals,
   // place them along its own downward slope (never mirror/rotate the nose).
   const front=mouth.zone.axis==='x';
   const positions=front?[.31,.51,.71]:[.32,.56,.80];
   let rendered=0;
   for(const position of positions){
    let cx,cy;
    if(front){
     cx=Math.round(mouth.x+position*(mouth.w-1));
     cy=Math.round(mouth.y+(mouth.h-1)*.48);
    }else{
     cy=Math.round(mouth.y+position*(mouth.h-1));
     const row=mouth.byY[cy]||mouth.byY[cy-1]||mouth.byY[cy+1];
     if(!row||!row.length)continue;
     cx=Math.round((row[0]+row[row.length-1])*.5);
    }
    let made=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const lx=cx+dx,ly=cy+dy;
     if(lx<mouth.zone.x0||lx>=mouth.zone.x1||
        ly<mouth.zone.y0||ly>=mouth.zone.y1)continue;
     const x=fx+lx,y=fy+ly;
     if(!isMouthInk(x,y))continue; // Nose, skin, eye, end teeth unchanged.
     makePixel(out,x,y,...(dy===1?[214,204,189]:[251,241,218]));
     made++;
    }
    rendered+=made;
   }
   return rendered;
  }
  function slackJaw(out,fx,fy,mouth){
   if(!mouth)return;
   // Slightly deepen the actual ink line, not an oval over the red nose.
   // Add a one-pixel dark lip underneath ORIGINAL mouth ink, on skin only.
   const front=mouth.zone.axis==='x';
   for(let y=mouth.zone.y0;y<mouth.zone.y1;y++)
    for(let x=mouth.zone.x0;x<mouth.zone.x1;x++){
     const sx=fx+x,sy=fy+y;
     if(!isMouthInk(sx,sy))continue;
     if(front&&y<mouth.y+1)continue;
     const below=sy+1;
     const j=at(sx,below);
     if(below>=fy+cell||src[j+3]<230||!isSkin(sx,below))continue;
     makePixel(out,sx,below,75,43,47);
    }
  }

  function lazyPaletteSet(canvas){
   // Body recolors are generated on demand, not every spawn or render.
   // Most new expressions never need all five large atlas copies on mobile.
   const set=[canvas];let made=false;
   for(let k=1;k<tones.length;k++)
    Object.defineProperty(set,k,{enumerable:true,configurable:true,get(){
     if(!made){
      made=true;
      const colors=variants(canvas);
      for(let j=1;j<tones.length;j++)
       Object.defineProperty(set,j,{value:colors[j]||canvas,enumerable:true});
     }
     return set[k];
    }});
   set.length=tones.length;
   return set;
  }

  const faceStyles={
   'heart-eyes':{heart:true},
   'extra-teeth':{teeth:true},
   'uneven-eyes':{uneven:true},
   'slack-jaw':{jaw:true},
   'heart-teeth':{heart:true,teeth:true},
   'uneven-jaw':{uneven:true,jaw:true}
  };
  for(const [kind,style] of Object.entries(faceStyles)){
   const out=new Uint8ClampedArray(src);
   for(const {row,group,reference} of stable){
    const mouthTrack=mouthsByRow[row];
    for(let col=0;col<cols;col++){
     const fx=col*cell,fy=row*cell,eyes=group[col],mouth=mouthTrack?.[col];
     if(style.uneven){
      paint(out,eyes[0],fx,fy,.43,0,reference[0],skinColor(0,row*cell,group[0][0]));
      paint(out,eyes[1],fx,fy,.14,0,reference[1],skinColor(0,row*cell,group[0][1]));
     }
     if(style.heart)heartEyes(out,fx,fy,eyes,reference);
     if(style.teeth)extraTeeth(out,fx,fy,mouth);
     if(style.jaw)slackJaw(out,fx,fy,mouth);
    }
   }
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const c=canvas.getContext('2d');if(!c)continue;
   const data=c.createImageData(w,h);data.data.set(out);c.putImageData(data,0,0);
   expressions[kind]=lazyPaletteSet(canvas);
  }
  return expressions;
 }

 window.ZZGreenPalette={tones,paletteFor,recolorGreen,variants,loadExpression,createFaceExpressions,cleanHairOverlay};
})();
