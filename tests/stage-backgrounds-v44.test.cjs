'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const loader=fs.readFileSync('dist/assets/stages/stage-backgrounds-v44.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
assert(html.includes('assets/stages/stage-backgrounds-v44.js?v=44-environments'),
  'bitmap scene loader is included on the live page');
assert(html.indexOf('stage-backgrounds-v44.js')<html.indexOf('game.js?v=44-eight-stage-art'),
  'backgrounds begin loading before gameplay code');
assert(sw.includes('zombie-zero-shell-v44-eight-stage-art'),'offline cache invalidated');
assert(!game.includes('setStageBackground();PY='),'stage transitions never modify ball collision Y');
assert(game.includes('wave++;setStageBackground();'),'every advancing stage switches theme');
assert(game.includes("setStageBackground(true);lives=hero().lives"),'new campaign and endless runs reset backdrop correctly');
assert(game.includes("STAGE_FADE_SECONDS=.9"),'fade lasts 0.9 seconds');
assert(game.includes('proceduralBackground();return'),'original background remains safe fallback');
assert(game.includes('STAGE_PLAYFIELD_VEIL'),'central contrast veil exists');

const names=new Set();
let total=0;
for(let i=1;i<=8;i++){
 const file='dist/assets/stages/bg-'+String(i).padStart(2,'0')+'.webp';
 const img=fs.readFileSync(file);
 assert.equal(img.toString('ascii',0,4),'RIFF',file+' has valid RIFF header');
 assert.equal(img.toString('ascii',8,12),'WEBP',file+' uses genuine WebP bitmap');
 assert(img.length>30000&&img.length<230000,file+' is a compressed high-quality mobile scene');
 assert(sw.includes("'./assets/stages/bg-"+String(i).padStart(2,'0')+".webp'"),file+' precached offline');
 assert(loader.includes('String(i+1).padStart(2'), 'loader uses ordered 2-digit filenames');
 names.add(img.subarray(0,Math.min(128,img.length)).toString('base64'));total+=img.length;
}
assert.equal(names.size,8,'each of the eight stages uses genuinely distinct art');
assert(total<1000000,'all eight full-color 2x backgrounds total less than 1MB');

const noop=()=>{},elements={},draws=[],styles=[];
const ctx=new Proxy({globalAlpha:1,drawImage:function(...args){
  draws.push({args,alpha:this.globalAlpha});
}}, {
 get:(o,k)=>o[k]??noop,
 set:(o,k,v)=>{o[k]=v;return true}
});
function el(id){return elements[id]??={textContent:'',innerHTML:'',style:{},
 hidden:false,addEventListener:noop,setAttribute:noop,
 getContext:()=>ctx,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}};
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const images=Array.from({length:8},(_,i)=>({id:i+1,naturalWidth:900,naturalHeight:1420}));
const art={images,ready:new Array(8).fill(true),count:8};
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,ZZStageArt:art,addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},requestAnimationFrame:noop,
 setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console,draws};
vm.createContext(sandbox);
vm.runInContext(game+`
function check(v,m){if(!v)throw Error(m)}
start();serve();
check(STAGE_ART_COUNT===8,'exactly 8 backgrounds');
check(STAGE_PLAYFIELD_VEIL.length===8,'independent playfield contrast for all 8 moods');
for(let stage=1;stage<=24;stage++){
 wave=stage;setStageBackground(true);draws.length=0;background();
 const main=draws.filter(d=>images.includes(d.args[0]));
 check(main.length===1&&main[0].args[0]===images[(stage-1)%8],
  'stage '+stage+' maps to the correct bitmap and cycles every 8 stages');
 check(main[0].args.slice(1).join(',')==='0,0,450,710',
  'native source fits fixed 450x710 board');
}
wave=1;setStageBackground(true);
wave=2;setStageBackground();check(previousArtIndex===0&&stageArtIndex===1,'stage transition remembers previous scene');
updateStageBackground(.45);draws.length=0;background();
const transition=draws.filter(d=>images.includes(d.args[0]));
check(transition.length===2&&transition[0].args[0]===images[0]&&transition[1].args[0]===images[1],
 'two stage environments crossfade without blank flash');
check(Math.abs(transition[1].alpha-.5)<.001,'smooth half opacity at mid-transition');
art.ready[2]=false;
wave=3;setStageBackground();const old=stageArtBlend;
updateStageBackground(.5);draws.length=0;background();
const missing=draws.filter(d=>images.includes(d.args[0]));
check(stageArtBlend===old&&missing.length===1&&missing[0].args[0]===images[1],
 'keep prior scene instead of blank frame when new scene is not loaded yet');
art.ready[2]=true;updateStageBackground(.9);
check(previousArtIndex===-1&&stageArtBlend===1,'transition resolves when new image is ready');
art.ready.fill(false);draws.length=0;background();
check(draws.filter(d=>images.includes(d.args[0])).length===0,
 'missing scenery renders the original procedural road rather than crashing');
check(DEFENSE_Y===565&&PY===584&&SHIELD_LINE_Y===H-58,
 'background transition never changes the defense, player or shield collision heights');
console.log('PASS: eight distinct mobile-friendly scenes, 24-stage loop, fade, missing-image fallback, untouched ball and shield geometry');
`,sandbox);
