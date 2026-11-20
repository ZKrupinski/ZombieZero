'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/game.js','utf8');
const hudCSS=fs.readFileSync('dist/endless-score-fix-v215.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
assert(html.includes('endless-score-fix-v215.css'),'new HUD stylesheet is loaded');
assert(hudCSS.includes('grid-template-columns:minmax(0,40fr) minmax(0,26fr) minmax(0,34fr)'),
 'endless score gets 40 percent of the safe score/wave/time region');
assert(hudCSS.includes('text-overflow:clip!important'),'score does not use an ellipsis');
assert(hudCSS.includes('overflow:visible!important'),'digits are no longer cut off');
assert(source.includes("'--zz-score-shrink'"),'long values shrink gradually without modifying score');
const noop=()=>{},els={};
const canvasContext=new Proxy({},{get:(obj,key)=>obj[key]??noop,set:(obj,key,val)=>(obj[key]=val,true)});
function el(id){return els[id]??={hidden:false,innerHTML:'',textContent:'',style:{setProperty:noop},onclick:noop,
 setAttribute:noop,addEventListener:noop,getContext:()=>canvasContext,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop};}
const sandbox={document:{getElementById:el,addEventListener:noop},navigator:{},
 window:{addEventListener:noop},localStorage:{getItem:()=>null,setItem:noop},
 requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,Math,console,Path2D:class{}};
vm.createContext(sandbox);
const checks=[
 "function check(ok,why){if(!ok)throw Error(why)}",
 "start('campaign');serve();",
 "for(let i=0;i<100;i++)updateBubbles(.1);",
 "check(bubbles.length===0,'citizens must not chat without an event');",
 "citizenReaction('critical');",
 "check(bubbles.length===1&&CITIZEN_REACTIONS.critical.includes(bubbles[0].text),'critical comment must match the hit');",
 "beginClear();",
 "check(bubbles.length===0,'campaign clear removes bubbles immediately');",
 "updateBubbles(4);",
 "check(bubbles.length===0,'no clear-stage idle speech');",
 "advanceStage();",
 "check(bubbles.length===0,'new campaign stage has no stale speech');",
 "start('campaign');serve();bubbleTimer=0;killCombo=4;killTimer=5;recordKill();",
 "check(bubbles.length===1&&CITIZEN_REACTIONS.combo.includes(bubbles[0].text),'five-kill combo has contextual dialogue');",
 "bubbleTimer=0;resetCitizenSpeech();activate('power');",
 "check(bubbles.length===1&&CITIZEN_REACTIONS.item.includes(bubbles[0].text),'item acquisition has contextual dialogue');",
 "start('endless');serve();bubbleTimer=0;citizenReaction('critical');",
 "check(bubbles.length===1,'endless combat cue appears');",
 "beginEndlessShift();",
 "check(bubbles.length===0&&mode==='endlessShift','endless shift clears prior speech');",
 "endlessShiftSpawned=true;refillEndlessWave();",
 "check(bubbles.length===0,'new endless wave has no stale speech');"
];
vm.runInContext(source+'\n'+checks.join('\n'),sandbox);
console.log('PASS v215: event-only citizen speech, both wave resets, and responsive endless score fit');
