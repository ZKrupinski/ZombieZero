'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p));
const base='dist/assets/ip/v2/';
const names=['big_zombie','trash_can'];
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return(crc^0xffffffff)>>>0}
for(const name of names){
 const bytes=read(base+name+'_hd.png');
 assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'boss PNG signature');
 assert.equal(bytes.readUInt32BE(16),2048,name+' 8x256 width');
 assert.equal(bytes.readUInt32BE(20),1024,name+' 4x256 height');
 assert.equal(bytes[25],6,'RGBA PNG, transparent background');
 let pos=8,done=false;
 while(pos+12<=bytes.length){
  const size=bytes.readUInt32BE(pos),end=pos+size+12;
  assert(end<=bytes.length,'PNG complete chunk');
  assert.equal(crc32(bytes.subarray(pos+4,pos+size+8)),bytes.readUInt32BE(pos+size+8),'valid PNG CRC');
  const type=bytes.toString('ascii',pos+4,pos+8);
  pos=end;if(type==='IEND'){done=true;break}
 }
 assert(done&&pos===bytes.length,name+' complete RGBA high-res atlas');
}
const html=read('dist/index.html').toString();
const sw=read('dist/sw.js').toString();
assert(html.indexOf('src="assets/ip/v2/boss-geometry.js"')>0);
assert(html.indexOf('src="assets/ip/v2/boss-geometry.js"')<html.indexOf('src="assets/ip/v2/object-zombies.js"'));
for(const name of names)assert(sw.includes('./assets/ip/v2/'+name+'_hd.png'),name+' precached offline');
assert(sw.includes('./assets/ip/v2/boss-geometry.js'),'HD geometry offline');
assert(sw.includes('shell-v15-boss-hd-muted-floor'),'fresh cache');
const src=[read(base+'sprite-geometry.js'),read(base+'boss-geometry.js'),read(base+'object-zombies.js')].map(x=>x.toString());
function boot(failHD=false){
 const calls=[];
 class ImageMock{
  constructor(){this.naturalWidth=0;this.naturalHeight=0}
  set src(value){
   this._src=value;
   if(value.endsWith('_hd.png')&&!failHD){this.naturalWidth=2048;this.naturalHeight=1024}
   else if(value.endsWith('_hd.png')){this.onerror?.();return}
   else {this.naturalWidth=1024;this.naturalHeight=512}
   this.onload?.();
  }
  get src(){return this._src}
 }
 const env={window:{},Image:ImageMock};
 vm.createContext(env);
 for(const text of src)vm.runInContext(text,env);
 const ctx={globalAlpha:1,filter:'none',save(){},restore(){},drawImage(...args){calls.push(args)}};
 return {pack:env.window.ZZObjectSprite,geometry:env.window.ZZBossSpriteGeometry,calls,ctx};
}
const hi=boot();
for(let n=0;n<2;n++){
 const name=names[n],z={boss:true,bossForm:n,form:3,x:150,y:60,w:66,h:88,seed:1.2,flash:0,recoil:0,moveDir:0};
 assert(hi.pack.available(z),name+' available');
 assert.equal(hi.pack.activeImage(z).src,base+name+'_hd.png',name+' chooses HD');
 for(const [frame,group,critical] of [[0,'down',false],[12,'left',false],[22,'right',false],[24,'hurt',false],[26,'normal',false],[28,'critical',true]]){
  hi.calls.length=0;
  z.moveDir=frame>=16&&frame<=23?1:frame>=8&&frame<=15?-1:0;
  z.recoil=frame===24?.20:0;
  if(frame>=26)assert(hi.pack.drawDeath(hi.ctx,z,critical,critical?.12:.1,.65));
  else assert(hi.pack.drawFrame(hi.ctx,hi.pack.activeImage(z),z,frame)===undefined);
  assert(hi.calls.length>0,'HD boss emitted draw calls');
  const [img,sx,sy,sw,sh,dx,dy,dw,dh]=hi.calls[0];
  const b=hi.geometry[name][group];
  assert(img.src.endsWith('_hd.png'),'uses HD atlas rather than scaling old low-res frame');
  assert.equal(sx,(frame%8)*256+b[0],name+' correct HD source x');
  assert.equal(sy,Math.floor(frame/8)*256+b[1],name+' correct HD source y');
  assert.equal(sw,b[2],name+' per-action alpha-crop width');
  assert.equal(sh,b[3],name+' per-action alpha-crop height');
  assert(Math.abs(dw/sw-dh/sh)<1e-9,'never distort 3D cube aspect');
  assert(Math.abs(dx+dw/2-(z.x+z.w/2))<1e-7,'center pivot stable');
  assert(Math.abs(dy+dh-(z.y+z.h+2))<1e-7,'foot pivot stable');
 }
}
const low=boot(true);
for(let n=0;n<2;n++){
 const z={boss:true,bossForm:n,x:100,y:80,w:66,h:88,flash:0,seed:.2,moveDir:0,recoil:0};
 assert(low.pack.available(z),'low-res fallback is game-safe when HD unavailable');
 assert(!low.pack.activeImage(z).src.endsWith('_hd.png'),'fallback picks prior 128px sheet');
 low.calls.length=0;
 assert(low.pack.draw(low.ctx,z,0));
 assert.equal(low.calls[0][3],low.pack.sourceRect(z,low.pack.getFrame(z,0))[2],
    'fallback samples original alpha crop');
}
const game=read('dist/game.js').toString();
assert(game.includes('originalObject?.draw(g,z,clock)'),'gameplay uses boss HD-capable renderer');
assert(game.includes('ZZObjectSprite.drawDeath(g,d.z,d.critical,d.t,d.split)'),'boss death uses same HD-capable renderer');
const gallery=read(base+'cast-demo.js').toString();
assert(gallery.includes('pack.activeImage(actor)'),'gallery displays actual HD boss');
assert(gallery.includes('pack.sourceRect(actor,frame,img)'),'gallery samples HD pixel coordinates');
console.log('PASS: two genuine higher-res 2048x1024 boss sprites, actual 256px cropped frames, walking/hit/death, fallback and review gallery');
