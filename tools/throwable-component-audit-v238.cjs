'use strict';
const {decodePNG}=require('./rebuild-throwables-atlas-v237.cjs');
const data=decodePNG('dist/assets/ip/v2/throwables-36-v237.png',1536);
function calc(id){
 const col=id%6,row=(id/6)|0,CELL=256,W=1536,H=1536;
 const labels=new Int16Array(CELL*CELL),q=new Int32Array(CELL*CELL);
 const pix=k=>{const x=k%CELL,y=(k-x)/CELL;return data[((row*CELL+y)*W+col*CELL+x)*4+3]};
 const parts=[];let next=0;
 for(let k=0;k<CELL*CELL;k++){
  if(labels[k]||pix(k)<28)continue;
  let head=0,tail=1,p=0,x0=255,y0=255,x1=0,y1=0;
  labels[k]=++next;q[0]=k;
  while(head<tail){
   const t=q[head++],x=t%CELL,y=(t-x)/CELL;p++;
   x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(let yy=Math.max(0,y-1);yy<=Math.min(CELL-1,y+1);yy++)
    for(let xx=Math.max(0,x-1);xx<=Math.min(CELL-1,x+1);xx++){
     const j=yy*CELL+xx;if(!labels[j]&&pix(j)>=28){labels[j]=next;q[tail++]=j}
    }
  }
  parts.push({n:p,box:[x0,y0,x1,y1]});
 }
 parts.sort((a,b)=>b.n-a.n);
 const main=parts[0];
 const gaps=p=>[Math.max(0,p.box[0]-main.box[2]-1,main.box[0]-p.box[2]-1),
                  Math.max(0,p.box[1]-main.box[3]-1,main.box[1]-p.box[3]-1)];
 let list=parts.slice(1).filter(p=>p.n>=6).map(p=>({...p,gaps:gaps(p)}));
 return{id:id+1,main,parts:parts.length,detached:list.slice(0,24)};
}
for(let id=0;id<36;id++){const r=calc(id);console.log('COMPONENT '+String(r.id).padStart(2,'0')+' main='+r.main?.n+'@'+r.main?.box.join(',')+' parts='+r.parts+' islands='+r.detached.map(x=>x.n+'@'+x.box.join(',')+' gap='+x.gaps.join(',')).join('; '))}
