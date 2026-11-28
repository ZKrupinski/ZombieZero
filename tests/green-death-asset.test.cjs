'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('dist/index.html'),sw=read('dist/sw.js'),loader=read('dist/assets/ip/green-death-loader.js'),game=read('dist/game.js');
assert(!fs.existsSync(path.join(root,'dist/assets/ip/green-death.png')),'retired B sheet removed');
assert(!loader.includes('green-death.png')&&!sw.includes('green-death.png'),'no old B request or precache');
for(const kind of ['normal','critical']){
 const file=fs.readFileSync(path.join(root,'dist/assets/ip/deaths-v307/green-'+kind+'.webp'));
 assert.equal(file.toString('ascii',0,4),'RIFF');
 assert.equal(file.toString('ascii',12,16),'VP8X');
 assert.equal(file.readUIntLE(24,3)+1,1920);assert.equal(file.readUIntLE(27,3)+1,320);
}
assert(html.includes('green-death-loader.js')&&html.indexOf('green-death-loader.js')<html.indexOf('src="game.js?v='));
assert(html.includes('death-demo-dialog')&&html.includes('death-demo-canvas'));
assert(loader.includes('normal:{count:8,frameMs:65,duration:.520}')&&loader.includes('critical:{count:8,frameMs:72.5,duration:.580}'));
assert(game.includes('window.ZZGreenDeath.draw(g,d.z,d.critical,elapsed)'));
assert(!game.includes('function scatterEnemy('));
assert(game.includes('window.ZZGreenDeath.draw(g,z,false,0)'));
assert(game.includes('greenSprite?(critical?.580:.520)'));
console.log('PASS: approved A only; no legacy B asset or runtime request; HD geometry and timing preserved.');
