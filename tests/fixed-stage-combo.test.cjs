'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8'),app=fs.readFileSync('dist/app.js','utf8');
const noop=()=>{},els={},canvasCalls=[];
const ctx=new Proxy({drawImage:(...args)=>canvasCalls.push(args),fillText:(...args)=>canvasCalls.push(args)},
 {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
const el=id=>els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop};
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{addEventListener:noop},localStorage:{getItem:()=>0,setItem:noop},
 Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,
 clearTimeout:noop,Math:Object.create(Math),console,canvasCalls};
vm.createContext(sandbox);
vm.runInContext(source+`
function check(test,reason){if(!test)throw Error(reason)}
check(H===710&&PY===584&&DEFENSE_Y===565,'fixed game coordinates');
killTimer=6;mode='playing';
const tiers=[[2,'NICE!',0],[5,'COOL!',1],[10,'GREAT!',2],
 [15,'AWESOME!',3],[20,'UNSTOPPABLE!',4],[30,'LEGENDARY!',5]];
for(const [count,word,tier] of tiers){
 killCombo=count;canvasCalls.length=0;drawKillCombo();
 check($('combo-overlay').hidden===false,'combo visible as separate banner');
 check($('combo-number').textContent===String(count),'large count preserved');
 check($('combo-praise').textContent===word,'six unique tier phrases');
 check($('combo-overlay').dataset.tier===String(tier),'six artwork palettes');
 check(canvasCalls.length===0,'badge never paints over zombie or boss sprites');
}
killCombo=0;drawKillCombo();check($('combo-overlay').hidden,'combo hidden after streak');
killCombo=30;killTimer=0;drawKillCombo();check($('combo-overlay').hidden,'expired combo is removed');

wave=3;rack();
const boss=foes.find(z=>z.boss);
check(boss&&boss.y===74,'boss spawn and difficulty stay at original coordinates');
`,sandbox);
assert(html.includes('id="combo-overlay"')&&html.includes('id="combo-number"')&&
 html.includes('id="combo-praise"'),'standalone combo artwork exists outside stage number');
assert(css.includes('var(--board-offset-y,0px)')&&css.includes('var(--board-offset-x,0px)'),
 'board is centered in browser fullscreen');
assert(css.includes('aspect-ratio:450/710!important'),'game frame cannot be distorted');
assert(app.includes('const scale=Math.min(width/450,height/710)'),
 'on-screen frame is contained by a single uniform scale');
assert(source.includes('const targetH=710;'),'playable height never depends on device aspect');
assert(source.includes('const minBarY=killCombo>=2&&killTimer>0?186:90'),'boss HP label moves only when combo artwork is active');
assert(css.includes('.zz-combo-overlay[data-tier="5"]'),'legendary tier artwork exists');
console.log('PASS: fixed 450:710 field, distinct large six-color cube combo artwork, boss HP safe band and intact hitboxes');
