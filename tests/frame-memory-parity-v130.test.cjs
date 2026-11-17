'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8');
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function referenceTrail(b,r){
 if(b.held||!b.trail?.length)return [];
 const raw=[{x:b.x,y:b.y},...b.trail],limit=r>8?BALL_TRAIL_POWER:BALL_TRAIL_NORMAL;
 let total=0;const path=[{x:b.x,y:b.y,s:0}];
 for(let i=0;i<raw.length-1&&total<limit;i++){
  const p=raw[i],q=raw[i+1],prev=raw[Math.max(0,i-1)],next=raw[Math.min(raw.length-1,i+2)];
  const dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy);if(len<.6)continue;
  const count=Math.ceil(len/2.6);
  for(let n=1;n<=count;n++){
   const t=n/count,t2=t*t,t3=t2*t,corner=p.corner||q.corner;
   const m0x=corner?dx:(q.x-prev.x)*.5,m0y=corner?dy:(q.y-prev.y)*.5;
   const m1x=corner?dx:(next.x-p.x)*.5,m1y=corner?dy:(next.y-p.y)*.5;
   const x=clamp(corner?p.x+dx*t:(2*t3-3*t2+1)*p.x+(t3-2*t2+t)*m0x+(-2*t3+3*t2)*q.x+(t3-t2)*m1x,Math.min(p.x,q.x),Math.max(p.x,q.x));
   const y=clamp(corner?p.y+dy*t:(2*t3-3*t2+1)*p.y+(t3-2*t2+t)*m0y+(-2*t3+3*t2)*q.y+(t3-t2)*m1y,Math.min(p.y,q.y),Math.max(p.y,q.y));
   const last=path[path.length-1],step=Math.hypot(x-last.x,y-last.y);if(step<.04)continue;
   if(total+step>=limit){const z=(limit-total)/step;path.push({x:last.x+(x-last.x)*z,y:last.y+(y-last.y)*z,s:limit});return path}
   total+=step;path.push({x,y,s:total});
  }
 }
 return path;
}

const box={Math,clamp,BALL_TRAIL_NORMAL:170,BALL_TRAIL_POWER:190};
vm.createContext(box);
vm.runInContext(src.slice(src.indexOf('function buildBallTrailPath('),src.indexOf('function sampleBallTrail(')),box);
vm.runInContext(src.slice(src.indexOf('function compactVisualQueue('),src.indexOf('function update(dt)')),box);
const BALL_TRAIL_NORMAL=170,BALL_TRAIL_POWER=190;
let seed=130;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const storage=[],identities=new Set();let vertices=0,allocated=0;
for(let k=0;k<1000;k++){
 const b={x:rand()*450,y:rand()*710,held:k%37===0,trail:[]};
 let x=b.x,y=b.y;
 for(let i=0;i<k%97;i++){x+=(rand()-.5)*22;y+=(rand()-.5)*22;b.trail.push({x,y,corner:rand()<.12})}
 const radius=k%2?8:12;
 const expected=referenceTrail(b,radius),actual=box.buildBallTrailPath(b,radius,storage);
 assert.equal(JSON.stringify(actual),JSON.stringify(expected),'bit-identical vertices, length, clipping and corners');
 vertices+=actual.length;
 for(const point of actual)if(!identities.has(point)){identities.add(point);allocated++}
}
assert(allocated<vertices*.02,'over 98% of sampled vertices reuse storage');
for(let k=0;k<300;k++){
 const q=Array.from({length:k%80},(_,id)=>({id,t:rand(),life:rand()}));
 const expected=q.map(p=>({...p})).filter(p=>(p.t+=.016)<p.life);
 assert.equal(box.advanceVisualQueue(q,.016),q,'same backing queue');
 assert.deepEqual(q,expected,'same lifetime and stable draw order');
}
console.log(`PASS v130: 1000 exact spline comparisons, ${vertices} vertices with ${allocated} allocations; 300 stable effect expiry cases.`);
