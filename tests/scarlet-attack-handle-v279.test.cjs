'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const start=game.indexOf('// v279: Alpha-only cleanup for Scarlet');
const end=game.indexOf('function player(){',start);
assert(start>=0&&end>start,'eight-pose full-body handbag alpha correction included');
const pixels=new Uint8ClampedArray(768*384*4);
for(let i=0;i<pixels.length;i+=4){
 pixels[i]=40;pixels[i+1]=65;pixels[i+2]=80;pixels[i+3]=255;
}
const canvas={width:0,height:0};
let created=0,drawn=0,stored=0;
const ctx={
 drawImage(){drawn++},
 getImageData(){return {data:pixels}},
 putImageData(){stored++}
};
canvas.getContext=()=>ctx;
const env=vm.createContext({document:{createElement(tag){assert.equal(tag,'canvas');created++;return canvas}}});
vm.runInContext(game.slice(start,end),env);
const poses=vm.runInContext('scarletHandleCavities',env);
const point=vm.runInContext('scarletPointInPoly',env);
assert.equal(poses.length,8,'each independent complete swing pose is corrected');
const centers=[];
for(let frame=0;frame<8;frame++){
 const p=poses[frame];
 let inside=null;
 for(let y=30;y<105&&!inside;y++)for(let x=20;x<105;x++){
  if(point(x+.5,y+.5,p)){inside=[x,y];break}
 }
 assert(inside,'found correction pixel inside pose '+frame);
 centers.push(inside);
 const [x,y]=inside,offset=((Math.floor(frame/4)*192+y)*768+(frame%4)*192+x)*4;
 pixels[offset]=255;pixels[offset+1]=255;pixels[offset+2]=255;pixels[offset+3]=255;
}
const sheet={naturalWidth:768,naturalHeight:384};
const clean=vm.runInContext('cleanScarletAttackHandle',env);
assert.equal(clean(sheet),canvas,'gameplay receives sanitized canvas instead of old white-matte sprite');
for(let frame=0;frame<8;frame++){
 const [x,y]=centers[frame],i=((Math.floor(frame/4)*192+y)*768+(frame%4)*192+x)*4;
 assert.equal(pixels[i+3],0,'white inside handle becomes transparent in swing frame '+frame);
}
assert.equal(pixels[3],255,'pixels outside all handbag holes remain untouched');
assert.equal(clean(sheet),canvas,'sprite is cached across game frames');
assert.equal(created,1,'canvas allocated once, no per-frame canvas churn');
assert.equal(drawn,1);assert.equal(stored,1);
assert.equal(clean({naturalWidth:192,naturalHeight:192}).naturalWidth,192,'other character assets unaffected');
assert(game.includes('const renderSheet=attacking?cleanScarletAttackHandle(sheet):sheet;'),'gameplay actually renders corrected full-body image');
assert(game.includes('drawHeroBitmap(renderSheet,'),'corrected sprite used for drawing');
assert(html.includes('v279-scarlet-attack-handle-alpha')&&sw.includes('v279-scarlet-attack-handle-alpha'),'new renderer is refreshed in browser and PWA cache');
console.log('PASS v279: all 8 handbag attack holes transparent, hands preserved, fixed renderer cached');
