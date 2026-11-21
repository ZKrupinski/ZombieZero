'use strict';
(()=>{
 const system=window.ZZGarage,progress=window.ZZProgression;
 const panel=$('garage-dialog'),body=$('garage-body'),note=$('garage-note');
 const slots=['무기','공','차량'];
 const styles=['라켓 끝으로 받으면 코너를 깊게 노립니다.','배트 중심에 맞히면 적 무리를 강하게 밀어냅니다.','두 번째 리턴마다 첫 충돌이 주변 적에게 한 번 더 튑니다.','벽을 맞힌 휠캡이 첫 적을 옆으로 밀어냅니다.'];
 let activePart=system.parts[0],tab='parts',frame=0;
 const btn=(action,label,disabled=false)=>'<button type="button" data-action="'+action+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
 function render(){
  cancelAnimationFrame(frame);
  const data=progress.garage(),h=selectedHero,part=activePart;
  const level=data.levels[part.id],owned=level!==undefined;
  const gear=data.loads[h],price=system.prices[level],xp=data.xp[h]||0;
  const portrait=h===3?'<img class="tow-preview" src="assets/ip/tow-mechanic.webp" alt="">':'<span class="garage-portrait" style="--row:'+h+'"></span>';
  const banner='<section class="garage-driver">'+portrait+'<div><h3>'+HEROES[h].name+'</h3><p>'+styles[h]+'</p><small>숙련 '+xp+' / '+(xp>=10?'도색 해금': '10 웨이브')+'</small></div></section>';
  const nav='<nav>'+btn('parts','장비 정비',tab==='parts')+btn('signal','구조 무전',tab==='signal')+'</nav>';
  if(tab==='signal'){
   body.innerHTML=banner+nav+'<section class="radio-box"><div class="radio-dial"></div><h3>'+ (data.mechanic?'정비사 합류 완료':'폐차장 신호 포착')+'</h3><p>'+(data.mechanic?'합류한 생존자 4명이 각각 25% 확률로 응답합니다. 중복 응답은 배지 1개가 됩니다. 배지 2개로 미보유 장비를 제작할 수 있습니다.':'첫 스테이지 또는 첫 웨이브를 클리어하면 무전권을 받습니다. 첫 호출로 정비사가 합류합니다.')+'</p><strong>무전권 '+data.tickets+'　·　구조 배지 '+data.badges+'</strong><div>'+btn('radio','1회 호출',data.tickets<1)+btn('batch','10회 호출',data.tickets<10)+'</div></section>'+(data.mechanic?btn('trial','휠캡 3회 시타')+btn('driver','정비사 선택',h===3):'');
   return;
  }
  const list=slots.map((slot,i)=>'<section class="garage-slot"><small>'+slot+'</small><div>'+system.parts.filter(p=>p.slot===i).map(p=>'<button data-part="'+p.id+'" aria-pressed="'+(p===part)+'">'+p.name+'<small>'+(data.levels[p.id]===undefined?'미보유':(gear[i]===p.id?'장착 · ':'')+'+'+data.levels[p.id])+'</small></button>').join('')+'</div></section>').join('');
  const val=n=>system.value(part,n)+part.unit;
  const detail='<section class="garage-detail"><strong>'+part.name+'</strong><p>'+part.label+' '+val(level||0)+(owned&&level<5?' → '+val(level+1):'')+'</p>'+
   (owned?btn('equip',gear[part.slot]===part.id?'장착 중':'장착',gear[part.slot]===part.id)+btn('upgrade',price?'강화 · '+price+' Z':'최대 강화',price===undefined||price>progress.chips()):'<p>'+ (part.id==='cushion'?1:system.parts.indexOf(part)+1)+'번째 스테이지 또는 웨이브 첫 클리어로 획득</p>'+btn('craft','제작 · 배지 2',data.badges<2))+'</section>';
  body.innerHTML=banner+nav+'<div class="garage-wallet">Z코인 '+progress.chips()+'　·　배지 '+data.badges+'</div>'+list+detail;
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
 body.onclick=e=>{
  const button=e.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.part){activePart=system.parts.find(p=>p.id===button.dataset.part);note.textContent='';render();return}
  const action=button.dataset.action;
  if(action==='shoot')return;
  note.textContent='';
  if(action==='trial'){trial();return}
  if(action==='parts'||action==='signal')tab=action;
  else if(action==='driver'){$('hero-3').click();note.textContent='정비사가 출전 대기 중입니다.'}
  else{
   const wasOwned=progress.garage().mechanic;
   if(!progress.garageAction(action,activePart.id,selectedHero)){note.textContent='저장 상태와 보유 재화를 확인하세요.';return}
   if(action==='radio'&&!wasOwned){
    renderHeroes();$('hero-3').click();note.textContent='“견인 요청하신 분?” 정비사가 합류했습니다!';
    panel.animate?.([{opacity:.5},{opacity:1}],{duration:360});
   }else note.textContent=({equip:'장착했습니다.',upgrade:'강화 성공!',craft:'제작 완료!',radio:'구조 배지 +1',batch:'구조 배지 +10'})[action];
   if(['radio','batch'].includes(action)&&wasOwned)note.textContent=progress.garage().calls.map(i=>HEROES[i].name).join(' · ')+' 응답! 배지 +'+progress.garage().calls.length;
   window.ZZProgressionSound?.();
  }
  render();
 };
 $('garage-open').onclick=()=>{if(!['menu','over'].includes(mode))return;tab='parts';note.textContent='';render();panel.showModal()};
 $('garage-close').onclick=()=>panel.close();
 panel.addEventListener('close',()=>cancelAnimationFrame(frame));
})();
