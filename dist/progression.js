/* ZOMBIE ZERO — permanent progression v189. Shared by Campaign and Endless.
   Load before game.js. No gameplay changes until a skill is purchased. */
'use strict';
(function(){
 const STORE_KEY='zz-growth-v1';
 const MAX_LEVEL=5;
 const PRICES=[15,30,55,90,145];
 const GROUPS=[
  {id:'weapon',name:'WEAPON',subtitle:'액티브 스킬'},
  {id:'citizen',name:'CITIZEN',subtitle:'시민 지원'},
  {id:'survival',name:'SURVIVAL',subtitle:'생존 훈련'}
 ];
 const defs=[
  {id:'dual',group:'weapon',name:'더블볼',tag:'BALL',atlas:1},
  {id:'triple',group:'weapon',name:'트리플볼',tag:'BALL',atlas:2},
  {id:'power',group:'weapon',name:'파워볼',tag:'POWER',atlas:3},
  {id:'fire',group:'weapon',name:'화염볼',tag:'FIRE',atlas:4},
  {id:'slow',group:'weapon',name:'슬로우',tag:'TIME',atlas:5},
  {id:'pierce',group:'weapon',name:'관통샷',tag:'PIERCE',atlas:6},
  {id:'shield',group:'weapon',name:'보호막',tag:'SHIELD',atlas:7},
  {id:'bazooka',group:'weapon',name:'시민 바주카 지속시간',tag:'ROCKET',atlas:0},
  {id:'rescue',group:'citizen',name:'신속 구조',tag:'RESCUE',passiveIcon:0},
  {id:'citizenArmor',group:'citizen',name:'시민 방어훈련',tag:'ARMOR',passiveIcon:1},
  {id:'citizenCrit',group:'citizen',name:'행운의 투척',tag:'LUCK',passiveIcon:2},
  {id:'citizenPower',group:'citizen',name:'전투 지원훈련',tag:'DAMAGE',passiveIcon:3},
  {id:'bazookaPower',group:'citizen',name:'바주카 개조',tag:'BLAST',passiveIcon:4},
  {id:'bazookaReload',group:'citizen',name:'신속 재장전',tag:'RELOAD',passiveIcon:5},
  {id:'lastStand',group:'survival',name:'최후의 저항',tag:'LAST STAND',passiveIcon:8},
  {id:'poisonResist',group:'survival',name:'중독 저항',tag:'RESIST',passiveIcon:9},
  {id:'detox',group:'survival',name:'해독 능력',tag:'DETOX',passiveIcon:10},
  {id:'recover',group:'survival',name:'빠른 안정화',tag:'RECOVER',passiveIcon:11},
  {id:'mental',group:'survival',name:'정신력',tag:'GROGGY',passiveIcon:12},
  {id:'comboFocus',group:'survival',name:'콤보 집중력',tag:'COMBO',passiveIcon:13},
  {id:'itemMagnet',group:'citizen',name:'보급품 회수',tag:'PICKUP',passiveIcon:6},
  {id:'sweetSpot',group:'survival',name:'라켓 스위트스폿',tag:'RACKET',passiveIcon:7},
 ];
 const funnyNames={dual:'공 하나 더!',triple:'공 셋이야!',power:'빡센볼!',fire:'화르륵볼!',slow:'질질볼!',pierce:'뚫어뻥샷!',shield:'철벽막!',bazooka:'오래쏴!',rescue:'번개구조!',citizenArmor:'안죽어요!',citizenCrit:'대박투척!',citizenPower:'더쎈시민!',bazookaPower:'크게쏴!',bazookaReload:'빨리쏴!',lastStand:'한판더!',poisonResist:'침참기!',detox:'독빼기!',recover:'멘탈회복!',mental:'깡다구!',comboFocus:'끊지마!',itemMagnet:'줍줍왕!',sweetSpot:'찰떡존!'};
 const skillJokes={dual:'공이 하나 더!',triple:'공이 세 개!',power:'한 방이 묵직!',fire:'좀비 구이!',slow:'좀비 느릿!',pierce:'줄줄이 뻥!',shield:'잠깐 무적!',bazooka:'바주카 오래!',rescue:'시민 후다닥!',citizenArmor:'한 번 더!',citizenCrit:'가끔 대박!',citizenPower:'투척 더 아프게!',bazookaPower:'더 세고 넓게!',bazookaReload:'장전 후딱!',lastStand:'아직 안 끝났어!',poisonResist:'침 맞아도 버텨!',detox:'독이 쏙쏙!',recover:'회복 재빨리!',mental:'그로기 짧게!',comboFocus:'콤보 끊지 마!',itemMagnet:'멀리서도 줍줍!',sweetSpot:'라켓 더 넓게!'};

 const map=Object.fromEntries(defs.map(d=>[d.id,d]));
 let state={version:1,chips:0,levels:{},claims:{},runSeq:0};
 function int(x,min,max){return Number.isFinite(Number(x))?Math.max(min,Math.min(max,Math.trunc(Number(x)))):min}
 function read(){
  try{
   const raw=JSON.parse(localStorage.getItem(STORE_KEY)||'null');
   if(!raw||raw.version!==1)return;
   state.chips=int(raw.chips,0,1e9);
   state.runSeq=int(raw.runSeq,0,1e9);
   for(const d of defs)state.levels[d.id]=int(raw.levels&&raw.levels[d.id],0,5);
   if(raw.claims&&typeof raw.claims==='object'){
    const entries=Object.keys(raw.claims).slice(-1600);
    for(const k of entries)if(raw.claims[k])state.claims[k]=1;
   }
   const retiredRank=int(raw.levels?.earlyWarning,0,MAX_LEVEL);
   if(retiredRank){
    state.chips=int(state.chips+PRICES.slice(0,retiredRank).reduce((sum,price)=>sum+price,0),0,1e9);
    save();
   }
  }catch{}
 }
 function save(){
  try{localStorage.setItem(STORE_KEY,JSON.stringify(state));return true}
  catch{return false}
 }
 read();
 let runKey='',runMode='',selectedSkill='dual';
 // All 22 upgrades are visible in one fixed 9:16 catalogue. Selecting an
 // entry opens its effects and one generously sized purchase button below.
 const $=id=>document.getElementById(id);
 function level(id){return map[id]?int(state.levels[id],0,MAX_LEVEL):0}
 function cost(id){const n=level(id);return n>=MAX_LEVEL?0:PRICES[n]}
 function chips(){return state.chips}
 function startRun(mode){
  state.runSeq=(state.runSeq+1)%1e9;
  runMode=mode;
  runKey=Date.now().toString(36)+'-'+state.runSeq+'-'+Math.floor(Math.random()*1e8).toString(36);
  save();refresh();
 }
 function grant(kind,wave,amount){
  if(!runKey||!['campaign','endless'].includes(runMode))return false;
  const stage=int(wave,1,100000);
  const key=runKey+':'+kind+':'+stage;
  if(state.claims[key])return false;
  state.claims[key]=1;
  state.chips=int(state.chips+int(amount,0,1000),0,1e9);
  // Keep the newest 1600 awards. Run keys never recycle, so older runs are safe.
  const keys=Object.keys(state.claims);
  if(keys.length>1600)for(const old of keys.slice(0,keys.length-1600))delete state.claims[old];
  save();refresh();
  return true;
 }
 function purchase(id){
  if(!map[id]||level(id)>=MAX_LEVEL||state.chips<cost(id))return false;
  state.chips-=cost(id);state.levels[id]=level(id)+1;save();refresh();
  try{window.ZZProgressionSound?.()}catch{}
  return true;
 }
 const baseDuration={bazooka:12,dual:16,triple:16,power:14,fire:10,slow:12,pierce:10,shield:18};
 function duration(skill,hero=1){
  const base=baseDuration[skill];
  return (base===undefined?0:base*(1+level(skill)*.06))*(Number.isFinite(hero)?hero:1);
 }
 function rescueKills(){return level('rescue')>=3?4:5}
 function rescueAbsent(){return 8-level('rescue')*.5}
 function citizenGuardChance(){return level('citizenArmor')*.2}
 function citizenCriticalChance(){return level('citizenCrit')*.03}
 function citizenDamage(){return .25+level('citizenPower')*.05}
 function bazookaDamage(){return 8+level('bazookaPower')*.4}
 function bazookaRadiusBonus(){return Math.round(level('bazookaPower')*1.6)}
 function bazookaInterval(){return 3-level('bazookaReload')*.08}
 const standDistances=[60,80,100,120,145,170];
 function lastStandDistance(){return standDistances[level('lastStand')]}
 function lastStandUses(){return level('lastStand')>=5?3:level('lastStand')>=3?2:1}
 function poisonFactor(){return 1-level('poisonResist')*.06}
 function detoxRate(){return 5.5*(1+level('detox')*.12)}
 function poisonGrace(){return 2.35-level('recover')*.22}
 function groggySeconds(){return 1.85-level('mental')*.10}
 function comboSeconds(){return 6+level('comboFocus')*.24}
 function pickupWidth(){return 65+level('itemMagnet')*4}
 function paddleBonus(){return level('sweetSpot')*2}
 function example(id,l){
  if(baseDuration[id]!==undefined)return (baseDuration[id]*(1+l*.06)).toFixed(1).replace(/\.0$/,'')+'초 지속';
  switch(id){
   case 'rescue':return (l>=3?4:5)+'킬 복귀 · 대기 '+(8-l*.5).toFixed(1)+'초';
   case 'citizenArmor':return l===0?'기본 1회 피격 희생':Math.round(l*20)+'% 확률로 첫 피격 방어';
   case 'citizenCrit':return '크리티컬 '+l*3+'% · 피해 3배';
   case 'citizenPower':return '시민 투척 피해 '+(.25+l*.05).toFixed(2);
   case 'bazookaPower':return '바주카 피해 '+(8+l*.4).toFixed(1)+' · 반경 +'+Math.round(l*1.6)+'px';
   case 'bazookaReload':return '발사 간격 '+(3-l*.08).toFixed(2)+'초';
   case 'lastStand':return '밀어내기 '+standDistances[l]+'px · '+(l>=5?3:l>=3?2:1)+'회/웨이브';
   case 'poisonResist':return '중독 누적량 -'+l*6+'%';
   case 'detox':return '해독 '+(5.5*(1+l*.12)).toFixed(2)+'/초';
   case 'recover':return '회복 대기 '+(2.35-l*.22).toFixed(2)+'초';
   case 'mental':return '그로기 '+(1.85-l*.1).toFixed(2)+'초';
   case 'comboFocus':return '콤보 유지 '+(6+l*.24).toFixed(2)+'초';
   case 'itemMagnet':return '아이템 판정 +'+(l*4)+'px';
   case 'sweetSpot':return '반사 폭 +'+(l*4)+'px';
  }
  return '';
 }
 function iconHTML(d){
  if(d.atlas!==undefined)return '<span class="zz-upgrade-icon zz-upgrade-bitmap" style="background-position:'+((d.atlas/7)*100).toFixed(4)+'% 50%" aria-hidden="true"></span>';
  const col=d.passiveIcon%7,row=Math.floor(d.passiveIcon/7);
  return '<span class="zz-upgrade-icon zz-passive-art" style="background-position:'+col*100/6+'% '+row*100+'%" aria-hidden="true"></span>';
 }
 function refresh(){
  const balance=$('upgrade-chip-count'),wallet=$('upgrade-wallet');
  if(balance)balance.textContent=state.chips.toLocaleString('ko-KR');
  if(wallet)wallet.textContent=state.chips.toLocaleString('ko-KR');
  const panel=$('upgrade-list');if(panel&&$('upgrade-dialog')?.open)renderList();
 }
 function renderDetail(){
  const d=map[selectedSkill]||defs[0];
  const n=level(d.id),max=n>=MAX_LEVEL,c=cost(d.id),affordable=state.chips>=c;
  const title=$('upgrade-detail-name'),rank=$('upgrade-detail-level');
  const current=$('upgrade-detail-current'),next=$('upgrade-detail-next'),buy=$('upgrade-detail-buy');
  const icon=$('upgrade-detail-icon');
  if(icon)icon.innerHTML=iconHTML(d);
  if(title)title.textContent=funnyNames[d.id]||d.name;
  if(rank)rank.textContent='LV '+n+' / 5';
  if(current)current.textContent=example(d.id,n);
  if(next)next.textContent=max?'성장 완료':example(d.id,n+1);
  if(buy){
   buy.disabled=max||!affordable;
   buy.textContent=max?'MAX LEVEL':'강화 · '+c+' Z';
   buy.setAttribute('aria-label',d.name+(max?' 최고 레벨':' 강화 '+c+' Z-CHIP'));
  }
 }
 function renderList(){
  const list=$('upgrade-list');if(!list)return;
  // Each category distributes its available height among its own skills.
  list.innerHTML=GROUPS.map(group=>{
   const entries=defs.filter(d=>d.group===group.id).map(d=>{
    const n=level(d.id),max=n===MAX_LEVEL,selected=d.id===selectedSkill;
    const pips=Array.from({length:5},(_,i)=>'<i'+(i<n?' class="filled"':'')+'></i>').join('');
    return '<button type="button" class="zz-upgrade-card'+(selected?' selected':'')+
     '" data-select="'+d.id+'" aria-pressed="'+String(selected)+'"'+
     ' aria-label="'+d.name+', 레벨 '+n+'/5, '+(max?'최대 강화':'다음 강화 '+cost(d.id)+' Z-CHIP')+'">'+
     iconHTML(d)+'<span class="zz-upgrade-compact-copy"><b>'+(funnyNames[d.id]||d.name)+'</b>'+ '<small class="zz-upgrade-joke">'+(skillJokes[d.id]||'')+'</small>'+
     '<span class="zz-upgrade-mini-level">LV '+n+'<span class="zz-upgrade-pips">'+pips+
     '</span></span></span></button>';
   }).join('');
   return '<section class="zz-upgrade-column zz-group-'+group.id+'" aria-label="'+group.subtitle+'">'+
    '<h3><span>'+group.name+'</span><small>'+group.subtitle+'</small></h3>'+entries+'</section>';
  }).join('');
  renderDetail();
 }
 function open(){
  const modal=$('upgrade-dialog'),overlay=$('overlay');
  if(!modal||!overlay||overlay.hidden||!['selection','results'].includes(overlay.dataset.screen))return false;
  if(!modal.open){selectedSkill='dual';renderList();refresh();modal.showModal();}
  return true;
 }
 function close(){const modal=$('upgrade-dialog');if(modal?.open)modal.close()}
 function initUI(){
  const launch=$('upgrade-open'),dialog=$('upgrade-dialog'),list=$('upgrade-list');
  if(!launch||!dialog||!list)return;
  launch.addEventListener('click',open);
  $('upgrade-close')?.addEventListener('click',close);
  list.addEventListener('click',event=>{
   const card=event.target.closest?.('button[data-select]');
   if(!card||!map[card.dataset.select])return;
   selectedSkill=card.dataset.select;renderList();
   list.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
  });
  $('upgrade-detail-buy')?.addEventListener('click',()=>{
   if(purchase(selectedSkill))renderList();
  });
  refresh();
 }
 if(typeof document!=='undefined')initUI();
 window.ZZProgression={
  version:1,defs,level,chips,cost,purchase,startRun,grant,refresh,open,
  duration,rescueKills,rescueAbsent,citizenGuardChance,citizenCriticalChance,citizenDamage,
  bazookaDamage,bazookaRadiusBonus,bazookaInterval,lastStandDistance,lastStandUses,
  poisonFactor,detoxRate,poisonGrace,groggySeconds,comboSeconds,pickupWidth,paddleBonus,
  debug:()=>({chips:state.chips,levels:{...state.levels},runKey,claims:Object.keys(state.claims).length})
 };
})();
