'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('dist/game.js','utf8');
const a=src.indexOf("function background(){");
const b=src.indexOf("function player(){",a);
assert(a>=0&&b>a,'current scene draws roadway in background()');
const bg=src.slice(a,b);
const p=bg.match(/const palette=([\s\S]*?)\]\[\(wave-1\)%3\];/);
assert(p,'three rotating road palettes');
const colors=(p[1].match(/#[0-9a-fA-F]{6}/g)||[]).map(hex=>[
  parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)
]);
assert.equal(colors.length,12,'three stage palettes each have four tone entries');
function brightness(rgb){return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722}
for(let i=0;i<3;i++){
 const four=colors.slice(i*4,i*4+4);
 const base=four[0],t1=four[1],t2=four[2],trim=four[3];
 for(const rgb of four){
  assert(Math.max(...rgb)-Math.min(...rgb)<32,'floor remains neutral, not neon');
  assert(brightness(rgb)>=135&&brightness(rgb)<=196,'light enough behind dark silhouettes');
 }
 assert(Math.abs(brightness(t1)-brightness(t2))<15,'tile contrast is not distracting');
 assert(Math.abs(brightness(base)-brightness(t1))<25,'subtle ground gradient');
 assert(brightness(trim)>brightness(base),'subtle trim differentiates the road');
}
assert(bg.includes("rect(x+7,y+25,11,2,'#59656032')"),'cracks softened and desaturated');
assert(bg.includes("for(let i=0;i<16;i++)"),'less road sparkle noise');
assert(bg.includes("g.globalAlpha=.10"),'animated lane markings softer than before');
assert(!bg.includes("#5cd9de")&&!bg.includes("#e791e9"),'saturated previous palette removed');
assert(!bg.includes("#131d38")&&!bg.includes("#261a38"),'dark floor no longer overpowers zombie sprites');
console.log('PASS: brighter low-chroma three-stage road palettes, subtle tiles/cracks and less overlay noise');
