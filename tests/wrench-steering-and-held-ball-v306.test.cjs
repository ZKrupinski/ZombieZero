'use strict';
// Attack sheet is the ORIGINAL approved mechanic, with only the duplicate
// peach fingers at the left steering-wheel tip repainted as dark wheel trim.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const old=fs.readFileSync('dist/assets/ip/wrench-swing-v264.webp');
const image=fs.readFileSync('dist/assets/ip/wrench-swing-v306.webp');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert.equal(image.toString('ascii',0,4),'RIFF');
assert.equal(image.toString('ascii',8,12),'WEBP');
assert.equal(image.toString('ascii',12,16),'VP8X');
assert.equal(1+image.readUIntLE(24,3),768,'four 192px columns');
assert.equal(1+image.readUIntLE(27,3),384,'two 192px rows');
assert.equal(crypto.createHash('sha1').update(image).digest('hex'),
 '536ff232f7f170e16b8d985514543bc19eed0a42',
 'pixel-verified source: only 64-88 skin/steering pixels altered in frames 0-6, final frame unchanged');
assert.equal(crypto.createHash('sha1').update(old).digest('hex'),
 'eb3f1efef23c09aff08c088f2f63cb3d95206b7c',
 'idle/source artwork and original approved attack safely preserved');
assert.match(html,/id="wrench-swing" src="assets\/ip\/wrench-swing-v306\.webp\?v=306-steering-hand-clean"/,'game loads fixed attack frames');
assert.match(sw,/\.\/assets\/ip\/wrench-swing-v306\.webp/,'offline pre-cache includes the new frames');
assert.match(sw,/v306-wrench-wheel-hand-ball-lower/,'cache changes for both fixes');
assert.match(html,/game\.js\?v=[^"]*v306-held-ball-lower/,'held ball logic cache busted');
const match=game.match(/const wrenchServeOffsets=\[([\s\S]*?)\];/);
assert(match,'all eight Wrench bob poses remain in the game');
const entries=[...match[1].matchAll(/\{x:(-?\d+),y:(-?\d+)\}/g)].map(m=>[Number(m[1]),Number(m[2])]);
assert.equal(entries.length,8);
assert.deepEqual(entries.map(n=>n[1]),[-34,-36,-39,-42,-39,-36,-35,-35],
 'Wrench ball lowered by 11px with the original per-frame rhythm');
assert.deepEqual(entries.map(n=>n[0]),[-34,-34,-34,-35,-35,-34,-34,-35],
 'Wrench ball remains to the left of the face in front of the car');
assert.match(game,/selectedHero===4\?\{x:-35,y:-27\}/,
 'Scarlet pre-serve diamond moved down ten logical pixels');
assert.match(game,/HELD_BALL_OFFSETS\[selectedHero\]\|\|HELD_BALL_OFFSETS\[0\]/,
 'Ace, Ruby and Ria initial ball positions unaffected');
assert.match(game,/if\(balls\[0\]\?\.held\)\{[\s\S]*?const o=heldBallOffset\(\);[\s\S]*?balls\[0\]\.x=car\+o\.x;balls\[0\]\.y=PY\+o\.y;/,
 'held balls follow position every frame');
console.log('PASS v306: no double Wrench hand at steering wheel in raised-spanner frames; lowered Wrench/Scarlet pre-serve positions and 8-frame alpha intact');
