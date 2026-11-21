'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('dist/style.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const before=css.indexOf('.portrait-play .machine>.hud,.landscape-game .machine>.hud');
assert(before>=0,'shared gameplay HUD renderer exists');
const hud=css.slice(before,before+900);
assert(hud.includes('background:linear-gradient(180deg,#06121bdc'),'gameplay HUD retains its existing shading');
const fix=css.slice(css.lastIndexOf('/* v249 —'));
assert(fix.startsWith('/* v249 — remove the PLAY HUD'),'v249 title fix is last');
assert(fix.includes('.machine:has(#overlay[data-screen="selection"]:not([hidden])) > .hud{'),
 'matches only title selection and its visible overlay');
assert(fix.includes('background:none!important')&&fix.includes('background-image:none!important'),
 'prevent all HUD dark overlays from obscuring top title text');
assert(fix.includes('box-shadow:none!important'),'remove any header shadow in selection');
assert(!fix.includes('display:none'),'do not hide HUD and top-right settings menu');
assert(!fix.includes('pointer-events:none'),'preserve settings touch actions');
assert(!fix.includes('data-screen="pause"')&&!fix.includes('data-screen="results"'),
 'pause and game-over HUD unchanged');
assert(/style\.css\?v=[^"]*v249-transparent-title-hud/.test(html),
 'browser refreshes corrected CSS');
assert(sw.includes('v249-transparent-title-hud'),'PWA cache refresh for users who installed game');
console.log('PASS v249: remove black gameplay HUD gradient above title words while preserving settings and play HUD.');
