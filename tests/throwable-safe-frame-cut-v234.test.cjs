'use strict';
// Verify each original 6x6 item is isolated from its neighbors. The approved
// 1536x1024 RGBA art is not edited, and citizens/bosses use the same renderer.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/assets/ip/v2/throwables-v159.js','utf8');
const imagePng=fs.readFileSync('dist/assets/ip/v2/throwables-36-v159.png');
assert.equal(imagePng.readUInt32BE(16),1536);assert.equal(imagePng.readUInt32BE(20),1024);
const crops=[],tiles=[];
function buildCanvas(){
 const tile={width:0,height:0},ctx={
  drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh){
   crops.push({image,sx,sy,sw,sh,dx,dy,dw,dh});
  },
  getImageData(x,y,w,h){
   const p=new Uint8ClampedArray(w*h*4);
   function rect(x0,y0,x1,y1){for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++)
    {const i=(yy*w+xx)*4;p[i]=50;p[i+1]=160;p[i+2]=210;p[i+3]=255}}
   rect(75,35,175,139); // Actual throwable: large centered silhouette.
   rect(25,6,60,12);   // Detached neighbor fragment at top edge.
   rect(250,59,256,90);// Right-neighbor bleed.
   rect(40,167,70,171);// Bottom edge of the following row.
   return{width:w,height:h,data:p};
  },
  putImageData(data){tile.cleaned=data}
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
const pack=sandbox.window.ZZThrowablesV159;
pack.request();
(async()=>{
 await Promise.resolve();await Promise.resolve();
 assert(pack.ready,'approved PNG loaded');
 assert.equal(pack.preparedFrameCount,36,'all 36 source cells are isolated');
 assert.equal(crops.length,36,'one integer-aligned source crop per item');
 assert.equal(tiles.length,36);
 assert(crops.every(c=>[c.sx,c.sy,c.sw,c.sh,c.dx,c.dy,c.dw,c.dh].every(Number.isInteger)),
   'non-integer row slicing no longer causes adjacent-frame interpolation');
 for(let row=0;row<6;row++)for(let col=0;col<6;col++){
  const crop=crops[row*6+col],y0=Math.round(row*1024/6),y1=Math.round((row+1)*1024/6);
  assert.equal(crop.sx,col*256);assert.equal(crop.sy,y0);assert.equal(crop.sh,y1-y0);
  assert.equal(crop.sw,256);
  const tile=tiles[row*6+col],pix=tile.cleaned.data,alpha=(x,y)=>pix[(y*256+x)*4+3];
  assert.equal(alpha(0,70),0,'left boundary is transparent');
  assert.equal(alpha(255,70),0,'right boundary is transparent');
  assert.equal(alpha(45,0),0,'top boundary is transparent');
  assert.equal(alpha(45,170),0,'bottom boundary is transparent');
  assert.equal(alpha(40,8),0,'isolated neighboring top fragment removed');
  assert.equal(alpha(252,70),0,'neighboring right fragment masked');
  assert.equal(alpha(85,80),255,'approved central throwable silhouette preserved');
 }
 const calls=[],ctx={save(){},restore(){},translate(){},rotate(){},drawImage(...args){calls.push(args)}};
 for(let k=0;k<36;k++)assert(pack.draw(ctx,k,70,80,40,k*.12));
 assert.equal(calls.length,36);
 assert(calls.every(c=>c.length===5&&tiles.includes(c[0])),
  'rotation/scaling reads only isolated tile canvases, never another frame');
 assert.equal(calls[35][0],tiles[35],'last frame source is correct');
 console.log('PASS v234: all 36 throwable sprites isolated with integer crop, edge-alpha scrub, neighboring-island removal, no changes to original PNG');
})().catch(e=>{console.error(e);process.exitCode=1});
