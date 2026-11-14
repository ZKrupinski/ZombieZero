'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const png=fs.readFileSync('dist/assets/ip/hero-car-attack.png');
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','authentic PNG');
assert.equal(png.readUInt32BE(16),1536,'eight high-res 192px columns');
assert.equal(png.readUInt32BE(20),576,'three 192px character rows');
assert(png.includes(Buffer.from('tRNS')),'transparent sprite pixels, no opaque sheet');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const loader=fs.readFileSync('dist/assets/ip/hero-car-attack.js','utf8');
assert(html.includes('src="assets/ip/hero-car-attack.js?v=38-clean-hero-sprite"')&&html.includes('src="game.js?v=39-falling-loot-glow"'),'loader included before game');
assert(html.indexOf('src="assets/ip/hero-car-attack.js?v=38-clean-hero-sprite"')<html.indexOf('src="game.js?v=39-falling-loot-glow"'),'load art first');
assert(sw.includes('hero-car-attack.png')&&sw.includes('hero-car-attack.js'),'offline cache includes both assets');
assert(loader.includes('atlas.naturalWidth===1536&&atlas.naturalHeight===576'),'reject incomplete atlas');
assert(loader.includes("hero-car-attack.png?v=38-clean-hero-sprite"),'runtime bitmap must bypass old PWA/CDN cache');
assert(html.includes('style.css?v=38-clean-hero-sprite')&&html.includes('app.js?v=37-tiny-items'),'fresh stylesheet and service worker bootstrap');
assert(sw.includes('cache.match(new URL(u.pathname,u.origin))'),'offline use of versioned resource requests can fall back to unversioned pre-cache');
assert(fs.readFileSync('dist/style.css','utf8').includes('hero-car-attack.png?v=38-clean-hero-sprite'),'portrait CSS must display the same current atlas');
const source=fs.readFileSync('dist/game.js','utf8'),noop=()=>{},els={},calls=[];
const g=new Proxy({drawImage:(...args)=>calls.push(args)},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
const el=id=>els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,addEventListener:noop,
 setAttribute:noop,getContext:()=>g,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop};
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const image={naturalWidth:1536,naturalHeight:576};
const sandbox={document:{getElementById:el,addEventListener:noop},
 window:{ZZHeroCarAttack:{ready:true,image},AudioContext:AudioMock,addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},requestAnimationFrame:noop,
 setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console,artCalls:calls};
vm.createContext(sandbox);
vm.runInContext(source+`
function check(v,msg){if(!v)throw Error(msg)}
start();serve();
check(PY===584&&DEFENSE_Y===565,'racket bounce line raised 20px yet remains below the zombie defense line');
check(HEROES.map(h=>h.name).join(',')==='에이스,루비,리암','original playable names restored');
for(let i=0;i<3;i++){
 selectedHero=i;artCalls.length=0;heroAttackTime=0;player();
 check(artCalls.length===1,'one composite car/hero bitmap rather than duplicated procedural cars');
 const a=artCalls[0];
 check(a[1]===0&&a[2]===i*192&&a[3]===192&&a[4]===192,'correct row and frame');
 check(a[5]===car-108/2&&a[6]===579-108/2,'70% scale stays centered around original hero/car sprite midpoint');
 check(a[7]===108&&a[8]===108,'onscreen hero/car are 70% of 154px while 192px source stays intact');
}
selectedHero=1;artCalls.length=0;
heroAttackTime=HERO_ATTACK_DURATION;player();
check(artCalls[0][1]===384,'bat wind-up frame starts on weapon animation');
artCalls.length=0;heroAttackTime=HERO_ATTACK_DURATION*.55;player();
check(artCalls[0][1]!==384,'animation advances through swinging sprite cells');
heroAttackTime=0;balls=[newBall(car,PY-9,0,380,false)];mode='playing';update(.02);
check(heroAttackTime===HERO_ATTACK_DURATION,'actual ball bounce starts swing animation');
artCalls.length=0;player();
check(artCalls[0][2]===192,'pink car stays selected while bouncing');
// The hitbox is raised together with the visible line, not just drawn higher.
start();serve();selectedHero=0;balls=[newBall(car,584-9,0,380,false)];
update(.02);check(balls[0].vy<0,'ball rebounds at the new 584px weapon height');
start();serve();balls=[newBall(car,600,0,380,false)];update(.02);
check(balls[0].vy>0,'old 604px paddle altitude no longer produces an invisible rebound');
console.log('PASS: restored hero names, full-resolution atlas, 70% onscreen size, matching raised line and actual paddle collision, all three attack rows');
`,sandbox);
