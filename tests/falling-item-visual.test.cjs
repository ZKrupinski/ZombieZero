'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8');
assert(!src.includes('rect(item.x-1,item.y-33'),'old floating crosshair vertical line removed');
assert(!src.includes('rect(item.x-4,item.y-30'),'old floating crosshair horizontal line removed');
assert(src.includes('const FALLING_ITEM_SIZE=46;'),'falling icon larger than previous 34px');
assert(src.includes("g.globalCompositeOperation='lighter'"),'subtle additive icon halo present');
assert(src.includes('g.globalAlpha=.16'),'additive bloom overlay is restrained');
const noop=()=>{},elements={},images=[],rings=[],blends=[];
const ctx=new Proxy({drawImage:(...args)=>images.push(args),arc:(...args)=>rings.push(args)},
 {get:(o,k)=>o[k]??noop,set:(o,k,v)=>{if(k==='globalCompositeOperation')blends.push(v);o[k]=v;return true}});
const el=id=>elements[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop};
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const image={naturalWidth:1024,naturalHeight:128};
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{ZZItemIcons:{ready:true,image},AudioContext:AudioMock,addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},requestAnimationFrame:noop,
 setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console,images,rings,blends};
vm.createContext(sandbox);
vm.runInContext(src+`
function check(v,m){if(!v)throw Error(m)}
start();serve();mode='playing';car=210;
const pickup={k:'pierce',x:177,y:330,phase:0};
images.length=0;blends.length=0;fxEnabled=true;
drawFallingItem(pickup);
const sizes=images.map(a=>a[7]);
check(sizes.includes(46),'normal falling bitmap grows from 34 to 46 logical pixels');
check(sizes.includes(50),'a softly additive halo surrounds the falling PNG');
check(blends.includes('lighter'),'falling icon really uses ADD blend');
check(images.every(a=>a[0]===window.ZZItemIcons.image),'original transparent bitmap remains the source');
const baseCount=images.length;
images.length=0;active.pierce=10;
drawActiveItemIcons();
check(images.length===1&&images[0][7]===17,'equipped icon below car stays 17px unchanged');
images.length=0;itemPickupFX=[];items=[{k:'pierce',x:car,y:PY+3,phase:0}];
update(.016);
check(items.length===0,'real falling loot is collected by the moving car');
check(itemPickupFX.length===1&&itemPickupFX[0].k==='pierce','pickup effect is spawned on real collection');
check(itemPickupFX[0].x===car,'pickup burst follows actual catch position');
images.length=0;rings.length=0;
drawItemPickupFX();
check(images.some(a=>a[7]>=18),'pickup creates distinct growing bitmap image burst');
check(rings.length>0,'pickup confirms collection with brief circular flare');
const elapsed=itemPickupFX[0].t;
update(.12);
check(itemPickupFX.length===1&&itemPickupFX[0].t>elapsed,'pickup effect advances smoothly');
update(.55);
check(itemPickupFX.length===0,'pickup FX clears itself after ~0.62 seconds');
// A new run must never carry stale pickup FX over.
activate('dual',100,300);check(itemPickupFX.length===1,'secondary item also flashes');
start();check(itemPickupFX.length===0,'new game clears lingering pickup effect');
console.log('PASS: falling collectible 46px with restrained additive glow, no crosshair; real pickup image burst, 17px car status unchanged');
`,sandbox);
