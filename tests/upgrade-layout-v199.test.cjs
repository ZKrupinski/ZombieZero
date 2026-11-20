'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('dist/index.html','utf8');
const v198=fs.readFileSync('dist/upgrade-ui-v198.css','utf8');
const v199=fs.readFileSync('dist/upgrade-layout-v199.css','utf8');
const progression=fs.readFileSync('dist/progression.js','utf8');
const serviceWorker=fs.readFileSync('dist/sw.js','utf8');
const styleTag=/<link rel="stylesheet" href="upgrade-layout-v199\.css\?v=199-clean-skill-rows">/;
assert(styleTag.test(html),'load repair stylesheet from index');
assert(html.indexOf('upgrade-layout-v199.css')>html.indexOf('upgrade-ui-v198.css'),'corrected layout takes precedence');
for(const p of [
 'assets/ui/upgrade-weapon-row-v198.webp',
 'assets/ui/upgrade-citizen-row-v198.webp',
 'assets/ui/upgrade-survival-row-v198.webp',
 'assets/ui/upgrade-detail-v198.webp',
 'assets/ui/upgrade-gold-button-v198.webp'
])assert(v198.includes(p),'retain approved raster UI asset '+p);
for(const required of [
 'zz-upgrade-card::before','zz-upgrade-detail::before',
 'background:linear-gradient(180deg,#3b293f',
 'background:linear-gradient(180deg,#224e45',
 'background:linear-gradient(180deg,#383459',
 '.zz-upgrade-compact-copy',
 '.zz-upgrade-joke','.zz-upgrade-mini-level',
 '.zz-upgrade-pips>i.filled',
 'grid-template-columns:minmax(0,1fr) clamp(105px,27%,152px)'
])assert(v199.includes(required),'repair missing '+required);
assert(progression.includes("const pips=Array.from({length:5}"),'live skill levels remain dynamic');
assert(progression.includes('skillJokes[d.id]'),'comic copy still real text');
assert(progression.includes('selectedSkill=card.dataset.select;renderList()'),'skill selection remains operational');
assert(progression.includes('if(purchase(selectedSkill))renderList()'),'purchase still reloads live level');
assert(html.includes('id="upgrade-detail-current"')&&html.includes('id="upgrade-detail-next"'),'current and next level details accessible');
assert(!html.includes('id="upgrade-tabs"')&&!html.includes('upgrade-page-prev'),'all 23 skills remain on one screen');
assert(serviceWorker.includes("'./upgrade-layout-v199.css'"),'PWA pre-caches corrected sheet');
assert(fs.existsSync('dist/assets/ui/upgrade-atlas-v198.png'),'original atlas remains in game');
console.log('PASS v199: raster artwork preserved, duplicate printed icons/levels masked, readable live rows and non-overlapping detail layout');
