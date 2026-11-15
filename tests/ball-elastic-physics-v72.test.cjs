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
if(!source.includes("ballImpact(b,'y',-1,'shield')")||
   !source.includes("ballImpact(b,'y',-1,'citizen')"))
 throw Error('shield and citizen bounces must trigger elastic sprite animation');
vm.runInContext(source+"\nfunction check(ok,msg){if(!ok)throw Error(msg)}\nconst nearly=(a,b)=>Math.abs(a-b)<.00001;\nconst held=newBall(130,230,0,0,true),rest=ballSpritePose(held,8,0,0);\ncheck(rest.index===0&&rest.sx===1&&rest.sy===1,'held ball spins without shape changes');\nconst b=newBall(130,230,250,-420,false);\nb.spinAngle=1.25;\nconst before=[b.x,b.y,b.vx,b.vy];\nballImpact(b,'y',-1,'paddle');\ncheck(nearly(b.bounceDuration,.19),'racket has short calculated elastic response');\ncheck(before.every((v,i)=>v===[b.x,b.y,b.vx,b.vy][i]),'sprite animation never changes collision physics');\nb.bounceTime=b.bounceDuration*.95;\nconst squash=ballSpritePose(b,8,0,.2);\ncheck(squash.index===0&&squash.sx<.92&&squash.sy>1.05,'same resting bitmap mathematically compresses on impact axis');\ncheck(nearly(squash.rotation,Math.PI/2),'vertical bounce compression follows vertical normal');\ncheck(squash.spin===1.25,'squash does not reset the texture rotation');\nb.bounceTime=b.bounceDuration*.42;\nconst stretch=ballSpritePose(b,8,0,.2);\ncheck(stretch.index===0&&stretch.sx>1.08&&stretch.sy<.96,'same frame elongates on recoil');\nconst baseball=ballSpritePose(b,8,1,.2),toy=ballSpritePose(b,8,2,.2);\ncheck(baseball.sx<stretch.sx&&toy.sx>stretch.sx,'baseball is firmer, toy ball softer');\nconst giant=ballSpritePose(b,16,2,.2);\ncheck(giant.sx<toy.sx,'enlarged ball avoids over-deformation');\nballImpact(b,'x',-1,'enemy');\ncheck(nearly(b.bounceDuration,.17),'zombie collision has distinct timing');\nb.bounceTime=b.bounceDuration*.95;\nconst side=ballSpritePose(b,8,0,.3);\ncheck(side.index===0&&side.sx<.92&&side.sy>1.05&&side.rotation===0,'lateral collision compresses along X without sprite swaps');\nballImpact(b,'y',1,'ceiling');\ncheck(nearly(b.bounceDuration,.155),'ceiling response remains crisp');\nb.bounceTime=0;\nconst flight=ballSpritePose(b,8,0,.3);\ncheck(flight.index===0&&flight.sx>1&&flight.sy<1,'fast flight subtly stretches one bitmap along movement');\ncheck(nearly(flight.spin,1.25),'flight texture rotation preserves angular phase');\nstart();serve();\ncheck(balls[0].impactKind==='serve'&&balls[0].vy<0,'launch stretch remains available');\ncheck(ballSpritePose(balls[0],8).index===0,'launch does not switch to deformation sprites');\nconsole.log('PASS: one bitmap frame, calculated velocity/impact deformation, continuous spin and unchanged collisions');\n",sandbox);
