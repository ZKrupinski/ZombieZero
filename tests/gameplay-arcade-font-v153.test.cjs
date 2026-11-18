'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const game=fs.readFileSync('dist/game.js','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
assert(css.includes("font-family:'Press Start 2P','Courier New',monospace!important"),
 'gameplay font must exactly match title START GAME typeface');
for(const id of ['#score','#wave','#survival-time','#hud-heart-count']){
 assert(css.includes(id),'every HUD metric has pixel font support: '+id);
}
assert(css.includes('.stage .zz-combo-praise')&&css.includes('.stage .zz-combo-score strong'),
 'combo popups adopt the arcade face');
assert(css.includes('mix-blend-mode:plus-lighter')&&css.includes('text-shadow:'),
 'CSS game type adds bounded ADD/bloom');
assert(!css.includes('.bubble{font-family:')&&!css.includes('.citizen-bubble{font-family:'),
 'Korean citizen speech font is not overwritten');
assert(game.includes("g.font='bold 15px Arial, sans-serif';g.textAlign='center';g.fillText(q.text"),
 'Korean citizen bubble font is unchanged');
assert(game.includes("g.font='400 16px \"Press Start 2P\",monospace'"),'critical font switched');
assert(game.includes("g.font='400 19px \"Press Start 2P\",monospace'"),'endless wave font switched');
assert(game.includes("g.font='400 17px \"Press Start 2P\",monospace'"),'stage-clear font switched');
assert(game.includes("g.globalCompositeOperation='lighter'"),'canvas text glow uses ADD');
assert(html.includes('-v153-arcade-font-glow')&&sw.includes('-v153-arcade-font-glow'),
 'PWA and both scripts/stylesheets use fresh versions');
assert(!game.includes('PIERCE CRIT!'),'all criticals retain the same text');
assert(game.includes("const textScale=piercingCritical?.75+Math.random()*.28:.90+Math.random()*.15"),
 'critical popups sample one bounded size at spawn');
assert(game.includes('t:0,life:.72,pierce:piercingCritical,textScale'),
 'each popup retains its own sampled size across frames');
const source=game.slice(game.indexOf('function drawCriticalPopups(){'),
  game.indexOf('function drawImpactFlashes(){'));
assert(source.startsWith('function drawCriticalPopups(){'));
const scales=[],words=[],strokes=[],colors=[];
const g={
 save(){},restore(){},translate(){},scale(x,y){scales.push([x,y])},
 strokeText(...a){strokes.push(a)},fillText(...a){words.push(a)},
 fillStyle:'#fff',shadowColor:'',shadowBlur:0,lineWidth:1
};
const pops=[
 {x:140,y:230,t:.2,life:.72,pierce:true,textScale:.75},
 {x:230,y:260,t:.2,life:.72,pierce:true,textScale:.91},
 {x:330,y:290,t:.2,life:.72,pierce:false,textScale:1.05}
];
const context={g,criticalPopups:pops,fxEnabled:true,W:450,DEFENSE_Y:490,
 Math,clamp:(a,l,r)=>Math.max(l,Math.min(r,a)),
 arcadeGlowText:(text,x,y)=>{words.push([text,x,y]);},
 rect:()=>{}};
vm.runInNewContext(source+';drawCriticalPopups()',context,{timeout:1000});
assert.equal(scales.length,3,'every critical gets its own scale');
assert(scales[0][0]<scales[1][0]&&scales[1][0]<scales[2][0],
 'piercing criticals vary independently and smaller than large normal critical');
assert(words.every(x=>x[0]==='CRITICAL!'),'the popup title is consistent');
assert(strokes.every(x=>x[0]==='CRITICAL!'),'outlined arcade glyph remains readable');
assert(scales.every(s=>s[0]>0.6&&s[0]<=1.06),
 'critical titles stay within safe text-size bounds');
console.log('PASS V153: START GAME pixel type, HUD/CSS and canvas ADD bloom, untouched Korean bubbles, independently randomized readable CRITICAL! sizes');
