'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const asset='scarlet-attack-v280.webp',buffer=fs.readFileSync('dist/assets/ip/'+asset);
assert.equal(buffer.toString('ascii',0,4),'RIFF');
assert.equal(buffer.toString('ascii',8,12),'WEBP');
assert.equal(buffer.toString('ascii',12,16),'VP8L','approved 8-frame attack uses lossless RGBA');
const packed=buffer.readUInt32LE(21);
assert.equal((packed&0x3fff)+1,768,'4×192px frame columns');
assert.equal(((packed>>>14)&0x3fff)+1,384,'2×192px frame rows');
assert((packed>>>28)&1,'native transparent pixels inside handbag handle');
assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'),
 'f8a71c6287a490132d2247426120fffb59400c591a3e459cbc446b2e5c3ae272',
 'attack frames use the exact approved, cleaned v280 sprite');
assert(!game.includes('cleanScarletAttackHandle('),'obsolete runtime alpha patch removed');
assert(!game.includes('scarletHandleCavities'),'obsolete frame polygons removed');
assert(game.includes('const renderSheet=sheet;'),'game draws original approved pixels, with no postprocess');
assert(game.includes('drawHeroBitmap(renderSheet,'),'original bitmap drawn in gameplay');
assert(html.includes('id="scarlet-attack" src="assets/ip/'+asset+'"'),'new v280 attack atlas loaded');
assert(sw.includes("'./assets/ip/"+asset+"'"),'new v280 attack atlas cached offline');
assert(html.includes('v280-approved-full-swing-pixels')&&sw.includes('v280-approved-full-swing-pixels'),
 'v280 asset and game renderer invalidate stale browser caches');
console.log('PASS v280: native lossless 8-frame handbag attack, transparent handle, no runtime matte cutout');
