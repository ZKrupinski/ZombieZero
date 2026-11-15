'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const loader=fs.readFileSync('dist/assets/stages/stage-backgrounds-v57.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
assert(html.includes('assets/stages/stage-backgrounds-v57.js?v=66-exact-lanes'),
  'bitmap scene loader is included on the live page');
assert(html.indexOf('stage-backgrounds-v57.js')<html.indexOf('game.js?v=77-analytic-ball-blue-boss'),
  'backgrounds begin loading before gameplay code');
assert(sw.includes('zombie-zero-shell-v77-analytic-ball-blue-boss'),'offline cache invalidated');
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
// Stage 09–18 are exact WebP bytes delivered from one verified ZIP_STORED pack.
// There is no recompression or vector/gradient substitute at runtime.
const expected={
 9:'54e26fd84cb3',10:'2a8c715178cd',11:'fb18885d846c',12:'4c7cf3e1869c',
 13:'4965690931cc',14:'5b8ac34d65e0',15:'e4745f60f4a4',16:'30e16912235b',
 17:'710be3e901e6',18:'452ff0d967a4'
};
const archive='dist/assets/stages/bg-09-18-v57-stored.zip';
const packed=fs.readFileSync(archive);
assert.equal(crypto.createHash('sha256').update(packed).digest('hex'),
 '40f2169f2fa837de0abf56c68282a077fa73c581433e56366aeac1c701ac1493',
 'GitHub archive must contain byte-identical approved v57 art');
assert(sw.includes("'./assets/stages/bg-09-18-v57-stored.zip'"),'all 10 artworks are precached in one ZIP');
let addedBytes=0,at=0,count=0;
while(at+30<=packed.length&&packed.readUInt32LE(at)===0x04034b50){
 const flags=packed.readUInt16LE(at+6),method=packed.readUInt16LE(at+8),
       compressed=packed.readUInt32LE(at+18),rawSize=packed.readUInt32LE(at+22),
       nameLength=packed.readUInt16LE(at+26),extraLength=packed.readUInt16LE(at+28);
 const name=packed.toString('utf8',at+30,at+30+nameLength);
 const m=/^bg-(0[9]|1[0-8])\.webp$/.exec(name);
 assert(m,name+' must be an expected image');
 const stage=Number(m[1]),start=at+30+nameLength+extraLength,stop=start+compressed;
 assert.equal(flags&8,0,'no data descriptors');
 assert.equal(method,0,'ZIP stores already compressed WebP without recompression');
 assert.equal(rawSize,compressed,'each WebP is copied exactly');
 assert(stop<=packed.length);
 const img=packed.subarray(start,stop);
 assert.equal(img.toString('ascii',0,4),'RIFF');
 assert.equal(img.toString('ascii',8,12),'WEBP');
 assert(img.length>100000&&img.length<280000,'compressed full-color game bitmap');
 assert.equal(crypto.createHash('sha256').update(img).digest('hex').slice(0,12),
  expected[stage],name+' is the correct user-approved v57 image');
 names.add(img.subarray(0,Math.min(128,img.length)).toString('base64'));
 addedBytes+=img.length;
 at=stop;count++;
}
assert.equal(count,10,'stage ZIP holds exactly ten new maps');
assert.equal(names.size,18,'all eighteen backgrounds remain distinct');
assert(addedBytes<2500000,'all ten high quality game scenes <2.5MB');
assert(!loader.includes('.webp.b64'),'new runtime loader does not download old text images');
for(const stage of ['09','15']){
 const file='dist/assets/stages/bg-'+stage+'-v66-orthographic.webp';
 const img=fs.readFileSync(file);
 assert.equal(img.toString('ascii',0,4),'RIFF');
 assert.equal(img.toString('ascii',8,12),'WEBP');
 assert.equal(img.toString('ascii',12,16),'VP8 ');
 assert.equal(img.readUInt16LE(26)&0x3fff,900);
 assert.equal(img.readUInt16LE(28)&0x3fff,1420);
 assert(img.length>60000&&img.length<200000);
 assert(sw.includes("'./assets/stages/bg-"+stage+"-v66-orthographic.webp'"));
}
assert(loader.includes("const override={8:'bg-09-v66-orthographic.webp',14:'bg-15-v66-orthographic.webp'}"));
assert(loader.includes("if(i<8)img.src="),'original 8 backgrounds retain their independent WebP source');
assert(loader.includes("fetch(archive).then"),'stages 09–18 load from the one protected binary archive');

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
const images=Array.from({length:18},(_,i)=>({id:i+1,naturalWidth:900,naturalHeight:1420}));
const art={images,ready:new Array(18).fill(true),count:18};
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,ZZStageArt:art,addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},requestAnimationFrame:noop,
 setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console,draws};
vm.createContext(sandbox);
vm.runInContext(game+`
function check(v,m){if(!v)throw Error(m)}
start();serve();
check(STAGE_ART_COUNT===18,'exactly 18 backgrounds');
check(STAGE_PLAYFIELD_VEIL.length===18,'independent playfield contrast for all 18 moods');
for(let stage=1;stage<=36;stage++){
 wave=stage;setStageBackground(true);draws.length=0;background();
 const main=draws.filter(d=>window.ZZStageArt.images.includes(d.args[0]));
 check(main.length===1&&main[0].args[0]===window.ZZStageArt.images[(stage-1)%18],
  'stage '+stage+' maps to the correct bitmap and cycles every 18 stages');
 check(main[0].args.slice(1).join(',')==='0,0,450,710',
  'native source fits fixed 450x710 board');
}
wave=1;setStageBackground(true);
wave=2;setStageBackground();check(previousArtIndex===0&&stageArtIndex===1,'stage transition remembers previous scene');
updateStageBackground(.45);draws.length=0;background();
const transition=draws.filter(d=>window.ZZStageArt.images.includes(d.args[0]));
check(transition.length===2&&transition[0].args[0]===window.ZZStageArt.images[0]&&transition[1].args[0]===window.ZZStageArt.images[1],
 'two stage environments crossfade without blank flash');
check(Math.abs(transition[1].alpha-.5)<.001,'smooth half opacity at mid-transition');
window.ZZStageArt.ready[2]=false;
wave=3;setStageBackground();const old=stageArtBlend;
updateStageBackground(.5);draws.length=0;background();
const missing=draws.filter(d=>window.ZZStageArt.images.includes(d.args[0]));
check(stageArtBlend===old&&missing.length===1&&missing[0].args[0]===window.ZZStageArt.images[1],
 'keep prior scene instead of blank frame when new scene is not loaded yet');
window.ZZStageArt.ready[2]=true;updateStageBackground(.9);
check(previousArtIndex===-1&&stageArtBlend===1,'transition resolves when new image is ready');
window.ZZStageArt.ready.fill(false);draws.length=0;background();
check(draws.filter(d=>window.ZZStageArt.images.includes(d.args[0])).length===0,
 'missing scenery renders the original procedural road rather than crashing');
check(DEFENSE_Y===565&&PY===584&&SHIELD_LINE_Y===H-58,
 'background transition never changes the defense, player or shield collision heights');
console.log('PASS: eighteen distinct mobile-friendly scenes, 36-stage loop, fade, missing-image fallback, untouched ball and shield geometry');
`,sandbox);
