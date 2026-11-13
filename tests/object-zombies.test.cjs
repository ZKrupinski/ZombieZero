'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const keys=['red_barrel','black_barrel','red_brain_cube','cardboard_box','wooden_crate','black_brain_cube','yellow_brain_cube','big_zombie','trash_can'];
const loader=fs.readFileSync(path.join(root,'dist/assets/ip/v2/object-zombies.js'),'utf8');
const geometry=fs.readFileSync(path.join(root,'dist/assets/ip/v2/sprite-geometry.js'),'utf8');
const game=fs.readFileSync(path.join(root,'dist/game.js'),'utf8');
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'dist/sw.js'),'utf8');
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return(crc^0xffffffff)>>>0}
for(const k of keys){
 const png=fs.readFileSync(path.join(root,'dist/assets/ip/v2',k+'.png'));
 assert(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),k+' PNG signature');
 assert.equal(png.readUInt32BE(16),1024,k+' width');
 assert.equal(png.readUInt32BE(20),512,k+' height');
 let pos=8,alpha=false,done=false;
 while(pos+12<=png.length){const len=png.readUInt32BE(pos),end=pos+12+len;assert(end<=png.length,k+' chunk bounds');
 const type=png.toString('ascii',pos+4,pos+8);
 assert.equal(crc32(png.subarray(pos+4,pos+8+len)),png.readUInt32BE(pos+8+len),k+' '+type+' CRC');
 if(type==='tRNS'||(type==='IHDR'&&[4,6].includes(png[pos+25])))alpha=true;
 pos=end;if(type==='IEND'){done=true;break}}
 assert(done&&alpha&&pos===png.length,k+' PNG transparency and completeness');
 assert(html.includes('assets/ip/v2/object-zombies.js'),'game loader injected');
 assert(sw.includes('./assets/ip/v2/'+k+'.png'),k+' offline precache');
}
assert(sw.includes('shell-v10-nine-lane-crowd'),'new PWA cache version');
assert(game.includes('originalObject?.draw(g,z,clock)'),'original runtime draws in actual zombie loop');
assert(game.includes('ZZObjectSprite.drawDeath(g,d.z,d.critical,d.t,d.split)'),'normal and critical death renderer connected');
assert(game.includes('const criticalObject='),'finisher can trigger on non-green sprites');
let calls=[];
class ImageMock{
 constructor(){this.naturalWidth=1024;this.naturalHeight=512;this.complete=true}
 set src(s){this._src=s;if(this.onload)this.onload()}
 get src(){return this._src}
}
const context={Image:ImageMock,window:{}};vm.createContext(context);new vm.Script(geometry).runInContext(context);new vm.Script(loader).runInContext(context);
const cast=context.window.ZZObjectSprite;
assert(cast,'global object exists');assert.equal(Object.keys(cast.images).length,9);
assert.equal(cast.normal.length,8);assert.equal(cast.bosses.length,4);
for(let form=1;form<8;form++)assert(cast.available({form}),'regular form '+form);
for(let bossForm=0;bossForm<4;bossForm++)assert(cast.available({boss:true,bossForm}),'boss '+bossForm);
assert(!cast.available({form:0}),'green mascot stays on its approved dedicated sheet');
const canvas={globalAlpha:1,filter:'none',save(){calls.push(['save'])},restore(){calls.push(['restore'])},translate(){},scale(){},drawImage(img,...args){calls.push(['draw',img.src,...args])}};
const z={x:40,y:60,w:33,h:44,form:1,seed:0,recoil:0,moveDir:0,flash:0};
assert(cast.draw(canvas,z,0));
const geom=context.window.ZZSpriteGeometry.red_barrel;
function drawExpected(frame,group){
 const b=geom[group];
 const callsOut=calls.filter(c=>c[0]==='draw');
 assert(callsOut.length>=1,'some bitmap was drawn');
 const d=callsOut[0];
 assert.equal(d[2],(frame%8)*128+b[0],group+' cropped X');
 assert.equal(d[3],Math.floor(frame/8)*128+b[1],group+' cropped Y');
 assert.equal(d[4],b[2],group+' crop width');
 assert.equal(d[5],b[3],group+' crop height');
 assert(Math.abs(d[8]/d[4]-d[9]/d[5])<1e-8,'no aspect distortion');
}
drawExpected(0,'down');
calls=[];z.moveDir=-1;cast.draw(canvas,z,0);drawExpected(8,'left');
calls=[];z.moveDir=1;cast.draw(canvas,z,0);drawExpected(16,'right');
calls=[];z.recoil=.21;cast.draw(canvas,z,0);drawExpected(24,'hurt');
calls=[];cast.drawDeath(canvas,z,true,.08,.58);drawExpected(28,'critical');
calls=[];cast.drawDeath(canvas,z,false,.08,.52);drawExpected(26,'normal');
assert.equal(calls.filter(c=>c[0]==='save').length,calls.filter(c=>c[0]==='restore').length);
console.log('PASS: nine original 128px indexed RGBA atlases, 270 frames, direction/hit/finishers, mapping, fallback, PWA offline cache');
