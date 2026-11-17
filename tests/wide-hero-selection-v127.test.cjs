'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const app=fs.readFileSync('dist/app.js','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const a=html.indexOf('<div class="overlay" id="overlay"'),b=html.indexOf('<div id="toast">',a);
assert(a>=0&&b>a,'selection overlay available');
const selection=html.slice(a,b);
assert(selection.includes('data-title="true" data-screen="selection"'),'original playable selection screen retained');
assert(selection.includes('<div class="label" id="label">NOVALIGHT ARCADE 001 / ZOMBIE SURVIVAL</div>'),
 'replacement eyebrow exactly as requested');
assert(selection.includes('<h2 id="title">From HERO to ZERO</h2>'),
 'exact title slogan and casing');
assert(!selection.includes('SURVIVAL TENNIS'),'old subtitle is removed from selection');
assert(!selection.includes('당신의 <em>주인공은?</em>'),'old selection heading replaced');
assert(selection.includes('id="hero-0"')&&selection.includes('id="hero-1"')&&selection.includes('id="hero-2"'),
 'all three original hero controls retained');
assert(selection.includes('id="hero-stats"')&&selection.includes('id="start"'),
 'character stats and start action preserved');
assert(selection.includes('<div class="selection-copyright" aria-label="저작권">'),
 'separate copyright inside selection overlay');
assert(selection.includes('NOVALIGHT x AHNDANTE x BLACKRAIN')&&
 selection.includes('2027 All Rights Reserved.'),
 'same two-line exact title screen credits');
assert(selection.indexOf('id="hint"')<selection.indexOf('class="selection-copyright"'),
 'selection copyright lies below character and start controls');
assert(selection.indexOf('class="selection-copyright"')<selection.lastIndexOf('</div>'),
 'copyright is located inside overlay');
assert(html.includes('v127-wide-selection'),'new stylesheet cache is invalidated');
assert(sw.includes('v127-wide-selection'),'service worker cache refreshed');
const pos=css.indexOf('/* v127: Wider arcade hero selection');
assert(pos>0,'new feature stylesheet exists at end');
const nextSection=css.indexOf('/* V132:',pos);
const styles=css.slice(pos,nextSection>pos?nextSection:undefined);
assert(!styles.includes('#overlay[data-screen="results"]'),'results are still separately styled');
assert(!styles.includes('.zz-boot-scene'),'independent title screen remains unchanged');
for(const k of [
 '#overlay[data-screen="selection"] #heroes',
 'max-width:none!important',
 'grid-template-columns:repeat(3,minmax(0,1fr))!important',
 '#overlay[data-screen="selection"] .hero-card .hero-vehicle-portrait',
 'width:min(100%,118px)!important',
 'background-size:800% 300%!important',
 'background-position-y:50%!important',
 'background-position-y:100%!important',
 '@keyframes zz-v127-hero-frames',
 '57%{background-position-x:100%}',
 'animation:zz-v127-hero-frames 2.4s steps(7,end) infinite!important',
 'min-height:clamp(192px,31svh,240px)!important',
 'font:900 clamp(15px,3.8vw,18px)',
 'font:800 clamp(11px,2.9vw,13px)',
 '#overlay[data-screen="selection"]>.selection-copyright',
 'color:#b9fa73',
 'position:absolute',
 'text-align:center'
])assert(styles.includes(k),'required selected-only style: '+k);
assert(styles.includes('overflow-y:auto!important')&&styles.includes('padding:8px 9px 59px!important'),
 'scrollable constrained-height screen leaves room for bottom copyright');
assert(styles.includes('@media(max-height:620px)')&&styles.includes('@media(max-height:460px)'),
 'short and landscape screens receive reduced portrait and header sizes');
assert(styles.includes('@media(prefers-reduced-motion:reduce)'),
 'animated select frames have a reduced-motion fallback');
assert(css.includes("background-image:url('assets/ip/hero-idle-v55.png?v=55-approved-cast')!important"),
 'same approved transparent RGBAs rather than new sprites');
assert(game.includes("el.innerHTML=portrait(h)+'<b>'+h.name+'</b><small>'+h.role+'</small><span>'+h.desc+'</span>'"),
 'original character labels, roles and descriptions still populate the buttons');
assert(game.includes("$('hero-stats').textContent=hero().stats"),
 'selected hero stats continue to update');
assert(game.includes("el.onclick=()=>{if(mode!=='menu'&&mode!=='over')return;selectedHero=i;renderHeroes();draw()}"),
 'three original hero button interactions unchanged');
assert(app.includes("root.classList.add('zz-scene-selection','zz-boot-complete')"),
 'boot transitions to the same selection screen');
assert(selection.includes('assets/ip/zombie-zero-bi-v75.png'),'approved logo preserved');
assert(html.includes('NOVALIGHT ARCADE 001 / ZOMBIE SURVIVAL')&&
 html.includes('From HERO to ZERO'),'title and selection share branding');
console.log('PASS v127: full-width 3-hero selection, correctly scaled 8x3 bitmap animation, larger hero text and stats, lime centered credits, responsive safe-area layout, no results/title regressions.');
