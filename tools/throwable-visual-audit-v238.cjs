'use strict';
// Build a low-res visual audit PNG of the actual user-approved source vs the
// exact repaired sprite atlas. A single CI log contains these review images
// so art defects can be inspected before changing production assets.
const fs=require('node:fs');
const {decodePNG,encodePNG}=require('./rebuild-throwables-atlas-v237.cjs');
const old=decodePNG('dist/assets/ip/v2/throwables-36-v159.png',1024);
const fresh=decodePNG('dist/assets/ip/v2/throwables-36-v238.png',1536);
const grid=new Uint8Array(1152*576*4),zoom=new Uint8Array(1024*256*4);
function put(buffer,W,H,x,y,r,g,b,a=255){
 if(x<0||y<0||x>=W||y>=H)return;let i=(y*W+x)*4;
 const u=a/255,v=1-u;buffer[i]=Math.round(r*u+buffer[i]*v);
 buffer[i+1]=Math.round(g*u+buffer[i+1]*v);
 buffer[i+2]=Math.round(b*u+buffer[i+2]*v);buffer[i+3]=255;
}
function checker(buffer,W,H){
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const k=((x>>4)+(y>>4))&1,base=k?32:45;put(buffer,W,H,x,y,base,base+8,base+12)
 }
}
function sprite(buffer,W,H,image,imgH,num,offx,offy,size){
 const row=Math.floor(num/6),col=num%6;
 const x0=col*256,y0=imgH===1024?Math.round(row*1024/6):row*256;
 const w=256,h=imgH===1024?Math.round((row+1)*1024/6)-y0:256;
 const scale=size/256,dh=Math.ceil(h*scale),dy=offy+Math.round((size-dh)/2);
 for(let yy=0;yy<dh;yy++)for(let xx=0;xx<size;xx++){
  const sx=Math.min(w-1,Math.floor(xx/scale)),sy=Math.min(h-1,Math.floor(yy/scale));
  const p=((y0+sy)*1536+x0+sx)*4;
  const a=image[p+3];if(a)put(buffer,W,H,offx+xx,dy+yy,image[p],image[p+1],image[p+2],a);
 }
}
function numerals(buffer,W,H,x,y,n,color){
 const glyph={0:['111','101','101','101','111'],1:['010','110','010','010','111'],2:['111','001','111','100','111'],3:['111','001','111','001','111'],4:['101','101','111','001','001'],5:['111','100','111','001','111'],6:['111','100','111','101','111'],7:['111','001','001','001','001'],8:['111','101','111','101','111'],9:['111','101','111','001','111']};
 for(let d=0;d<2;d++){
  const g=glyph[+String(n).padStart(2,'0')[d]];
  for(let py=0;py<5;py++)for(let px=0;px<3;px++)if(g[py][px]==='1')
   for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++)
    put(buffer,W,H,x+(d*8+px*2)+sx,y+py*2+sy,...color,255);
 }
}
checker(grid,1152,576);
for(let id=0;id<36;id++){
 const cx=id%6,cy=Math.floor(id/6);
 sprite(grid,1152,576,old,1024,id,cx*96+6,cy*96+7,84);
 sprite(grid,1152,576,fresh,1536,id,576+cx*96+6,cy*96+7,84);
 numerals(grid,1152,576,cx*96+5,cy*96+5,id+1,[255,225,135]);
 numerals(grid,1152,576,576+cx*96+5,cy*96+5,id+1,[129,244,160]);
}
checker(zoom,1024,256);
for(let pos=0;pos<4;pos++){
 const id=pos<2?11:28,art=pos%2?fresh:old,h=pos%2?1536:1024;
 sprite(zoom,1024,256,art,h,id,pos*256+1,0,255);
 numerals(zoom,1024,256,pos*256+8,8,id+1,pos%2?[129,244,160]:[255,225,135]);
}
function emit(title,W,H,rgba){
 const buf=encodePNG(W,H,rgba);const value=buf.toString('base64');
 console.log('THROWABLE_'+title+'_BEGIN bytes='+buf.length);
 for(let i=0;i<value.length;i+=4000)console.log('THROWABLE_'+title+'_BASE64 '+value.slice(i,i+4000));
 console.log('THROWABLE_'+title+'_END');
}
emit('OVERVIEW',1152,576,grid);
emit('FOCUS',1024,256,zoom);
