'use strict';
// Wrench steel ball was visually undersized despite its existing custom art.
// Verify on-screen diameter independently of the shared gameplay collider.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const scale=+(game.match(/if\(selectedHero===3\)g\.scale\((\d+\.\d+),\1\)/)||[])[1];
assert(Number.isFinite(scale),'Wrench must have a fixed bitmap correction scale');
const aceSize=+(game.match(/const size=r\*(3\.\d+);\s*(?:if\(!drawSkillTintedFrame\([^\n]+?\)\))?g\.drawImage\(img,0,0,frameW,frameH,-size\/2,-size\/2,size,size\)/)||[])[1];
assert(Number.isFinite(aceSize),'read actual Ace tennis bitmap draw diameter');
const wrenchDiameter=scale*2;
assert(wrenchDiameter>aceSize*1.05,'steel ball should now be noticeably larger than Ace');
assert(wrenchDiameter<aceSize*1.15,'steel ball should only be slightly larger than Ace');
assert.equal(scale,1.85);
assert.equal(aceSize,3.40);
assert(game.includes("if(selectedHero===3 && $('wrench-ball-art')?.naturalWidth)")&&game.includes("g.drawImage($('wrench-ball-art'),-r,-r,r*2,r*2)"),
 'same Wrench bitmap keeps its visual design and frame-free rotation');
assert(html.includes('id="wrench-ball-art" src="assets/ip/wrench-steel-ball-v265.webp"'),
 'reuse the approved steel sphere source art');
assert(game.includes("const radius=((has('power')?12:8)*(typeof miniBallScale==='function'?miniBallScale():1))"),
 'global ball collision radius must not be enlarged only for Wrench');
assert(game.includes("if(selectedHero===1)g.scale(1.08,1.08)"),
 'Ruby original ball rendering remains unchanged');
assert(game.includes('const size=r*3.25;')&&game.includes("if(selectedHero===4)"),
 'Scarlett gemstone is unaffected');
assert(game.includes('function drawHeroBallSprite(b,r,col){')&&
 game.includes('if(b.held)return {index,sx,sy,rotation,spin};'),
 'single renderer corrects held and flying visual ball sizes');
assert(html.includes('-v335-wrench-ball-visual-scale'), 'runtime JS cache is refreshed');
assert(sw.includes('v335-wrench-ball-visual-scale'),'PWA cache invalidated for mobile users');
console.log('PASS v335: Wrench steel ball visible diameter 3.70r is 8.8% bigger than Ace 3.40r; gameplay radius and other character ball sprites unchanged.');
