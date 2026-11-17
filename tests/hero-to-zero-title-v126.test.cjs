'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const app=fs.readFileSync('dist/app.js','utf8');
const boot=html.slice(html.indexOf('<section id="boot-scene"'),html.indexOf('<div class="desktop-note">'));
assert(boot.includes('<span class="boot-eyebrow">NOVALIGHT ARCADE 001 / ZOMBIE SURVIVAL</span>'),
 'top eyebrow retains precise requested credits');
assert(boot.includes('<p class="boot-tagline">From HERO to ZERO</p>'),
 'large tagline preserves exact authored casing');
assert(boot.indexOf('NOVALIGHT ARCADE 001 / ZOMBIE SURVIVAL')<
 boot.indexOf('From HERO to ZERO')&&boot.indexOf('From HERO to ZERO')<boot.indexOf('boot-logo-image'),
 'small eyebrow then large tagline then bitmap logo');
assert(!boot.includes('ARCADE 001 / SURVIVAL TENNIS</span>'),
 'old wording no longer appears in title');
assert(!boot.includes('도시는 빼앗겼다. 랠리는 아직 끝나지 않았다.'),
 'old tagline no longer appears in title');
const cssStart=css.indexOf('/* v126: Restore authored title hierarchy');
assert(cssStart>0,'v126 scoped title styles exist');
const last=css.slice(cssStart,css.indexOf('/* v127: Wider arcade hero selection',cssStart));
assert(last.includes('.zz-boot-scene .boot-eyebrow')&&last.includes('.zz-boot-scene .boot-tagline'),
 'both header lines scoped exclusively to initial boot title');
assert(last.includes('clamp(18px,3.5vw,26px)'),
 'HERO to ZERO uses visibly larger font than previous 9-11px');
assert(last.includes('color:#ffe047')&&last.includes('0 0 14px #ffd53daa')&&
 last.includes('0 0 27px #ffbb3b77'),
 'both arcade texts use warm yellow plus layered bright glow/bloom text shadows');
assert(last.includes('.zz-boot-scene .boot-arcade-line')&&last.includes('filter:drop-shadow('),
 'shared bloom-like glow applies to both alternating labels');
assert(boot.includes('boot-arcade-start')&&boot.includes('boot-arcade-coin'),
 'START GAME and INSERT COIN alternate on the existing start button');
assert(css.includes('@keyframes zz-title-start-pulse')&&css.includes('@keyframes zz-title-coin-pulse'),
 'previous alternating blink retained');
assert(boot.includes('NOVALIGHT x AHNDANTE x BLACKRAIN')&&boot.includes('2027 All Rights Reserved.'),
 'copyright preserved at bottom');
assert(boot.includes('id="boot-start" class="boot-start" type="button" aria-label="START GAME"'),
 'native start button unchanged');
assert(app.includes("bootStart.addEventListener('click',async()=>")&&
 app.includes('enterMobileFullscreen(true); // Must happen before the first await.'),
 'click / fullscreen / image-loading flow unchanged');
assert(html.includes('style.css?v=90-reduced-title-logo-v125-arcade-title-v126-hero-to-zero-glow'),
 'CSS cache-bust ensures updated visuals on mobile');
assert(sw.includes('-v125-arcade-title-v126-hero-to-zero-glow'),
 'PWA service worker refreshes updated CSS');
assert(last.includes('@media(max-height:460px)'), 'small landscape title remains responsive');
assert(last.includes('.zz-boot-scene')&&!last.includes('.overlay[data-screen'),
 'hero picker art / typography not modified');
console.log('PASS v126: requested two-line title, larger tagline, yellow glow/bloom, alternating arcade prompts, copyright and game-start flow.');
