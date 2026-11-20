'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('dist/progression.js','utf8');
const markup=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/menu-zombie-palette-v211.css','utf8');
assert(css.includes('LOADING UPGRADE...'),'loading message is styled in the existing button');
assert(css.includes('LOAD FAILED · RETRY'),'broken image recovery offers retry');
assert(markup.includes('progression.js?v='),'growth module still included');
function createSandbox(ImageClass,fontReady=Promise.resolve()){
 const listeners={},nodes={};
 const get=id=>nodes[id]??=( {id,dataset:{},hidden:false,open:false,disabled:false,
   innerHTML:'',textContent:'',style:{},setAttribute(){},
   addEventListener(kind,fn){listeners[id+':'+kind]=fn},
   querySelector:()=>null,showModal(){this.open=true},close(){this.open=false}} );
 get('overlay').dataset.screen='selection';
 const window={Image:ImageClass};
 const document={getElementById:get,fonts:{load:()=>Promise.resolve([]),ready:fontReady}};
 const localStorage={getItem:()=>null,setItem(){}};
 const ctx={window,document,localStorage,Date,Math,console,setTimeout,clearTimeout};
 vm.createContext(ctx);vm.runInContext(script,ctx);
 return{ctx,nodes,get,api:window.ZZProgression,listeners};
}
const tick=async()=>{for(let i=0;i<4;i++)await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));};
(async()=>{
 const made=[];
 let resolveFont;
 class HeldImage{
  constructor(){made.push(this)}
  set src(u){this.url=u}
  decode(){return new Promise(resolve=>{this.finishDecode=resolve})}
 }
 const env=createSandbox(HeldImage,new Promise(resolve=>resolveFont=resolve));
 assert.equal(env.api.open(),true);
 assert.equal(env.get('upgrade-dialog').open,false,'dialog remains hidden before font ready');
 assert.equal(env.get('upgrade-open').dataset.upgradeLoad,'loading');
 resolveFont();await tick();
 assert.equal(made.length,36,'all 36 original upgrade assets are queued');
 assert.equal(env.get('upgrade-dialog').open,false,'images not loaded yet');
 made.forEach(img=>img.onload());await tick();
 assert.equal(env.get('upgrade-dialog').open,false,'network load is not enough until image decode');
 made.forEach(img=>img.finishDecode());await tick();
 assert.equal(env.get('upgrade-dialog').open,true,'dialog opens after full decoding');
 assert.equal(env.get('upgrade-open').disabled,false,'launch button restored');
 env.get('upgrade-dialog').close();
 env.api.open();await tick();
 assert.equal(env.get('upgrade-dialog').open,true,'cached resources allow instant later opening');
 // Failed asset retries once and leaves the menu visible, not a partial dialog.
 const counts=new Map();
 class RetryImage{
  set src(url){
   const n=(counts.get(url)||0)+1;counts.set(url,n);
   queueMicrotask(()=>{
    if(url.includes('upgrade-sign-v198.webp')&&n<=2)this.onerror();
    else this.onload();
   });
  }
  decode(){return Promise.resolve()}
 }
 const retry=createSandbox(RetryImage);
 retry.api.open();await tick();
 assert.equal(retry.get('upgrade-dialog').open,false,'a missing upgrade image prevents opening');
 assert.equal(retry.get('upgrade-open').dataset.upgradeLoad,'error','failure is visible on button');
 assert.equal(retry.get('upgrade-open').disabled,false,'button remains retryable');
 retry.api.open();await tick();
 assert.equal(retry.get('upgrade-dialog').open,true,'retry opens after the missing image loads');
 // If the user started gameplay meanwhile, even a completed load cannot show the modal.
 const deferred=[];
 class DelayedImage{
  constructor(){deferred.push(this)}
  set src(v){this.url=v}
  decode(){return Promise.resolve()}
 }
 const background=createSandbox(DelayedImage);
 background.api.open();await tick();
 background.get('overlay').dataset.screen='pause';
 deferred.forEach(img=>img.onload());await tick();
 assert.equal(background.get('upgrade-dialog').open,false,'do not open above paused gameplay');
 console.log('PASS v221: upgrade artwork and font ready before dialog, failure retry, navigation safety');
})().catch(err=>{console.error(err);process.exitCode=1});
