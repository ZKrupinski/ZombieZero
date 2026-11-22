'use strict';
// Regression: facial variations must preserve the APPROVED source atlas pixels
// outside genuine facial features (especially transparent frame gutters).
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const paletteCode=fs.readFileSync('dist/assets/ip/v2/green-palette.js','utf8');
const walkCode=fs.readFileSync('dist/assets/ip/v2/green-walk.js','utf8');
const deathCode=fs.readFileSync('dist/assets/ip/green-death-loader.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
new vm.Script(paletteCode);new vm.Script(walkCode);new vm.Script(deathCode);
assert.match(paletteCode,/function createFaceExpressions\(/);
assert(!walkCode.includes("'assets/ip/v2/green_zombie-'+name+'.webp'"),'old sprite WebPs must not render');
assert(!deathCode.includes("'assets/ip/green-death-'+kind+'-v95-'+name+'.webp'"),'old death WebPs must not render');
assert.match(html,/v289-organic-face/);
assert.match(sw,/v289-organic-face/);
class Canvas{
 constructor(){this.width=0;this.height=0;this.pixels=null;}
 getContext(){
  const self=this;
  return {
   drawImage(img){self.pixels=new Uint8ClampedArray(img.pixels);},
   getImageData(){return {data:new Uint8ClampedArray(self.pixels)};},
   createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},
   putImageData(img){self.pixels=new Uint8ClampedArray(img.data);}
  };
 }
}
const document={createElement:()=>new Canvas()};
const env={window:{},document,Uint8ClampedArray,Math};
vm.createContext(env);vm.runInContext(paletteCode,env);
const makeImage=(w,h)=>{
 const pixels=new Uint8ClampedArray(w*h*4),cell=w===1024?128:96;
 const pixel=(x,y,rgba)=>{
  const i=(y*w+x)*4;pixels.set(rgba,i);
 };
 // One actual face frame; transparent gutters and unrelated poses remain empty.
 for(let y=38;y<101;y++)for(let x=28;x<98;x++)pixel(x,y,[71,164,75,255]);
 for(let y=54;y<=70;y++)for(let x=41;x<=55;x++)pixel(x,y,[240,245,228,255]);
 for(let y=54;y<=70;y++)for(let x=67;x<=81;x++)pixel(x,y,[240,245,228,255]);
 for(let y=59;y<=63;y++)for(let x=46;x<=49;x++)pixel(x,y,[205,54,64,255]);
 for(let y=59;y<=63;y++)for(let x=72;x<=75;x++)pixel(x,y,[205,54,64,255]);
 for(let y=84;y<=90;y++)for(let x=53;x<=71;x++)pixel(x,y,[153,52,50,255]);
 for(let x=37;x<=58;x++)pixel(x,49,[26,35,29,255]);
 for(let x=65;x<=86;x++)pixel(x,49,[26,35,29,255]);
 pixel(55,99,[239,238,234,255]); // original must retain any separate detail
 return {naturalWidth:w,naturalHeight:h,pixels,cell};
};
const img=makeImage(1024,512),p=env.window.ZZGreenPalette;
const e=p.createFaceExpressions(img);
assert(e['half-lid']?.length&&e['raised-brow']?.length,'two on-load facial atlas variations');
const pixel=(arr,x,y,w=1024)=>[...arr.slice((y*w+x)*4,(y*w+x)*4+4)];
const sleepy=e['half-lid'][0].pixels,skeptical=e['raised-brow'][0].pixels;
assert.notDeepEqual(pixel(sleepy,46,59),pixel(img.pixels,46,59),'sleepy upper eyelid covers white eye');
assert.deepEqual(pixel(sleepy,46,69),pixel(img.pixels,46,69),'lower eyeball remains visible');
assert.notDeepEqual(pixel(skeptical,46,59),pixel(img.pixels,46,59),'second expression has a real eye change');
assert.notDeepEqual(pixel(sleepy,61,84),pixel(img.pixels,61,84),'mouth pixels are altered subtly');
for(const atlas of [sleepy,skeptical]){
 for(let i=3;i<atlas.length;i+=4)assert.equal(atlas[i],img.pixels[i],'alpha must never change');
 for(const [x,y] of [[0,0],[127,127],[128,55],[40,100],[55,99],[43,49]]){
  assert.deepEqual(pixel(atlas,x,y),pixel(img.pixels,x,y),'other pixels stay exact');
 }
}
assert.deepEqual(pixel(img.pixels,46,59),[205,54,64,255],'canonical source is never mutated');
// Death atlas uses its actual 96x128 geometry, never bleeds into next 96px cell.
const death=makeImage(768,128),d=p.createFaceExpressions(death);
assert(d['half-lid']&&d['raised-brow'],'death variations share the approved source');
for(const atlas of [d['half-lid'][0].pixels,d['raised-brow'][0].pixels]){
 for(let i=3;i<atlas.length;i+=4)assert.equal(atlas[i],death.pixels[i]);
 assert.deepEqual(pixel(atlas,98,50,768),pixel(death.pixels,98,50,768),'other death frame must remain untouched');
}
console.log('PASS: organic zombie eye + mouth, canonical style, no alpha bleed, no baked-on brows');
