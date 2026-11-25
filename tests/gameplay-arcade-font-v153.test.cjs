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
// V354/V355: test the shared screen-space renderer instead of the retired boxed result.
const stageStart=game.indexOf('function drawStageAnnouncement(');
const clearStart=game.indexOf('function drawClear(){');
const stageSource=game.slice(stageStart,game.indexOf('}',clearStart)+1);
assert(stageSource.startsWith('function drawStageAnnouncement('));
const stageCalls=[];
const stageG={save(){},restore(){},measureText(word){return {width:word.length*parseFloat(this.font.split(' ')[1])}},fillText(word,x,y,maxWidth){stageCalls.push({kind:'fill',word,x,y,maxWidth,font:this.font,color:this.fillStyle,blend:this.globalCompositeOperation,blur:this.shadowBlur})},strokeText(word,x,y,maxWidth){stageCalls.push({kind:'stroke',word,x,y,maxWidth,color:this.strokeStyle,width:this.lineWidth})}};
vm.runInNewContext(stageSource+";drawStageAnnouncement('STAGE 01','#ffffff',32);drawClear()",{g:stageG,W:450,H:710,fxEnabled:true},{timeout:1000});
for(const [word,color,size] of [['STAGE 01','#ffffff',32],['STAGE CLEAR','#ffe32b',28],['!','#ffe32b',28]]){
 const calls=stageCalls.filter(c=>c.word===word);
 assert(calls.some(c=>c.kind==='stroke'&&c.color==='#000000'&&c.width>=6),'stage title has black outline');
 assert(calls.some(c=>c.kind==='fill'&&c.color===color&&c.font==='400 '+size+'px "Press Start 2P",monospace'),'stage title uses correct arcade font and color');
 assert(calls.some(c=>c.kind==='fill'&&c.blend==='lighter'&&c.blur>0),'stage title has additive glow');
 assert(calls.every(c=>c.y===355&&c.x-c.maxWidth/2>=18&&c.x+c.maxWidth/2<=432),'stage title has safe margins');
}
const title=stageCalls.find(c=>c.word==='STAGE 01'&&c.kind==='stroke');
const clear=stageCalls.find(c=>c.word==='STAGE CLEAR'&&c.kind==='stroke');
const bang=stageCalls.find(c=>c.word==='!'&&c.kind==='stroke');
assert.equal(title.x,225,'stage intro centered');
const gap=bang.x-bang.maxWidth/2-(clear.x+clear.maxWidth/2);
assert(gap>0&&gap<28*.65,'exclamation gap smaller than a full glyph, not touching');
assert(Math.abs((clear.x-clear.maxWidth/2+bang.x+bang.maxWidth/2)/2-225)<.001,'clear group centered');
assert(game.includes("drawStageAnnouncement('STAGE '+String(wave).padStart(2,'0'),'#ffffff',32)"),'intro uses reduced size');
// A limited canvas context must never crash the clearing transition.
const noMetrics={save(){},restore(){},measureText(){},fillText(word,x,y,width){assert(Number.isFinite(x+y+width))},strokeText(word,x,y,width){assert(Number.isFinite(x+y+width))}};
vm.runInNewContext(stageSource+';drawClear()',{g:noMetrics,W:450,H:710,fxEnabled:true},{timeout:1000});
assert(game.includes("if(mode==='stageNumber')drawStageAnnouncement("),'stage intro drawn above arena');
assert(game.includes("if(mode==='stageNumber'){draw();requestAnimationFrame(frame);return}"),'arena renders during title without advancing combat');
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
