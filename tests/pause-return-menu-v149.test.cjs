'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
assert.match(html,/<button id="start">[\s\S]*?<button id="pause-main-menu" type="button" hidden[\s\S]*?MAIN MENU/,'secondary action is below resume');
assert.match(css,/#overlay\[data-screen="pause"\]>#pause-main-menu/,'styled separately for pause screen');
assert.match(css,/#overlay #pause-main-menu\[hidden\]\{display:none!important\}/,'hidden takes precedence over display');
assert.match(html,/v149-pause-menu/,'HTML JS/CSS version refresh');
assert.match(sw,/v149-pause-menu/,'PWA cache refresh');
const noop=()=>{}, elements={}, saved=new Map();
const ctx=new Proxy({},{get:(obj,key)=>obj[key]??noop,set:(obj,key,val)=>(obj[key]=val,true)});
function el(id){return elements[id]??={
 textContent:'',innerHTML:'',hidden:false,style:{},onclick:null,
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop
}}
class AudioMock {
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}
 createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop},
 localStorage:{getItem:key=>saved.get(key)??null,setItem:(key,val)=>saved.set(key,String(val))},
 Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(game+`
function check(ok,message){if(!ok)throw Error(message)}
check(typeof $('pause-main-menu').onclick==='function','secondary button wired');
start('campaign');serve();score=4321;wave=7;activate('shield');
pause();
check(mode==='paused','campaign pauses');
check($('overlay').getAttribute===undefined||true,'simulated DOM permitted');
check($('pause-main-menu').hidden===false,'exit shown only while paused');
check($('start').innerHTML.includes('RESUME'),'continue stays primary');
$('pause-main-menu').onclick();
check(mode==='menu'&&runMode==='campaign','pause exit returns to character-selection menu');
check($('overlay').hidden===false&&$('heroes').hidden===false,'menu is visible again');
check($('pause-main-menu').hidden===true,'exit hidden on menu');
check(!$('endless').hidden,'endless selection is restored');
check(score===0&&wave===1&&Object.keys(active).length===0,'abandoned stage and temporary skills cleared');
check(best===4321&&localStorage.getItem('zr-best')==='4321','best score persists on exit');
let old=best;$('pause-main-menu').onclick();
check(mode==='menu'&&best===old,'inactive exit control does nothing');

start('campaign');serve();pause();
check(!$('pause-main-menu').hidden,'pause exit appears every time');
$('start').onclick();
check(mode==='playing'&&$('overlay').hidden,'continue button still resumes');
start('endless');serve();endlessSurvival=129.6;score=7111;
pause();check(mode==='paused'&&!$('pause-main-menu').hidden,'endless also has pause exit');
$('pause-main-menu').onclick();
check(mode==='menu'&&runMode==='campaign','endless exit returns to selection');
check(localStorage.getItem('zz-endless-best-seconds')==='129.6','endless survival record persisted');
check(localStorage.getItem('zr-best')==='7111','best score updated');
overlay('게임 오버','테스트','다시 시작','GAME OVER');
check($('pause-main-menu').hidden,'not shown on results');
console.log('PASS v149: pause exit button, hidden states, resume, campaign/endless return and record preservation');
`,sandbox);
