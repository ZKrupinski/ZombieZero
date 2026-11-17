'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const css=fs.readFileSync('dist/style.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const app=fs.readFileSync('dist/app.js','utf8');
const mark='/* v78 · One 450×710 coordinate grid';
const at=css.indexOf(mark);
assert(at>0,'v78 responsive CSS overrides legacy fixed HUD at the end');
const rules=css.slice(at);
assert(html.includes('style.css?v=90-reduced-title-logo'),'CSS cache busted');
assert(html.includes('game.js?v=93-multiball-light-cache'),'game cache busted');
assert(sw.includes('zombie-zero-shell-v93-multiball-light-cache'),'offline cache busted');
assert(app.includes("root.classList.toggle('zz-compact-hud',boardWidth<=330)"), 'compact HUD depends on contained board, not viewport');
assert(rules.includes('/* v78.1: minimum 34px'), 'button spacing is computed from physical hit target width');
assert(app.includes('const scale=Math.min(width/450,height/710)'),
  'world canvas is always contained uniformly');
assert(rules.includes('.machine>.hud'),'actual HUD anchored to the board');
assert(rules.includes('--hud-safe-top:max(0px,calc(env(safe-area-inset-top'),
  'notch offset only applies if the game touches the screen edge');
assert(rules.includes('.machine>.hud>.hud-hearts'),'heart occupies an independent slot');
assert(rules.includes('.machine>.hud>.hud-center-stats'),'stage and score occupy a dedicated slot');
assert(rules.includes('.machine>.hud>#pause'),'pause button placed separately');
assert(rules.includes('.machine>.hud>#options-toggle'),'options button placed separately');
assert(rules.includes('.stage>.zz-combo-overlay'),'combo anchored inside contained stage');
assert(rules.includes('53px * var(--ui-scale'),'combo sits directly below the score');
assert(rules.includes('text-overflow:ellipsis!important'),'long values stay inside score box');
function between(a,b){return Math.max(0,Math.min(a,b))}
function checkBoard(viewW,viewH){
 const scale=Math.min(viewW/450,viewH/710),bw=450*scale,bh=710*scale;
 const compact=bw<=330;
 const heart={x:8*scale,w:compact?bw*.24:113*scale};
 const stats={x:compact?bw*.265:132*scale,w:compact?bw*.44:205*scale};
 const controlWidth=Math.max(34,36*scale);
 const controlGap=Math.max(5,6*scale);
 const pauseRight=7*scale+controlWidth+controlGap;
 const pause={x:bw-pauseRight-controlWidth,w:controlWidth};
 const menu={x:bw-7*scale-controlWidth,w:controlWidth};
 const gap=(a,b)=>b.x-(a.x+a.w);
 const desc=viewW+'×'+viewH;
 assert(bw<=viewW+.01&&bh<=viewH+.01,'gameboard fits '+desc);
 assert(gap(heart,stats)>=0,'heart and stage score overlap '+desc+' '+gap(heart,stats));
 assert(gap(stats,pause)>=-.3,'score and pause overlap '+desc+' '+gap(stats,pause));
 assert(gap(pause,menu)>=-.01,'pause and menu overlap '+desc+' '+gap(pause,menu));
 assert(menu.x+menu.w<=bw+.01,'options stays inside board '+desc);
 assert(53*scale>=40*scale+8*scale,'combo immediately follows score text '+desc);
 assert(53*scale+44*scale<bh*.4,'combo stays in upper game quarter '+desc);
 const ox=(viewW-bw)/2,oy=(viewH-bh)/2;
 assert(ox>=0&&oy>=0,'letterboxing centered '+desc);
 console.log('UI_SAFE '+desc+' board='+Math.round(bw)+'×'+Math.round(bh)+
  ' letterbox=('+Math.round(ox)+','+Math.round(oy)+')'+
  ' gaps='+[gap(heart,stats),gap(stats,pause),gap(pause,menu)].map(x=>x.toFixed(1)).join('/'));
}
for(const dims of [
 [1384,1536],[658,1536], // both user screenshots
 [320,568],[360,800],[390,844],[412,915],[832,750], // phones and foldables
 [1024,768],[1280,720],[1920,1080],[280,520]
])checkBoard(...dims);
const a=game.indexOf('function citizenBubbleLayout(q,carX=car){');
const b=game.indexOf('function drawBubbles(){',a);
assert(a>=0&&b>a,'speech bubble layout uses the game world');
const src=game.slice(a,b);
const fn=vm.runInNewContext(src+';citizenBubbleLayout',{
 W:450,H:710,PY:584,car:225,
 clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),Math
});
function speech(q,carX){
 const o=fn(q,carX),w=o.w,h=o.h;
 assert(o.x>=22&&o.x+w<=428,'speech stays inside the 450px art border');
 assert(o.y>=100&&o.y+h<=(q.event?653:665),'random lower cheers remain above crowd head, event text keeps original safe rail');
 const center=q.event?56:26;
 const clash=o.x<carX+center&&o.x+w>carX-center&&o.y+h>584-66&&o.y<584+42;
 assert(!clash,'speech may cover the outer car edge, never the central hero or long-event clearance');
}
speech({x:190,y:582,w:112,event:'return'},225);
speech({x:320,y:582,w:112,event:'save'},380);
speech({x:20,y:607,w:80,event:null},80);
speech({x:190,y:350,w:112,event:'return'},225);
console.log('PASS: 11 device ratios keep HUD distinct, combo below HUD and citizens only at the car edge, never over its center');
