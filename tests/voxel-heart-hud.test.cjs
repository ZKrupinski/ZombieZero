'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const png=fs.readFileSync('dist/assets/ip/heart-voxel-v40.png');
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','voxel heart is a real PNG');
assert.equal(png.readUInt32BE(16),128);assert.equal(png.readUInt32BE(20),128);
assert.equal(png[25],6,'heart has true RGBA, not a CSS or vector replacement');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const ids=['id="hud-hearts"','id="wave"','id="score"','id="pause"','id="options-toggle"'];
const positions=ids.map(key=>html.indexOf(key));
assert(positions.every(x=>x>=0)&&positions.every((x,i)=>i===0||x>positions[i-1]),
 'voxel hearts left, stage and score adjacent in center, controls right');
assert(html.includes('src="assets/ip/heart-voxel-v40.png"'),'new heart asset is visible in gameplay HUD');
assert(html.includes('id="lives" hidden'),'old bottom hearts do not compete with upper-left display');
assert(html.includes('class="hud-center-stats"')&&html.includes('class="score-compact"'),
 'score is no longer isolated at upper-left');
assert(css.includes('.hud .hud-center-stats .score-compact')&&
 css.includes('.hud .hud-hearts'),'responsive HUD uses same board scale');
assert(css.includes('#lives{display:none!important}'),'footer life glyphs suppressed on every display');
assert(sw.includes("'./assets/ip/heart-voxel-v40.png'"),'heart resource works offline');
const noop=()=>{},els={},draws=[];
const context=new Proxy({drawImage:(...args)=>draws.push(args)},
 {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},
 hidden:false,addEventListener:noop,setAttribute:noop,
 getContext:()=>context,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const image={naturalWidth:1536,naturalHeight:576};
const sandbox={document:{getElementById:el,addEventListener:noop},
 window:{ZZHeroCarAttack:{ready:true,image},AudioContext:AudioMock,addEventListener:noop},
 navigator:{},localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console,
 draws};
vm.createContext(sandbox);
vm.runInContext(game+`
function check(x,msg){if(!x)throw Error(msg)}
start();serve();selectedHero=0;hud();
check($('hud-heart-count').textContent==='×3','starting Ace has three big displayed lives');
check($('lives').textContent==='','footer no longer repeats hearts');
selectedHero=2;lives=2;hud();
check($('hud-heart-count').textContent==='×2','Liam life display follows selected hero');
lives=1;hud();check($('hud-heart-count').textContent==='×1','life count updates immediately');
lives=0;hud();check($('hud-heart-count').textContent==='×0','no hearts remain on game over');
check($('hud-hearts').style.opacity==='.42','game-over heart dims');
selectedHero=1;wave=12;score=12345;hud();
check($('wave').textContent==='12'&&$('score').textContent==='12,345',
 'score and stage remain independent data nodes');
for(let i=0;i<3;i++){
 selectedHero=i;draws.length=0;player();
 check(draws.length===1,'single playable sprite is retained');
 check(draws[0][2]===i*192&&draws[0][7]===108&&draws[0][8]===108,
   'gameplay 70 percent composite size and correct atlas row unchanged');
}
console.log('PASS: real transparent voxel heart, top-left live counter, adjacent stage/score, right buttons and 70% sprites unchanged');
`,sandbox);
