'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('dist/game.js','utf8');
const body=s.slice(s.indexOf('function drawElementalTrailBody('),s.indexOf('// V83: fire is a living'));
let strokes=[],points=[];
const g={save(){},restore(){},beginPath(){points=[]},moveTo(x,y){points.push([x,y])},lineTo(x,y){points.push([x,y])},stroke(){strokes.push({width:this.lineWidth,alpha:this.globalAlpha,points:[...points]})}};
const env={g,Math,fxEnabled:true,has:k=>env.skills.includes(k)};vm.createContext(env);vm.runInContext(body,env);
for(const skills of [['fire'],['pierce'],['fire','pierce']])for(const r of [8,12])for(const shape of ['straight','bounce','reverse']){
 env.skills=skills;env.r=r;
 env.path=Array.from({length:69},(_,i)=>({x:200-(shape==='straight'?i:Math.min(i,68-i))*2.5,y:shape==='bounce'?100+i*1.2:100,s:i*2.5}));
 let reference;
 for(const count of [1,2,3,6]){
  strokes=[];env.multiSkillFastRender=count>=3;
  vm.runInContext('drawBallSkillTrail(path[0],r,path)',env);
  assert.equal(strokes.length,1);assert.equal(strokes[0].width,r*1.52);
  assert(strokes.every(x=>x.width>0&&x.alpha>0));
  const vertices=strokes.flatMap((x,i)=>i?x.points.slice(1):x.points);
  assert.deepEqual(vertices,env.path.map(p=>[p.x,p.y]),'every bounce vertex retained, no shortcut or offset polygon');
  if(reference)assert.deepEqual(strokes,reference,'LOD cannot change body geometry or opacity');
  reference=strokes;
 }
}
console.log('PASS v107: fire/pierce/combined × 2 radii × 3 trajectories × 4 ball counts: stable width, complete path, no duplicate core.');
