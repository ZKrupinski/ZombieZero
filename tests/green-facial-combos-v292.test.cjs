'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const path=require('node:path');
const BASE=path.join(__dirname,'../dist');
const paletteCode=fs.readFileSync(path.join(BASE,'assets/ip/v2/green-palette.js'),'utf8');
const walkCode=fs.readFileSync(path.join(BASE,'assets/ip/v2/green-walk.js'),'utf8');
const game=fs.readFileSync(path.join(BASE,'game.js'),'utf8');
const html=fs.readFileSync(path.join(BASE,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(BASE,'sw.js'),'utf8');
new vm.Script(paletteCode);new vm.Script(game);
const labels=['heart-eyes','extra-teeth','uneven-eyes','slack-jaw','heart-teeth','uneven-jaw'];
for(const name of labels)assert(game.includes("'"+name+"'"),'spawn pool includes '+name);
assert.match(game,/hairColor:hairRoll<\.10\?'blond'/);
assert.match(walkCode,/expressions\[z\.expression\]/,'active sprite uses expression atlas');
assert.match(paletteCode,/lazyPaletteSet\(/,'rare palettes made only if needed');
assert.match(html,/v292-face-mix/);
assert.match(sw,/v292-face-mix/);
assert.match(sw,/v294-small-hearts-locked-lids/);
assert.match(paletteCode,/reference\.h\*\(depth/,'eyelid thickness frozen to per-direction reference');
assert.match(paletteCode,/preserveNoseBridge\(out,eyes,mouth,fx,fy\)/);
// Small actual-PNG decoder for the approved unmodified 8-bit RGBA walking atlas.
// The tests render against production image pixels, not only mocked rectangles.
function decodeRGBA(data){
 assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const w=data.readUInt32BE(16),h=data.readUInt32BE(20);
 assert.equal(data[24],8,'8-bit pixels');
 assert.equal(data[25],6,'RGBA sprite');
 assert.equal(data[28],0,'non-interlaced');
 let p=8;const idat=[];
 while(p+12<=data.length){
  const len=data.readUInt32BE(p),type=data.toString('ascii',p+4,p+8);
  if(type==='IDAT')idat.push(data.subarray(p+8,p+8+len));
  p+=12+len;if(type==='IEND')break;
 }
 const packed=zlib.inflateSync(Buffer.concat(idat)),stride=w*4;
 const out=new Uint8ClampedArray(w*h*4);
 let start=0;
 const paeth=(a,b,c)=>{
  const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);
  return da<=db&&da<=dc?a:db<=dc?b:c;
 };
 for(let y=0;y<h;y++){
  const filter=packed[start++],dest=y*stride;
  for(let x=0;x<stride;x++){
   const raw=packed[start++],left=x>=4?out[dest+x-4]:0;
   const up=y>0?out[dest-stride+x]:0;
   const ul=y>0&&x>=4?out[dest-stride+x-4]:0;
   const predictor=filter===0?0:filter===1?left:filter===2?up:
    filter===3?Math.floor((left+up)/2):filter===4?paeth(left,up,ul):NaN;
   assert(Number.isFinite(predictor),'PNG filter supported');
   out[dest+x]=(raw+predictor)&255;
  }
 }
 return {naturalWidth:w,naturalHeight:h,pixels:out};
}
class Canvas{
 constructor(){this.width=0;this.height=0;this.pixels=null;}
 getContext(){
  const owner=this;
  return {
   drawImage(image){owner.pixels=new Uint8ClampedArray(image.pixels);},
   getImageData(){return {data:new Uint8ClampedArray(owner.pixels)};},
   createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},
   putImageData(data){owner.pixels=new Uint8ClampedArray(data.data);}
  };
 }
}
const sandbox={window:{},document:{createElement:()=>new Canvas()},Uint8ClampedArray,Math};
vm.createContext(sandbox);vm.runInContext(paletteCode,sandbox);
const img=decodeRGBA(fs.readFileSync(path.join(BASE,'assets/ip/v2/green_zombie.png')));
assert.equal(img.naturalWidth,1024);assert.equal(img.naturalHeight,512);

const faces=sandbox.window.ZZGreenPalette.createFaceExpressions(img);
for(const name of labels)assert(faces[name]?.length===5,'face atlas is populated: '+name);
function changes(a,b,row,frame){
 let n=0,eyebrow=0,changedBelow=0;
 const baseY=row*128,baseX=frame*128;
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const i=((baseY+y)*1024+baseX+x)*4;
  if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]){
   n++;
   if(y<35)eyebrow++;
   if(y>73)changedBelow++;
  }
  if(a[i+3]!==b[i+3])throw Error('alpha changed by facial variant');
 }
 return {n,eyebrow,changedBelow};
}
for(const name of labels){
 const atlas=faces[name][0].pixels,counts=[];
 for(let row=0;row<3;row++){
  const rowCounts=[];
  for(let f=0;f<8;f++){
   const stat=changes(atlas,img.pixels,row,f);
   assert.equal(stat.eyebrow,0,'hair/top-face never painted');
   rowCounts.push(stat.n);
  }
  counts.push(rowCounts);
  // No alternating unedited frames within a moving 8-frame direction.
  const live=rowCounts.filter(n=>n>0).length;
  assert(live===0||live===8,name+': intermittent face changes in row '+row+' '+rowCounts);
 }
 assert(counts.some(row=>row.some(x=>x>0)),name+': zero art edits on REAL sprite');
 // Every direction must keep the approved face feature through all 8 frames.
 // In particular, never return to default teeth/jaw on diagonal movement.
 assert(counts.every(row=>row.every(n=>n>0)),
  name+': facial feature must exist in front and both diagonal walks');
 if(name==='heart-eyes'){
  // Before the fix a front sprite changed ~500+ pixels. The new, smaller
  // candy hearts must fit in less than 65% of that area.
  assert(counts[0].every(n=>n<335), 'heart eyes must be modest, not oversized');
 }
 // Center bridge pixels above the original mouth may never become a
 // synthetic dark nose (particularly with an open-mouth expression).
 if(name==='slack-jaw'||name==='uneven-jaw'){
  // Compare mouth-only edits against the same eye treatment: the
  // asymmetric-eye variant intentionally edits original eye pixels near
  // the nasal bridge; the mouth layer must NEVER touch those pixels.
  const baseline=name==='uneven-jaw'?faces['uneven-eyes'][0].pixels:img.pixels;
  const edited=atlas;
  for(let f=0;f<8;f++)for(let y=66;y<71;y++)for(let x=61;x<65;x++){
   const i=(y*1024+f*128+x)*4;
   assert.deepEqual([...edited.slice(i,i+3)],[...baseline.slice(i,i+3)],
    'mouth transformation must never create a fake dark nose');
  }
 }
 console.log('FACE '+name+' changed px per row/frame: '+JSON.stringify(counts));
}
for(const name of ['heart-eyes','extra-teeth','slack-jaw']){
 const count=changes(faces[name][0].pixels,img.pixels,0,0);
 assert(count.n>6,name+': visible first-frame face change');
}
console.log('PASS v292: 4 distinctive + 2 combined faces, source alpha unchanged, no flicker or eyebrow edits, real sprite decoded');
