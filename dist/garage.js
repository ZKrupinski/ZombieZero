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
 let equipped={},activeData,activeHero;
 const masteryStep=5,masteryCap=10;
 function mastery(xp){return Math.min(masteryCap,Math.floor((xp||0)/masteryStep))}
 function masteryDefense(){return mastery(activeData?.xp?.[activeHero])}
 function value(part,level){return part.base+part.step*level}
 function load(hero,data){
  equipped={};activeData=data;activeHero=hero;
  for(const id of Object.values(data?.loads?.[hero]||{})){
   if(byId[id]&&Number.isInteger(data.levels[id]))equipped[id]=value(byId[id],data.levels[id]);
  }
 }

 // Every equipped module contributes to a permanent combat stat as well as
 // its own conditional / special mechanic. All values are per hero loadout.
 function statBoosts(gear){
  return {
   attack:Math.round(((gear('grip')||0)*.4+(gear('heavy')||0)*.25)*10)/10,
   guard:Math.ceil((gear('wide')||0)/2)+Math.round((gear('cushion')||0)/5)+Math.round((gear('steer')||0)/3),
   resist:Math.round((gear('filter')||0)/3)
  };
 }
 function combatStats(){return statBoosts(id=>equipped[id]||0)}
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
    if(data.mechanic){
     data.badges++;
     data.xp[survivor]=(data.xp[survivor]||0)+1;
    }else data.mechanic=true;
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
  // Real class steering: Wrench's aim spreads more with ordinary offsets.
  ball.bank=false;ball.first=true;ball.returns=(ball.returns||0)+1;
  const centered=Math.abs(offset)<=.28+(equipped.grip||0)/100+(equipped.wide||0)/400;
  // Grip is a real precision modifier for every hero, not just Ruby.
  // It widens the centered contact window and adds a conditional hit bonus.
  ball.precision=!!equipped.grip&&centered;
  ball.slam=hero===1&&centered;ball.echo=hero===2&&ball.returns%2===0;
  const edge=Math.abs(offset)>=.68-(equipped.grip||0)/100;
  if(hero===3)return Math.sign(offset)*Math.min(1.29,Math.pow(Math.abs(offset),.74)*1.34);
  if(hero===0)return offset*(edge?1.22:.93);
  if(hero===2)return offset*.95;
  return offset*1.09;
 }
 function contact(ball,hero,impact){
  if(ball.bank && (hero===3||equipped.cushion)){
   if(hero===3){
    impact.x=Math.sign(impact.x||ball.vx||1);impact.y=0;
    impact.ricochet=true;impact.power=1.55;
   }
   impact.push=(hero===3?2.15:1)*(1+(equipped.cushion||0)/100);
  }
  if(ball.precision){
   impact.power=(impact.power||1)*(1+(equipped.grip||0)/100);
  }
  if(ball.slam){
   impact.push=(impact.push||1)*1.9;
   impact.power=(impact.power||1)*1.15;
  }
  if(ball.first!==false && equipped.heavy){
   // Heavy core stacks with character-specific impacts instead of overwriting.
   impact.power=(impact.power||1)*(1+equipped.heavy/100);
   ball.vx*=.96;ball.vy*=.96;
  }
  impact.echo=!!ball.echo;
  ball.first=false;ball.slam=false;ball.bank=false;ball.echo=false;ball.precision=false;
 }

 // Core and special bonuses share one formula between the game, selection and garage.
 // Unique first-hit damage stays on the gear badge; permanent attack is shown separately.
 function heroStats(hero,data,progression,index){
  const loads=data?.loads?.[index]||{},levels=data?.levels||{};
  const gear=id=>{
   const part=byId[id];
   return part&&loads[part.slot]===id&&Number.isInteger(levels[id])
    ?value(part,levels[id]):0;
  };
  const extraSweet=(progression?.level?.('sweetSpot')||0)*2;
  const boosted=statBoosts(gear);
  const baseSpeed=Number(hero?.speed)||500;
  const baseDamage=Number(hero?.damage)||1;
  const baseLives=Number(hero?.lives)||3;
  const basePaddle=Number(hero?.paddle)||60;
  return [
   {id:'speed',icon:'⚡',name:'속도',base:baseSpeed,bonus:Math.round(baseSpeed*gear('steer')/100),cap:950,unit:''},
   {id:'attack',icon:'✦',name:'공격',base:baseDamage,bonus:baseDamage*boosted.attack/100,cap:3.4,unit:'',precision:2},
   {id:'hp',icon:'♥',name:'체력',base:baseLives,bonus:0,cap:6,unit:''},
   {id:'guard',icon:'↔',name:'수비',base:basePaddle,bonus:gear('wide')+boosted.guard+extraSweet+mastery(data?.xp?.[index]),cap:120,unit:'px'},
   {id:'resist',icon:'✚',name:'내성',base:0,bonus:boosted.resist,cap:50,unit:'%'}
  ];
 }
 // Secondary effects are conditional in combat and must not be misrepresented
 // as permanent damage, health or speed. Read from this hero's equipped slots.
 function heroGearStats(data,index){
  const loads=data?.loads?.[index]||{},levels=data?.levels||{};
  const slotLabels=['무기','공','차량'];
  return slotLabels.map((slot,idx)=>{
   const part=byId[loads[idx]],active=!!part&&Number.isInteger(levels[part.id]);
   const label=active?({grip:'정타',wide:'확장',cushion:'반사',heavy:'첫타',steer:'조향',filter:'방독'}[part.id]):slot;
   return {id:active?part.id:'slot'+idx,name:label,
    bonus:active?value(part,levels[part.id]):0,unit:active?part.unit:'',
    description:active?part.label+' · 추가 기본 스탯 강화 적용':'장착한 장비 없음'};
  });
 }
 function heroStatMarkup(hero,data,progression,index){
  const rows=heroStats(hero,data,progression,index),segments=12;
  return '<div class="hero-mini-stats" aria-label="기본 능력치와 장비 강화분">'+rows.map(row=>{
   const rounded=n=>row.precision?n.toFixed(row.precision):String(Math.round(n));
   const baseSegments=Math.min(segments,Math.round(row.base/row.cap*segments));
   const bonusSegments=row.bonus>0?Math.max(1,Math.ceil(row.bonus/row.cap*segments)):0;
   const maxBonus=Math.min(segments-baseSegments,bonusSegments);
   const suffix=row.id==='resist'?'%':'';
   const desc=row.name+' 기본 '+rounded(row.base)+suffix+(row.bonus>0?' 강화 +'+rounded(row.bonus)+suffix:'');
   const blocks=Array.from({length:segments},(_,n)=>{
    const kind=n<baseSegments?'base':n<baseSegments+maxBonus?'boost':'empty';
    return '<i class="hero-stat-cell '+kind+'"></i>';
   }).join('');
   return '<div class="hero-mini-stat" role="img" aria-label="'+desc+'" title="'+desc+'">'+
    '<span class="hero-mini-icon" aria-hidden="true">'+row.icon+'</span>'+
    '<span class="hero-mini-label" aria-hidden="true">'+row.name+'</span>'+
    '<span class="hero-mini-track" aria-hidden="true">'+blocks+'</span>'+
    '<span class="hero-mini-value'+(row.bonus>0?' boosted':'')+'" aria-hidden="true">'+rounded(row.base+row.bonus)+suffix+'</span>'+
    '<span class="hero-mini-bonus'+(row.bonus>0?' active':'')+'" aria-hidden="true">'+(row.bonus>0?'+'+rounded(row.bonus)+suffix:'·')+'</span></div>';
  }).join('')+
   '<div class="hero-gear-traits" aria-label="캐릭터 장착 장비의 특수 효과">'+
   heroGearStats(data,index).map(row=>{
    const active=row.bonus>0;
    const label=row.name+' '+(active?'+'+row.bonus+row.unit:'—');
    return '<span class="hero-gear-trait'+(active?' active':'')+'" title="'+row.description+
     (active?' · 현재 +'+row.bonus+row.unit:' · 장비 미장착')+
     '" aria-label="'+label+'">'+label+'</span>';
   }).join('')+'</div></div>';
 }
 return {mastery,masteryDefense,masteryStep,masteryCap,parts,prices,blank,load,value,reward,modify,strike,contact,bonus:id=>equipped[id]||0,combatStats,statBoosts,heroStats,heroGearStats,heroStatMarkup};
})();
