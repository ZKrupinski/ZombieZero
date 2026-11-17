'use strict';
// V121: audit the actual committed 8-frame critical-death PNG, not synthetic
// mocks. The edit runs once at image load; normal/death art is unchanged.
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const zlib=require('node:zlib');
function unpackIndexedPng(path){
 const png=fs.readFileSync(path);
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 let pos=8,w=0,h=0,palette=null,alpha=null,idat=[];
 while(pos<png.length){
  const n=png.readUInt32BE(pos),type=png.toString('ascii',pos+4,pos+8);
  const chunk=png.subarray(pos+8,pos+8+n);
  if(type==='IHDR'){w=chunk.readUInt32BE(0);h=chunk.readUInt32BE(4);
   assert.equal(chunk[8],8,'8-bit palette');assert.equal(chunk[9],3,'indexed PNG');
   assert.equal(chunk[12],0,'non-interlaced');
  }
  if(type==='PLTE')palette=chunk;
  if(type==='tRNS')alpha=chunk;
  if(type==='IDAT')idat.push(chunk);
  pos+=12+n;if(type==='IEND')break;
 }
 assert(w===768&&h===128&&palette&&alpha&&idat.length);
 const bytes=zlib.inflateSync(Buffer.concat(idat)),pixels=new Uint8ClampedArray(w*h*4);
 let offset=0,prior=Buffer.alloc(w);
 for(let y=0;y<h;y++){
  const filter=bytes[offset++],line=Buffer.from(bytes.subarray(offset,offset+w));offset+=w;
  for(let x=0;x<w;x++){
   const l=x?line[x-1]:0,u=prior[x],ul=x?prior[x-1]:0;
   if(filter===1)line[x]=(line[x]+l)&255;
   else if(filter===2)line[x]=(line[x]+u)&255;
   else if(filter===3)line[x]=(line[x]+Math.floor((l+u)/2))&255;
   else if(filter===4){
    const p=l+u-ul,dl=Math.abs(p-l),du=Math.abs(p-u),dul=Math.abs(p-ul);
    line[x]=(line[x]+(dl<=du&&dl<=dul?l:du<=dul?u:ul))&255;
   }else assert.equal(filter,0,'supported PNG row filter');
  }
  for(let x=0;x<w;x++){
   const p=line[x],i=(y*w+x)*4,j=p*3;
   pixels[i]=palette[j];pixels[i+1]=palette[j+1];pixels[i+2]=palette[j+2];
   pixels[i+3]=p<alpha.length?alpha[p]:255;
  }
  prior=line;
 }
 return {pixels,w,h};
}
const source=fs.readFileSync('dist/assets/ip/green-death-loader.js','utf8');
const begin=source.indexOf(' function cleanCriticalFringePixels(');
const end=source.indexOf(' function cleanCriticalFringeBitmap(',begin);
assert(begin>=0&&end>begin,'critical alpha edge repair function exists');
const func=source.slice(begin,end);
const crit=unpackIndexedPng('dist/assets/ip/green-death-critical-v95.png');
const before=new Uint8ClampedArray(crit.pixels);
const context={Uint8ClampedArray,pixels:crit.pixels,w:crit.w,h:crit.h,changed:0};
vm.createContext(context);
vm.runInContext(func+'\nchanged=cleanCriticalFringePixels(pixels,w,h)',context);
let diff=0,opaqueEdits=0,coloredEdits=0,frameChanges=new Array(8).fill(0);
for(let i=0;i<crit.pixels.length;i+=4){
 const altered=crit.pixels[i]!==before[i]||crit.pixels[i+1]!==before[i+1]||
   crit.pixels[i+2]!==before[i+2]||crit.pixels[i+3]!==before[i+3];
 if(!altered)continue;
 diff++;const pixelIndex=i/4,x=pixelIndex%crit.w;
 frameChanges[Math.floor(x/96)]++;
 if(before[i+3]===255)opaqueEdits++;
 if(Math.min(before[i],before[i+1],before[i+2])<185||
    Math.max(before[i],before[i+1],before[i+2])-Math.min(before[i],before[i+1],before[i+2])>48)coloredEdits++;
}
assert.equal(context.changed,diff,'reports actual modified pale edge pixels');
assert(diff>0,'actual critical sheet contains a repairable white-alpha rim');
assert.equal(opaqueEdits,0,'intact opaque detail is never edited');
assert.equal(coloredEdits,0,'colored body, clothing, brain and outline pixels are preserved');
assert(frameChanges.slice(3).some(v=>v>0),'critical expanding/shattering frames have pale rim to repair');
assert(source.includes("if(kind==='critical')part.variants=part.variants.map(cleanCriticalFringeBitmap)"),
 'only critical atlas is repaired once after palette variants are baked');
const normal=unpackIndexedPng('dist/assets/ip/green-death-normal-v95.png');
assert.equal(normal.w,crit.w);assert.equal(normal.h,crit.h);
console.log('PASS v121: critical white alpha perimeter corrected in',diff,
 'pixels; per-frame:',frameChanges.join(','),'; opaque and colored art untouched.');
