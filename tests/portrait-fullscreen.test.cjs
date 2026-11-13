'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let portrait=false;
const dimensions={width:390,height:844};
const noop=()=>{},elements={};
const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return elements[id]??={
 textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,setPointerCapture:noop,
 getContext:()=>ctx,getBoundingClientRect:()=>({width:dimensions.width,height:dimensions.height,left:0,top:0})
}}
const root={classList:{contains:k=>k==='portrait-play'&&portrait}};
class AudioMock{constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}createBufferSource(){return{connect:noop,start:noop,stop:noop}}createDelay(){return{delayTime:{value:0},connect:noop}}createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}}
const sandbox={navigator:{},document:{getElementById:el,documentElement:root,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop,devicePixelRatio:2},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},requestAnimationFrame:noop,
 setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`
function check(x,m){if(!x)throw Error(m)}
{
 check(H===710&&PY===604&&DEFENSE_Y===565,'desktop base reference stays unchanged');
 let y0=citizens[0].y;
 document.documentElement.classList.contains('portrait-play');
}
`,sandbox);
const layout=sandbox.window.ZZGameLayout;
assert(layout,'debug world measurements exist');
assert.equal(layout.getHeight(),710);
portrait=true;
sandbox.resizeCanvas();
const h=Math.round(450*dimensions.height/dimensions.width);
assert.equal(layout.getHeight(),h,'viewport determines real world height');
assert.equal(layout.getPaddleY(),h-106,'paddle remains near viewport bottom');
assert.equal(layout.getDefenseY(),h-145,'defense zone tracks viewport bottom');
assert.equal(elements.game.height,dimensions.height*2,'canvas consumes full portrait height at DPR 2');
assert.equal(elements.game.width,dimensions.width*2,'canvas consumes full portrait width');
vm.runInContext(`
{
 start();serve();check(balls.length===1&&!balls[0].held,'serve works in expanded world');
 const b=balls[0];b.x=car;b.y=PY-9;b.vy=350;b.vx=0;
 update(.02);check(b.vy<0,'ball can still bounce at expanded paddle');
 check(citizens[0].y===682+VIEW_DELTA,'citizen ground moves with bottom HUD');
 check(H>710,'extra gameplay height available, not merely a cosmetic margin');
}
`,sandbox);
portrait=false;dimensions.width=450;dimensions.height=710;sandbox.resizeCanvas();
assert.equal(layout.getHeight(),710,'rotation returns to original game coordinate space');
assert.equal(layout.getPaddleY(),604,'base paddle geometry restored');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const app=fs.readFileSync('dist/app.js','utf8');
assert(html.includes('id="options-dialog"')&&html.includes('id="options-toggle"'),'settings dialog exists');
assert(css.includes('.portrait-play .stage')&&css.includes('height:100%!important'),'game stage fills screen');
assert(app.includes("root.classList.toggle('portrait-play',portrait)"),'portrait mode chosen from usable viewport');
assert(!app.includes('room*450/710);root.style.setProperty('),'old hardcoded header deduction removed for portrait');
console.log('PASS: full-screen portrait world, live ball collision, defense/citizen bottom anchors, and options menu');
