'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const base='dist/assets/ip/v2/';
const sources=[fs.readFileSync(base+'sprite-geometry.js','utf8'),
 fs.readFileSync(base+'boss-geometry.js','utf8'),
 fs.readFileSync(base+'object-zombies.js','utf8')];
const cleaned=[];
class CanvasMock{
 constructor(){this.width=0;this.height=0;this._pixels=null;}
 getContext(){
  const canvas=this;
  return {
   clearRect(){},drawImage(){},
   getImageData(){
    // One 150x180 connected trash-can body and TWO unrelated snippets.
    const data=new Uint8ClampedArray(256*256*4);
    const rect=(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)
     for(let x=x0;x<=x1;x++){const at=(y*256+x)*4;data[at]=120;data[at+1]=210;data[at+2]=110;data[at+3]=255;}};
    rect(91,25,211,204); // main body (nearly 22K pixels)
    rect(13,102,28,136); // stray neighboring-frame piece at left
    rect(103,234,133,243); // stray neighboring-frame piece below
    return {data};
   },
   putImageData(image){
    canvas._pixels=image.data;
    cleaned.push(canvas);
   }
  };
 }
}
class ImageMock{
 constructor(){this.naturalWidth=0;this.naturalHeight=0;}
 set src(v){
  this._src=v;
  if(v.endsWith('_hd.png')){this.naturalWidth=2048;this.naturalHeight=1024;}
  else{this.naturalWidth=1024;this.naturalHeight=512;}
  this.onload?.();
 }
 get src(){return this._src;}
}
const ctx={window:{},Image:ImageMock,document:{createElement:(name)=>{
 assert.equal(name,'canvas');return new CanvasMock();
}}};
vm.createContext(ctx);
for(const s of sources)vm.runInContext(s,ctx);
const art=ctx.window.ZZObjectSprite,trash={boss:true,bossForm:1,x:170,y:80,w:66,h:88,seed:.3,flash:0,recoil:0,moveDir:0};
const img=art.activeImage(trash);
assert(img.src.endsWith('trash_can_hd.png'),'still using approved source image');
assert.equal(cleaned.length,6,'only four trash frames and two blue boss frames isolated');
const bad=[19,22,24,25];
for(const frame of bad){
 const source=art.frameImage(trash,frame,img);
 assert(source instanceof CanvasMock,'frame '+frame+' draws isolated alpha canvas');
 const pixels=source._pixels;
 const alpha=(x,y)=>pixels[(y*256+x)*4+3];
 assert(alpha(120,80)===255,'main body preserved');
 assert(alpha(16,110)===0,'left edge foreign fragment deleted');
 assert(alpha(115,238)===0,'bottom edge foreign fragment deleted');
 const calls=[],draw={globalAlpha:1,filter:'none',save(){},restore(){},drawImage(...args){calls.push(args)}};
 art.drawFrame(draw,img,trash,frame);
 assert.equal(calls.length,1,'one properly cropped image per frame');
 const [renderImage,sx,sy,sw,sh,dx,dy,dw,dh]=calls[0];
 const originalRect=art.sourceRect(trash,frame,img);
 assert.equal(renderImage,source,'gameplay renders corrected frame');
 assert.equal(sx,originalRect[0]%256,'source x local to isolated cell');
 assert.equal(sy,originalRect[1]%256,'source y local to isolated cell');
 assert.equal(sw,originalRect[2]);assert.equal(sh,originalRect[3]);
 assert(Math.abs(dw/sw-dh/sh)<1e-8,'visual scale remains uniform');
 assert(Number.isFinite(dx)&&Number.isFinite(dy),'original foot pivot stays valid');
}
for(const frame of [0,7,12,18,20,23,26,28,29])
 assert.equal(art.frameImage(trash,frame,img),img,'clean-up does not alter good frame '+frame);
const big={...trash,bossForm:0},bigImg=art.activeImage(big);
for(const frame of [10,19]){
 const isolated=art.frameImage(big,frame,bigImg);
 assert(isolated instanceof CanvasMock,'blue boss diagonal frame '+frame+' isolated');
 const pixels=isolated._pixels;
 assert.equal(pixels[(120*256+110)*4+3],255,'blue giant body preserved');
 assert.equal(pixels[(110*256+16)*4+3],0,'disconnected left fragment removed');
 const calls=[],mock={globalAlpha:1,save(){},restore(){},drawImage(...args){calls.push(args)}};
 art.drawFrame(mock,bigImg,big,frame);
 assert.equal(calls[0][0],isolated,'actual gameplay uses corrected blue boss frame');
}
for(const frame of [0,1,8,9,11,16,18,20,23,24,28,29])
 assert.equal(art.frameImage(big,frame,bigImg),bigImg,'other blue boss frame '+frame+' unchanged');
const game=fs.readFileSync('dist/game.js','utf8');
assert(game.includes('originalObject?.draw(g,z,clock)'),'production renderer preserved');
const demo=fs.readFileSync(base+'cast-demo.js','utf8');
assert(demo.includes('pack.frameImage(actor,frame,img)'),'animation gallery uses the same isolated frames');
console.log('PASS: trash-can HD 19/22/24/25 remove disconnected alpha islands, preserve body/pivot, other frames and blue boss diagonal 10/19 corrected');
