'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const app=fs.readFileSync('dist/app.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
assert(html.includes('id="boot-scene" class="zz-boot-scene"'));
assert(html.includes('id="boot-load-status"'));
assert(css.includes('53px * var(--ui-scale,1)'));
assert(css.includes('left:50%!important;'),'combo stays centered at all widths');
const nodes={};
function mk(id){
 if(!nodes[id])nodes[id]={id,hidden:false,style:{},textContent:'',handlers:{},children:[],open:false,
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn)},
 appendChild(child){this.children.push(child)},
 click(){for(const fn of this.handlers.click||[])fn()},
 setAttribute(){},showModal(){this.open=true},close(){this.open=false}
 };
 return nodes[id];
}
const waiting={src:'https://example.org/assets/ip/hero-car-attack.png',complete:false,naturalWidth:0,handlers:{},
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn)},
 removeEventListener(type,fn){this.handlers[type]=(this.handlers[type]||[]).filter(x=>x!==fn)},
 decode(){return Promise.resolve()},
 fire(type){for(const fn of [...(this.handlers[type]||[])])fn()}
};
const classes=new Set(['zz-scene-title']);
const root={classList:{add(k){classes.add(k)},remove(k){classes.delete(k)},toggle(k,v){v?classes.add(k):classes.delete(k)},contains(k){return classes.has(k)}},
 style:{setProperty(){}},requestFullscreen(){fullscreenCalls++;doc.fullscreenElement=root;return Promise.resolve()}};
let fullscreenCalls=0;
const doc={documentElement:root,fullscreenElement:null,images:[waiting],fonts:{ready:Promise.resolve()},
 getElementById:mk,querySelector:q=>({name:q}),addEventListener(){}};
const win={innerWidth:390,innerHeight:844,matchMedia:()=>({matches:false}),addEventListener(){}};
const env={document:doc,window:win,navigator:{maxTouchPoints:1,userAgent:'Android'},
 requestAnimationFrame:fn=>fn(),resizeCanvas(){},setTimeout,clearTimeout,Date,console,Promise,mode:'menu',pause(){}};
vm.runInNewContext(app,env);
mk('boot-start').click();
assert.equal(fullscreenCalls,1,'click immediately requests fullscreen');
assert.equal(mk('boot-screen').hidden,false,'title visible while image pending');
assert(classes.has('zz-scene-loading'),'title waits for decoding');
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(mk('boot-screen').hidden,false,'no premature selection');
 waiting.complete=true;waiting.naturalWidth=192;waiting.fire('load');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(mk('boot-screen').hidden,true,'title released after image decoded');
 assert.equal(mk('boot-scene').hidden,true,'independent title removed');
 assert(classes.has('zz-scene-selection'),'selection visible');
 console.log('PASS: fullscreen gesture, deferred image decode, atomic title transition.');
})().catch(e=>{console.error(e);process.exitCode=1});
