'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('dist/index.html','utf8');
const base=fs.readFileSync('dist/style.css','utf8');
const palette=fs.readFileSync('dist/menu-zombie-palette-v211.css','utf8');
const score=fs.readFileSync('dist/endless-score-fix-v215.css','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('endless-score-fix-v215.css?v=216-pixel-score-font'),'new score CSS loaded');
assert(html.includes('menu-zombie-palette-v211.css?v=216-restore-result-heroes-hud'),'result CSS loaded');
assert(sw.includes('v216-original-score-results-cast'),'PWA cache invalidated');
assert(score.includes("font-family:'Press Start 2P','Courier New',monospace!important"),
 'original pixel font restored to score');
assert(score.includes('font-weight:400!important')&&score.includes('font-synthesis:none!important'),
 'the original pixel font weight is not bold simulated Arial');
assert(score.includes('overflow:visible!important')&&score.includes('text-overflow:clip!important'),
 'long scores never show an ellipsis');
assert(game.includes("6/Math.max(6,score.toString().length)"),'long pixel-font scores scale to available width');
assert(palette.includes('aspect-ratio:1 / 1!important')&&
 palette.includes('#overlay[data-screen="results"] .hero-card .hero-vehicle-portrait'),
 'result sprite backgrounds have explicit frame height');
assert(palette.includes('background-size:800% 300%!important'),
 'result sprites sample original 8-frame by 3-row atlas');
for(const [row,y] of [[0,'0%'],[1,'50%'],[2,'100%']]){
 assert(palette.includes('.hero-vehicle-portrait.row-'+row+'{')&&
  palette.includes('background-position-y:'+y+'!important'),
  'result hero '+row+' retains its original atlas row');
}
assert(base.includes("background-image:url('assets/ip/hero-idle-v55.png?v=55-approved-cast')!important"),
 'approved original character PNG remains unchanged');
assert(fs.existsSync('dist/assets/ip/hero-idle-v55.png'),'approved character sheet exists');
assert(html.includes('src="assets/ip/zombie-zero-bi-v75.png"'),'original game BI retained');
assert(palette.includes('.machine:has(#overlay[data-screen="results"]:not([hidden])) > .hud')&&
 palette.includes('visibility:hidden!important'),
 'results hide gameplay heart, score, wave, time, pause and settings HUD');
assert(game.includes("'data-screen',['GAME OVER','VICTORY'].includes(label)?'results':'pause'"),
 'result and pause screens remain functionally distinct');
console.log('PASS v216: original pixel score, all three approved result heroes, and gameplay HUD hidden only for results');
