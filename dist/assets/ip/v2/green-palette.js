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

 // v289: Author expressions from the untouched, approved bitmap, not a
 // separately exported WebP with polluted transparency or pasted eyebrows.
 // Only recolor pixels inside real eye/mouth shapes; retain original alpha,
 // lighting, hair, silhouettes, directional poses, and frame boundaries.
 function createFaceExpressions(source){
  if(typeof document==='undefined'||!source?.naturalWidth)return {};
  const width=source.naturalWidth,height=source.naturalHeight;
  const cell=width===1024&&height===512?128:width===768&&height===128?96:0;
  if(!cell)return {};
  let original;
  try{
   const base=document.createElement('canvas');base.width=width;base.height=height;
   const c=base.getContext('2d',{willReadFrequently:true});if(!c)return {};
   c.drawImage(source,0,0);original=c.getImageData(0,0,width,height);
  }catch(_){return {}}
  const pixels=original.data,frameCols=width/cell,frameRows=height/cell;
  const idx=(x,y)=>(y*width+x)*4;
  const skin=(x,y)=>{
   const i=idx(x,y),r=pixels[i],g=pixels[i+1],b=pixels[i+2];
   return pixels[i+3]>190&&g>r+13&&g>b+7&&g>42;
  };
  const white=(x,y)=>{
   const i=idx(x,y),r=pixels[i],g=pixels[i+1],b=pixels[i+2];
   return pixels[i+3]>170&&r>172&&g>178&&b>157&&
     Math.max(r,g,b)-Math.min(r,g,b)<89;
  };
  // A 4-connected white eye component remains recognizable in every
  // perspective; mouth/teeth are rejected by location and component size.
  function eyeRegions(fx,fy){
   const x0=fx+Math.round(cell*.16),x1=fx+Math.round(cell*.87);
   const y0=fy+Math.round(cell*.24),y1=fy+Math.round(cell*.77);
   const visited=new Uint8Array(cell*cell),eyes=[];
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const mark=(y-fy)*cell+x-fx;
    if(visited[mark]||!white(x,y))continue;
    const queue=[[x,y]];visited[mark]=1;
    let count=0,minX=x,maxX=x,minY=y,maxY=y;
    for(let k=0;k<queue.length;k++){
     const [px,py]=queue[k];count++;
     minX=Math.min(minX,px);maxX=Math.max(maxX,px);
     minY=Math.min(minY,py);maxY=Math.max(maxY,py);
     for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=px+dx,ny=py+dy;
      if(nx<x0||nx>=x1||ny<y0||ny>=y1)continue;
      const at=(ny-fy)*cell+nx-fx;
      if(visited[at]||!white(nx,ny))continue;
      visited[at]=1;queue.push([nx,ny]);
     }
    }
    const ew=maxX-minX+1,eh=maxY-minY+1;
    if(count>=Math.max(5,Math.round(cell*cell/1500))&&
       ew>=3&&eh>=3&&ew<cell*.31&&eh<cell*.27&&
       (minY+maxY)/2<fy+cell*.68)
     eyes.push({x:minX,y:minY,w:ew,h:eh,area:count});
   }
   return eyes.sort((a,b)=>b.area-a.area).slice(0,2).sort((a,b)=>a.x-b.x);
  }
  // Sample real shaded skin immediately beside each eye. No flat color,
  // artificial black eyebrow, outside-the-sprite paint, or shadow box.
  function nearbySkin(x,y,fx,fy,region){
   for(let radius=1;radius<=15;radius++){
    const choices=[
     [region.x-radius,y],[region.x+region.w-1+radius,y],
     [x,region.y-radius],[x,region.y+region.h-1+radius]
    ];
    for(const [sx,sy] of choices)
     if(sx>=fx&&sx<fx+cell&&sy>=fy&&sy<fy+cell&&skin(sx,sy)){
      const k=idx(sx,sy);return [pixels[k],pixels[k+1],pixels[k+2]];
     }
   }
   return null;
  }
  function paintEye(out,eye,fx,fy,amount,tilt){
   // An uneven fold traces each existing eye; the original brow survives.
   const right=eye.x+eye.w;
   for(let x=eye.x;x<right;x++){
    const local=(x-eye.x+.5)/eye.w-.5;
    const cut=eye.y+Math.max(1,Math.round(eye.h*(amount+tilt*local)));
    for(let y=eye.y;y<=cut&&y<eye.y+eye.h;y++){
     const i=idx(x,y),a=pixels[i+3],r=pixels[i],g=pixels[i+1],b=pixels[i+2];
     if(a<160||r<35&&g<45&&b<45||skin(x,y))continue;
     const color=nearbySkin(x,y,fx,fy,eye);
     if(!color)continue; // Failed detection must NEVER damage the atlas.
     const atFold=y===cut,weight=atFold?.77:.95;
     for(let c=0;c<3;c++){
      const shade=atFold?color[c]*.57:color[c];
      out[i+c]=Math.round(pixels[i+c]*(1-weight)+shade*weight);
     }
    }
   }
  }
  function paintMouth(out,eyes,fx,fy,kind){
   if(cell!==128||!eyes.length)return;
   const top=Math.max(...eyes.map(e=>e.y+e.h))+5;
   const x0=Math.max(fx+25,Math.min(...eyes.map(e=>e.x))-2);
   const x1=Math.min(fx+104,Math.max(...eyes.map(e=>e.x+e.w))+2);
   const y1=Math.min(fy+103,top+18);
   const mouth=[];
   for(let y=top;y<y1;y++)for(let x=x0;x<x1;x++){
    const i=idx(x,y),r=pixels[i],g=pixels[i+1],b=pixels[i+2];
    if(pixels[i+3]>200&&r>72&&r>g*1.22&&r>b*1.19)
     mouth.push([x,y]);
   }
   if(mouth.length<8||mouth.length>210)return;
   const minX=Math.min(...mouth.map(p=>p[0])),maxX=Math.max(...mouth.map(p=>p[0]));
   const minY=Math.min(...mouth.map(p=>p[1])),maxY=Math.max(...mouth.map(p=>p[1]));
   for(const [x,y] of mouth){
    const shorten=kind==='half-lid'?
      y===minY&&x>minX+1&&x<maxX-1:
      (x>=maxX-2&&y>=minY&&y<maxY);
    if(!shorten)continue;
    const color=nearbySkin(x,y,fx,fy,{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1});
    if(!color)continue;
    const i=idx(x,y);
    for(let c=0;c<3;c++)out[i+c]=Math.round(pixels[i+c]*.12+color[c]*.88);
   }
  }
  const result={};
  for(const kind of ['half-lid','raised-brow']){
   const out=new Uint8ClampedArray(pixels);
   for(let row=0;row<frameRows;row++)for(let col=0;col<frameCols;col++){
    const fx=col*cell,fy=row*cell,eyes=eyeRegions(fx,fy);
    if(!eyes.length)continue;
    for(let n=0;n<eyes.length;n++){
     const amount=kind==='half-lid'?(n===0?.47:.39):
       (n===0?.29:.13);
     paintEye(out,eyes[n],fx,fy,amount,kind==='half-lid'?.10:-.08);
    }
    paintMouth(out,eyes,fx,fy,kind);
   }
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const c=canvas.getContext('2d');if(!c)continue;
   const data=c.createImageData(width,height);data.data.set(out);c.putImageData(data,0,0);
   result[kind]=variants(canvas);
  }
  return result;
 }
 window.ZZGreenPalette={tones,paletteFor,recolorGreen,variants,loadExpression,createFaceExpressions};
})();
