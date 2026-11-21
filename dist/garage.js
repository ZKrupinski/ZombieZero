'use strict';
window.ZZGarage = (() => {
 const parts = [
  {id:'grip',slot:0,name:'스위트스폿 그립',label:'정타 판정 폭',base:10,step:2,unit:'%'},
  {id:'wide',slot:0,name:'접이식 확장판',label:'양쪽 수비 범위',base:4,step:2,unit:'px'},
  {id:'cushion',slot:1,name:'반발 스프링',label:'벽 반사 넉백',base:15,step:5,unit:'%'},
  {id:'heavy',slot:1,name:'헤비 코어',label:'첫 충돌 위력',base:20,step:6,unit:'%'},
  {id:'steer',slot:2,name:'퀵 스티어링',label:'차량 응답 속도',base:8,step:2,unit:'%'},
  {id:'filter',slot:2,name:'방독 필터',label:'8초마다 침 중독 감소',base:30,step:6,unit:'%'}
 ];
 const prices=[10,25,45,75,120];
 const byId=Object.fromEntries(parts.map(p=>[p.id,p]));
 const blank=()=>({mechanic:false,tickets:0,badges:0,best:{},levels:{},loads:[{},{},{},{}],xp:[0,0,0,0]});
 let equipped={};
 function value(part,level){return part.base+part.step*level}
 function load(hero,data){
  equipped={};
  for(const id of Object.values(data?.loads?.[hero]||{})){
   if(byId[id]&&Number.isInteger(data.levels[id]))equipped[id]=value(byId[id],data.levels[id]);
  }
 }
 function reward(data,mode,stage,hero){
  data.xp[hero]=(data.xp[hero]||0)+1;
  if(stage<=(data.best[mode]||0))return;
  data.best[mode]=stage;
  data.tickets++;
  for(const [index,p] of parts.entries())if(stage>=index+1 && !(p.id in data.levels))data.levels[p.id]=0;
  if(stage===1 && !('cushion' in data.levels))data.levels.cushion=0;
 }
 function modify(data,action,id,hero,chips){
  const p=byId[id];
  if(action==='batch' || action==='radio'){
   const count=action==='batch'?10:1;
   if(data.tickets<count)return;
   data.tickets-=count;data.calls=[];
   for(let i=0;i<count;i++){
    const survivor=data.mechanic?Math.floor(Math.random()*4):3;
    if(data.mechanic)data.badges++;else data.mechanic=true;
    data.calls.push(survivor);
   }
   return 0;
  }
  if(!p)return;
  if(action==='craft' && !(id in data.levels) && data.badges>=2){
   data.badges-=2;data.levels[id]=0;return 0;
  }
  if(!(id in data.levels))return;
  if(action==='equip'){data.loads[hero][p.slot]=id;return 0}
  const cost=prices[data.levels[id]];
  if(action==='upgrade' && cost!==undefined && chips>=cost){
   data.levels[id]++;return cost;
  }
 }
 function strike(ball,hero,offset){
  ball.bank=false;ball.first=true;ball.returns=(ball.returns||0)+1;
  const centered=Math.abs(offset)<=.22+(equipped.grip||0)/100;
  ball.slam=hero===1&&centered;ball.echo=hero===2&&ball.returns%2===0;
  const edge=Math.abs(offset)>=.68-(equipped.grip||0)/100;
  return offset*(hero===0&&edge?1.27:1.06);
 }
 function contact(ball,hero,impact){
  if(ball.bank && (hero===3||equipped.cushion)){
   if(hero===3){impact.x=Math.sign(impact.x||1);impact.y=0}
   impact.push=(hero===3?1.45:1)*(1+(equipped.cushion||0)/100);
  }
  if(ball.slam)impact.push=(impact.push||1)*1.65;
  if(ball.first!==false && equipped.heavy){
   impact.power=1+equipped.heavy/100;ball.vx*=.96;ball.vy*=.96;
  }
  impact.echo=!!ball.echo;
  ball.first=false;ball.slam=false;ball.bank=false;ball.echo=false;
 }
 return {parts,prices,blank,load,value,reward,modify,strike,contact,bonus:id=>equipped[id]||0};
})();
