'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const app=fs.readFileSync('dist/app.js','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
function between(s,start,end){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert(a>=0&&b>a,'section missing '+start);return s.slice(a,b)}
const title=between(html,'<section id="boot-scene"','<div class="desktop-note">');
assert(title.includes('id="boot-screen"'),'v80 independent title preserved');
assert(title.includes('boot-logo-image zz-brand-image'),'approved artwork still used');
assert(title.includes('id="boot-start" class="boot-start" type="button" aria-label="START GAME"'),
 'the same real start button is preserved for touch and Enter/Space');
assert(title.includes('<span class="boot-arcade-line boot-arcade-start" aria-hidden="true">START GAME</span>'),
 'exact arcade start copy under logo');
assert(title.includes('<span class="boot-arcade-line boot-arcade-coin" aria-hidden="true">INSERT COIN</span>'),
 'exact alternate coin copy');
assert(title.indexOf('boot-logo-image')<title.indexOf('boot-arcade-start'),'arcade text appears after logo');
assert(!title.includes('INSERT COIN · TOUCH TO START'),'old duplicate coin text removed');
assert(title.includes('NOVALIGHT x AHNDANTE x BLACKRAIN'),'copyright signature exactly matches');
assert(title.includes('2027 All Rights Reserved.'),'copyright second line matches');
assert(html.includes('style.css?v=90-reduced-title-logo-v125-arcade-title'),
 'fresh stylesheet URL avoids a stale mobile title');
assert(html.includes('family=Press+Start+2P'),'pixel arcade webfont requested');
const v125=css.slice(css.indexOf('/* v125: independent arcade title scene'),css.indexOf('/* v126: Restore authored title hierarchy'));
assert(v125.length>1000,'title override present at the end of stylesheet');
for(const c of ['#693339','#84452f','#050506'])
 assert(v125.includes(c),'desaturated red/orange/black vertical gradient contains '+c);
assert(v125.includes('.zz-boot-scene>.boot-screen'),'gradient targets independent title only');
assert(!v125.includes('.overlay[data-screen="selection"]'),'hero picker colors not overridden');
assert(v125.includes('@keyframes zz-title-start-pulse')&&v125.includes('@keyframes zz-title-coin-pulse'),
 'the labels alternate with stepped arcade blinking');
assert(v125.includes('2.1s steps(1,end) infinite'),'pixel-style hard transitions rather than soft crossfade');
assert(v125.includes('.boot-copyright')&&v125.includes('text-align:center')&&v125.includes('color:#ff5352'),
 'bright red two-line credit centered at the bottom');
assert(v125.includes('env(safe-area-inset-bottom,0px)'),
 'copyright clears the mobile safe-area footer');
assert(v125.includes('@media(max-height:460px)'),'short landscape titles receive responsive spacing');
assert(v125.includes('@media(prefers-reduced-motion:reduce)'),
 'accessible reduced-motion fallback prevents forced blinking');
assert(v125.includes('.boot-arcade-start{opacity:1!important}')&&v125.includes('.boot-arcade-coin{opacity:0!important}'),
 'reduced motion leaves START GAME visible');
assert(app.includes("bootStart.addEventListener('click',async()=>"),'native boot click retained');
assert(app.includes("enterMobileFullscreen(true); // Must happen before the first await."),
 'mobile fullscreen gesture remains synchronous');
assert(app.includes("bootStart.textContent='LOADING...'"),'existing asset decode/loading sequence retained');
assert(sw.includes('-v125-arcade-title'),'PWA cache version invalidates stale CSS');
console.log('PASS v125: standalone title gradient, two-line exact copyright, alternating 8-bit text, responsive safe areas, intact native boot loading.');
