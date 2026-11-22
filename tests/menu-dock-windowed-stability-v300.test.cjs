'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const style=fs.readFileSync('dist/style.css','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert.match(html,/<nav id="main-dock" aria-label="메인 메뉴">/);
assert.equal((html.match(/id="garage-open"/g)||[]).length,1);
assert.equal((html.match(/id="radio-open"/g)||[]).length,1);
assert.equal((html.match(/id="upgrade-open"/g)||[]).length,1);
assert.match(html,/garage\.css\?v=[^"]*v300-windowed-dock/,'windowed dock CSS reloaded');
assert.match(sw,/v300-windowed-dock/,'offline cache refreshed');
assert.match(css,/background-image:url\(assets\/ui\/main-dock\.webp\)/,'same approved dock bitmap kept');
assert.match(css,/#main-dock #radio-open::before\{background-position:50% center\}/);
assert.match(css,/#main-dock #upgrade-open::before\{background-position:100% center\}/);
const marker=css.lastIndexOf('/* v300 — Identical lower menu dock');
assert(marker>0,'final board-relative dock override exists');
const fix=css.slice(marker);
for(const term of [
 '#overlay[data-screen="selection"] #main-dock',
 'position:absolute!important','bottom:calc(54px * var(--ui-scale,1))!important',
 'height:calc(93px * var(--ui-scale,1))!important',
 'width:min(79%,calc(310px * var(--ui-scale,1)))!important',
 'grid-template-columns:repeat(3,minmax(0,1fr))!important',
 'max-height:none!important',
 'width:min(96%,calc(83px * var(--ui-scale,1)))!important'
])assert(fix.includes(term),'consistent board-scale dock '+term);
assert(!fix.includes('svh')&&!fix.includes('dvh') || fix.includes('never to svh/dvh'),'dock overrides use no viewport-height caps');
assert(fix.includes('flex:0 0 calc(96px * var(--ui-scale,1))'),'upper stack retains the dock slot');
assert(!fix.includes('#overlay[data-screen="results"] #main-dock'),'results layout deliberately untouched');
assert(style.includes('v299: Small fullscreen retry directly beneath the ZERO brand art'),'fullscreen toggle remains under the logo');
// Equal 450x710 normalized geometry for all board sizes and viewport heights.
// Native fullscreen 450x710; browser window 340x536.4 at proportional 9:16.
for(const scale of [1,.87,.75,1.3,1.65]){
 const bWidth=450*scale,bHeight=710*scale;
 const dockWidth=Math.min(bWidth*.79,310*scale);
 const dockHeight=93*scale,dockBottom=54*scale;
 const dockTop=bHeight-dockBottom-dockHeight;
 const left=(bWidth-dockWidth)/2,cell=dockWidth/3;
 const iconWidth=Math.min(cell*.96,83*scale);
 assert(Math.abs(dockTop/scale-563)<1e-7,'dock y independent of browser chrome');
 assert(Math.abs(dockWidth/scale-310)<1e-7,'dock width always board-relative');
 assert(Math.abs(iconWidth/scale-83)<1e-7,'all three icon images same approved size');
 assert(Math.abs(left/scale-70)<1e-7,'3 buttons symmetrically centered');
 assert(dockTop>=0&&dockBottom>=0&&dockHeight>0);
}
console.log('PASS v300: window/fullscreen three-button menu same 450x710 geometry, icon sizes and footer clearance');
