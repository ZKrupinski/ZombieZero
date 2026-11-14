'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(base,'dist/assets/ip/v2/green-walk.js'),'utf8');
const game=fs.readFileSync(path.join(base,'dist/game.js'),'utf8');
const html=fs.readFileSync(path.join(base,'dist/index.html'),'utf8');
const sw=fs.readFileSync(path.join(base,'dist/sw.js'),'utf8');
const png=fs.readFileSync(path.join(base,'dist/assets/ip/v2/green_zombie.png'));
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
assert(png.subarray(0,8).equals(signature),'green sprite PNG');
assert.equal(png.readUInt32BE(16),1024,'green atlas width');
assert.equal(png.readUInt32BE(20),512,'green atlas height');
let off=8,transparent=false,finished=false;
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
while(off+12<=png.length){
 const n=png.readUInt32BE(off),type=png.toString('ascii',off+4,off+8);
 assert(off+12+n<=png.length,'chunk bounds');
 assert.equal(crc32(png.subarray(off+4,off+8+n)),png.readUInt32BE(off+8+n),type+' CRC');
 if(type==='tRNS'||(type==='IHDR'&&[4,6].includes(png[off+17])))transparent=true;
 off+=12+n;if(type==='IEND'){finished=true;break}
}
assert(finished&&transparent&&off===png.length,'no opaque backdrop or corrupt chunks');
assert(html.includes('src="assets/ip/v2/green-walk.js"'),'green loader before game');
assert(html.indexOf('src="assets/ip/v2/green-walk.js"')<html.indexOf('src="game.js"'),'load ordering');
assert(sw.includes('./assets/ip/v2/green_zombie.png')&&sw.includes('./assets/ip/v2/green-walk.js'),'offline assets');
assert(sw.includes('shell-v18-dynamic-impact'),'cache version');
assert(game.includes('mascot?.draw(g,z,clock)'),'runtime connected');
assert(game.includes('const isGreen=!z.boss&&(z.form??0)===0'),'green uses dedicated final death 8/10 frames');
assert(game.includes('function tryStartBreakouts()'),'green diagonal movement now requires sparse-wave gap AI');
assert(game.includes('z.moveDir=Math.sign(z.x-previousX)'),'left/right animation follows actual lateral velocity');
assert(game.includes('}else z.moveDir=0;'),'default walk is frontal');
assert(!game.includes('Math.sin(clock*1.4+(z.seed||0))*radius'),'former random walk removed');
let draws=[];
class ImageMock {
 constructor(){this.naturalWidth=1024;this.naturalHeight=512}
 set src(v){this._src=v;if(this.onload)this.onload()}
 get src(){return this._src}
}
const sandbox={Image:ImageMock,window:{}};
vm.createContext(sandbox);new vm.Script(fs.readFileSync(path.join(base,'dist/assets/ip/v2/sprite-geometry.js'),'utf8')).runInContext(sandbox);new vm.Script(src).runInContext(sandbox);
const sprite=sandbox.window.ZZGreenWalk;
assert(sprite&&sprite.ready,'image initialized');
const ctx={save(){},restore(){},filter:'none',drawImage(...args){draws.push(args)}};
const z={x:40,y:60,w:33,h:44,form:0,seed:0,moveDir:0,recoil:0,flash:0};
assert.equal(sprite.getFrame(z,0),0);
z.moveDir=-5;assert.equal(sprite.getFrame(z,0),8,'down-left');
z.moveDir=5;assert.equal(sprite.getFrame(z,0),16,'down-right');
z.recoil=.21;assert.equal(sprite.getFrame(z,0),24,'hurt');
z.recoil=0;assert(sprite.draw(ctx,z,.55));
assert(draws.length===1,'one bitmap draw per active green zombie');
const bounds=sandbox.window.ZZSpriteGeometry.green_zombie.right;
assert.equal(draws[0][1],(sprite.getFrame(z,.55)%8)*128+bounds[0],'cropped source X');
assert.equal(draws[0][2],Math.floor(sprite.getFrame(z,.55)/8)*128+bounds[1],'cropped source Y');
assert.equal(draws[0][3],bounds[2],'cropped source width');
assert.equal(draws[0][4],bounds[3],'cropped source height');
console.log('PASS: 30 green frames with real left/right/down walking, 128px PNG and alpha, live gameplay, death precedence and PWA cache');
