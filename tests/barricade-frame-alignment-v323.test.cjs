'use strict';
// Guard against the v322 problem: unequal sprite extraction made the final
// damage stages visibly smaller although canvas draw width stayed at 22px.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const zlib=require('node:zlib');
const asset='assets/ip/v2/barricades/barricade-damage-v323-aligned.png';
const png=fs.readFileSync('dist/'+asset);
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
let offset=8,width=0,height=0,depth=0,colorType=0,trns=Buffer.alloc(0),idat=[];
while(offset+12<=png.length){
 const length=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);
 const body=png.subarray(offset+8,offset+8+length);
 if(type==='IHDR'){
  width=body.readUInt32BE(0);height=body.readUInt32BE(4);
  depth=body[8];colorType=body[9];
 }else if(type==='tRNS')trns=body;
 else if(type==='IDAT')idat.push(body);
 offset+=length+12;
 if(type==='IEND')break;
}
assert.deepEqual([width,height,depth,colorType],[280,56,8,3],
 'five 56x56 indexed-color PNG frames retain uniform cell boundaries');
assert(trns.length>0,'the bitmap retains real alpha transparency');
// PNG indexed-color scanlines use one palette index per pixel. Decode all
// five PNG filter modes, then compute alpha bounds separately for each tile.
const raw=zlib.inflateSync(Buffer.concat(idat));
let p=0,prev=Buffer.alloc(width),bounds=[];
for(let state=0;state<5;state++)bounds.push({l:56,t:56,r:0,b:0,count:0});
for(let y=0;y<height;y++){
 const filter=raw[p++],line=Buffer.alloc(width);
 for(let x=0;x<width;x++){
  const v=raw[p++],a=x?line[x-1]:0,b=prev[x],c=x?prev[x-1]:0;
  let n=0;
  if(filter===0)n=0;
  else if(filter===1)n=a;
  else if(filter===2)n=b;
  else if(filter===3)n=(a+b)>>1;
  else if(filter===4){
   const q=a+b-c,da=Math.abs(q-a),db=Math.abs(q-b),dc=Math.abs(q-c);
   n=da<=db&&da<=dc?a:db<=dc?b:c;
  }else throw Error('unsupported PNG filter '+filter);
  line[x]=(v+n)&255;
  const alpha=line[x]<trns.length?trns[line[x]]:255;
  if(alpha===0)continue;
  const stage=Math.floor(x/56),bx=x%56,box=bounds[stage];
  box.l=Math.min(box.l,bx);box.t=Math.min(box.t,y);
  box.r=Math.max(box.r,bx+1);box.b=Math.max(box.b,y+1);box.count++;
 }
 prev=line;
}
for(let i=0;i<5;i++){
 const b=bounds[i];
 assert.deepEqual([b.l,b.t,b.r,b.b],[2,2,54,54],
  'damage stage '+(i+1)+' must use the exact same 52px visible footprint');
 assert(b.count>600,'damage stage '+(i+1)+' should contain a complete bitmap block');
}
const mode=fs.readFileSync('dist/fortress-mode.js','utf8');
assert(mode.includes(asset),'runtime requests the correctly aligned source');
assert(mode.includes('const BARRICADE_FRAME=56'),'source frame stride is 56px');
assert(mode.includes('index*frame,0,frame,frame'),'one frame selected without overlap');
assert(mode.includes('w.x+shakeX,w.y+shakeY,T,T'),'same world-unit size for all damage states');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('src="fortress-mode.js?v='),'versioned barricade module present');
assert(sw.includes("'./"+asset+"'"),'correct PNG precached in the PWA');
assert(sw.includes('v323-aligned-damage-frames'),'old atlas cache invalidated');
console.log('PASS v323: all 5 damage images exactly aligned (52x52 within 56px), unchanged game size, transparent atlas and PWA cache.');
