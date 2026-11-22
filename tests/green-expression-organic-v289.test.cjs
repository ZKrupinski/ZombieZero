'use strict';
// v290: stable walk-direction expressions from original art only.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const paletteCode=fs.readFileSync('dist/assets/ip/v2/green-palette.js','utf8');
const walkCode=fs.readFileSync('dist/assets/ip/v2/green-walk.js','utf8');
const deathCode=fs.readFileSync('dist/assets/ip/green-death-loader.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
for(const source of [paletteCode,walkCode,deathCode])new vm.Script(source);
assert.match(paletteCode,/function createFaceExpressions\(/);
assert(!walkCode.includes("green_zombie-'+name+'.webp'"),'do not use the contaminated WebP sheets');
assert(!deathCode.includes("green-death-'+kind+'-v95-'+name+'.webp'"),'do not use contaminated death WebPs');
assert.match(deathCode,/part.expressions=\{\}/,'dying characters use original facial art');
assert.match(html,/v291-hair-mask/);
assert.match(sw,/v291-hair-mask/);
assert.match(sw,/v294-small-hearts-locked-lids/);
assert.match(paletteCode,/Math\.round\(reference\.h\*depth/);
class Canvas{
 constructor(){this.width=0;this.height=0;this.pixels=null}
 getContext(){
  const self=this;
  return {
   drawImage(img){self.pixels=new Uint8ClampedArray(img.pixels)},
   getImageData(){return {data:new Uint8ClampedArray(self.pixels)}},
   createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},
   putImageData(img){self.pixels=new Uint8ClampedArray(img.data)}
  };
 }
}
const env={window:{},document:{createElement:()=>new Canvas()},Math,Uint8ClampedArray};
vm.createContext(env);vm.runInContext(paletteCode,env);
const w=1024,h=512,pixels=new Uint8ClampedArray(w*h*4);
const at=(x,y)=>(y*w+x)*4;
function put(x,y,rgba){pixels.set(rgba,at(x,y))}
for(let row=0;row<3;row++)for(let frame=0;frame<8;frame++){
 const fx=frame*128,fy=row*128,shift=frame%2;
 for(let y=38;y<101;y++)for(let x=28;x<98;x++)put(fx+x+shift,fy+y,[71,164,75,255]);
 for(let y=8;y<=39;y++)for(let x=33;x<=95;x++)put(fx+x+shift,fy+y,[60,56,49,255]);
 for(const [a,b] of [[41,55],[67,81]])for(let y=54;y<=70;y++)
  for(let x=a;x<=b;x++)put(fx+x+shift,fy+y,[240,245,228,255]);
 for(const [a,b] of [[46,49],[72,75]])for(let y=59;y<=63;y++)
  for(let x=a;x<=b;x++)put(fx+x+shift,fy+y,[205,54,64,255]);
 for(let y=84;y<=90;y++)for(let x=53;x<=71;x++)put(fx+x+shift,fy+y,[153,52,50,255]);
 for(let x=37;x<=58;x++)put(fx+x+shift,fy+49,[26,35,29,255]);
 for(let x=65;x<=86;x++)put(fx+x+shift,fy+49,[26,35,29,255]);
}
const image={naturalWidth:w,naturalHeight:h,pixels};
const expressions=env.window.ZZGreenPalette.createFaceExpressions(image);
assert(expressions['half-lid']?.length===5&&expressions['raised-brow']?.length===5,'both expressive palettes are baked');
const px=(a,x,y)=>[...a.slice(at(x,y),at(x,y)+4)];
const changes={};
for(const kind of ['half-lid','raised-brow']){ const list=expressions[kind];
 const edited=list[0].pixels;
 for(let i=3;i<edited.length;i+=4)assert.equal(edited[i],pixels[i],'alpha is identical to canonical source');
 for(let frame=0;frame<8;frame++){
  const shift=frame%2,x=frame*128;
  assert.deepEqual(px(edited,x+43+shift,49),px(pixels,x+43+shift,49),'source eyebrow untouched');
  assert.deepEqual(px(edited,x+60+shift,87),px(pixels,x+60+shift,87),'source mouth untouched');
  assert.deepEqual(px(edited,x+10,10),px(pixels,x+10,10),'frame gutters never painted');
  assert.notDeepEqual(px(edited,x+46+shift,56),px(pixels,x+46+shift,56),'eyelid affects eye white, not brow');
 }
 changes[kind]=[];
 for(let frame=0;frame<8;frame++){
  let n=0;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   const off=at(frame*128+x,y);
   if(edited[off]!==pixels[off]||edited[off+1]!==pixels[off+1]||edited[off+2]!==pixels[off+2])n++;
  }
  changes[kind].push(n);
 }
 assert(changes[kind].every(n=>n>25),'all eight frames have eyelids, without intermittent blank frames');
 assert(new Set(changes[kind]).size<=2,'moving feet must not change face-paint area/frame');
}
assert.notDeepEqual(changes['half-lid'],changes['raised-brow'],'distinct eyelid depths');
assert.deepEqual(px(pixels,46,59),[205,54,64,255],'canonical source unaffected');
const death=env.window.ZZGreenPalette.createFaceExpressions({naturalWidth:768,naturalHeight:128,pixels:new Uint8ClampedArray(768*128*4)});
assert.equal(Object.keys(death).length,0,'unstable shrinking death faces are never algorithmically painted');
// A corrupted raw tint sheet fills 65px of every 128px slot, even outside
// the character. Only connected original hair-cap pixels may survive.
const contaminated=new Uint8ClampedArray(w*h*4);
for(let row=0;row<4;row++)for(let col=0;col<8;col++)
 for(let y=0;y<65;y++)for(let x=0;x<128;x++)
  contaminated.set([240,181,65,255],at(col*128+x,row*128+y));
const hair=env.window.ZZGreenPalette.cleanHairOverlay(
 image,{naturalWidth:w,naturalHeight:h,pixels:contaminated});
assert(hair?.pixels,'sanitized hair canvas created');
assert.equal(hair.pixels[at(10,15)+3],0,'horizontal color strip outside source alpha discarded');
assert.equal(hair.pixels[at(43,49)+3],0,'floating eyebrow never tinted');
assert.equal(hair.pixels[at(45,18)+3],255,'original dark hair cap stays recolorable');
assert.equal(hair.pixels[at(75,77)+3],0,'face and mouth remain untouched by hair colors');
assert.equal(hair.pixels[at(8*128-1,20)+3],0,'no hair color crosses a frame boundary');
console.log('PASS v291: eight stable eye frames, brow clearance, sanitized brown/blond/red hair masks, source alpha intact');
