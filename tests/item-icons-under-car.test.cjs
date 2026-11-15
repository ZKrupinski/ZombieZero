'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path='dist/assets/ip/item-icons-v56.png';
const png=fs.readFileSync(path);
const crypto=require('node:crypto');
assert.equal(crypto.createHash('sha256').update(png).digest('hex'),'9b60efe353d0c7324c942024f890149b16b33bdedea556f9743a2671d847f6ab','must render exact cleaned approved v56 PNG');
assert(!fs.readFileSync('dist/game.js','utf8').includes("SKILLS[k].name+' · '+SKILLS[k].desc"),'item pickups no longer show description toasts');
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','must use genuine PNG');
assert.equal(png.readUInt32BE(16),1024,'8 transparent 128px icons, one row');
assert.equal(png.readUInt32BE(20),128,'icon cells retain 128px master resolution');
assert.equal(png[25],6,'true RGBA color type for clean alpha');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const iconLoader=fs.readFileSync('dist/assets/ip/item-icons.js','utf8');
assert(!html.includes('class="skill-tray"'),'old text timer panel has been deleted from HTML');
assert(!html.includes('class="empty-skills"'),'unused item instruction panel removed');
assert(html.includes('id="skills" hidden'),'invisible legacy DOM hook exists safely');
assert(css.includes('.skill-tray,.empty-skills{display:none!important}'),'old tray is suppressed in all layouts');
assert(html.includes('src="assets/ip/item-icons.js?v=56-premium-clean-alpha"'),'bitmap loader is enabled');
assert(html.indexOf('src="assets/ip/item-icons.js?v=56-premium-clean-alpha"')<html.indexOf('src="game.js?v=68-visible-hitstop"'),'load art before game');
assert(sw.includes("assets/ip/item-icons-v56.png")&&sw.includes("assets/ip/item-icons.js"),'both offline bitmap and loader are precached');
assert(iconLoader.includes('naturalWidth===1024&&image.naturalHeight===128'),'reject wrong atlas dimensions');
const noop=()=>{},elements={},drawCalls=[],arcCalls=[];
const ctx=new Proxy({drawImage:(...args)=>drawCalls.push(args),arc:(...args)=>arcCalls.push(args)},
 {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
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
const atlasImage={naturalWidth:1024,naturalHeight:128};
const sandbox={document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,ZZItemIcons:{image:atlasImage,ready:true},addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},navigator:{},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console,
 drawCalls,arcCalls};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`
function check(v,m){if(!v)throw Error(m)}
start();serve();car=225;mode='playing';
active={pierce:10,dual:16,fire:10};skillUI();
check($('skills').hidden&&$('skills').innerHTML==='','no textual duration cards visible');
drawCalls.length=0;arcCalls.length=0;drawActiveItemIcons();
check(drawCalls.length===3,'exactly three small icon images under vehicle');
check(drawCalls.every(a=>a[0]===window.ZZItemIcons.image&&a[3]===128&&a[4]===128),'draw using exact source RGBA tiles');
check(drawCalls.map(a=>a[1]).join(',')==='128,512,768','dual, fire and approved piercing bullet tiles drawn in stable order');
check(drawCalls.every(a=>a[7]===22&&a[8]===22),'readable 22px status icons keep a consistent pixel size');
check(drawCalls.every(a=>a[6]===637-22/2),'item badges sit tightly under wheels, with timer arcs clear of the shield at Y=652');
check(arcCalls.length===6,'each icon has a small clock arc instead of text digits');
const firstX=drawCalls[0][5];car=280;drawCalls.length=0;drawActiveItemIcons();
check(Math.abs(drawCalls[0][5]-firstX-55)<.01,'all three active badges follow actual horizontal car position');
active={pierce:10};drawCalls.length=0;drawActiveItemIcons();
check(drawCalls.length===1&&drawCalls[0][1]===768,'approved blue ball-arrow crate is the piercing icon');
active=Object.fromEntries(Object.keys(SKILLS).map(k=>[k,SKILLS[k].duration]));
car=72;drawCalls.length=0;drawActiveItemIcons();
check(drawCalls.length===8,'all eight equipped skill icons are supported');
check(drawCalls.every(a=>a[5]>=0&&a[5]+a[7]<=450),'all icon-only statuses remain on-screen at left car edge');
car=378;drawCalls.length=0;drawActiveItemIcons();
check(drawCalls.every(a=>a[5]>=0&&a[5]+a[7]<=450),'all icons remain on-screen at right car edge');
check(skillUI()===undefined,'icon status render has no timer text cards');
console.log('PASS: eight 128px voxel image icons incl golden bullet, no bottom timer panels, 22px car-follow badges with countdown arcs and edge safety');
`,sandbox);
