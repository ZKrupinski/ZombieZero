'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const game=fs.readFileSync('dist/game.js','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(game.includes('function heroMiniStats(h)'), 'hero stat meter renderer exists');
assert(game.includes('window.ZZGarage?.heroStatMarkup?.(h,'),'both menus use shared real upgrade data');
const garage=fs.readFileSync('dist/garage.js','utf8');
for(const phrase of ['name:\'속도\'','name:\'첫타\'','name:\'체력\'','name:\'수비\'','gear(\'steer\')','gear(\'heavy\')','gear(\'wide\')','sweetSpot']){
 assert(garage.includes(phrase),'true game stat and equipment formula: '+phrase);
}
assert(game.includes("if(mode==='menu'||mode==='over')el.innerHTML+=heroMiniStats(h)"),'compact meters on both selection and game-over retry screens');
assert(game.includes("el.innerHTML=portrait(h)+'<b>'+h.name+'</b><small>'+h.role+'</small><span>'+h.desc+'</span>'"),
 'original art, hero names and result text retained');
assert(css.includes('v241 — full-height character spotlight on main selection ONLY'),'selection-specific styling');
assert(css.includes('flex:1 1 auto!important'),'character reel consumes remaining vertical space');
assert(css.includes('width:min(calc(100% - 6px),calc(100cqh - 108px)'),'portrait scales to actual card height');
assert(css.includes('container-type:size'),'card viewport provides portrait-height units');
assert(css.includes('#overlay[data-screen="selection"] #hero-stats{display:none!important}'),
 'redundant prose strip removed from selection');
assert(css.includes('#hero-3 .hero-vehicle-portrait'),'one-frame mechanic uses contain');
assert(css.includes('background-size:contain!important'),'recruited mechanic sprite not stretched into atlas');
assert(/garage\.css\?v=(9-main-hero-spotlight|10-clean-tint|11-v243-compact-dock-stats|12-v244-five-portrait-dock|13-v245-clear-top-centered-icons|14-v248-complete-hero-cards|15-v254-gameover-reel)/.test(html),'browser loads main-hero CSS');
assert(html.includes('-v241-main-hero-meters'),'browser loads new stat renderer');
assert(/v24[1-5]-(main-hero-spotlight|poison-tint|layout-stats-dock|five-portrait-no-dock-box|clear-top-centered-icons)/.test(sw),'new PWA cache key retained');
console.log('PASS v241: max-height character carousel, four truthful stat gauges, approved sprite art, results and garage isolation');
