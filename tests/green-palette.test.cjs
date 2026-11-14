'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root='dist/assets/ip/';
const paletteSrc=fs.readFileSync(root+'v2/green-palette.js','utf8');
const walkSrc=fs.readFileSync(root+'v2/green-walk.js','utf8');
const deathSrc=fs.readFileSync(root+'green-death-loader.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const env={window:{},console};vm.createContext(env);
vm.runInContext(paletteSrc,env);
const p=env.window.ZZGreenPalette;
assert.equal(p.tones.length,5,'classic and four alternative colors');
assert(Math.abs(p.tones.reduce((a,b)=>a+b.weight,0)-1)<1e-9,'weights sum to 100%');
assert.equal(p.paletteFor({form:2,seed:4}),0,'no recoloring special zombies');
assert.equal(p.paletteFor({boss:true,form:0,seed:4}),0,'no recoloring bosses');
assert.equal(p.paletteFor({form:0,seed:0}),0,'no-seed default stays classic green');
assert.equal(p.paletteFor({form:0,paletteVariant:4,seed:1}),4,'explicit variants stable');
const bins=[0,0,0,0,0];
for(let i=1;i<=2500;i++){const z={form:0,seed:i*.013},a=p.paletteFor(z),b=p.paletteFor(z);assert.equal(a,b,'deterministic palette by seed');bins[a]++}
assert(bins[0]>1000&&bins[0]<1650,'green remains a clear majority');
assert(bins.slice(1).every(n=>n>40),'all additional tones appear visibly');
const samples=[
 [76,168,81,255],   // green material changes
 [200,47,56,255],   // red clothes stay untouched
 [250,248,243,255], // white eyes unchanged
 [25,25,25,255],    // outline unchanged
 [50,120,55,0]     // alpha unchanged
].flat();
for(const variant of p.tones.slice(1)){
 const data=new Uint8ClampedArray(samples);
 p.recolorGreen(data,variant.rgb);
 assert.notDeepEqual([...data.slice(0,3)],samples.slice(0,3),'green body changes for '+variant.name);
 assert.deepEqual([...data.slice(4,16)],samples.slice(4,16),'face, shirt and outlines unchanged');
 assert.deepEqual([...data.slice(16,20)],samples.slice(16,20),'transparent color left unchanged');
 for(let i=3;i<data.length;i+=4)assert.equal(data[i],samples[i],'alpha preserved');
}
let created=0,drawn=0;
const sourcePixel=new Uint8ClampedArray(4*2);
sourcePixel.set([76,168,81,255,200,47,56,255]);
class Canvas{
 constructor(){this.id=++created;this.width=0;this.height=0;this.lastPixels=null}
 getContext(){return {
  drawImage:()=>{drawn++},
  getImageData:()=>({data:sourcePixel}),
  createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
  putImageData:(pixels)=>{this.lastPixels=pixels.data}
 }}
}
class ImageMock{
 constructor(){this.naturalWidth=1024;this.naturalHeight=512;this.decoding='async'}
 set src(v){this._src=v;if(v.includes('green-death')){this.naturalWidth=480;this.naturalHeight=96}
  this.onload?.()}
 get src(){return this._src}
}
const vmEnv={window:env.window,Image:ImageMock,console,
 document:{createElement:()=>new Canvas(),readyState:'loading',addEventListener:()=>{},getElementById:()=>null}};
vm.createContext(vmEnv);
vm.runInContext(walkSrc,vmEnv);
vm.runInContext(deathSrc,vmEnv);
const walk=vmEnv.window.ZZGreenWalk,death=vmEnv.window.ZZGreenDeath;
assert(walk.ready&&death.ready,'both source atlas images load');
assert.equal(walk.variants.length,5,'live walk/hurt palette atlases precomposed');
assert.equal(death.variants.length,5,'live death and critical palette atlases precomposed');
assert(walk.variants.slice(1).every(x=>x instanceof Canvas),'walk variants are cached offscreen bitmaps');
assert(death.variants.slice(1).every(x=>x instanceof Canvas),'death variants are cached offscreen bitmaps');
const actor={seed:2.871,form:0,x:100,y:140,w:33,h:44,moveDir:0,flash:0,recoil:0};
const actual=p.paletteFor(actor),calls=[];
const ctx={filter:'none',save(){},restore(){},drawImage(img,...args){calls.push({img,args})}};
assert(walk.draw(ctx,actor,1.2),'walk is rendered');
assert.strictEqual(calls.pop().img,walk.variants[actual],'walk uses that actor own body color');
assert(death.draw(ctx,actor,false,.05),'normal death is rendered');
assert.strictEqual(calls.pop().img,death.variants[actual],'normal death matches living color');
assert(death.draw(ctx,actor,true,.18),'critical death is rendered');
assert.strictEqual(calls.pop().img,death.variants[actual],'critical death matches living color');
actor.moveDir=1;walk.draw(ctx,actor,1.2);
assert.strictEqual(calls.pop().img,walk.variants[actual],'diagonal shares same color');
assert(html.indexOf('green-palette.js')<html.indexOf('green-death-loader.js'),'shared colorizer loads before green death');
assert(html.indexOf('green-palette.js')<html.indexOf('green-walk.js'),'shared colorizer loads before walk');
assert(sw.includes('./assets/ip/v2/green-palette.js'),'offline precache palette code');
assert(sw.includes('shell-v20-zombie-tones-controlled-fire'),'PWA cache updated');
console.log('PASS: five stable low-chroma original-bitmap palettes, green majority, unchanged faces and transparency, identical walk/hit/normal/crit death colors');
