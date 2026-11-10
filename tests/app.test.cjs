const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
const listeners={},els={},vars={},classes=new Set();function el(id){return els[id]??={textContent:'',style:{},showModal(){this.open=true},close(){this.open=false},getBoundingClientRect(){return{height:50}}}}
const root={style:{setProperty:(k,v)=>vars[k]=parseFloat(v)},classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k),contains:k=>classes.has(k)}};
const stage={},main={},bar=el('bar'),machine={children:[stage,...[62,34,34,0,18,28].map(h=>({getBoundingClientRect:()=>({height:h})}))]};let resumed=0;
const s={console,mode:'playing',pause:()=>s.mode='paused',resizeCanvas:()=>resumed++,getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0'}),requestAnimationFrame:fn=>fn(),navigator:{userAgent:'Android',platform:'Linux',maxTouchPoints:1},window:{innerWidth:390,innerHeight:800,matchMedia:q=>({matches:q==='(pointer: coarse)'}),visualViewport:{height:800,width:390,addEventListener(){}},addEventListener:(k,f)=>listeners[k]=f},document:{documentElement:root,fullscreenElement:null,getElementById:el,querySelector:q=>({'main':main,'.machine':machine,'.stage':stage,'.app-bar':bar,'.guide':el('guide')})[q],addEventListener:(k,f)=>listeners[k]=f}};
vm.createContext(s);vm.runInContext(fs.readFileSync('dist/app.js','utf8'),s);
for(const [width,height] of [[390,800],[360,640],[412,915],[844,390]]){s.window.innerWidth=width;s.window.innerHeight=height;s.window.visualViewport.width=width;s.window.visualViewport.height=height;listeners.resize();assert(vars['--board-width']<=width);assert(vars['--board-height']+176+50<=height);assert(classes.has('compact-app'))}
await el('fullscreen').onclick();assert.equal(el('app-dialog').open,true);assert.equal(s.mode,'paused');assert.match(el('app-message').textContent,/지원하지/);
root.requestFullscreen=async()=>s.document.fullscreenElement=root;s.document.exitFullscreen=async()=>s.document.fullscreenElement=null;await el('fullscreen').onclick();assert(s.document.fullscreenElement);await el('fullscreen').onclick();assert.equal(s.document.fullscreenElement,null);
let prompted=0;listeners.beforeinstallprompt({preventDefault(){},prompt:async()=>prompted++,userChoice:Promise.resolve({outcome:'accepted'})});await el('install').onclick();assert.equal(prompted,1);assert.match(el('install').textContent,/설치됨/);
s.navigator.userAgent='iPhone';await el('install').onclick();assert.match(el('app-message').textContent,/Safari/);
let prevented=0;listeners.touchmove({target:{closest:()=>null},preventDefault:()=>prevented++});listeners.touchmove({target:{closest:()=>({})},preventDefault:()=>prevented++});assert.equal(prevented,1);
const manifest=JSON.parse(fs.readFileSync('dist/manifest.webmanifest'));assert.equal(manifest.display,'standalone');for(const i of manifest.icons)assert(fs.existsSync('dist/'+i.src));assert(fs.readFileSync('dist/index.html','utf8').includes('manifest.webmanifest'));
console.log('PASS: four viewport sizes fit game + toolbar, fullscreen/fallback, install prompt/Safari guidance, gesture lock with dialog scroll, manifest assets');
})().catch(e=>{console.error(e);process.exit(1)});
