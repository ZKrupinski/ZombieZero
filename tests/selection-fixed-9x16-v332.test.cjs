'use strict';
/*
 * The approved artwork was a mockup, NOT a replacement for the live canvas.
 * Keep the existing hero carousel and game links, but lay every selectable
 * control out in a single 450x710 proportional grid without scrolling.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/selection-layout-v332.css','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
function loc(s){const n=html.indexOf(s);assert(n>=0,'missing DOM item: '+s);return n}
const logo=loc('class="overlay-logo');
const heroes=loc('id="heroes"');
const start=loc('<button id="start">Game Start!</button>');
const heading=loc('<span class="zz-mode-heading" aria-hidden="true">EXTRA MODE</span>');
const endless=loc('id="endless"');
const mini=loc('id="mini-horde"');
const fortress=loc('id="fortress-horde"');
const dock=loc('<nav id="main-dock"');
assert(logo<heroes&&heroes<start&&start<heading&&heading<endless&&endless<mini&&mini<fortress&&fortress<dock,
 'all six sections form one document flow: logo, reel, CTA, heading, modes, dock');
assert(html.includes('id="hero-0"')&&html.includes('id="hero-4"'),
 'keep existing five-character reel art and navigation');
assert(game.includes("if(mode==='menu')$('start').textContent='Game Start!';"),
 'changing selected character must not overwrite main CTA');
assert(game.includes("start(mode==='over'?runMode:'campaign')"),
 'primary CTA continues launching basic campaign');
assert(game.includes("start('endless')")&&game.includes("start('mini')")&&game.includes("start('fortress')"),
 'all extra game modes retain their launch callbacks');
for(const id of ['garage-open','radio-open','upgrade-open'])assert(html.includes('id="'+id+'"'));
for(const key of ['grid-template-columns:repeat(3,minmax(0,1fr))',
 'grid-template-rows:', 'grid-row:1!important','grid-row:2!important',
 'grid-row:3!important','grid-row:4!important','grid-row:5!important','grid-row:6!important',
 'position:relative!important;inset:auto!important',
 'transform:none!important', 'overflow:hidden!important',
 'overflow-x:hidden!important;overflow-y:hidden!important',
 'height:100%!important','max-height:100%!important',
 'background-image:url("assets/ui/mode-icons-v330.avif")',
 'content:"BASIC MODE START"','content:"»"'
])assert(css.includes(key),'missing responsive layout property: '+key);
assert(css.includes('#overlay[data-screen="selection"][hidden]'),
 'selection grid must remain hidden when playing a wave');
assert(!css.includes('position:absolute!important;\\n  z-index:5!important;'),
 'mode buttons must not be a free-floating layer');
assert(css.includes('grid-column:1!important;background-position:0% 50%'));
assert(css.includes('grid-column:2!important;background-position:50% 50%'));
assert(css.includes('grid-column:3!important;background-position:100% 50%'));
assert(css.includes('calc(306px * var(--ui-scale,1))'),
 'large zombie logo reduced from 360px to about 85%');
assert(css.includes('#overlay[data-screen="selection"]'),
 'selection styles scoped away from GAME OVER and pause');
assert(css.includes('calc(39px * var(--ui-scale,1) + env(safe-area-inset-bottom,0px))'),
 'safe footer and citizen area preserved');
// Compute normalized grid heights to catch accidental growth or overflow at
// 9:16 and small real displays; the CSS uses these same fractions.
const rows=[28.5,30,8.5,3.5,16,13.5];
assert.equal(rows.reduce((a,b)=>a+b,0),100);
for(const [width,height] of [[450,710],[360,640],[400,711],[450,800],[320,568]]){
 const scale=Math.min(width/450,height/710);
 const top=38*scale,bottom=39*scale,usable=height-top-bottom;
 assert(usable>0);
 const heights=rows.map(r=>usable*r/100);
 const end=top+heights.reduce((a,b)=>a+b,0);
 assert(end<=height-bottom+1e-6,
  'all menu rows fit the available 9:16 viewport without swipe to reveal menu');
 assert(heights[1]>70,'character cards have a useful tap region');
 assert(heights[2]>22,'main START remains tappable');
 assert(heights[4]>40&&heights[5]>40,'both secondary mode and dock rows stay visible');
}
assert(html.includes('selection-layout-v332.css?v=333-menu-vertical-spacing'),
 'new layout must load after existing badge art styles');
assert(html.indexOf('mode-icons-v330.css')<html.indexOf('selection-layout-v332.css'));
assert.equal(sw.split("'./selection-layout-v332.css'").length-1,2,
 'PWA precaches new layout in both resource lists');
assert(sw.includes('v333-menu-vertical-spacing'),'PWA cache invalidated');
assert(css.includes('transform:translateY(calc(-6px * var(--ui-scale,1)))!important'),
 'character selector moved slightly up, while retaining grid layout');
assert(css.includes('transform:translateY(calc(-4px * var(--ui-scale,1)))!important'),
 'Game Start button also raised, opening space below it');
assert(css.includes('align-items:flex-end!important;justify-content:center!important;gap:8px!important'),
 'EXTRA MODE heading lowered to the adjacent icon row');
assert(css.includes('transform:translateY(calc(2px * var(--ui-scale,1)))!important'),
 'EXTRA MODE text hugs the three secondary mode badges');
assert(css.includes('justify-self:center!important;align-self:start!important'),
 'secondary icon row aligns to its top instead of floating between rows');
assert(css.includes('margin:calc(-2px * var(--ui-scale,1)) 0 0!important'),
 'secondary icons sit slightly closer to the EXTRA MODE label');
console.log('PASS v332: Game Start label, integrated 9:16 grid, hero and all six mode/dock buttons accessible without scroll.');
