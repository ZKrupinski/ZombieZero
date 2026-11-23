'use strict';
// Three approved raster badges, preserving menu behavior and garage dock.
const assert=require('node:assert/strict'),fs=require('node:fs');
const root='dist/';
const png=fs.readFileSync(root+'assets/ui/mode-icons-v330.avif');
const css=fs.readFileSync(root+'mode-icons-v330.css','utf8');
const selection=fs.readFileSync(root+'selection-layout-v332.css','utf8');
const html=fs.readFileSync(root+'index.html','utf8');
const sw=fs.readFileSync(root+'sw.js','utf8');
const game=fs.readFileSync(root+'game.js','utf8');
assert(png.length>7000&&png.length<100000,'optimized, actual raster badge art');
assert.equal(png.toString('ascii',4,8),'ftyp');
assert.equal(png.toString('ascii',8,12),'avif');
const ispe=png.indexOf(Buffer.from('ispe'));
assert(ispe>=0,'AVIF coded dimensions present');
assert.equal(png.readUInt32BE(ispe+8),384,'three 128px square badges across');
assert.equal(png.readUInt32BE(ispe+12),128,'square icon rows');
assert(png.indexOf(Buffer.from('auxC'))>0,'transparent alpha aux image included');
assert(css.includes('background-image:url("assets/ui/mode-icons-v330.avif")'),
 'all three buttons reuse the approved bitmap atlas');
for(const [id,position] of [['endless','0%'],['mini-horde','50%'],['fortress-horde','100%']]){
 assert(html.includes('id="'+id+'"'),'original game-mode button remains: '+id);
 assert(css.includes(']>'+ '#'+id+'{'),'badge has scoped selection style: '+id);
 assert(css.includes('background-position:'+position+' 50%'),'mode badge has correct art: '+id);
}
assert(html.includes('<nav id="main-dock"'),'original Garage/Radio/Upgrade dock retained');
for(const id of ['garage-open','radio-open','upgrade-open'])assert(html.includes('id="'+id+'"'));
assert(selection.includes('grid-template-rows:'),'six-row layout now owns the actual 9:16 board');
assert(selection.includes('grid-row:5!important'),'three modes are native fifth-row grid items');
assert(selection.includes('grid-row:6!important'),'garage/radio/upgrade dock follows extra modes');
assert(selection.includes('position:relative!important;inset:auto!important'),
 'floating mode buttons are overridden by in-flow placement');
assert(selection.includes('overflow-x:hidden!important;overflow-y:hidden!important'),
 'every action must fit without scrolling');
assert(!selection.includes('margin-bottom:calc(106px'),
 'START button does not artificially expand the menu');
assert(html.includes('mode-icons-v330.css?v=330-approved-game-mode-badges'));
assert(html.includes('selection-layout-v332.css?v='),'responsive mode layout stays cache-versioned');
assert(html.indexOf('fortress-mode.css')<html.indexOf('mode-icons-v330.css'),
 'mode artwork overrides former plain text button styles');
assert(game.includes("const mini=$('mini-horde')")&&game.includes("start('mini')"));
assert(game.includes("const barricade=$('fortress-horde')")&&game.includes("start('fortress')"));
assert(game.includes("start('endless')"),'endless gameplay route remains intact');
assert.equal(sw.split("'./assets/ui/mode-icons-v330.avif'").length-1,2,
 'PWA precaches approved art in its two shell resource lists');
assert.equal(sw.split("'./mode-icons-v330.css'").length-1,2);
assert.equal(sw.split("'./selection-layout-v332.css'").length-1,2);
assert(sw.includes('v330-approved-mode-icons'),'service worker cache invalidated');
console.log('PASS v330/v332: approved mode art, native in-flow 9:16 menu, accessible routing and PWA caches.');
