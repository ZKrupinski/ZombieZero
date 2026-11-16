'use strict';
// v90: reduce oversized logos without changing bitmap art or overlay controls.
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(html.includes('style.css?v=90-reduced-title-logo'),'page refreshes new CSS');
assert(html.includes('game.js?v=91-render-performance-preserve-visuals'));
assert(sw.includes('zombie-zero-shell-v91-render-performance-preserve-visuals'),'service worker refreshes title CSS');
const end=css.slice(css.indexOf('/* v90 title UI:'));
assert(end.includes('.logo-heading>.game-logo')&&end.includes('max-width:305px'),
 'desktop sidebar logo shrunk from 395px');
assert(end.includes('.overlay[data-title="true"]>.overlay-logo')&&end.includes('width:min(68%,285px)'),
 'selection overlay shrunk from almost entire width');
assert(end.includes('.boot-content>.boot-logo-image')&&end.includes('width:min(74%,300px)'),
 'full-viewport boot logo shrunk from 420px');
assert(end.includes('@media(max-height:620px)')&&end.includes('@media(max-height:460px)'),
 'short phones receive smaller independent logo caps');
assert(html.includes('src="assets/ip/zombie-zero-bi-v75.png"'),
 'approved original high-res logo bitmap unchanged');
assert(html.includes('id="boot-start"')&&html.includes('id="hero-0"')&&html.includes('id="hero-1"')&&html.includes('id="hero-2"'),
 'boot and hero selection buttons remain available');
console.log('PASS: responsive reduced title / selection / desktop logo retains original art and controls.');
