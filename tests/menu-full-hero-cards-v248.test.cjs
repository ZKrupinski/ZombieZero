'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ui=fs.readFileSync('dist/garage-ui.js','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
// Read the function shipped to the browser, not a test-only duplicate.
const begin=ui.indexOf('function heroReelCardMarkup(hero,source){');
const end=ui.indexOf('  function syncFiveReel(){',begin);
assert(begin>=0&&end>begin,'five-slot renderer builds real full-card markup');
const ctx={HEROES:[
 {name:'에이스',role:'안정형'},
 {name:'루비',role:'기동형'},
 {name:'리아',role:'공격형'},
 {name:'정비사',role:'벽 반사형'}
]};
vm.createContext(ctx);vm.runInContext(ui.slice(begin,end),ctx);
const mockSource=(id,upgraded)=>({
 innerHTML:'<span class="hero-portrait hero-vehicle-portrait row-'+id+'"></span>',
 querySelector(selector){
  if(selector==='.hero-vehicle-portrait')return {
   outerHTML:'<span class="hero-portrait hero-vehicle-portrait row-'+id+'"></span>'
  };
  if(selector==='.hero-mini-stats')return {
   outerHTML:'<div class="hero-mini-stats"><div class="hero-mini-stat">'+
    '속도 <i class="hero-stat-cell base"></i>'+
    (upgraded?'<i class="hero-stat-cell boost"></i>':'')+'</div></div>'
  };
  return null;
 }
});
const shapes=[];
for(let id=0;id<4;id++){
 const markup=vm.runInContext('heroReelCardMarkup('+id+',src)',Object.assign(ctx,{src:mockSource(id,id===2)}));
 shapes.push(markup);
 assert(markup.includes('<div class="hero-reel-artwork">'),'portrait and title share one art layer '+id);
 assert(markup.includes('hero-vehicle-portrait row-'+id),'approved bitmap row used without filtering '+id);
 assert(markup.includes('<div class="hero-reel-id"><b>'+ctx.HEROES[id].name+'</b>'),
  'character name overlaid inside the art, right aligned '+id);
 assert(markup.includes('<small>'+ctx.HEROES[id].role+'</small>'),'role stays with overlaid name '+id);
 assert(markup.includes('</div><div class="hero-reel-bottom"><div class="hero-mini-stats">'),
  'all slots keep their full stats panel, not just selected slot '+id);
}
assert(shapes[2].includes('hero-stat-cell boost'),'gear upgrades remain visible on side cards');
const body=css.slice(css.indexOf('/* v248 — five *complete* portrait cards'),css.indexOf('/* v254 — GAME OVER:'));
assert(css.includes('/* v254 — GAME OVER:'),'result screen reuses complete-card carousel');
assert(body.startsWith('/* v248'),'late CSS is active');
assert(body.includes('> .hero-card.hero-reel-proxy .hero-reel-artwork>.hero-vehicle-portrait'),
 'responsive art stays fully within portrait window');
assert(body.includes('top:1px!important'),'no negative top placement or clipped hair in fullscreen');
assert(body.includes('calc(100cqh - 59px)'),'art is scaled to available card height, including stats');
assert(body.includes('width:min(calc(100% - 2px),calc(100cqh - 59px))!important'),
 'portrait is enlarged but bounded on both axes');
assert(body.includes('right:2px!important')&&body.includes('bottom:2px!important'),
 'name overlays lower right corner of car art');
assert(body.includes('z-index:3!important')&&body.includes('z-index:4!important'),
 'name sits above sprite; unified lower stats panel has its own foreground layer');
assert(body.includes(':not([data-reel-focus="true"]) .hero-reel-bottom>.hero-mini-stats'),
 'both left/right side cards retain their stats despite legacy hide rules');
assert(body.includes('display:flex!important'),'side card stats force visible');
assert(body.includes('[data-reel-hero="3"]')&&body.includes('wrench-mid-v261.webp'),
 'special one-frame mechanic art never uses mistaken 8x3 sprite source');
assert(body.includes('#overlay[data-screen="selection"]')&&!body.includes('#overlay[data-screen="results"]'),
 'garage and death/result screens are untouched');
assert(html.includes('garage.css?v=15-v254-gameover-reel')&&
 /garage-ui\.js\?v=(13-v254-gameover-reel|14-v310-scroll-stability)/.test(html),'mobile receives updated UI and styles');
assert(sw.includes('v248-complete-hero-cards'),'PWA cache refreshed');
console.log('PASS v248: fullscreen-safe large intact car art, lower-right overlaid name and stats box on ALL 5 cards, real upgraded stats and mechanic sprite.');
