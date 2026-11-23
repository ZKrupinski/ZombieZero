'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const app=fs.readFileSync('dist/app.js','utf8');
const style=fs.readFileSync('dist/style.css','utf8');
const start=src.indexOf("const HAPTICS_STORAGE_KEY='zz-device-haptics-enabled';");
const stop=src.indexOf('function circleRect(',start);
assert(start>=0&&stop>start,'Haptic scope must exist');
const code=src.slice(start,stop);
function make(seed={}){
 const data=new Map(Object.entries(seed)),pulses=[],attrs={};
 let clock=1000;
 const status={textContent:''};
 const btn={
  dataset:{},textContent:'VIBRATION ON',listeners:{},attrs,
  setAttribute(name,value){attrs[name]=value},
  querySelector(selector){return selector==='.option-status'?status:null},
  addEventListener(name,fn){this.listeners[name]=fn}
 };
 const box={
  window:{},navigator:{vibrate(pattern){pulses.push(pattern);return true}},
  $:id=>id==='haptics-toggle'?btn:null,
  document:{hidden:false,getElementById(id){return id==='haptics-toggle'?btn:null}},
  localStorage:{
   getItem(k){return data.has(k)?data.get(k):null},
   setItem(k,value){data.set(k,String(value))}
  },
  performance:{now(){return clock}},
  console,URLSearchParams
 };
 vm.createContext(box);
 vm.runInContext('let lastBuzz=0,buzzLockedUntil=0,buzzPriority=0,cameraKick=0,lastCameraFeedback=0;\n'+code,box);
 const get=expr=>vm.runInContext(expr,box);
 return{pulses,status,btn,data,get,setTime(ms){clock=ms},
  feedback(kind,ms){clock=ms;get('feedback('+JSON.stringify(kind)+')')},
  click(){btn.listeners.click()}};
}
// A first-time install defaults to player-only, not full blast.
const fresh=make();
assert.equal(fresh.get('hapticsMode'),'player');
assert.equal(fresh.get('hapticsEnabled'),true);
assert.equal(fresh.status.textContent,'플레이어 중심');
assert.equal(fresh.btn.dataset.state,'on');
assert.equal(fresh.btn.dataset.mode,'player');
assert.equal(fresh.btn.attrs['aria-pressed'],'true');
const unwanted=['hit','powerHit','kill','fireKill','critical','bossHit','bossKill','blast',
 'junkHit','junkGround','citizen','rescue','wall','item','miss','gameOver','lastStand',
 'shield','bossSpawn','start','wave','victory'];
let now=1100;
for(const name of unwanted){fresh.feedback(name,now+=1000);assert.equal(
 fresh.pulses.filter(v=>v!==0).length,0,name+' must never vibrate in PLAYER mode');}
const allowed=['serve','racket','car','poisonBlock','groggy','groggyRecover','blocked'];
for(const name of allowed){
 const count=fresh.pulses.filter(v=>v!==0).length;
 fresh.feedback(name,now+=1000);
 assert.equal(fresh.pulses.filter(v=>v!==0).length,count+1,
  name+' must vibrate once in PLAYER mode');
}
const count=fresh.pulses.filter(v=>v!==0).length;
// The real button cycles PLAYER -> FULL -> OFF -> PLAYER, never becomes
// actually disabled, and cancels an outstanding FULL vibration on change.
fresh.click();
assert.equal(fresh.get('hapticsMode'),'full');
assert.equal(fresh.status.textContent,'풀 진동');
assert.equal(fresh.btn.dataset.state,'on');
fresh.feedback('bossKill',now+=1000);
assert.equal(fresh.pulses.filter(v=>v!==0).length,count+1,
 'FULL must retain original zombie feedback');
fresh.click();
assert.equal(fresh.get('hapticsMode'),'off');
assert.equal(fresh.btn.dataset.state,'off');
assert.equal(fresh.btn.attrs['aria-pressed'],'false');
assert.equal(fresh.status.textContent,'진동 없음');
const before=fresh.pulses.filter(v=>v!==0).length;
fresh.feedback('serve',now+=1000);
assert.equal(fresh.pulses.filter(v=>v!==0).length,before,'OFF blocks all pulses');
assert.equal(typeof fresh.btn.listeners.click,'function','OFF must remain tappable');
fresh.click();assert.equal(fresh.get('hapticsMode'),'player');
assert.equal(fresh.data.get('zz-device-haptics-mode'),'player');
assert.equal(fresh.data.get('zz-device-haptics-enabled'),'1');
assert.equal(make(Object.fromEntries(fresh.data)).get('hapticsMode'),'player',
 'chosen mode survives reload');
assert.equal(make({'zz-device-haptics-enabled':'0'}).get('hapticsMode'),'off',
 'legacy OFF must stay OFF');
assert.equal(make({'zz-device-haptics-enabled':'1'}).get('hapticsMode'),'full',
 'legacy ON remains FULL for returning players');
assert.equal(make({'zz-device-haptics-mode':'player','zz-device-haptics-enabled':'0'}).get('hapticsMode'),'player',
 'new preference takes priority over legacy flag');
assert(src.includes("if(typeof feedback==='function')feedback('groggyRecover')"),
 'recovering from groggy must create a one-time feedback event');
assert(src.includes("feedback('poisonBlock')")&&src.includes("feedback('groggy')"),
 'projectile interception and groggy transitions still use real feedback');
assert(app.includes("'플레이어 중심'")&&app.includes("'풀 진동'"),
 'app option decoration must show all three modes');
assert(style.includes('#haptics-toggle[data-mode="off"]::after'),
 'only OFF gets an inactive decoration');
assert(html.includes('-v315-player-haptics'),'haptic assets must cache-bust');
console.log('PASS v315: fresh-player default, full legacy migration, no zombie pulses, hero-only events, groggy recovery, cyclic option and OFF-only inactive styling');
