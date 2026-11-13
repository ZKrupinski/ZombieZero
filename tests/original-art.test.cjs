'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const art=fs.readFileSync(path.join(root,'dist/assets/ip/green-zombie.js'),'utf8');
const game=fs.readFileSync(path.join(root,'dist/game.js'),'utf8');
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'dist/sw.js'),'utf8');

const found=art.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
assert(found,'original green zombie PNG is embedded');
const png=Buffer.from(found[1],'base64');
const sig=Buffer.from([137,80,78,71,13,10,26,10]);
assert(png.subarray(0,8).equals(sig),'PNG signature');
assert.equal(png.readUInt32BE(16),96,'PNG width');
assert.equal(png.readUInt32BE(20),128,'PNG height');
let offset=8,transparency=false,ended=false;
function crc32(bytes){
 let crc=0xffffffff;
 for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
 return (crc^0xffffffff)>>>0;
}
while(offset+12<=png.length){
 const len=png.readUInt32BE(offset),end=offset+12+len;
 assert(end<=png.length,'PNG chunk bounds');
 const name=png.toString('ascii',offset+4,offset+8);
 const checksum=png.readUInt32BE(offset+8+len);
 assert.equal(checksum,crc32(png.subarray(offset+4,offset+8+len)),name+' CRC');
 if(name==='tRNS')transparency=true;
 offset=end;
 if(name==='IEND'){ended=true;break}
}
assert(ended&&transparency,'transparent PNG is complete');
assert.equal(offset,png.length,'no trailing PNG garbage');
assert(html.includes('assets/ip/green-zombie.js')&&html.indexOf('assets/ip/green-zombie.js')<html.indexOf('src="game.js"'),'sprite loader precedes game');
assert(sw.includes('assets/ip/green-zombie.js')&&sw.includes('shell-v5-green-death'),'asset cached in updated service worker');
assert(!game.includes('g.drawImage(originalGreen,-3,-8,39,52)'),'legacy isometric green reference not drawn in gameplay');
assert(!game.includes("rect(-3,39,40,5,'#0b132699')"),'procedural ground shadow removed');
assert(game.includes('enemyHead(z,f,p,skin,a)'),'front-oriented procedural fallback retained');
console.log('PASS: transparent PNG integrity, no isometric gameplay bitmap, no baked shadow, fallback');
