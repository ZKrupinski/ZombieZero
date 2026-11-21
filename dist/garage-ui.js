'use strict';
(()=>{
 const system=window.ZZGarage,progress=window.ZZProgression;
 let panel,body,note,garageHero;
 const slots=['무기','공','차량'];
 const styles=['라켓 끝으로 받으면 코너를 깊게 노립니다.','배트 중심에 맞히면 적 무리를 강하게 밀어냅니다.','두 번째 리턴마다 첫 충돌이 주변 적에게 한 번 더 튑니다.','벽을 맞힌 휠캡이 첫 적을 옆으로 밀어냅니다.'];
 let activePart=system.parts[0],tab='parts',frame=0;
 const btn=(action,label,disabled=false)=>'<button type="button" data-action="'+action+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
 const artIndex={grip:0,wide:1,cushion:2,heavy:3,steer:4,filter:5,nut:6,ticket:7,radio:8};
 function icon(id){
  if(id==='coin')return '<img class="garage-icon" src="assets/ui/chip-v203.webp" alt="">';
  const n=artIndex[id];
  return '<span aria-hidden="true" class="garage-icon" style="background-position:'+((n%3)*50)+'% '+(Math.floor(n/3)*50)+'%"></span>';
 }
 function currency(id,name,amount){return '<span>'+icon(id)+name+' <b>'+amount+'</b></span>'}
 function card(p,data,gear){
  const level=data.levels[p.id],equipped=gear[p.slot]===p.id;
  const status=level===undefined?'미보유':(equipped?'장착 중 ':'보유 ')+'+'+level;
  return '<button data-part="'+p.id+'" aria-pressed="'+(p===activePart)+'">'+icon(p.id)+'<span>'+p.name+'<small>'+status+'</small></span></button>';
 }
 function render(){
  cancelAnimationFrame(frame);
  const data=progress.garage(),h=tab==='parts'?garageHero:selectedHero,part=activePart;
  const level=data.levels[part.id],owned=level!==undefined;
  const gear=data.loads[h],price=system.prices[level],xp=data.xp[h]||0;
  const portrait=h===3?'<img class="tow-preview" src="assets/ip/tow-mechanic.webp" alt="">':'<span class="garage-portrait" style="--row:'+h+'"></span>';
  const banner='<section class="garage-driver">'+portrait+'<div><h3>'+HEROES[h].name+'</h3><p>'+styles[h]+'</p><small>숙련 '+xp+' / '+(xp>=10?'도색 해금': '10 웨이브')+'</small></div></section>';
  const picker=tab==='parts'?'<div class="garage-picker" role="group" aria-label="정비할 생존자">'+HEROES.map((hero,i)=>{
   if(i===3&&!data.mechanic)return '';
   return '<button type="button" data-driver="'+i+'" aria-pressed="'+(h===i)+'">'+hero.name+'</button>';
  }).join('')+'</div>':'';
  const wallet='<div class="garage-wallet">'+(tab==='signal'?currency('ticket','무전권',data.tickets):currency('coin','Z코인',progress.chips()))+currency('nut','제작 너트',data.badges)+'</div>';
  if(tab==='signal'){
   const message=data.mechanic?'합류한 생존자 4명이 각각 25% 확률로 응답합니다.':'스테이지나 웨이브를 처음 클리어하면 무전권을 받습니다. 첫 호출로 정비사가 합류합니다.';
   body.innerHTML=wallet+'<section class="radio-box">'+icon('radio')+'<h3>'+(data.mechanic?'정비사 합류 완료':'폐차장 신호 포착')+'</h3><p>'+message+'</p><p>중복 응답 1회당 제작 너트 1개 · 너트 2개로 미보유 장비 1종 제작</p><div>'+btn('radio','1회 호출',data.tickets<1)+btn('batch','10회 호출',data.tickets<10)+'</div></section>'+(data.mechanic?btn('trial','휠캡 3회 시타')+btn('driver','정비사 선택',h===3):'');
   return;
  }
  const list=slots.map((slot,i)=>'<section class="garage-slot"><small>'+slot+'</small><div>'+system.parts.filter(p=>p.slot===i).map(p=>card(p,data,gear)).join('')+'</div></section>').join('');
  const val=n=>system.value(part,n)+part.unit;
  const effect=part.label+' '+val(level||0)+(owned&&level<5?' → '+val(level+1):'');
  const stage=part.id==='cushion'?1:system.parts.indexOf(part)+1;
  const actions=owned?btn('equip',gear[part.slot]===part.id?'장착 중':'장착',gear[part.slot]===part.id)+btn('upgrade',price?icon('coin')+'강화 '+price:'최대 강화',price===undefined||price>progress.chips()):btn('craft',icon('nut')+'너트 2개로 제작',data.badges<2);
  const detail='<section class="garage-detail"><div class="part-inspect">'+icon(part.id)+'<div><strong>'+part.name+'</strong><p>'+effect+'</p></div></div><div class="part-actions">'+(owned?'':'<small>스테이지 '+stage+' 또는 웨이브 '+stage+' 첫 클리어 보상</small>')+actions+'</div></section>';
  body.innerHTML=picker+banner+wallet+'<p class="nut-guide">무전 중복 응답으로 너트 획득 · 2개로 장비 1종 제작</p>'+list+detail;
 }
 function trial(){
  tab='trial';note.textContent='벽을 경유하도록 좌우를 조준하세요.';
  body.innerHTML='<canvas id="garage-range" width="300" height="230" aria-label="휠캡 시타장"></canvas><label>발사 각도 <input id="garage-aim" type="range" min="-70" max="70" value="63"></label>'+btn('shoot','시타 1 / 3')+btn('signal','무전으로');
  const canvas=$('garage-range'),ctx=canvas.getContext('2d'),disc=$('hubcap-art');
  let count=0,ball=null,prev=0,enemy=150;
  function tick(now){
   const dt=Math.min(.03,(now-prev)/1000);prev=now;
   ctx.fillStyle='#152937';ctx.fillRect(0,0,300,230);
   if(ball){
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(ball.x<10||ball.x>290){ball.vx*=-1;ball.x=clamp(ball.x,10,290);ball.bank=true}
    if(ball.y<=53){
     const hit=Math.abs(ball.x-enemy)<27;
     if(hit&&ball.bank)enemy=clamp(enemy+Math.sign(ball.vx)*48,24,276);
     note.textContent=hit?(ball.bank?'벽 반사 명중! 표적이 옆으로 밀렸습니다.':'직격! 다음에는 옆벽을 노려보세요.'):'빗나갔습니다. 각도를 바꿔보세요.';
     ball=null;const shoot=body.querySelector('[data-action=shoot]');shoot.disabled=count===3;shoot.textContent=count===3?'시타 완료':'시타 '+(count+1)+' / 3';
    }
   }
   const zombie=window.ZZGreenWalk?.image;
   ctx.fillStyle='#9ec86a';ctx.fillRect(enemy-19,26,38,25);
   if(zombie?.naturalWidth)ctx.drawImage(zombie,0,0,128,128,enemy-20,14,40,40);
   const angle=Number($('garage-aim').value)*Math.PI/180;
   ctx.strokeStyle='#efc46e';ctx.beginPath();ctx.moveTo(150,205);ctx.lineTo(150+Math.sin(angle)*30,205-Math.cos(angle)*30);ctx.stroke();
   if(disc.naturalWidth)ctx.drawImage(disc,(ball?.x??150)-9,(ball?.y??205)-9,18,18);
   frame=requestAnimationFrame(tick);
  }
  body.querySelector('[data-action=shoot]').onclick=e=>{
   const angle=Number($('garage-aim').value)*Math.PI/180;
   ball={x:150,y:205,vx:Math.sin(angle)*330,vy:-Math.cos(angle)*330,bank:false};count++;e.currentTarget.disabled=true;
  };
  frame=requestAnimationFrame(tick);
 }
 function handleAction(e){
  const button=e.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.driver!==undefined){
   garageHero=Number(button.dataset.driver);note.textContent='';render();
   body.querySelector('[data-driver="'+garageHero+'"]')?.focus();return;
  }
  if(button.dataset.part){activePart=system.parts.find(p=>p.id===button.dataset.part);note.textContent='';render();return}
  const action=button.dataset.action;
  if(action==='shoot')return;
  note.textContent='';
  if(action==='trial'){trial();return}
  if(action==='parts'||action==='signal')tab=action;
  else if(action==='driver'){$('hero-3').click();note.textContent='정비사가 출전 대기 중입니다.'}
  else{
   const wasOwned=progress.garage().mechanic;
   if(!progress.garageAction(action,activePart.id,tab==='parts'?garageHero:selectedHero)){note.textContent='저장 상태와 보유 재화를 확인하세요.';return}
   if(action==='radio'&&!wasOwned){
    renderHeroes();$('hero-3').click();note.textContent='“견인 요청하신 분?” 정비사가 합류했습니다!';
    panel.animate?.([{opacity:.5},{opacity:1}],{duration:360});
   }else note.textContent=({equip:'장착했습니다.',upgrade:'강화 성공!',craft:'제작 완료!',radio:'제작 너트 +1',batch:'제작 너트 +10'})[action];
   if(['radio','batch'].includes(action)&&wasOwned)note.textContent=progress.garage().calls.map(i=>HEROES[i].name).join(' · ')+' 응답! 제작 너트 +'+progress.garage().calls.length;
   window.ZZProgressionSound?.();
  }
  render();
 }
 for(const [prefix,page] of [['garage','parts'],['radio','signal']]){
  const dialog=$(prefix+'-dialog'),content=$(prefix+'-body');
  $(prefix+'-open').onclick=()=>{
   if(!['menu','over'].includes(mode))return;
   panel=dialog;body=content;note=$(prefix+'-note');tab=page;garageHero=selectedHero;
   note.textContent='';render();dialog.showModal();dialog.scrollTop=0;
  };
  content.onclick=handleAction;
  $(prefix+'-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>cancelAnimationFrame(frame));
 }
})();
