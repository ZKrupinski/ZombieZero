'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {decodePNG,GOOD}=require('../tools/rebuild-throwables-atlas-v237.cjs');
const first=decodePNG('dist/assets/ip/v2/throwables-36-v237.png',1536);
const fixed=decodePNG('dist/assets/ip/v2/throwables-36-v238.png',1536);
const info=JSON.parse(fs.readFileSync('dist/assets/ip/v2/throwables-36-v238-report.json','utf8'));
assert(info.results.length===36);
assert(info.totalRemoved>300,'real adjacent-frame fragments have been deleted');
const restored=[7,8,10,12,13,15,17,19,20,23,24,27,28,29,30];
for(const n of restored)assert(info.results[n-1].removed>0,'confirmed stray scrap not cleaned for sprite '+n);
for(const n of [5,6,16,18,21,22,31,32]){
 assert(GOOD.has(n-1));
 assert.equal(info.results[n-1].removed,0,'approved sprite '+n+' remains untouched');
}
let alphaRemoved=0,changedRGB=0,alphaAdded=0;
for(let i=0;i<first.length;i+=4){
 const a=first[i+3],b=fixed[i+3];
 if(b>a)alphaAdded++;
 if(b<a)alphaRemoved++;
 if(first[i]!==fixed[i]||first[i+1]!==fixed[i+1]||first[i+2]!==fixed[i+2])changedRGB++;
}
assert.equal(changedRGB,0,'approved art color is never repainted');
assert.equal(alphaAdded,0,'no artificial silhouettes are introduced');
assert(alphaRemoved>500,'targeted physically separate foreign pixels are removed');
assert(info.results.every(s=>s.slot>=1&&s.slot<=36));
const html=fs.readFileSync('dist/index.html','utf8');
const qa=fs.readFileSync('dist/throwable-qa.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const loader=fs.readFileSync('dist/assets/ip/v2/throwables-v238.js','utf8');
const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');
assert(html.includes('throwables-v238.js?v=238-fragment-cleaned'),'gameplay runs polished atlas');
assert(qa.includes('throwables-v238.js?v=238-fragment-cleaned'),'QA viewer previews same polished atlas');
assert(sw.includes('./assets/ip/v2/throwables-v238.js'),'offline cache contains polished loader');
assert(loader.includes("throwables-36-v238.png")&&loader.includes('artVersion:238'),'loader uses final atlas');
assert(workflow.includes('node tools/polish-throwables-atlas-v238.cjs'),'CI generates final artwork before checks/deploy');
console.log('PASS v238: discarded '+alphaRemoved+' alpha pixels from reviewed neighbor islands, without repainting any RGB pixels or altering 8 approved sprites');
