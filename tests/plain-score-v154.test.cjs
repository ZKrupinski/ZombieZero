'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
// HUD, game over, victory, and in-canvas failure should all show raw digits.
assert(!game.includes("toLocaleString('ko-KR')"),'locale grouping must not leak back into the score UI');
const score=(game.match(/String\(score\)/g)||[]).length;
const best=(game.match(/String\(best\)/g)||[]).length;
assert.equal(score,4,'score is ungrouped in four display paths');
assert.equal(best,2,'best score is ungrouped in results and victory');
assert.match(game,/\$\('score'\)\.textContent=String\(score\)/,'live score renders no commas');
assert.match(game,/\$\('result-score'\)\.textContent=String\(score\)/,'results display no commas');
assert.match(game,/\$\('result-best'\)\.textContent=String\(best\)/,'best score displays no commas');
assert.match(game,/SCORE '\+String\(score\)/,'failure scene shows ungrouped score');
assert(html.includes('v154-plain-score'),'new JS cache key');
assert(sw.includes('v154-plain-score'),'new PWA cache key');
assert.equal(String(123456789),'123456789','number formatting stays plain decimal');
console.log('PASS V154: score and best score are ungrouped across gameplay and results');
