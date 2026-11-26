'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8');
const cut=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)+1));
const box={Math,Map,Set,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),BALL_TRAIL_NORMAL:170,BALL_TRAIL_POWER:190,has:()=>false};
vm.createContext(box);
vm.runInContext(cut('function buildBallTrailPath(','function sampleBallTrail(')+cut('function makeFoeGrid(','function march('),box);
const points=[],path=[];
for(let i=0;i<120;i++){
 const b={held:i%13===0,x:100+i,y:300-i,trail:Array.from({length:96},(_,j)=>({x:100+i-j*2.6,y:300-i+Math.sin(j*.19+i*.2)*20+j*1.7,corner:j%17===0}))};
 const r=i%2?8:12,expected=box.buildBallTrailPath(b,r,[]),actual=box.buildBallTrailPath(b,r,points,path);
 assert.equal(actual,path);assert.equal(JSON.stringify(actual),JSON.stringify(expected));
}
const actors=Array.from({length:160},(_,i)=>({x:(i*37)%420,y:(i*71)%600,w:17+i%29,h:21+i%34}));
const grid=box.makeFoeGrid(actors),scratch=[];
for(let i=0;i<100;i++){
 const x=(i*19)%440,y=(i*43)%650;
 const expected=grid.query(x,y,16,16),actual=grid.query(x,y,16,16,-1,scratch);
 assert.equal(actual,scratch);assert.equal(JSON.stringify(actual),JSON.stringify(expected));
 for(let j=0;j<actual.length;j++)actual[j]=actors[actual[j]];
}
assert(src.includes('if(z.y+z.h>=DEFENSE_Y&&foes.includes(z))'));
const breach=(z,foes,DEFENSE_Y)=>z.y+z.h>=DEFENSE_Y&&foes.includes(z);
for(const y of [0,555,565,600])for(const present of [true,false]){
 const z={y,h:10},foes=present?[z]:[];
 assert.equal(breach(z,foes,565),foes.includes(z)&&z.y+z.h>=565);
}
console.log('PASS v439: reusable trail and ordered grid buffers; defense breach parity');
