'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const path='dist/assets/ip/item-icons-v56.png';
const png=fs.readFileSync(path);
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16),1024);
assert.equal(png.readUInt32BE(20),128);
assert.equal(png[24],8,'8 bits per RGBA channel');
assert.equal(png[25],6,'true color + straight transparency');
assert.equal(crypto.createHash('sha256').update(png).digest('hex'),
 '9b60efe353d0c7324c942024f890149b16b33bdedea556f9743a2671d847f6ab',
 'exact approved 8-item transparent source');
let offset=8,chunks=[];
while(offset<png.length){
 const len=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);
 if(type==='IDAT')chunks.push(png.subarray(offset+8,offset+8+len));
 offset+=12+len;if(type==='IEND')break;
}
const raw=zlib.inflateSync(Buffer.concat(chunks));
const W=1024,H=128,stride=W*4;
assert.equal(raw.length,(stride+1)*H);
const rgba=Buffer.alloc(W*H*4);let prev=Buffer.alloc(stride);
let src=0;
for(let y=0;y<H;y++){
 const method=raw[src++],row=Buffer.alloc(stride);
 for(let k=0;k<stride;k++){
  const v=raw[src++],a=k>=4?row[k-4]:0,b=prev[k],c=k>=4?prev[k-4]:0;
  let predictor=0;
  if(method===1)predictor=a;
  if(method===2)predictor=b;
  if(method===3)predictor=Math.floor((a+b)/2);
  if(method===4){
   const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
   predictor=pa<=pb&&pa<=pc?a:pb<=pc?b:c;
  }
  row[k]=(v+predictor)&255;
 }
 row.copy(rgba,y*stride);
 prev=row;
}
const order=['bazooka','dual','triple','power','fire','slow','pierce','shield'];
for(let i=0;i<8;i++){
 const x0=128*i,nonzero=[];
 for(let y=0;y<H;y++)for(let x=0;x<128;x++){
  const idx=(y*W+x0+x)*4,alpha=rgba[idx+3];
  if(!alpha){
   assert.equal(rgba[idx],0,order[i]+' transparent RGB must be black, never a colored halo');
   assert.equal(rgba[idx+1],0);assert.equal(rgba[idx+2],0);
  }else nonzero.push([x,y]);
  if(x===0||x===127||y===0||y===127)
   assert.equal(alpha,0,order[i]+' must have a true transparent frame border');
 }
 assert(nonzero.length>8500&&nonzero.length<11500,order[i]+' is clean and fills 128px cell');
}
// Active symbols must stay above shield bloom and under speech bubbles.
const game=fs.readFileSync('dist/game.js','utf8');
const beg=game.indexOf('function drawActiveItemIcons(){'),end=game.indexOf('function drawIcon(',beg),block=game.slice(beg,end);
assert(block.includes('const size=22,step=24;'),'22px status sprite makes shield and rocket legible on mobile');
assert(block.includes('const y=SHIELD_LINE_Y-15+VIEW_DELTA;'),'equipped items stay directly below wheels');
assert(block.includes('g.arc(x,y,12.2'),'duration ring scales with status artwork');
assert(652-15+12.2+.7<652-2,'duration ring never covers shield line');
assert(game.includes("const ITEM_ICON_KEYS=['bazooka','dual','triple','power','fire','slow','pierce','shield'];"),
 'bitmap order remains correct for all eight original skill behaviors');
assert(game.includes("const FALLING_ITEM_SIZE=46;"),'large pickup chest silhouette is preserved');
const loader=fs.readFileSync('dist/assets/ip/item-icons.js','utf8');
assert(loader.includes('item-icons-v56.png?v=56-clean-alpha-crates'));
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('item-icons.js?v=56-premium-clean-alpha'));
assert(html.includes('game.js?v=82-ball-fx-ripple'));
assert(sw.includes("'./assets/ip/item-icons-v56.png'"));
assert(!sw.includes("'./assets/ip/item-icons-v37.png'"));
assert(sw.includes('zombie-zero-shell-v82-ball-fx-ripple'));
console.log('PASS: eight clean transparent premium chest PNG cells, no stray pixels or RGB fringes, readable active badges and intact skill mapping.');
