'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('dist/fortress-mode.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/fortress-mode.css','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const nodes={};
for(const id of ['fortress-builder','fortress-actions','fortress-confirm','fortress-cancel','fortress-ready','fortress-material','fortress-tip','fortress-preview-summary']){
 nodes[id]={hidden:false,disabled:false,dataset:{},style:{},addEventListener(k,fn){this[k]=fn}};
}
const timers=[];const win={setTimeout(fn,ms){timers.push({fn,ms})}};
const doc={getElementById:id=>nodes[id]||null,createElement:()=>({getContext:()=>null})};
new Function('window','document',src)(win,doc);
const f=win.ZZFortress,b=nodes['fortress-ready'];let starts=0,feedback=0;
f.bind(()=>{starts++;f.deploy([])},()=>feedback++);
f.reset();f.begin([],1);
assert.equal(b.dataset.starting,'false');assert.equal(b.click(),true);
assert.equal(feedback,1);assert.equal(starts,0);assert.equal(b.dataset.starting,'true');
assert.equal(b.click(),false);assert.equal(f.selectBuild('ice'),false);
assert.equal(timers[0].ms,340);timers.shift().fn();
assert.equal(starts,1);assert.equal(b.dataset.starting,'false');assert.equal(b.hidden,true);
f.begin([],2);b.click();f.reset();timers.shift().fn();assert.equal(starts,1,'stale timer cannot launch a reset game');
assert(html.includes('COME ON, START!'));assert(css.includes('data-starting="true"]::before'));
assert(sw.includes('fortress-start-v383.webp'));
assert(fs.existsSync('dist/assets/ui/fortress-start-v383.webp'));
console.log('PASS v383: bitmap press feedback, click-only FX, single launch and cancellation.');
