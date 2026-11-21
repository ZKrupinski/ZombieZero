'use strict';
(()=>{
 const system=window.ZZGarage,progress=window.ZZProgression;
 let panel,body,note,garageHero;
 const slots=['무기','공','차량'];
 const styles=['라켓 끝으로 받으면 코너를 깊게 노립니다.','배트 중심에 맞히면 적 무리를 강하게 밀어냅니다.','두 번째 리턴마다 첫 충돌이 주변 적에게 한 번 더 튑니다.','벽을 맞힌 휠캡이 첫 적을 옆으로 밀어냅니다.'];
 let activePart=system.parts[0],tab='parts',frame=0;
 // The first three survivors belong to the player from the start.
 // The tow mechanic joins the reel only after the radio actually recruits them.
 function availableHeroes(){
  return HEROES.map((_,i)=>i).filter(i=>i<3||(i===3&&progress.garage().mechanic));
 }
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
 function reelCard(h,data){
  const xp=data.xp[h]||0;
  const portrait=h===3
   ?'<img class="tow-preview" src="assets/ip/tow-mechanic.webp" alt="">'
   :'<span class="garage-portrait" style="--row:'+h+'"></span>';
  return '<div class="garage-reel-card" data-reel-hero="'+h+'">'+
   '<div class="garage-reel-figure">'+portrait+'</div>'+
   '<div class="garage-reel-copy"><span class="garage-reel-count">OWNED</span>'+
   '<h3>'+HEROES[h].name+'</h3>'+
   '<p>'+styles[h]+'</p>'+
   '<small>숙련 '+xp+' 클리어</small></div></div>';
 }
 let refreshGarageReel=()=>{};
 function render(){
  cancelAnimationFrame(frame);
  const data=progress.garage(),roster=availableHeroes(),wanted=tab==='parts'?garageHero:selectedHero;
  const h=roster.includes(wanted)?wanted:roster[0],part=activePart;
  if(tab==='parts')garageHero=h;
  const level=data.levels[part.id],owned=level!==undefined;
  const gear=data.loads[h],price=system.prices[level],xp=data.xp[h]||0;
  const statPanel='<section class="garage-stat-panel" aria-label="현재 캐릭터 기본 능력치와 강화분">'+
   '<div class="garage-stat-heading"><b>현재 장착 능력치</b><small><i class="stat-legend-base"></i>기본 <i class="stat-legend-boost"></i>강화 증가</small></div>'+
   (system.heroStatMarkup?.(HEROES[h],data,progress,h)||'')+
   '<p class="garage-stat-footnote">첫타 = 첫 충돌 공격력 · 수비 = 공 반사 판정 폭</p></section>';
  const banner='<section class="garage-driver" aria-label="보유 캐릭터 회전 선택" data-selected-hero="'+h+'" tabindex="0">'+
   '<div class="garage-reel-stage">'+roster.map(i=>reelCard(i,data)).join('')+'</div>'+
   reelArrow(-1)+reelArrow(1)+'</section>';
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
  body.innerHTML=banner+wallet+statPanel+'<p class="nut-guide">무전 중복 응답으로 너트 획득 · 2개로 장비 1종 제작</p>'+list+detail;
  refreshGarageReel();
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
  const button=e.target.closest('button');if(!button||button.disabled||button.dataset.step||button.dataset.reelHero!==undefined)return;
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
  // Garage adjustments are visible immediately on the main hero cards,
  // even when the user closes the dialog without changing characters.
  if(typeof renderHeroes==='function'&&['equip','upgrade','craft'].includes(action))renderHeroes();
 }
 function reelArrow(dir){
  return '<button type="button" class="reel-arrow" data-step="'+dir+'" aria-label="'+(dir<0?'이전':'다음')+' 캐릭터">'+(dir<0?'‹':'›')+'</button>';
 }
 // All visible reel cards stay mounted throughout a gesture. Only their
 // transforms change on pointermove; inventory and gear rerender ONCE at snap.
 function bindReel(root,selector,current,select,enabled){
  let pointer=null,startX=0,startY=0,dragged=false,vertical=false,progressUnits=0;
  let lastX=0,lastTime=0,velocity=0,coast=0,programmatic=false,lastSwipe=-1;
  const surface=()=>root.querySelector(selector);
  const roster=()=>availableHeroes();
  const reduce=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const stride=()=>Math.max(90,Math.min(190,(surface()?.clientWidth||320)*.47));
  const indexOf=(id)=>roster().indexOf(id);
  const fiveReel=selector==='.hero-options';
  // Five visible positions, plus one offscreen handoff on either side.
  // Slots are virtual; with fewer than five owned heroes the wheel cycles
  // existing heroes, and automatically shows five distinct once recruited.
  let proxies=[];
  function ensureFiveReel(){
   if(!fiveReel)return;
   const stage=surface();
   if(!stage?.appendChild||typeof document==='undefined'||!document.createElement)return;
   if(proxies.length&&proxies.every(node=>node.parentNode===stage))return;
   proxies=[];
   for(let offset=-3;offset<=3;offset++){
    const node=document.createElement('div');
    node.className='hero-card hero-reel-proxy';
    node.dataset.reelOffset=String(offset);
    node.setAttribute('role','button');
    node.tabIndex=offset===0?0:-1;
    node.setAttribute('aria-label','캐릭터 선택');
    stage.appendChild(node);proxies.push(node);
   }
   root.dataset.fiveReel='true';
  }
  function syncFiveReel(){
   ensureFiveReel();
   if(!proxies.length)return;
   const heroes=roster(),count=heroes.length,origin=indexOf(current());
   if(!count)return;
   for(const node of proxies){
    const offset=Number(node.dataset.reelOffset);
    const hero=heroes[((Math.max(0,origin)+offset)%count+count)%count];
    const source=$('hero-'+hero);
    if(!source)continue;
    if(node.dataset.reelHero!==String(hero)||node.innerHTML!==source.innerHTML){
     node.innerHTML=source.innerHTML;
     node.dataset.reelHero=String(hero);
    }
    node.setAttribute('aria-label',source.textContent?.trim()||('캐릭터 '+(hero+1)));
    node.setAttribute('aria-current',offset===0?'true':'false');
    node.tabIndex=offset===0?0:-1;
   }
  }
  const items=()=>Array.from(surface()?.querySelectorAll?.(
   fiveReel&&$('overlay')?.dataset.screen==='selection'?'.hero-reel-proxy':
   fiveReel?'.hero-card:not(.hero-reel-proxy)':'[data-reel-hero],.hero-card'
  )||[]);
  function itemHero(item){
   return item.dataset?.reelHero!==undefined?Number(item.dataset.reelHero):Number(item.id?.slice(5));
  }
  function paint(progress=0){
   const heroes=roster(),count=heroes.length,origin=indexOf(current()),step=stride();
   if(!count)return;
   if(fiveReel&&$('overlay')?.dataset.screen==='selection'){
    ensureFiveReel();
    const width=surface()?.clientWidth||320;
    for(const node of proxies){
     const offset=Number(node.dataset.reelOffset);
     const relative=offset-progress,distance=Math.abs(relative);
     const first=Math.min(1,distance),second=Math.min(1,Math.max(0,distance-1));
     const spread=distance<=1?distance*.265:.265+(distance-1)*.215;
     const dx=Math.sign(relative)*spread*width;
     const scale=1-first*.30-second*.20;
     const turn=-relative*10,drop=Math.min(distance,2)*7;
     node.style.transform='translate(-50%, -50%) translate3d('+dx.toFixed(1)+'px,'+drop.toFixed(1)+'px,0) scale('+scale.toFixed(3)+') rotateY('+turn.toFixed(1)+'deg)';
     node.style.opacity=distance<2.72?Math.min(1,Math.max(0,(2.72-distance)*3)).toFixed(3):'0';
     node.style.zIndex=String(200-Math.round(distance*50));
     node.style.filter='brightness('+(1-.12*Math.min(distance,2)).toFixed(2)+')';
     node.style.pointerEvents=distance<2.45?'auto':'none';
     node.dataset.reelFocus=distance<.48?'true':'false';
    }
    return;
   }
   for(const node of items()){
    const id=itemHero(node),at=heroes.indexOf(id);
    if(at<0){node.style.display='none';continue}
    node.style.display='';
    let relative=at-(origin<0?0:origin)-progress;
    while(relative>count/2)relative-=count;
    while(relative< -count/2)relative+=count;
    const distance=Math.abs(relative),side=Math.min(1,distance);
    const visible=distance<1.28;
    const scale=1-.30*side,turn=-relative*13;
    const dx=relative*step,drop=side*9;
    node.style.transform='translate(-50%, -50%) translate3d('+dx.toFixed(1)+'px,'+drop.toFixed(1)+'px,0) scale('+scale.toFixed(3)+') rotateY('+turn.toFixed(1)+'deg)';
    node.style.opacity=visible?Math.min(1,Math.max(0,(1.28-distance)*4)).toFixed(3):'0';
    node.style.zIndex=String(100-Math.round(distance*30));
    node.style.filter='brightness('+(1-.27*side).toFixed(2)+') saturate('+(1-.17*side).toFixed(2)+')';
    node.style.pointerEvents=distance<1.08?'auto':'none';
    node.dataset.reelFocus=distance<.49?'true':'false';
   }
  }
  function refresh(){if(pointer===null&&coast===0){if(fiveReel)syncFiveReel();paint(0)}}
  function stop(){cancelAnimationFrame(coast);coast=0;progressUnits=0;paint(0)}
  function commit(target){
   const heroes=roster(),at=indexOf(current());
   if(!heroes.length)return;
   const id=heroes[(((at<0?0:at)+target)%heroes.length+heroes.length)%heroes.length];
   if(id!==current()){
    programmatic=true;
    try{select(id)}finally{programmatic=false}
   }
   progressUnits=0;if(fiveReel)syncFiveReel();paint(0);
  }
  function snap(target){
   cancelAnimationFrame(coast);coast=0;
   target=Math.max(-3,Math.min(3,target));
   const from=progressUnits,dist=Math.abs(target-from);
   if(!dist||reduce()||typeof requestAnimationFrame!=='function'){commit(target);return}
   const duration=Math.max(170,Math.min(420,180+dist*105));
   let began=null;
   const tick=now=>{
    if(!enabled()){stop();return}
    if(began===null)began=now;
    const t=Math.min(1,(now-began)/duration);
    // Cubic ease-out decelerates the slot wheel without jumping during drag.
    const eased=1-Math.pow(1-t,3);
    paint(from+(target-from)*eased);
    if(t<1)coast=requestAnimationFrame(tick);
    else{coast=0;commit(target)}
   };
   coast=requestAnimationFrame(tick);
  }
  root.addEventListener('pointerdown',e=>{
   if(!enabled()||pointer!==null||e.button!==0||!e.target.closest(selector)||e.target.closest('[data-step]'))return;
   stop();pointer=e.pointerId;
   startX=lastX=e.clientX;startY=e.clientY??0;lastTime=e.timeStamp??0;
   dragged=false;vertical=false;velocity=0;
   root.setPointerCapture?.(pointer);
  });
  root.addEventListener('pointermove',e=>{
   if(pointer!==e.pointerId||vertical)return;
   const dx=e.clientX-startX,dy=(e.clientY??startY)-startY;
   if(!dragged&&Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)*1.2){
    vertical=true;progressUnits=0;paint(0);return;
   }
   if(Math.abs(dx)>7)dragged=true;
   if(!dragged)return;
   e.preventDefault?.();
   const dt=Math.max(8,(e.timeStamp??lastTime+16)-lastTime);
   velocity=velocity*.52+((e.clientX-lastX)/dt)*.48;
   lastX=e.clientX;lastTime=e.timeStamp??lastTime+16;
   // 1:1 finger tracking. Do NOT mutate selectedHero or innerHTML while swiping.
   progressUnits=Math.max(-3.2,Math.min(3.2,-dx/stride()));
   paint(progressUnits);
  });
  function release(e){
   if(pointer!==e.pointerId)return;
   pointer=null;
   if(vertical){progressUnits=0;paint(0);return}
   if(e.type!=='pointerup'){snap(0);return}
   const dx=e.clientX-startX;
   if(Math.abs(dx)>7)dragged=true;
   if(!dragged){progressUnits=0;paint(0);return}
   lastSwipe=e.timeStamp??0;
   progressUnits=Math.max(-3.2,Math.min(3.2,-dx/stride()));
   const projected=progressUnits-Math.max(-.85,Math.min(.85,velocity*140/stride()));
   let target=Math.round(projected);
   // A deliberate half-card drag changes once; a tiny move returns to center.
   if(Math.abs(dx)<20&&Math.abs(velocity)<.38)target=0;
   if(target===0&&Math.abs(dx)>25&&Math.abs(velocity)>.38)target=dx<0?1:-1;
   snap(target);
  }
  for(const event of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(event,release);
  // Capture the synthetic click produced by releasing a touch gesture on a
  // hero button BEFORE the button's native onclick can select the wrong hero.
  root.addEventListener('click',e=>{
   if(programmatic||lastSwipe<0||!Number.isFinite(e.timeStamp))return;
   if(e.timeStamp>=lastSwipe&&e.timeStamp-lastSwipe<350&&!e.target.closest('[data-step]')){
    e.preventDefault?.();e.stopImmediatePropagation?.();lastSwipe=-1;
   }
  },true);
  root.addEventListener('click',e=>{
   if(programmatic||!enabled())return;
   const arrow=e.target.closest('[data-step]');
   if(arrow){stop();snap(Number(arrow.dataset.step));return}
   const card=e.target.closest('[data-reel-hero],.hero-card');
   if(!card)return;
   if(lastSwipe>=0&&Number.isFinite(e.timeStamp)&&e.timeStamp>=lastSwipe&&e.timeStamp-lastSwipe<350){
    e.preventDefault?.();e.stopImmediatePropagation?.();lastSwipe=-1;return;
   }
   // Proxies are virtual slots: tapping either of the two side positions
   // uses that exact offset, not the shortest hero-ID distance (which would
   // jump in a 3-character looping roster).
   if(fiveReel&&card.dataset.reelOffset!==undefined){
    const offset=Number(card.dataset.reelOffset);
    if(offset!==0){stop();snap(offset)}
    return;
   }
   // Tapping a rear card is equivalent to spinning it to the center.
   const at=indexOf(itemHero(card)),currentAt=indexOf(current());
   if(at>=0&&currentAt>=0&&at!==currentAt){
    let delta=at-currentAt;
    const count=roster().length;
    if(delta>count/2)delta-=count;
    if(delta< -count/2)delta+=count;
    // Main menu's native button handler has already updated selectedHero;
    // garage cards are divs, so they need the selection callback here.
    if(selector==='.garage-driver')snap(delta);
    else paint(0);
   }else paint(0);
  });
  root.addEventListener('keydown',e=>{
   if(!enabled()||!e.target.closest(selector)||!['ArrowLeft','ArrowRight'].includes(e.key))return;
   e.preventDefault();e.stopPropagation();stop();snap(e.key==='ArrowLeft'?-1:1);
  });
  if(fiveReel)syncFiveReel();
  paint(0);
  window.addEventListener?.('resize',refresh);
  // Main selector may start hidden before the title fades out.
  // Its visible width must reflow on reveal, not stay at the hidden 0px stride.
  if(selector==='.hero-options'&&typeof ResizeObserver==='function'){
   const node=surface();if(node)new ResizeObserver(refresh).observe(node);
  }
  return {refresh,paint};
 }
 const menuReel=bindReel($('heroes'),'.hero-options',()=>selectedHero,i=>$('hero-'+i).click(),()=>['menu','over'].includes(mode));
 window.ZZRefreshHeroReel=menuReel.refresh;
 const garageReel=bindReel($('garage-body'),'.garage-driver',()=>garageHero,i=>{garageHero=i;note.textContent='';render()},()=>$('garage-dialog').open);
 refreshGarageReel=garageReel.refresh;
 for(const [prefix,page] of [['garage','parts'],['radio','signal']]){
  const dialog=$(prefix+'-dialog'),content=$(prefix+'-body');
  $(prefix+'-open').onclick=()=>{
   if(!['menu','over'].includes(mode))return;
   panel=dialog;body=content;note=$(prefix+'-note');tab=page;garageHero=selectedHero;
   note.textContent='';render();dialog.showModal();dialog.scrollTop=0;
   if(page==='parts')refreshGarageReel();
  };
  content.onclick=handleAction;
  $(prefix+'-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>cancelAnimationFrame(frame));
 }
})();
