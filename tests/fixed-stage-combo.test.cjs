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
killCombo=4;killTimer=6;mode='playing';
canvasCalls.length=0;drawKillCombo();
check($('combo-hud').hidden===false,'combo shown in HUD');
check($('combo-hud').textContent==='4 COMBO · NICE!','combo text preserved');
check(canvasCalls.length===0,'combo does not paint across boss or stage');
killCombo=12;drawKillCombo();
check($('combo-hud').textContent==='12 COMBO · AMAZING!','streak tier updates');
killCombo=0;drawKillCombo();check($('combo-hud').hidden,'combo hidden after streak');
wave=3;rack();
const boss=foes.find(z=>z.boss);
check(boss&&boss.y===74,'boss spawn and difficulty stay at original coordinates');
`,sandbox);
assert(html.includes('id="combo-hud"'),'stage HUD owns combo');
assert(css.includes('var(--board-offset-y,0px)')&&css.includes('var(--board-offset-x,0px)'),
 'board is centered in browser fullscreen');
assert(css.includes('aspect-ratio:450/710!important'),'game frame cannot be distorted');
assert(app.includes('const scale=Math.min(width/450,height/710)'),
 'on-screen frame is contained by a single uniform scale');
assert(source.includes('const targetH=710;'),'playable height never depends on device aspect');
assert(source.includes('Math.max(0,90-(z.y-32))'),'boss health label stays below top HUD without changing its physical position');
console.log('PASS: stage screenshots preserve fixed 450:710 frame; boss HP and combo leave HUD unobstructed');
