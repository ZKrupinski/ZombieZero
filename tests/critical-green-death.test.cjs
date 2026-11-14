'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const noop=()=>{},els={};
const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,addEventListener:noop,setAttribute:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}resume(){}createBuffer(n,len,sr){return{getChannelData:()=>new Float32Array(len)}}createBufferSource(){return{connect:noop,start:noop,stop:noop}}createDelay(){return{delayTime:{value:0},connect:noop}}createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},window:{AudioContext:AudioMock,addEventListener:noop},localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`
function check(v,m){if(!v)throw Error(m)}
{ start();serve();wave=1;rack();
const target=foes[0],oldX=target.x,oldY=target.y,oldW=target.w,oldH=target.h;
target.form=0;target.hp=3;target.max=3;
const oldScore=score;
damage(target,1,false,{x:0,y:1},true);
check(!foes.includes(target),'fatal critical removes enemy from physics immediately');
check(score>oldScore,'critical kill still scores once');
check(enemyDeaths.length===1&&enemyDeaths[0].critical,'explicit full-health critical strike triggers green sequence');
check(enemyDeaths[0].split>.5,'critical uses a readable open-lid and brain interval');
check(target.x===oldX&&target.y===oldY&&target.w===oldW&&target.h===oldH,'critical animation does not alter physics');
drawEnemyDeaths();
updateEnemyVisuals(.34);
check(enemyDeaths.length===1,'lid / brain reveal remains onscreen before shattering');
drawEnemyDeaths();
updateEnemyVisuals(.25);
check(enemyDeaths.length===0&&enemyPieces.length===6,'six special green pieces after reveal');
check(enemyPieces.every(p=>p.criticalGreen),'lid, brain, green body fragment types retained');
drawEnemyDeaths();
let once=score;damage(target,10);check(score===once,'no double-awarded critical kill');
start();serve();wave=1;rack();let normal=foes[0];normal.form=0;normal.hp=1;normal.max=1;
damage(normal,1,false);check(enemyDeaths.length===1&&!enemyDeaths[0].critical,'ordinary one-damage kill uses ordinary death');
start();serve();wave=1;rack();let burning=foes[0];burning.form=0;burning.hp=1;burning.max=1;
damage(burning,3,true);check(enemyDeaths.length===1&&!enemyDeaths[0].critical,'burn damage does not trigger critical');
start();serve();wave=3;rack();let boss=foes.find(z=>z.boss);boss.hp=1;
damage(boss,5,false);check(enemyDeaths.length===1&&!enemyDeaths[0].critical,'boss still uses boss-specific death');
console.log('PASS: green critical lid reveal, brain, 6 themed fragments, single kill, unchanged collider and ordinary/burn/boss fallbacks');
}
`,sandbox);
