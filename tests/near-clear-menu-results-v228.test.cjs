'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('dist/menu-zombie-palette-v211.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const menu=css.match(/#overlay\[data-screen="selection"\]\{\s*background:([^;]+);/);
const results=css.match(/#overlay\[data-screen="results"\]\{\s*background:([^;]+);/);
assert(menu&&results,'selection and results both have their own backgrounds');
assert(menu[1].includes('rgba(28,47,55,.12)')&&menu[1].includes('rgba(9,21,33,.23)'),
 'selection overlay near transparent');
assert(results[1].includes('rgba(27,45,56,.14)')&&results[1].includes('rgba(9,22,34,.24)'),
 'results overlay near transparent');
assert(css.includes('background:rgba(11,20,28,.32)!important'),
 'pause overlay keeps its separately approved dim');
assert(css.includes('background:#172731!important'),
 'results cards keep enough contrast to read');
assert(html.includes('menu-zombie-palette-v211.css?v=228-clear-menu-results'),
 'browser loads new transparency CSS');
assert(sw.includes('v228-near-clear-menu-results'),
 'PWA refreshes opacity changes');
console.log('PASS v228: near-clear main/results backdrops, readable result cards and unchanged pause layer');
