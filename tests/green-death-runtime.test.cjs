'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},els={},draws=[];
const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',hidden:false,style:{},addEventListener:noop,setAttribute:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}resume(){}createBuffer(n,len,sr){return{getChannelData:()=>new Float32Array(len)}}createBufferSource(){return{connect:noop,start:noop,stop:noop}}createDelay(){return{delayTime:{value:0},connect:noop}}createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},window:{AudioContext:AudioMock,addEventListener:noop,ZZGreenDeath:{ready:true,draw:(...args)=>{draws.push(args);return true}}},localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console,draws};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`
function check(cond,message){if(!cond)throw Error(message)}
{
 start();serve();wave=1;rack();
 let green=foes.find(z=>!z.boss);
 green.form=0;green.hp=1;green.max=1;
 let oldScore=score;
 zombie(green);check(window.ZZGreenDeath.draw!==undefined,'active art available');
 let idleDraws=draws.length;
 damage(green,1,false);
 check(score>oldScore&&enemyDeaths.length===1,'regular death keeps scoring');
 check(enemyDeaths[0].spriteMode&&enemyDeaths[0].split===.520,'normal death uses 8-frame timing');
 drawEnemyDeaths();check(draws.length>idleDraws,'original bitmap rendered in live scene');
 updateEnemyVisuals(.30);check(enemyDeaths.length===1,'regular fall persists after 0.30s');
 updateEnemyVisuals(.23);check(!enemyDeaths.length&&!enemyPieces.length,'normal PNG complete, no duplicate shattered body');
 start();serve();wave=1;rack();
 let critical=foes.find(z=>!z.boss);
 critical.form=0;critical.hp=2;critical.max=2;
 damage(critical,2,false);
 check(enemyDeaths.length===1&&enemyDeaths[0].critical&&enemyDeaths[0].spriteMode,'strong lethal attack triggers bitmap critical');
 check(enemyDeaths[0].split===.580,'critical 10-frame duration');
 drawEnemyDeaths();
 updateEnemyVisuals(.59);
 check(enemyDeaths.length===0&&enemyPieces.length===0,'critical atlas already includes scatter, prevent double');
 const frames=draws.filter(a=>a[2]===true).length;check(frames>0,'critical atlas draw called');
 console.log('PASS: in-game green living sprite, normal and critical PNG death timings, draw calls, no duplicate debris, original scoring');
}
`,sandbox);
