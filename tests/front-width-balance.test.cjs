'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto'),vm=require('node:vm');
const root='dist/assets/ip/v2/';
const expected=[
 {id:'green_zombie',cell:128,w:73,union:[24,6,103,122],unchanged:'da1b2000b8a6dc895a231ba1c3c0813d16f47fa6bcbab071045305df50af22a6'},
 {id:'red_brain_cube',cell:128,w:83,union:[20,10,107,120],unchanged:'747506ce5256537ba706c9a6d4f17d82cb0780090ed5513f5cf96e83fe6bee28'},
 {id:'black_brain_cube',cell:128,w:87,union:[17,10,110,120],unchanged:'a0bf4309d88736b27186ba58268889a272d4c775bf7a2a7b52a954a7b1d527b5'},
 {id:'yellow_brain_cube',cell:128,w:88,union:[17,12,111,120],unchanged:'4f72e33675697456e41bf9807acd0dd1c82d8e72b26121b48299a57b83c38085'},
 {id:'big_zombie',cell:128,w:109,union:[7,6,120,120],unchanged:'0a65acd425b221fc897fc3db001789fdb15e22e6d6f35ae19ec3a81920bb54c7'},
 {id:'big_zombie_hd',cell:256,w:223,union:[13,35,244,234],unchanged:'2a65ee32bacf6d9bdc95249b60e7047acaf18f1c4ed004144887bfd5a6c26aea'}
];
function rgbaPNG(filename){
 const png=fs.readFileSync(filename);
 assert(png.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')));
 let width=0,height=0,depth=0,type=0,offset=8;const idat=[];
 while(offset+12<=png.length){
  const len=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8);
  if(kind==='IHDR'){width=png.readUInt32BE(offset+8);height=png.readUInt32BE(offset+12);
   depth=png[offset+16];type=png[offset+17];}
  if(kind==='IDAT')idat.push(png.subarray(offset+8,offset+8+len));
  offset+=len+12;if(kind==='IEND')break;
 }
 assert.equal(depth,8);assert.equal(type,6,'full RGBA atlas');
 const raw=zlib.inflateSync(Buffer.concat(idat)),stride=width*4;
 const result=Buffer.alloc(width*height*4),rowBytes=stride+1;
 assert.equal(raw.length,rowBytes*height,'all image scanlines accounted for');
 for(let y=0;y<height;y++){
  const filter=raw[y*rowBytes],start=y*rowBytes+1,dest=y*stride;
  for(let x=0;x<stride;x++){
   const a=x>=4?result[dest+x-4]:0;
   const b=y>0?result[dest-stride+x]:0;
   const c=y>0&&x>=4?result[dest-stride+x-4]:0;
   let predictor=0;
   if(filter===1)predictor=a;
   if(filter===2)predictor=b;
   if(filter===3)predictor=Math.floor((a+b)/2);
   if(filter===4){
    const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);
    predictor=da<=db&&da<=dc?a:db<=dc?b:c;
   }
   assert(filter>=0&&filter<=4,'valid PNG line filter');
   result[dest+x]=(raw[start+x]+predictor)&255;
  }
 }
 return {width,height,rgba:result};
}
const env={window:{}};vm.createContext(env);
vm.runInContext(fs.readFileSync(root+'sprite-geometry.js','utf8'),env);
vm.runInContext(fs.readFileSync(root+'boss-geometry.js','utf8'),env);
for(const {id,cell,w,union,unchanged} of expected){
 const img=rgbaPNG(root+id+'.png');
 assert.equal(img.width,cell*8);assert.equal(img.height,cell*4);
 const rgba=img.rgba;
 const tail=rgba.subarray(img.width*4*cell);
 assert.equal(crypto.createHash('sha256').update(tail).digest('hex'),unchanged,
   id+' all diagonal/hit/death frames are PIXEL-IDENTICAL to previous approved atlas');
 let minx=cell,miny=cell,maxx=0,maxy=0;
 for(let frame=0;frame<8;frame++){
  let visible=0;
  for(let y=0;y<cell;y++){
   for(let x=0;x<cell;x++){
    const alpha=rgba[(y*img.width+frame*cell+x)*4+3];
    if(alpha===0)continue;
    visible++;minx=Math.min(minx,x);miny=Math.min(miny,y);
    maxx=Math.max(maxx,x+1);maxy=Math.max(maxy,y+1);
   }
  }
  assert(visible>100,id+' frontal frame '+frame+' contains visible subject');
 }
 assert.deepEqual([minx,miny,maxx,maxy],union,id+' exact frontal 8-frame union');
 const newWidth=maxx-minx,ratio=newWidth/w;
 assert(ratio>1.03&&ratio<1.10,id+' width increases just 3–10%');
 const geom=(id==='big_zombie_hd'?env.window.ZZBossSpriteGeometry.big_zombie:env.window.ZZSpriteGeometry[id]).down;
 assert(geom[0]<=minx&&geom[1]<=miny&&geom[0]+geom[2]>=maxx&&geom[1]+geom[3]>=maxy,
   id+' cropping includes every pixel of widened front art');
 assert(Math.abs((geom[0]+geom[2]/2)-cell/2)<2,id+' centered about same local axis');
}
const game=fs.readFileSync('dist/game.js','utf8');
assert(game.includes('mascot?.draw(g,z,clock)')&&game.includes('originalObject?.draw(g,z,clock)'),
 'game uses the modified assets without changing gameplay');
console.log('PASS: 5 targets (6 atlases) gently widened in frontal 8 frames; 144 other frames unchanged byte-for-byte in RGBA, alpha crops/foot axes preserved');
