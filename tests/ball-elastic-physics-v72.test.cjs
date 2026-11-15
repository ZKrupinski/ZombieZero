'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const noop=()=>{},els={};
const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock {
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},
 Path2D:class{},requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
const source=fs.readFileSync('dist/game.js','utf8');
vm.runInContext(source+"\nfunction check(ok,message){if(!ok)throw Error(message)}\nconst almost=(a,b)=>Math.abs(a-b)<.00001;\nconst resting=newBall(130,230,0,0,true),atRest=ballSpritePose(resting,8,0,0);\ncheck(atRest.sx===1&&atRest.sy===1,'held ball stays round');\nconst b=newBall(130,230,250,-420,false);\nconst previous=[b.x,b.y,b.vx,b.vy];\nballImpact(b,'y',-1,'paddle');\ncheck(almost(b.bounceDuration,.235)&&b.impactKind==='paddle','racket holds more squash frames');\ncheck(previous.every((n,i)=>n===[b.x,b.y,b.vx,b.vy][i]),'animation does not alter physics');\nb.bounceTime=b.bounceDuration*.8;\nconst squash=ballSpritePose(b,8,0,.2);\ncheck(squash.index===2&&squash.sy<1&&squash.sx>1,'vertical impact uses frame 2 and squashes into racket');\nb.bounceTime=b.bounceDuration*.5;\nconst stretch=ballSpritePose(b,8,0,.2);\ncheck(stretch.index===3&&stretch.sy>1&&stretch.sx<1,'racket rebound uses frame 3 and stretches upward');\nconst baseball=ballSpritePose(b,8,1,.2),toy=ballSpritePose(b,8,2,.2);\ncheck(baseball.sy<stretch.sy&&toy.sy>stretch.sy,'three hero balls have different firmness');\nconst big=ballSpritePose(b,16,2,.2);\ncheck(big.sy<toy.sy,'power ball scales less than rubber toy');\nballImpact(b,'x',-1,'enemy');\ncheck(almost(b.bounceDuration,.205),'enemy contact has unique animation timing');\nb.bounceTime=b.bounceDuration*.8;\nconst sideSquash=ballSpritePose(b,8,0,.3);\ncheck(sideSquash.index===4&&sideSquash.sx<1&&sideSquash.sy>1,'leftward contact uses compression frame 4');\nb.bounceTime=b.bounceDuration*.5;\nconst sideRebound=ballSpritePose(b,8,0,.3);\ncheck(sideRebound.index===5&&sideRebound.sx>1&&sideRebound.sy<1,'side recoil uses frame 5');\nballImpact(b,'y',1,'ceiling');\ncheck(almost(b.bounceDuration,.175),'ceiling bounce stays short');\nb.bounceTime=0;\nconst flying=ballSpritePose(b,8,0,.3);\ncheck(flying.sx>1&&flying.sy<1,'fast flight stretches subtly');\nstart();serve();\ncheck(balls[0].impactKind==='serve'&&balls[0].vy<0,'serve enters launch stretch, keeps upward velocity');\ncheck(source.includes(\"ballImpact(b,'y',-1,'shield')\"),'shield uses same elastic reaction');\ncheck(source.includes(\"ballImpact(b,'y',-1,'citizen')\"),'citizen uses same elastic reaction');\nconsole.log('PASS: approved 8-frame tennis/baseball/toy use squash, stretch and recovery by collision type and speed; physics unchanged');\n",sandbox);
