'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const noop=()=>{},elements={};
const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return elements[id]??={textContent:'',innerHTML:'',style:{},
 hidden:false,addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,
 Math:Object.create(Math),console};
vm.createContext(sandbox);
const source=fs.readFileSync('dist/game.js','utf8');
vm.runInContext(source+"\nfunction check(ok,msg){if(!ok)throw Error(msg)}\ncheck(BOSS_SWEEP_MIN>=80&&BOSS_SWEEP_MAX>=180,'boss has broad lane-travel targets');\nstart();serve();wave=3;rack();mode='playing';\nconst boss=foes.find(z=>z.boss);\ncheck(boss&&foes.length>15,'boss stage has dense followers');\nconst initialX=boss.x;\nfor(let i=0;i<90;i++){clock+=.016;march(.016);}\ncheck(Math.abs(boss.x-initialX)<1,'boss waits while surrounding lanes are blocked');\nfoes=[boss];boss.bossNextMove=clock;\nlet minX=boss.x,maxX=boss.x,maxDepthOffset=0;\nlet movedCount=0,heldOrientation=0;\nfor(let i=0;i<520;i++){\n const old=boss.x;clock+=.016;march(.016);\n check(boss.x>=zombieMinX()-.01&&boss.x<=zombieMaxX(boss)+.01,'boss stays inside painted sides');\n check(Number.isFinite(boss.y)&&Number.isFinite(boss.x),'boss patrol never breaks coordinates');\n check(Math.abs(boss.y-boss.bossHomeY)<=BOSS_DEPTH_SWAY+2,'depth sway cannot accumulate');\n if(Math.abs(boss.x-old)>.05){\n  movedCount++;\n  check(boss.moveDir===Math.sign(boss.x-old),'boss faces its real lateral motion');\n }else if(boss.moveDir===0)heldOrientation++;\n minX=Math.min(minX,boss.x);maxX=Math.max(maxX,boss.x);\n maxDepthOffset=Math.max(maxDepthOffset,Math.abs(boss.y-boss.bossHomeY));\n}\ncheck(maxX-minX>125,'boss uses much wider lanes when arena is empty: '+(maxX-minX));\ncheck(movedCount>100&&heldOrientation>0,'boss alternates readable side travel and pauses');\ncheck(maxDepthOffset>8,'boss also performs restrained forward/backward movement');\nboss.x=180;boss.y=90;boss.bossHomeY=90;\ndelete boss.bossGoalX;delete boss.bossGoalY;\nconst wallEnemy={x:285,y:108,w:33,h:44,hp:10,max:10,kind:0,form:0,row:1,col:7,seed:1.1,burn:0};\nfoes=[boss,wallEnemy];\ncheck(!bossPatrolCorridor(boss,340,90),'wide side sweep cannot cross another zombie');\ncheck(bossPatrolCorridor(boss,60,90),'opposite open side remains traversable');\nfoes=[boss];\ndelete boss.bossGoalX;delete boss.bossGoalY;boss.bossNextMove=clock+100;\ndamage(boss,1,false,{x:100,y:0});\nconst frozenX=boss.x,frozenY=boss.y;\nfor(let i=0;i<5;i++){clock+=.016;march(.016);}\ncheck(Math.abs(boss.x-frozenX)<.001&&Math.abs(boss.y-frozenY)<.001,\n 'hit flash interrupts boss movement without drifting');\nboss.y=DEFENSE_Y-boss.h-48;boss.bossHomeY=boss.y;boss.bossNextMove=clock;\ndelete boss.bossGoalX;delete boss.bossGoalY;\nclock+=.2;boss.hitShakeUntil=clock-1;\nfor(let i=0;i<10;i++){clock+=.016;march(.016);}\ncheck(!Number.isFinite(boss.bossGoalX),'boss stops side sweeps near the defense line');\ncheck(boss.y>DEFENSE_Y-boss.h-48,'boss continues to threaten the defense');\nconsole.log('PASS: blocked boss holds lanes, cleared boss wide side sweeps, small Y jukes, swept no-overlap checks, hit freeze and forward threat');\n",sandbox);
