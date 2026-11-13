'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const parts=['cast-data-1.js','cast-data-2.js','cast-data-3.js','cast-loader.js'];
const scripts=parts.map(s=>read('dist/assets/ip/'+s));
const html=read('dist/index.html'),sw=read('dist/sw.js'),game=read('dist/game.js');

class ImageMock{
 constructor(){this.complete=true;this.naturalWidth=256}
 set src(v){this._src=v}
 get src(){return this._src}
}
const sandbox={window:{},Image:ImageMock};vm.createContext(sandbox);
for(const s of scripts)new vm.Script(s).runInContext(sandbox);
const cast=sandbox.window.ZZObjectCast;
assert(cast&&cast.atlas,'original cast image is built');
assert.equal(cast.ids.length,13,'ten zombies and three survivors');
assert.equal(cast.enemyIndex.length,8);
assert.equal(cast.bossIndex.length,4);
assert.equal(cast.heroIndex.length,3);
assert.deepEqual(Array.from(cast.heroIndex),[10,11,12]);
assert.equal(cast.atlas.src.startsWith('data:image/png;base64,'),true);
const png=Buffer.from(cast.atlas.src.split(',')[1],'base64');
assert.equal(png.readUInt32BE(16),256,'atlas width');
assert.equal(png.readUInt32BE(20),256,'atlas height');
function crc32(bytes){
 let crc=0xffffffff;
 for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
 return (crc^0xffffffff)>>>0;
}
let off=8,hasTransparency=false,finished=false;
assert(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
while(off+12<=png.length){
 const len=png.readUInt32BE(off),end=off+len+12;
 assert(end<=png.length,'chunk not truncated');
 const name=png.toString('ascii',off+4,off+8);
 assert.equal(crc32(png.subarray(off+4,off+8+len)),png.readUInt32BE(off+8+len),name+' CRC');
 if(name==='tRNS')hasTransparency=true;
 off=end;
 if(name==='IEND'){finished=true;break}
}
assert(finished&&hasTransparency&&off===png.length,'complete transparent atlas');
for(const s of parts){
 assert(html.includes('src="assets/ip/'+s+'"'),s+' is on page');
 assert(sw.includes('./assets/ip/'+s),s+' is precached');
 assert(html.indexOf('src="assets/ip/'+s+'"')<html.indexOf('src="game.js"'),'art loads before game');
}
assert(game.includes('cast.bossIndex[z.bossForm??0]'),'boss art mapping');
assert(game.includes('cast.enemyIndex[z.form??0]'),'regular art mapping');
assert(game.includes('cast.heroIndex[selectedHero]'),'hero art mapping');
assert(game.includes('atlas.naturalWidth===256'),'bitmap availability guarded');
assert(game.includes('gameplayCompatible===true?cast.gameplayAtlas:null'),'isometric gallery gated away from gameplay');
assert(!game.includes('const originalGreen=window.ZZOriginalArt'),'legacy isometric mascot not used');
const loader=scripts[3];
assert(loader.includes("sourceView:'isometric',gameplayCompatible:false,gameplayAtlas:null"),'isometric art explicitly gallery-only');
assert(loader.includes('removeFloorShadow'),'gallery shadows removed at load');
assert(game.includes('/* no baked character ground shadow'),'Canvas shadow is removed');
assert(game.includes('enemyHead(z,f,p,skin,a)'),'procedural front-oriented fallback retained');
for(const name of ['그린 좀비','드럼통 좀비 · 레드','일회용 포장 박스 좀비','빅 좀비','쓰레기통 좀비','생존자 소년','금발 소녀','빨간 안경 소녀'])assert(game.includes(name),name+' present in game');
console.log('PASS: 13 canon gallery sprites, PNG integrity, camera gate, no baked shadows, PWA fallback');
