const vm=require('node:vm'),fs=require('node:fs');
const noop=()=>{},els={},tones=[];const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,addEventListener:noop,setAttribute:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}resume(){}createBuffer(n,len,sr){return{getChannelData:()=>new Float32Array(len)}}createBufferSource(){return{connect:noop,start:noop,stop:noop}}createDelay(){return{delayTime:{value:0},connect:noop}}createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect:noop}}createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}createOscillator(){return{frequency:{setValueAtTime:f=>tones.push(f),exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},window:{AudioContext:AudioMock,addEventListener:noop},localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};vm.createContext(sandbox);

const assert=require('node:assert/strict');let count=0,reject=false,failEcho=false;
class StatefulAudio extends AudioMock{
 constructor(){super();this.state='suspended';this.resumes=0;count++}
 resume(){this.resumes++;if(reject)return Promise.reject(Error('blocked'));this.state='running';return Promise.resolve()}
 createDelay(){if(failEcho)throw Error('optional effect unavailable');return super.createDelay()}
}
sandbox.window.AudioContext=StatefulAudio;
vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);
const run=code=>vm.runInContext(code,sandbox),flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 reject=true;run('start()');await flush();assert.equal(run('audio.state'),'suspended');assert.equal(els.sound.textContent,'♫ 재생');
 let before=tones.length;run("sfx('hit');music()");assert.equal(tones.length,before,'no stale notes scheduled while blocked');
 reject=false;run('recoverAudio({})');await flush();assert.equal(run('audio.state'),'running');assert(tones.length>before,'music and confirmation sound resume');assert.equal(els.sound.textContent,'♫ ON');
 run("audio.state='interrupted';audio.onstatechange()");assert.equal(els.sound.textContent,'♫ 재생');run('recoverAudio({})');await flush();assert.equal(run('audio.state'),'running');
 run("audio.state='suspended'");els.sound.onclick();await flush();assert.equal(run('sound'),true,'retry does not mute');assert.equal(run('audio.state'),'running');
 els.sound.onclick();assert.equal(run('sound'),false);before=run('audio.resumes');run('recoverAudio({})');assert.equal(run('audio.resumes'),before,'deliberate mute respected');els.sound.onclick();await flush();
 const oldCount=count;run("audio.state='closed'");failEcho=true;run('unlockAudio()');await flush();assert.equal(count,oldCount+1);assert.equal(run('audioRunning()'),true,'closed context rebuilt despite optional echo failure');
 run("musicEnabled=false;music()");assert.equal(run('musicBus.gain.value'),0);before=tones.length;run("sfx('car')");assert(tones.length>before,'effects remain available when BGM off');
 run("musicEnabled=true;music()");assert(run('musicBus.gain.value')>0);
 console.log('PASS: blocked start, no stale scheduling, gesture retry, interruption, retry button, mute preference, closed context, optional echo failure, BGM/effects');
})().catch(e=>{console.error(e);process.exitCode=1});
