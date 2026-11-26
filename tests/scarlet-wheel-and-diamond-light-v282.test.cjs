'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const css=fs.readFileSync('dist/garage.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');

// Source-level regression: the fifth hero must have her own projected light.
// Before v282, only three hero colors existed and Scarlet fell back to Ace green.
const begin=game.indexOf('const TRAIL_GROUND_HERO_COLORS=');
const end=game.indexOf('// V89:',begin);
assert(begin>=0&&end>begin,'ground light implementation found');
const context={
 fxEnabled:true,selectedHero:4,clock:0,balls:[{}],calls:[],
 compactBallFX:()=>false,
 has:()=>false,
 sampleBallTrail:(path,d)=>({x:20+d,y:40,s:d}),
 drawProjectedLightSpill:function(x,y,r,rgb,alpha){this.calls.push({rgb:Array.from(rgb),alpha})}
};
context.drawProjectedLightSpill=(x,y,r,rgb,alpha)=>context.calls.push({rgb:Array.from(rgb),alpha});
vm.createContext(context);
vm.runInContext(game.slice(begin,end),context);
const draw=()=>vm.runInContext(
 "drawTrailGroundReflections({held:false,x:50,y:100},8,[{x:50,y:100,s:0},{x:40,y:90,s:170}]);",
 context);
draw();
assert(context.calls.length>=12,'normal reflection draws a continuous light wake');
assert(context.calls.some(x=>x.rgb.join(',')==='180,212,255'),'Scarlet light uses ice blue');
assert(context.calls.some(x=>x.rgb.join(',')==='245,187,237'),'Scarlet light includes restrained pink facet');
assert(context.calls.every(x=>x.rgb.join(',')!=='192,234,112'),'Scarlet never inherits tennis-lime light');
context.calls=[];context.selectedHero=0;
draw();
assert(context.calls.every(x=>x.rgb.join(',')==='192,234,112'),'Ace retains original tennis-lime light');
context.calls=[];context.selectedHero=4;
context.compactBallFX=()=>true;
draw();
assert(context.calls.length>=12,'mobile retains full reflected wake');
assert(context.calls.some(x=>x.rgb.join(',')==='180,212,255'),'diamond blue retained');
assert(context.calls.some(x=>x.rgb.join(',')==='245,187,237'),'diamond accent retained');
context.calls=[];context.compactBallFX=()=>false;
context.has=kind=>kind==='fire';
draw();
assert(context.calls.some(x=>x.rgb.join(',')==='201,0,9'),
 'the fire skill still uses red fire light');

// Layout: anchor actual portrait (not the whole reel) by its bottom wheel line.
assert(css.includes("/* v282: Scarlet's 80% portrait uses the SAME lower wheel datum"),
 'Scarlet-specific alignment override exists');
const layout=css.slice(css.indexOf("/* v282: Scarlet's"));
assert(layout.includes('[data-reel-hero="4"] .hero-reel-artwork>img.hero-vehicle-scarlet'),
 'only Scarlet gets wheel alignment adjustment');
assert(layout.includes('top:auto!important;')&&layout.includes('bottom:0!important;'),
 'wheels are aligned to bottom of the artwork region');
assert(layout.includes('left:50%!important;')&&layout.includes('transform:translateX(-50%)!important;'),
 'artwork is horizontally centered');
assert(layout.includes('scale:.8!important;'),'Scarlet stays at approved 80 percent');
assert(layout.includes('#garage-dialog .garage-reel-card[data-reel-hero="4"]'),
 'the garage reel is also centered and bottom aligned');
assert(layout.includes('#radio-dialog .rx-portrait[src*="scarlet-portrait"]'),
 'radio is aligned to the same datum');
assert(game.includes('const size=112*.8,carSpriteBottom=579+112/2;'),
 'gameplay retains 80 percent scale and stable wheel baseline');
assert(html.includes('v282-scarlet-wheel-light-colors')&&sw.includes('v282-scarlet-wheel-light-colors'),
 'browser and service-worker caches invalidate old lighting/positions');
console.log('PASS v282: diamond-blue/pink ground glow, original Ace/fire colors, bottom wheel and center alignment in every screen');
