'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const noop=()=>{},els={};
const ctx=new Proxy({},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){return els[id]??={textContent:'',innerHTML:'',style:{},hidden:false,
 addEventListener:noop,setAttribute:noop,getContext:()=>ctx,
 getBoundingClientRect:()=>({width:450,height:710,left:0,top:0}),setPointerCapture:noop}}
class AudioMock{constructor(){this.currentTime=0;this.sampleRate=44100;this.destination={}}
 resume(){}createBuffer(n,len){return{getChannelData:()=>new Float32Array(len)}}
 createBufferSource(){return{connect:noop,start:noop,stop:noop}}
 createDelay(){return{delayTime:{value:0},connect:noop}}
 createGain(){return{gain:{value:1,setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop}}
 createOscillator(){return{frequency:{setValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:noop,start:noop,stop:noop}}
}
const sandbox={navigator:{},document:{getElementById:el,addEventListener:noop},
 window:{AudioContext:AudioMock,addEventListener:noop},
 localStorage:{getItem:()=>0,setItem:noop},Path2D:class{},
 requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,Math:Object.create(Math),console};
vm.createContext(sandbox);
const geometry=fs.readFileSync('dist/assets/ip/v2/sprite-geometry.js','utf8');
vm.runInContext(geometry,sandbox);
vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`
function check(cond,msg){if(!cond)throw Error(msg)}
{
 check(ENEMY_COLUMNS===9,'nine packed horizontal columns');
 check(ENEMY_LEFT_X===23&&ENEMY_LEFT_X+ENEMY_PITCH*8===394,'horde fills both edges of playfield');
 const step=ENEMY_PITCH;
 check(ENEMY_ROW_PITCH===58,'crowded formation vertical pitch');
 const firstX=ENEMY_LEFT_X+33/2,lastX=ENEMY_LEFT_X+ENEMY_PITCH*8+33/2;
 const alpha=window.ZZSpriteGeometry?.green_zombie?.down;
 if(alpha){const half=alpha[2]/2*Math.min(66/122,55/122,43/92);check(firstX-half>=20&&lastX+half<=430,'bitmap stays inside edge lanes')}

 check(step>45&&step<47,'roughly 46px between 33px collision boxes');
 start();serve();
 for(const stage of [1,2,3,4,6,20,50]){
  wave=stage;rack();
  const rows=wave===1?2:Math.min(4,Math.max(3,Math.round(Math.min(5,3+Math.floor(wave/2))*7/ENEMY_COLUMNS))),boss=wave%3===0;
  const count=rows*9-(boss?6:0)+(boss?1:0);
  check(foes.length===count,'near-original difficulty at stage '+stage);
  check(foes.every(z=>z.row>=0||z.boss),'every spawned enemy has a row');
  const normals=foes.filter(z=>!z.boss);
  check(normals.every(z=>z.col>=0&&z.col<=8),'valid columns');
  for(let row=0;row<rows;row++){
   const group=normals.filter(z=>z.row===row);
   check(group.length===(boss&&row<2?6:9),'dense row size');
   const xs=group.map(z=>z.x);
   check(xs.every((x,i)=>i===0||x>xs[i-1]),'left-to-right stable order');
   check(group.every(z=>z.y===70+row*ENEMY_ROW_PITCH),'58px vertical packing');
  }
  if(!boss){
   const first=normals.find(z=>z.row===0&&z.col===0);
   const last=normals.find(z=>z.row===0&&z.col===8);
   check(first.x===23&&last.x===394,'near-touching stage row from left to right');
  }else{
   const bossActor=foes.find(z=>z.boss);
   check(bossActor.x===192&&bossActor.y===74,'boss stays centered');
   check(normals.filter(z=>z.row<2).every(z=>!([3,4,5].includes(z.col))),
    'boss opening reserves three central lanes');
  }
  const previous=foes.map(z=>[z,z.y,z.hp]);
  march(.25);
  check(previous.every(([z,y,hp])=>z.y>y&&z.hp===hp),
   'dense neighbors never block forward motion at stage '+stage);
 }
 wave=22;rack();
 for(const z of foes)z.y+=250;
 check(triggerLastStand(),'endgame emergency retreat still works');
 for(let row=0;row<4;row++){
  const group=foes.filter(z=>z.row===row);
  check(Math.max(...group.map(z=>z.y))-Math.min(...group.map(z=>z.y))<.001,
   'last stand leaves same-row neighbors horizontally aligned');
 }
 check(foes.every(z=>z.x+z.w<=W&&z.x>=0),'no collider leaves road after retreat');
 console.log('PASS: nine columns, 46px width lanes, 58px rows, boss opening, marching and last stand across stage 1-50');
}
`,sandbox);
