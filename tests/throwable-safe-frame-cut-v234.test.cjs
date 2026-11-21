'use strict';
// v235: verify 36 isolated and padded throwables preserve every connected
// corner pixel while removing only remote, detached edge contamination.
// The approved source PNG, the object scale, and the throw physics stay intact.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync('dist/assets/ip/v2/throwables-v159.js','utf8');
const imagePng=fs.readFileSync('dist/assets/ip/v2/throwables-36-v159.png');
assert.equal(imagePng.readUInt32BE(16),1536);assert.equal(imagePng.readUInt32BE(20),1024);
assert.equal(crypto.createHash('sha256').update(imagePng).digest('hex'),
 '703d45a500d2fa00e589e4d1be87477a8d06e38d44fca235d744aeccc61bac5a');
const crops=[],tiles=[],PAD=12,FRAME_H=171;
function buildCanvas(){
 const index=tiles.length,tile={width:0,height:0},ctx={
  drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh){crops.push({image,sx,sy,sw,sh,dx,dy,dw,dh})},
  getImageData(x,y,w,h){
   assert.equal(x,PAD);assert.equal(y,PAD);assert.equal(w,256);assert([170,171].includes(h));
   const p=new Uint8ClampedArray(w*h*4);
   const rect=(x0,y0,x1,y1)=>{for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){
     const i=(yy*w+xx)*4;p[i]=75;p[i+1]=165;p[i+2]=190;p[i+3]=255;
   }};
   rect(75,35,175,139); // Original solid central art.
   if(index%2===0){
    // These are genuine, CONNECTED extensions to the cell edges.
    // Broad alpha taper used to erase or fade all four corners.
    rect(110,0,140,36);rect(110,138,140,h);
    rect(0,68,76,94);rect(174,68,256,94);
   }else{
    // Neighboring cell scraps: small, isolated, remote and edge-adjacent.
    rect(25,6,60,12);rect(250,59,256,90);rect(40,h-4,70,h);
   }
   return{width:w,height:h,data:p};
  },
  putImageData(data,x,y){tile.cleaned={data,x,y}}
 };
 tile.getContext=()=>ctx;tiles.push(tile);return tile;
}
class FakeImage{
 constructor(){this.naturalWidth=1536;this.naturalHeight=1024}
 set src(x){this.path=x;this.onload?.()}
 decode(){return Promise.resolve()}
}
const sandbox={window:{},document:{createElement:tag=>{assert.equal(tag,'canvas');return buildCanvas()}},
 Image:FakeImage,Math,Promise,console,Int16Array,Int32Array,Uint8Array,Uint8ClampedArray};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
const pack=sandbox.window.ZZThrowablesV159;pack.request();
(async()=>{
 await Promise.resolve();await Promise.resolve();
 assert(pack.ready,'approved original PNG loaded');
 assert.equal(pack.preparedFrameCount,36,'all 36 projectile frames isolated');
 assert.equal(pack.framePadding,PAD,'each isolated tile has transparent safety padding');
 assert.equal(crops.length,36,'one integer-aligned crop per sprite');
 assert.equal(tiles.length,36);
 for(let row=0;row<6;row++)for(let col=0;col<6;col++){
  const index=row*6+col,crop=crops[index],y0=Math.round(row*1024/6),y1=Math.round((row+1)*1024/6);
  assert.equal(crop.sx,col*256);assert.equal(crop.sy,y0);assert.equal(crop.sh,y1-y0);
  assert.equal(crop.sw,256);
  assert.deepEqual([crop.dx,crop.dy,crop.dw,crop.dh],[PAD,PAD,256,y1-y0]);
  assert([crop.sx,crop.sy,crop.sw,crop.sh,crop.dx,crop.dy,crop.dw,crop.dh].every(Number.isInteger));
  const tile=tiles[index];
  assert.equal(tile.width,256+PAD*2);assert.equal(tile.height,FRAME_H+PAD*2);
  assert.equal(tile.cleaned.x,PAD);assert.equal(tile.cleaned.y,PAD);
  const h=y1-y0,pix=tile.cleaned.data.data,alpha=(x,y)=>pix[(y*256+x)*4+3];
  assert.equal(alpha(85,80),255,'center of original sprite remains 100% opaque');
  if(index%2===0){
   assert.equal(alpha(120,0),255,'original connected top corner must not be faded');
   assert.equal(alpha(120,h-1),255,'original connected bottom corner must not be clipped');
   assert.equal(alpha(0,80),255,'original connected left corner must not be clipped');
   assert.equal(alpha(255,80),255,'original connected right corner must not be faded');
  }else{
   assert.equal(alpha(40,8),0,'remote top spill removed');
   assert.equal(alpha(252,70),0,'remote right spill removed');
   assert.equal(alpha(50,h-2),0,'remote bottom spill removed');
  }
 }
 const calls=[],ctx={save(){},restore(){},translate(){},rotate(){},drawImage(...args){calls.push(args)}};
 for(let kind=0;kind<36;kind++)assert(pack.draw(ctx,kind,70,80,40,kind*.12));
 assert.equal(calls.length,36);
 assert(calls.every(c=>c.length===5&&tiles.includes(c[0])),
  'turning, zooming and rotating use only isolated canvases');
 assert.equal(calls[35][0],tiles[35],'last frame points to correct sprite');
 const size=40,h=size*(1024/6)/256,px=PAD*size/256,py=PAD*h/FRAME_H;
 assert(Math.abs(calls[0][1]-(-size/2-px))<1e-8,'left edge offsets for safety padding');
 assert(Math.abs(calls[0][2]-(-h/2-py))<1e-8,'top edge offsets for safety padding');
 assert(Math.abs(calls[0][3]-(size+px*2))<1e-8,'original sprite width is not shrunk');
 assert(Math.abs(calls[0][4]-(h+py*2))<1e-8,'original sprite height is not shrunk');
 console.log('PASS v235: 36 full-corner projectiles preserved; tiny remote neighbor scraps cleared; separate padded frames retain unchanged size');
})().catch(error=>{console.error(error);process.exitCode=1});
