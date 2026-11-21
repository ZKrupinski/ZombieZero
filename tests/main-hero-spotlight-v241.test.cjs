'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const game=fs.readFileSync('dist/game.js','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(game.includes('function heroMiniStats(h)'), 'hero stat meter renderer exists');
for(const phrase of ['속도','공격','체력','수비','h.speed,660','h.damage,2','h.lives,3','h.paddle,68']){
 assert(game.includes(phrase),'real gameplay hero stat connected: '+phrase);
}
assert(game.includes("if(mode==='menu')el.innerHTML+=heroMiniStats(h)"),'compact meters only on selection');
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
assert(html.includes('garage.css?v=9-main-hero-spotlight'),'browser loads new CSS');
assert(html.includes('-v241-main-hero-meters'),'browser loads new stat renderer');
assert(sw.includes('v241-main-hero-spotlight'),'new PWA cache key');
console.log('PASS v241: max-height character carousel, four truthful stat gauges, approved sprite art, results and garage isolation');
