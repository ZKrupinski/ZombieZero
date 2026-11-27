'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root=path.join(__dirname,'../dist');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
const stages=game.match(/const CAMPAIGN_COMIC_STAGES=new Set\(\[([^\]]+)\]\);/);
assert.ok(stages,'Campaign comic stage list exists');
assert.deepEqual(stages[1].split(',').map(Number),Array.from({length:43},(_,i)=>i+1));
for(let n=13;n<=43;n++){
 const b=fs.readFileSync(path.join(root,'assets/stages/comics',`stage-${n}.jpg`));
 assert.ok(b.length>1000 && b[0]===255 && b[1]===216 && b[b.length-2]===255 && b[b.length-1]===217,`stage-${n} JPEG intact`);
}
assert.ok(game.includes("runMode!=='campaign'||!CAMPAIGN_COMIC_STAGES.has(wave)"));
assert.ok(game.includes('performance.now()+3000'));
console.log('Campaign comics 1–43: complete; new JPEGs valid.');
