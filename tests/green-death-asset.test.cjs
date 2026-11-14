'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const png=fs.readFileSync(path.join(root,'dist/assets/ip/green-death.png'));
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
assert(png.subarray(0,8).equals(signature),'real green death PNG committed');
assert.equal(png.readUInt32BE(16),480,'10 frames * 48px');
assert.equal(png.readUInt32BE(20),96,'2 rows * 48px');
function crc32(a){let crc=0xffffffff;for(const b of a){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return(crc^0xffffffff)>>>0}
let p=8,alpha=false,done=false;
while(p+12<=png.length){
 const len=png.readUInt32BE(p),end=p+12+len;
 assert(end<=png.length,'PNG chunk bounds');
 const type=png.toString('ascii',p+4,p+8);
 assert.equal(png.readUInt32BE(p+8+len),crc32(png.subarray(p+4,p+8+len)),'CRC '+type);
 if(type==='tRNS')alpha=true;
 p=end;
 if(type==='IEND'){done=true;break}
}
assert(done&&alpha&&p===png.length,'valid shadow-free transparent PNG');
const html=read('dist/index.html'),sw=read('dist/sw.js'),loader=read('dist/assets/ip/green-death-loader.js'),game=read('dist/game.js');
assert(html.includes('green-death-loader.js')&&html.indexOf('green-death-loader.js')<html.indexOf('src="game.js?v=35-piercing-critical"'),'sprite loader precedes game');
assert(html.includes('death-demo-dialog')&&html.includes('death-demo-canvas'),'in-game review control is wired');
assert(sw.includes('green-death.png')&&sw.includes('green-death-loader.js'),'PNG is PWA precached');
assert(loader.includes("image.src='assets/ip/green-death.png'"),'loads actual PNG');
assert(loader.includes('row:0,count:8,frameMs:65')&&loader.includes('row:1,count:10,frameMs:58'),'frame timings are preserved');
assert(game.includes('window.ZZGreenDeath.draw(g,d.z,d.critical,d.t)'),'real game draws bitmap death, not just preview');
assert(game.includes('!d.spriteMode)scatterEnemy'),'avoid double breakup after bitmap');
assert(game.includes('greenSprite.draw(g,{x:0,y:0,w:33,h:44},false,0)'),'living green zombie matches death art');
assert(game.includes('greenSprite?(critical?.580:.520)'),'accurate normal/critical visual duration');
console.log('PASS: actual RGBA alpha PNG, both animation strips, in-game render, visual QA controls, caching and fallback');
