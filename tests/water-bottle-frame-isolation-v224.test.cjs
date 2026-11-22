'use strict';
// Validates exact 8x7 per-frame transparency cleanup for the approved small
// water-bottle elite. PNG source remains byte-for-byte unchanged.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/assets/ip/v2/elite-zombies-v145.js','utf8');
const png=fs.readFileSync('dist/assets/ip/v2/elites/water-bottle-v145.png');
assert.equal(png.length,1529756,'original approved PNG preserved');
assert.equal(png.readUInt32BE(16),1344);
assert.equal(png.readUInt32BE(20),1176);
assert(src.includes('function isolateBottleAtlas(img)'),'on-load bottle isolation installed');
assert(src.includes('if(kind===2){try{s.cleanImage=isolateBottleAtlas(img)}'),'other elites not modified');
const WIDTH=168,HEIGHT=168;
const created=[],saved=[],sourceCrops=[];
const sample=(row,col)=>{
 const p=new Uint8ClampedArray(WIDTH*HEIGHT*4);
 const rect=(x0,y0,x1,y1,a=255)=>{
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const idx=4*(y*WIDTH+x);
   p[idx]=55;p[idx+1]=215;p[idx+2]=190;p[idx+3]=a;
  }
 };
 rect(65,35,104,143); // approved character body
 rect(68,24,100,32); // intended disconnected cap near the main silhouette
 rect(158,65,168,91); // neighbor frame peeking in from the right
 rect(70,155,96,168); // next row bottle cap peeking up from below
 if(row===6){rect(29,60,38,69);rect(0,20,5,47)}
 return {width:WIDTH,height:HEIGHT,data:p};
};
function makeCanvas(){
 const canvas={width:0,height:0};
 const ctx={
  col:0,row:0,buffer:null,
  clearRect(){},
  drawImage(im,sx,sy){
   if(typeof sx==='number'&&typeof sy==='number'&&arguments.length>=9){
    this.col=sx/WIDTH;
   this.row=Math.round(sy/HEIGHT);
   sourceCrops.push({col:this.col,row:this.row,sourceTop:sy});
   }else if(im===created[1]){
    const d=im.getContext('2d').buffer;
    saved.push({col:sx/WIDTH,row:sy/HEIGHT,data:new Uint8ClampedArray(d.data)});
   }
  },
  getImageData(){return sample(this.row,this.col)},
  putImageData(d){this.buffer=d}
 };
 canvas.getContext=()=>ctx;
 created.push(canvas);
 return canvas;
}
class MockImage{
 constructor(){this.naturalWidth=1344;this.naturalHeight=1176;MockImage.images.push(this)}
 set src(path){this.path=path}
 decode(){return Promise.resolve()}
}
MockImage.images=[];
const world={window:{},document:{createElement:tag=>{
 assert.equal(tag,'canvas');return makeCanvas();
}},Image:MockImage,console,Math,Int16Array,Int32Array,Uint8Array,Uint8ClampedArray};
vm.createContext(world);vm.runInContext(src,world);
const lib=world.window.ZZEliteSprites;
const alpha=(d,x,y)=>d[4*(y*WIDTH+x)+3];
lib.requestForStage(7);
const bottle=MockImage.images.find(img=>img.path.endsWith('water-bottle-v145.png'));
assert(bottle,'bottle PNG requested');
bottle.onload();
(async()=>{
 await Promise.resolve();await Promise.resolve();
 assert.equal(lib.cache[2].ready,true,'bottle atlas only becomes ready after isolation');
 assert.equal(saved.length,56,'all 56 frames processed individually');
 assert.equal(sourceCrops.length,56,'one crop per frame');
 const hitCrops=sourceCrops.filter(x=>x.row===5);
 assert.equal(hitCrops.length,8,'all eight hit frames included');
 assert(hitCrops.every(x=>x.sourceTop===5*HEIGHT-24),
   'hit row fetches its actual cap from previous atlas row');
 assert(sourceCrops.filter(x=>x.row!==5).every(x=>x.sourceTop===x.row*HEIGHT),
   'other animations preserve their original frame ranges');
 const first=saved.find(x=>x.col===0&&x.row===0);
 assert.equal(alpha(first.data,80,90),255,'main silhouette preserved');
 assert.equal(alpha(first.data,80,28),255,'real cap remains');
 assert.equal(alpha(first.data,162,80),0,'side-neighbor fragment removed');
 assert.equal(alpha(first.data,82,160),0,'next-row cap removed');
 const dead=saved.find(x=>x.col===0&&x.row===6);
 assert.equal(alpha(dead.data,32,64),255,'central death debris preserved');
 assert.equal(alpha(dead.data,2,25),0,'foreign edge scrap removed');
 // The cleaned canvas is actually used for both regular frames and death frames.
 const calls=[],ctx={save(){},restore(){},drawImage(...args){calls.push(args)}};
 const z={x:42,y:75,w:33,h:44,kind:0,eliteKind:2,moveDir:0,seed:0,recoil:0,hitHold:0,flash:0};
 assert.equal(lib.draw(ctx,z,0),true);
 assert.strictEqual(calls.at(-1)[0],lib.cache[2].cleanImage,'regular animation uses isolated atlas');
 const normalY=calls.at(-1)[6];
 z.hitHold=.1;
 assert.equal(lib.draw(ctx,z,0),true);
 assert.equal(calls.at(-1)[2],5*HEIGHT,'hit row selected during recoil');
 assert(Math.abs(normalY-calls.at(-1)[6]-8)<.01,
   'foot-anchor correction precisely cancels 24px upward source crop');
 z.hitHold=0;
 lib.drawDeath(ctx,z,.3,.72);
 assert.strictEqual(calls.at(-1)[0],lib.cache[2].cleanImage,'death animation uses isolated atlas');
 assert.equal(calls.at(-1)[3],168,'source frame width is exactly one cell');
 console.log('PASS v224: bottle all 56 frames isolated; cap, center, death preserved; neighboring strips removed');
})().catch(e=>{console.error(e);process.exitCode=1});
