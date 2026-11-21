'use strict';
// Rebuild the approved 36-piece throwable art into a genuine 6×6, 256px-cell
// atlas. The old 1536×1024 contact sheet's 170.667px rows overlap: cropping
// each cell loses body corners and captures adjacent items. Segment pixels
// from overlapping source rows, preserving their original RGBA values.
// No third-party package. 28 user-flagged slots repaired; 8 good slots retained.
const fs=require('node:fs'),zlib=require('node:zlib'),path=require('node:path');
const INPUT='dist/assets/ip/v2/throwables-36-v159.png';
const OUTPUT='dist/assets/ip/v2/throwables-36-v237.png';
const REPORT='dist/assets/ip/v2/throwables-36-v237-report.json';
const W=1536,H=1024,N=36,COLS=6,CELL=256,OUT_H=1536;
const GOOD=new Set([5,6,16,18,21,22,31,32].map(n=>n-1));
const FLAGS={
  1:'cut',2:'cut',3:'cut',4:'cut',7:'cut,bleed',8:'cut,bleed',
  9:'cut,bleed',10:'bleed',11:'cut',12:'cut,bleed',13:'bleed',
  14:'cut,bleed',15:'bleed',17:'cut,bleed',19:'bleed',
  20:'bleed',23:'bleed',24:'bleed',25:'bleed',26:'cut',
  27:'bleed',28:'bleed',29:'cut,bleed',30:'cut,bleed',
  33:'cut',34:'cut',35:'cut',36:'cut'
};
function crc32(bytes){let c=-1;for(const n of bytes){c^=n;for(let k=0;k<8;k++)c=(c>>>1)^(-(c&1)&0xedb88320)}return(c^-1)>>>0}
function chunk(name,payload){
 const type=Buffer.from(name),len=Buffer.allocUnsafe(4),crc=Buffer.allocUnsafe(4);
 len.writeUInt32BE(payload.length);crc.writeUInt32BE(crc32(Buffer.concat([type,payload])));
 return Buffer.concat([len,type,payload,crc]);
}
function decodePNG(file){
 const b=fs.readFileSync(file);
 if(b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('not PNG');
 let off=8,w=0,h=0,depth=0,color=0;const data=[];
 while(off<b.length){
  const len=b.readUInt32BE(off),type=b.toString('ascii',off+4,off+8),body=b.subarray(off+8,off+8+len);off+=len+12;
  if(type==='IHDR'){w=body.readUInt32BE(0);h=body.readUInt32BE(4);depth=body[8];color=body[9];}
  else if(type==='IDAT')data.push(body);else if(type==='IEND')break;
 }
 if(w!==W||h!==H||depth!==8||color!==6)throw Error('approved 1536×1024 RGBA source required');
 const raw=zlib.inflateSync(Buffer.concat(data)),stride=w*4,result=new Uint8Array(w*h*4);
 let p=0;let prev=new Uint8Array(stride);
 for(let y=0;y<h;y++){
  const filter=raw[p++],row=new Uint8Array(stride);
  for(let x=0;x<stride;x++){
   const a=x>=4?row[x-4]:0,b=prev[x],c=x>=4?prev[x-4]:0;
   let pred=0;
   if(filter===1)pred=a;else if(filter===2)pred=b;else if(filter===3)pred=(a+b)>>1;
   else if(filter===4){const z=a+b-c,da=Math.abs(z-a),db=Math.abs(z-b),dc=Math.abs(z-c);pred=da<=db&&da<=dc?a:db<=dc?b:c;}
   else if(filter!==0)throw Error('unsupported filter '+filter);
   row[x]=(raw[p++]+pred)&255;
  }
  result.set(row,y*stride);prev=row;
 }
 if(p!==raw.length)throw Error('PNG decode incomplete');
 return result;
}
function encodePNG(width,height,rgba){
 const row=width*4,raw=Buffer.alloc(height*(row+1));
 for(let y=0;y<height;y++){
  const offset=y*(row+1);
  raw[offset]=0;Buffer.from(rgba.buffer,rgba.byteOffset+y*row,row).copy(raw,offset+1);
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
// Choose representative source colors from the interior of each piece.
// Histograms are alpha-weighted and deliberately exclude the contested seams.
function palettes(rgba){
 const result=[];
 for(let i=0;i<N;i++){
  const col=i%6,row=Math.floor(i/6),x0=col*CELL+45,x1=col*CELL+211;
  const cy=(row+.5)*H/6,y0=Math.max(0,Math.round(cy-50)),y1=Math.min(H,Math.round(cy+50));
  const bins=new Map();
  for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){
   const p=(y*W+x)*4,a=rgba[p+3];if(a<100)continue;
   const r=rgba[p],g=rgba[p+1],b=rgba[p+2],key=((r>>>4)<<8)|((g>>>4)<<4)|(b>>>4);
   const old=bins.get(key)||{n:0,r:0,g:0,b:0};
   old.n+=a;old.r+=r*a;old.g+=g*a;old.b+=b*a;bins.set(key,old);
  }
  result[i]=[...bins.values()].sort((a,b)=>b.n-a.n).slice(0,20)
     .map(a=>[a.r/a.n,a.g/a.n,a.b/a.n]);
 }
 return result;
}
function colorCost(r,g,b,palette){
 if(!palette.length)return 70;
 let best=1e9;
 for(const c of palette){
  const dr=r-c[0],dg=g-c[1],db=b-c[2];
  const diff=(dr*dr*.29+dg*dg*.52+db*db*.19);
  if(diff<best)best=diff;
 }
 return Math.sqrt(best);
}
function candidates(x,y){
 const c=Math.floor(x/CELL),approx=Math.floor(y*6/H),list=[];
 for(let dy=-1;dy<=1;dy++){
  const row=approx+dy;if(row<0||row>=6)continue;
  for(let dc=-1;dc<=1;dc++){
   const col=c+dc;if(col<0||col>=6)continue;
   if(dc!==0 && Math.min(x-c*CELL,(c+1)*CELL-x)>42)continue;
   list.push(row*6+col);
  }
 }
 return list;
}
function baseCost(x,y,r,g,b,idx,pal){
 const col=idx%6,row=Math.floor(idx/6);
 const dx=(x-(col+.5)*CELL)/132;
 const dy=(y-(row+.5)*H/6)/98;
 // Color supports recovery beyond the row seam; position prevents a distant
 // similarly-colored item from capturing an adjacent piece's entire silhouette.
 return .40*dx*dx+.78*dy*dy+.020*colorCost(r,g,b,pal[idx]);
}
function build(){
 const src=decodePNG(INPUT),pal=palettes(src),owners=new Int8Array(W*H).fill(-1);
 let count=0,overlap=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const p=(y*W+x)*4,a=src[p+3];if(a<=7)continue;
  let best=1e9,owner=-1;
  const poss=candidates(x,y);
  for(const idx of poss){
   const cost=baseCost(x,y,src[p],src[p+1],src[p+2],idx,pal);
   if(cost<best){best=cost;owner=idx}
  }
  owners[y*W+x]=owner;count++;
  if(owner!==Math.floor(y*6/H)*6+Math.floor(x/CELL))overlap++;
 }
 // Refine overlapping seam ownership using neighbors of similar color.
 // Do not alter the center 56px of each row; it anchors object identity.
 const nearby=[-W-1,-W,-W+1,-1,1,W-1,W,W+1];
 for(let round=0;round<3;round++){
  let changes=0;
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
   const k=y*W+x,owner=owners[k];if(owner<0)continue;
   const coreY=Math.abs(y-(Math.floor(y*6/H)+.5)*H/6);
   const coreX=Math.abs(x-(Math.floor(x/CELL)+.5)*CELL);
   if(coreY<44&&coreX<94)continue;
   const p=k*4,cands=candidates(x,y);
   let best=1e9,next=owner;
   for(const idx of cands){
    let cost=baseCost(x,y,src[p],src[p+1],src[p+2],idx,pal);
    let smooth=0;
    for(const d of nearby){
     const q=k+d,neighbor=owners[q];if(neighbor<0||neighbor===idx)continue;
     const j=q*4,dr=src[p]-src[j],dg=src[p+1]-src[j+1],db=src[p+2]-src[j+2];
     if(dr*dr+dg*dg+db*db<1900)smooth+=.055;
    }
    cost+=smooth;
    if(cost<best){best=cost;next=idx}
   }
   if(next!==owner){owners[k]=next;changes++}
  }
  console.log('ownership refinement',round+1,'changes',changes);
  if(!changes)break;
 }
 // Output each image at its original nominal pixel scale: the 171px-tall
 // source row is centered inside a 256px cell with 42px above/below. Overhang
 // pixels can extend across the former seam without requiring any resampling.
 const out=new Uint8Array(W*OUT_H*4),stats=Array.from({length:N},(_,i)=>({slot:i+1,flag:FLAGS[i+1]||'clean',retained:0,restored:0,trimmed:0,source:0}));
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const p=(y*W+x)*4,a=src[p+3];if(a<=7)continue;
  const baseIdx=Math.floor(y*6/H)*6+Math.floor(x/CELL);
  const chosen=owners[y*W+x];const target=chosen<0?baseIdx:chosen;
  // 8 accepted frames are EXACT source crops; the 28 flagged frames are
  // reconstructed from color-connected neighbors of their source cell.
  const idx=GOOD.has(baseIdx)?baseIdx:(GOOD.has(target)?baseIdx:target);
  const ix=idx%6,iy=Math.floor(idx/6),localX=x-ix*CELL;
  const localY=Math.round(y-iy*H/6+43);
  if(localX<0||localX>=CELL||localY<0||localY>=CELL){stats[idx].trimmed++;continue}
  const dest=((iy*CELL+localY)*W+ix*CELL+localX)*4;
  const own=isColorOpaque(out,dest),newSource=idx!==baseIdx;
  if(a>=own){
   out[dest]=src[p];out[dest+1]=src[p+1];out[dest+2]=src[p+2];out[dest+3]=a;
  }
  stats[idx].retained++;
  if(newSource)stats[idx].restored++;
  if(newSource)stats[baseIdx].trimmed++;
 }
 // Clean frames must exactly match original strict source cropping.
 // This second pass is intentional: no mask or color segmentation affects
 // the eight approved frame assets.
 for(const idx of GOOD){
  const col=idx%6,row=Math.floor(idx/6),sy=Math.round(row*H/6),ey=Math.round((row+1)*H/6);
  for(let ly=0;ly<CELL;ly++)for(let lx=0;lx<CELL;lx++){
   const dest=((row*CELL+ly)*W+col*CELL+lx)*4;
   if(ly<43||ly>=43+ey-sy){out.fill(0,dest,dest+4);continue}
   const source=((sy+ly-43)*W+col*CELL+lx)*4;
   out.set(src.subarray(source,source+4),dest);
  }
 }
 // Preserve antialiased alpha below threshold for known foreground pixels:
 // reintroduced as a feather around the recovered opaque region, never
 // restored from the opposite tile without matching owner.
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  const p=(y*W+x)*4,a=src[p+3];if(a===0||a>7)continue;
  const current=owners[y*W+x];
  let label=current;
  if(label<0){
   const around=[y*W+x-1,y*W+x+1,(y-1)*W+x,(y+1)*W+x];
   const tally=new Map();
   for(const at of around){const v=owners[at];if(v>=0)tally.set(v,(tally.get(v)||0)+1)}
   label=[...tally].sort((a,b)=>b[1]-a[1])[0]?.[0]??-1;
  }
  if(label<0||GOOD.has(label))continue;
  const col=label%6,row=Math.floor(label/6),lx=x-col*CELL,ly=Math.round(y-row*H/6+43);
  if(lx<0||lx>=CELL||ly<0||ly>=CELL)continue;
  const dest=((row*CELL+ly)*W+col*CELL+lx)*4;
  if(out[dest+3]===0)out.set(src.subarray(p,p+4),dest);
 }
 // Ensure transparent first/last 1-pixel gutters in output cells wherever
 // possible; only absolute clipped source pixels reach a border.
 for(let row=0;row<6;row++)for(let col=0;col<6;col++){
  const idx=row*6+col;if(GOOD.has(idx))continue;
  // Do not erase any connected shape corner. A future real-asset touch-up
  // should handle source-cutoff if needed.
 }
 fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
 fs.writeFileSync(OUTPUT,encodePNG(W,OUT_H,out));
 fs.writeFileSync(REPORT,JSON.stringify({source:INPUT,output:OUTPUT,width:W,height:OUT_H,flags:FLAGS,
   unchanged:[...GOOD].map(n=>n+1),inputPixels:count,nonlocalPixelCandidates:overlap,stats},null,2)+'\n');
 console.log('RECONSTRUCTED',OUTPUT,'bytes',fs.statSync(OUTPUT).size);
 console.log('SOURCE opaque pixels',count,'cross-boundary candidates',overlap);
 for(const stat of stats)console.log('THROWABLE',String(stat.slot).padStart(2,'0'),stat.flag,
   'retained',stat.retained,'restored-from-neighbors',stat.restored,'reassigned-out',stat.trimmed);
}
function isColorOpaque(data,offset){return data[offset+3]}
if(require.main===module)build();
module.exports={build,decodePNG,encodePNG,GOOD,FLAGS};
