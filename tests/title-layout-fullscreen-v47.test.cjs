'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const app=fs.readFileSync('dist/app.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');

assert(html.includes('id="boot-screen"')&&html.includes('id="boot-start"'),'dedicated first-boot attract screen');
assert(html.includes('id="overlay" data-title="true" data-screen="selection"'),'selection follows GAME START');
assert(html.includes('id="overlay-fullscreen"'),'user can re-enter fullscreen on results');
assert(html.indexOf('id="boot-screen"')<html.indexOf('</section><div class="desktop-note"'),'attract covers the game machine, not a separate browser page');
assert(html.includes('game.js?v=71-boss-open-space')&&html.includes('app.js?v=47-native-fullscreen'),'new game and fullscreen scripts loaded');
assert(html.includes('style.css?v=55-hero-anim'),'layout cache bypass');
assert(sw.includes('zombie-zero-shell-v71-boss-open-space'),'PWA cache invalidated');
assert(css.includes('#overlay[data-screen="selection"] .hero-card')&&css.includes('#overlay[data-screen="results"] .hero-card'),'both screens use matching hero-card rules');
assert(css.includes('height:auto!important;min-height:165px!important'),'old forced 112px portrait card height overridden');
assert(css.includes('.boot-screen[hidden]{display:none!important}'),'first title is removed after start');
assert(game.includes("name:'리아'")&&!game.includes("name:'리암'"),'third heroine uses a feminine visible name');
assert(game.includes("'results':'pause'"),'game-over overlay receives separate results layout');
assert(game.includes("id:'liam',name:'리아'"),'combat hero internal identity preserved');

const node=(id)=>{
 if(!nodes[id])nodes[id]={
  id,hidden:id==='overlay-fullscreen',open:false,style:{},textContent:'',onclick:null,
  children:[],handlers:{},
  addEventListener(event,fn){(this.handlers[event]??=[]).push(fn);},
  appendChild(x){this.children.push(x);},
  click(){for(const f of this.handlers.click||[])f({type:'click'});this.onclick?.({type:'click'});},
  setAttribute(){},showModal(){this.open=true;},close(){this.open=false;},
 };
 return nodes[id];
};
const nodes={};
const listeners={};
const classes=new Set();
const styleVars={};
const root={
 classList:{
  add(k){classes.add(k);},
  toggle(k,v){if(v)classes.add(k);else classes.delete(k);},
  contains(k){return classes.has(k);}
 },
 style:{setProperty(k,v){styleVars[k]=v;}},
 requestFullscreen(){requests++;doc.fullscreenElement=root;return Promise.resolve();}
};
let requests=0,fitCalls=0;
const doc={
 documentElement:root,fullscreenElement:null,
 getElementById:node,
 querySelector(q){return {name:q};},
 addEventListener(k,f){(listeners['document:'+k]??=[]).push(f);}
};
const win={
 innerWidth:420,innerHeight:830,
 matchMedia:()=>({matches:false}),
 addEventListener(k,f){(listeners['window:'+k]??=[]).push(f);},
 requestAnimationFrame(){}
};
const ctx={
 document:doc,window:win,
 navigator:{maxTouchPoints:1,userAgent:'Android Chrome'},
 resizeCanvas(){fitCalls++;},
 mode:'menu',pause(){},
 requestAnimationFrame(){},console,Promise
};
vm.runInNewContext(app,ctx);
assert(classes.has('portrait-play'),'portrait fullscreen shell remains active');
assert.equal(node('boot-screen').hidden,false,'separate splash is initially visible');
assert.equal(requests,0,'fullscreen not requested before user input');
node('boot-start').click();
assert.equal(requests,1,'GAME START asks for native fullscreen in same click');
assert.equal(node('boot-screen').hidden,true,'select hero screen becomes visible after GAME START');
assert.equal(node('overlay-fullscreen').hidden,true,'no recovery button during native fullscreen');
assert(fitCalls>=2,'fit refreshes after entering fullscreen');
doc.fullscreenElement=null;
for(const cb of listeners['document:fullscreenchange']||[])cb();
assert.equal(node('overlay-fullscreen').hidden,false,'result and selection expose retry after platform fullscreen exits');
node('overlay-fullscreen').click();
assert.equal(requests,2,'fullscreen recovers on a fresh explicit click');
assert.equal(node('overlay-fullscreen').hidden,true);
assert.equal(node('boot-screen').hidden,true,'returning from game never reopens the startup splash');
console.log('PASS: first-launch GAME START, full hero cards, results parity, Ria, fullscreen entry and recovery.');
