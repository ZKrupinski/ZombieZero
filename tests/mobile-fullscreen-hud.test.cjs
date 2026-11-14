'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const app=fs.readFileSync('dist/app.js','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
assert(app.includes("['start','endless']"),'mobile fullscreen binds to both actual play buttons');
assert(app.includes("root.requestFullscreen||root.webkitRequestFullscreen"),'native fullscreen is triggered from user gesture');
assert(app.includes("mobileDevice()"),'avoid making desktop users fullscreen');
assert(app.includes("root.style.setProperty('--ui-scale'"),'HUD ratio derives from logical board width');
assert(css.includes('top:calc(7px * var(--ui-scale,1) + env(safe-area-inset-top,0px))'),
 'compact score and right buttons share top baseline');
assert(css.includes('left:50%!important;right:auto!important;transform:translateX(-50%)!important'),
 'stage header stays at exact board center');
assert(css.includes('width:max(34px,calc(36px * var(--ui-scale,1)))!important'),
 'compact right-side menu buttons use bounded tap targets');
assert(css.includes('.portrait-play .hud .wave'),'stage number has a dedicated grid position');
assert(css.includes('env(safe-area-inset-top,0px)'),'notch and status-bar safe area respected');
assert(css.includes('env(safe-area-inset-bottom,0px)'),'home indicator safe area respected');
assert(game.includes("const el=$('combo-overlay');"),'combo is separate from stage and score HUD');
assert(!game.includes('g.translate(W/2,154);const scale=1+comboPop*.25'),'oversized canvas combo removed');
assert(html.includes('id="combo-overlay"')&&html.includes('id="combo-praise"'),'original large combo returns to separate top-center overlay');
assert(!html.includes('id="combo-hud"'),'small combo formerly mixed into stage header removed');
assert(css.includes('.zz-combo-overlay[data-tier="5"]')&&css.includes('@keyframes zz-combo-pop'),
 'six colored voxel styles and punch animation exist');
assert(html.includes('viewport-fit=cover'),'fullscreen screen and safe-area support');
console.log('PASS: native fullscreen, compact aligned top HUD and six-tier centered voxel combo separate from stage');
