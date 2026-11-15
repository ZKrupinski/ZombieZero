'use strict';
// HUD text removal is cosmetic only: defense rules and hearts stay functional.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const section=(start,end)=>{const i=source.indexOf(start),j=source.indexOf(end,i+start.length);assert(i>=0&&j>i);return source.slice(i,j)};
for(const body of [section('function proceduralBackground(){','const STAGE_ART_COUNT=18'),section('function background(){','function player(){')]){
 assert(!body.includes('DEFENSE LINE / 넘기면 끝!'),'defense caption removed from both background types');
}
assert(source.includes('z.y+z.h>=DEFENSE_Y'),'breach collision check preserved');
assert(source.includes("f.type==='breach'?'방어선 돌파!'"),'failure explanation still exists');
assert(!source.includes("'BALLS '+balls.length"),'no count text in the footer');
assert(html.includes('id="hud-heart-count"'),'heart count still has its HUD node');
assert(html.includes('game.js?v=64-zombie-sized-impact'),'fresh game asset URL');
assert(sw.includes('zombie-zero-shell-v64-zombie-sized-impact'),'PWA cache updated');
const noop=()=>{},els={};
const graphics=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
const el=id=>els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,addEventListener:noop,setAttribute:noop,getContext:()=>graphics,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop};
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={document:{getElementById:el,addEventListener:noop},window:{AudioContext:AudioMock,addEventListener:noop},navigator:{},localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(source+`
function check(ok,msg){if(!ok)throw Error(msg)}
start();hud();
check($('status').textContent==='','no serve hint remains when ball is held');
check($('hud-heart-count').textContent==='×3','heart count retains original three lives');
serve();hud();
check($('status').textContent==='','footer is empty during play');
active.dual=10;syncMulti();hud();
check(balls.length===2&&$('status').textContent==='','extra active balls do not recreate redundant footer text');
lives=2;hud();
check($('hud-heart-count').textContent==='×2','remaining lives still update the top HUD');
`,sandbox);
console.log('PASS: caption and BALLS counter removed, serve hint removed, hearts and multi-ball gameplay intact.');
