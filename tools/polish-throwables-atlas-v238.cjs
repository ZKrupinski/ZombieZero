'use strict';
// Manual art-direction cleanup of confirmed adjacent-frame bleed after v237's
// color-aware seam reconstruction. Unlike v234, never fade/clip entire sprite
// edges: only named, spatially separated source fragments are removed.
// All 8 approved "good" sprites and main body pixels are bit-identical.
const fs=require('node:fs');
const {decodePNG,encodePNG,GOOD}=require('./rebuild-throwables-atlas-v237.cjs');
const FROM='dist/assets/ip/v2/throwables-36-v237.png';
const OUT='dist/assets/ip/v2/throwables-36-v238.png';
const REPORT='dist/assets/ip/v2/throwables-36-v238-report.json';
const SIZE=256,ATLAS=1536,THRESHOLD=24;
// [x0,y0,x1,y1] in each 256px cell. These boxes are drawn around specific
// foreign-looking detached islands found by visual review, never the body.
const CONFIRMED_BLEED_ZONES={
 7:[[128,0,190,45]],
 8:[[74,22,222,59]],
 9:[[15,0,242,53]],
 10:[[89,46,117,60]],
 12:[[82,38,115,57]],
 13:[[104,40,185,59]],
 14:[[25,0,230,49]],
 15:[[151,27,207,55]],
 17:[[166,17,227,43],[169,225,229,256]],
 19:[[86,18,184,46]],
 20:[[130,200,190,224]],
 23:[[130,13,155,44],[42,27,62,46],[165,204,228,237]],
 24:[[172,209,204,236]],
 27:[[66,188,146,228]],
 28:[[78,192,151,233],[200,206,221,235]],
 29:[[191,40,215,55],[125,189,220,220]],
 30:[[30,202,74,237]]
};
const src=decodePNG(FROM,1536),out=src.slice();
const labels=new Int16Array(SIZE*SIZE),queue=new Int32Array(SIZE*SIZE);
const countAlpha=(i)=>out[i*4+3];
const results=[];
for(let id=0;id<36;id++){
 const row=Math.floor(id/6),col=id%6,boxes=CONFIRMED_BLEED_ZONES[id+1];
 if(!boxes){results.push({slot:id+1,removed:0,components:0,unchanged:true});continue}
 labels.fill(0);let next=0,parts=[];
 const at=(x,y)=>((row*SIZE+y)*ATLAS+col*SIZE+x);
 for(let k=0;k<SIZE*SIZE;k++){
  const x=k%SIZE,y=(k-x)/SIZE;
  if(labels[k]||countAlpha(at(x,y))<THRESHOLD)continue;
  let head=0,tail=1,minX=x,minY=y,maxX=x,maxY=y,size=0;
  const mark=++next;labels[k]=mark;queue[0]=k;
  while(head<tail){
   const t=queue[head++],xx=t%SIZE,yy=(t-xx)/SIZE;size++;
   if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;
   if(yy<minY)minY=yy;if(yy>maxY)maxY=yy;
   for(let ny=Math.max(0,yy-1);ny<=Math.min(SIZE-1,yy+1);ny++)
    for(let nx=Math.max(0,xx-1);nx<=Math.min(SIZE-1,xx+1);nx++){
     const q=ny*SIZE+nx;if(!labels[q]&&countAlpha(at(nx,ny))>=THRESHOLD){
      labels[q]=mark;queue[tail++]=q;
     }
    }
  }
  parts.push({id:mark,size,x0:minX,y0:minY,x1:maxX,y1:maxY});
 }
 const main=parts.reduce((a,b)=>!a||a.size<b.size?b:a,null);
 const removed=[];
 for(const p of parts){
  if(p===main)continue;
  // Exact spatial review: every bounding-box edge stays within its unwanted
  // fragment zone; deliberately ignore all small legitimate nearby debris.
  const inZone=boxes.some(([x0,y0,x1,y1])=>
     p.x0>=x0&&p.x1<x1&&p.y0>=y0&&p.y1<y1);
  const sizeCap=Math.max(1500,main.size*.09);
  if(inZone&&p.size<sizeCap)removed.push(p);
 }
 let pixels=0;
 for(const p of removed){
  // Clean selected connected shape AND its few low-alpha antialiasing fringes.
  // Bounded by that component's reviewed box, never by the sprite's whole edge.
  const box=boxes.find(([x0,y0,x1,y1])=>
   p.x0>=x0&&p.x1<x1&&p.y0>=y0&&p.y1<y1);
  const [bx0,by0,bx1,by1]=box;
  for(let y=Math.max(by0,p.y0-2);y<=Math.min(by1-1,p.y1+2);y++)
   for(let x=Math.max(bx0,p.x0-2);x<=Math.min(bx1-1,p.x1+2);x++){
    const k=y*SIZE+x,i=at(x,y)*4;
    const isComponent=labels[k]===p.id;
    const fringe=labels[k]===0&&out[i+3]>0&&out[i+3]<THRESHOLD;
    if((isComponent||fringe)&&out[i+3]){out[i+3]=0;pixels++;}
   }
 }
 results.push({slot:id+1,removed:pixels,components:removed.length,
   removedBoxes:removed.map(p=>[p.x0,p.y0,p.x1,p.y1,p.size]),unchanged:pixels===0});
 console.log('POLISH',String(id+1).padStart(2,'0'),'removed='+pixels,'components='+removed.length,
   removed.map(p=>[p.x0,p.y0,p.x1,p.y1,p.size].join(',')).join('; '));
}
for(const id of GOOD){
 const before=(row,col,y,x)=>((row*SIZE+y)*ATLAS+col*SIZE+x)*4;
 const row=Math.floor(id/6),col=id%6;
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const i=before(row,col,y,x);
  if(src[i]!==out[i]||src[i+1]!==out[i+1]||src[i+2]!==out[i+2]||src[i+3]!==out[i+3])
   throw Error('Approved untouched projectile changed: '+(id+1));
 }
}
fs.writeFileSync(OUT,encodePNG(ATLAS,ATLAS,out));
fs.writeFileSync(REPORT,JSON.stringify({source:FROM,output:OUT,confirmedBleedZones:CONFIRMED_BLEED_ZONES,
 totalRemoved:results.reduce((s,x)=>s+x.removed,0),results},null,2)+'\n');
console.log('POLISHED_ATLAS',OUT,'size='+fs.statSync(OUT).size,'totalRemoved='+results.reduce((s,x)=>s+x.removed,0));
