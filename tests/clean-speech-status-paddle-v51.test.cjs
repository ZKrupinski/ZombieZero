'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const between=(from,to)=>{
 const a=source.indexOf(from),b=source.indexOf(to,a+from.length);
 assert(a>=0&&b>a,'missing source section '+from);return source.slice(a,b);
};
const draw=between('function draw(){','function frame(t)');
const player=between('function player(){','// Cosmetic poses only');
const bubble=between('function drawBubbles(){','function updateCrowd');
const toast=between('function toast(t){','// A separate density meter');
const beginClear=between('function beginClear(){','function advanceStage');
assert(draw.includes('drawActiveItemIcons();drawBubbles();'),
 'speech bubbles draw after equipped icons and remain above their bloom-free layer');
assert(draw.indexOf('fxRenderer.composite(g);')<draw.indexOf('drawActiveItemIcons();'),
 'equipped badges still draw after shield and Bloom');
assert.equal(draw.split('drawBubbles();').length-1,1,'speech balloons are only drawn once');
assert(player.includes('g.drawImage(sprite.image,')&&player.includes('heroSprite(x,600,1,win)'),
 'bitmap and original fallback hero artwork remain');
assert(!player.includes('g.moveTo(car-hero().paddle,')&&
 !player.includes('g.moveTo(x-h.paddle,'),
 'both old long visual racket-range guide lines are removed');
assert(source.includes('Math.abs(b.x-car)<hero().paddle+radius/2'),
 'real racket collision width remains unchanged');
assert(bubble.includes('g.fillText(q.text,')&&source.includes('function citizenCue(p,back,text=null)'),
 'citizen speech is preserved');
assert(toast.includes("el.textContent=''")&&toast.includes('el.style.opacity=0'),
 'temporary situational toast no longer writes visible strings');
assert(!beginClear.includes('CITIZENS SAVED!'),
 'previously recurring citizens-saved footer message removed');
assert(css.includes('#status,#toast{display:none!important'),
 'bottom status and toast surfaces hidden even during transient updates');
assert(html.includes('<span id="status" hidden aria-hidden="true"></span>'),
 'empty status node retained invisibly for compatibility');
assert(html.includes('game.js?v=73-obvious-elastic-ball')&&
 sw.includes('zombie-zero-shell-v74-clean-trash-can-frames'),
 'new cache versions let mobile PWA show the actual cleanup');
console.log('PASS: citizen dialogue above badges, no gameplay status text or racket guide, physics unchanged.');
