'use strict';
(()=>{
 const system=window.ZZGarage,progress=window.ZZProgression;
 let panel,body,note,garageHero;
 const slots=['무기','공','차량'];
 const styles=['가장 넓은 수비 판정과 정교한 코너 컨트롤. 안정적으로 방어합니다.','최고 이동 속도와 긴 스킬 시간. 중심에 맞히면 적을 강하게 밀어냅니다.','기본 화력 2.2. 두 번째 리턴마다 주변 적에게 충격이 전이됩니다.','가벼운 조작에도 크게 꺾이는 트릭샷. 벽 반사 후 첫 적을 강타하고 주변 2명까지 타격.'];
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
  const rank=system.mastery(data.xp[h]);
  const portrait=h===3
   ?'<img class="tow-preview" src="assets/ip/wrench-mid-v261.webp?v=263" alt="">'
   :'<span class="garage-portrait" style="--row:'+h+'"></span>';
  return '<div class="garage-reel-card" data-reel-hero="'+h+'">'+
   '<div class="garage-reel-figure">'+portrait+'</div>'+
   '<div class="garage-reel-copy"><span class="garage-reel-count">OWNED</span>'+
   '<h3>'+HEROES[h].name+'</h3>'+
   '<span class="garage-class-label" style="--hero-accent:'+(HEROES[h].accent||'#c2e88e')+'">'+(HEROES[h].role||'SURVIVOR')+' · '+(HEROES[h].className||'생존자')+'</span>'+
   '<p>'+styles[h]+'</p>'+
   '<small>숙련 Lv.'+rank+' · 수비 +'+rank+'px</small></div></div>';
 }
 let refreshGarageReel=()=>{};
 let receipt=null,receiving=false,receiveTimer;
 function radioPortrait(hero){
  return hero===3?'<img class="rx-portrait" src="assets/ip/wrench-mid-v261.webp?v=263" alt="">':
   '<span class="rx-portrait rx-sprite" style="--row:'+hero+'" aria-hidden="true"></span>';
 }
 function radioView(data,wallet){
  const newHero=receipt?.recruit!=null;
  const hero=receipt?.recruit??receipt?.calls[0];
  const label=receiving?'응답 수신 중':receipt?(newHero?'신규 생존자 합류':'아군 응답 확인'):'구조 채널 대기';
  const title=receiving?'주파수 동조 중…':receipt?HEROES[hero].name:(data.mechanic?'생존자 통신망':'폐차장 신호 포착');
  const visual=receipt&&!receiving?radioPortrait(hero):icon('radio');
  const caption=receiving?'호출을 보냈습니다.':receipt?(newHero?'구조 성공! 이제 함께 출전할 수 있습니다.':HEROES[hero].role):
   (data.mechanic?'보유 생존자 4명 · 응답 확률 각 25%':'첫 호출 확정 합류 · 렌치');
  const screen='<section class="rx-screen '+(receiving?'rx-tuning':receipt?(newHero?'rx-reveal rx-new':'rx-reveal'):'')+'">'+
   '<div class="rx-status"><i></i>'+label+'</div><div class="rx-art">'+visual+'</div>'+
   '<h3>'+title+'</h3><p>'+caption+'</p></section>';
  if(receiving)return wallet+screen+btn('reveal','결과 바로 보기');
  if(receipt){
   const counts=HEROES.map((_,i)=>receipt.calls.filter(id=>id===i).length);
   const rows=counts.map((count,i)=>{
    if(!count)return '';
    const gained=receipt.gains[i],xp=data.xp[i]||0;
    const rank=system.mastery(xp),previous=system.mastery(xp-gained);
    const reward=gained?'중복 '+gained+'회 · 숙련 +'+gained+' · 너트 +'+gained:'신규 합류';
    return '<li>'+radioPortrait(i)+'<div><b>'+HEROES[i].name+'</b><small>'+reward+'</small>'+
     (rank>previous?'<strong>숙련 Lv.'+previous+' → '+rank+' · 수비 +'+(rank-previous)+'px</strong>':'')+'</div></li>';
   }).join('');
   return wallet+screen+'<div class="rx-summary"><b>응답 '+receipt.calls.length+'건</b>'+
    (receipt.nuts?'<span>'+icon('nut')+'제작 너트 +'+receipt.nuts+'</span>':'')+'</div>'+
    '<ul class="rx-list">'+rows+'</ul>'+
    (newHero?'<p class="rx-guide">'+styles[hero]+'</p>':'')+
    '<div class="rx-actions">'+btn('signal','무전으로')+(newHero?btn('visit','차고에서 보기'):'')+'</div>';
  }
  return wallet+screen+'<div class="rx-actions">'+btn('radio','1회 호출 <small>무전권 1장</small>',data.tickets<1)+
   btn('batch','10회 호출 <small>무전권 10장</small>',data.tickets<10)+'</div>'+
   '<p class="rx-guide">스테이지·웨이브 첫 클리어 시 무전권 1장<br>보유 생존자 응답 시 해당 캐릭터 숙련 +1 · 제작 너트 +1<br>너트 2개로 미보유 장비 1종 제작</p>';
 }
 function revealRadio(){
  clearTimeout(receiveTimer);
  receiving=false;
  if(!panel.open||tab!=='signal')return;
  render();
  note.textContent=receipt.recruit!=null?HEROES[receipt.recruit].name+' 합류를 환영합니다!':'응답 수신 완료';
  body.querySelector('[data-action=signal]')?.focus();
 }
 function callRadio(action){
  if(receipt)return;
  const before=progress.garage(),owned=availableHeroes();
  if(!progress.garageAction(action,activePart.id,selectedHero)){
   note.textContent='호출을 저장하지 못했습니다. 무전권과 저장 상태를 확인하세요.';return;
  }
  const after=progress.garage();
  const recruit=after.calls.find(id=>!owned.includes(id));
  receipt={calls:after.calls.slice(),recruit,nuts:after.badges-before.badges,
   gains:HEROES.map((_,i)=>(after.xp[i]||0)-(before.xp[i]||0))};
  renderHeroes();
  if(recruit!=null)$('hero-'+recruit).click();
  window.ZZProgressionSound?.();
  receiving=true;render();
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)revealRadio();
  else{
   body.querySelector('[data-action=reveal]')?.focus();
   receiveTimer=setTimeout(revealRadio,1050);
  }
 }
 function render(){
  cancelAnimationFrame(frame);
  const data=progress.garage(),roster=availableHeroes(),wanted=tab==='parts'?garageHero:selectedHero;
  const h=roster.includes(wanted)?wanted:roster[0],part=activePart;
  if(tab==='parts')garageHero=h;
  const level=data.levels[part.id],owned=level!==undefined;
  const gear=data.loads[h],price=system.prices[level],xp=data.xp[h]||0;
  const rank=system.mastery(xp);
  const next=rank===system.masteryCap?'최고 단계':('다음 단계까지 '+(system.masteryStep-xp%system.masteryStep)+'점');
  const statPanel='<section class="garage-stat-panel" aria-label="현재 캐릭터 기본 능력치와 강화분">'+
   '<div class="garage-stat-heading"><b>'+(HEROES[h].role||'SURVIVOR')+' · 현재 능력치</b><small><i class="stat-legend-base"></i>기본 <i class="stat-legend-boost"></i>강화 증가</small></div>'+
   (system.heroStatMarkup?.(HEROES[h],data,progress,h)||'')+
   '<p class="garage-stat-footnote">숙련 '+xp+'점 · '+next+' · 숙련 Lv당 수비 +1px</p></section>';
  const banner='<section class="garage-driver" aria-label="보유 캐릭터 회전 선택" data-selected-hero="'+h+'" tabindex="0">'+
   '<div class="garage-reel-stage">'+roster.map(i=>reelCard(i,data)).join('')+'</div>'+
   reelArrow(-1)+reelArrow(1)+'</section>';
  const wallet='<div class="garage-wallet">'+(tab==='signal'?currency('ticket','무전권',data.tickets):currency('coin','Z코인',progress.chips()))+currency('nut','너트',data.badges)+'</div>';
  if(tab==='signal'){
   body.innerHTML=radioView(data,wallet);
   return;
  }
  const list=slots.map((slot,i)=>'<section class="garage-slot"><small>'+slot+'</small><div>'+system.parts.filter(p=>p.slot===i).map(p=>card(p,data,gear)).join('')+'</div></section>').join('');
  const details=system.partBenefits?.(part,level||0)||{stat:'',unique:part.label};
  const nextBenefit=owned&&level<5?system.partBenefits?.(part,level+1):null;
  const effect='<span class="garage-effect-stat">스탯 '+details.stat+'</span>'+
   '<span class="garage-effect-unique">고유 '+details.unique+'</span>'+
   (nextBenefit?'<small class="garage-effect-next">다음: '+nextBenefit.stat+'</small>':'');
  const stage=part.id==='cushion'?1:system.parts.indexOf(part)+1;
  const actions=owned?btn('equip',gear[part.slot]===part.id?'장착 중':'장착',gear[part.slot]===part.id)+btn('upgrade',price?icon('coin')+'강화 '+price:'최대 강화',price===undefined||price>progress.chips()):btn('craft',icon('nut')+'너트 2개로 제작',data.badges<2);
  const detail='<section class="garage-detail"><div class="part-inspect">'+icon(part.id)+'<div><strong>'+part.name+'</strong><p>'+effect+'</p></div></div><div class="part-actions">'+(owned?'':'<small>스테이지 '+stage+' 또는 웨이브 '+stage+' 첫 클리어 보상</small>')+actions+'</div></section>';
  body.innerHTML='<div class="garage-shell">'+banner+wallet+statPanel+'<div class="garage-part-grid">'+list+'</div>'+detail+'</div>';
  refreshGarageReel();
 }
 function handleAction(e){
  const button=e.target.closest('button');if(!button||button.disabled||button.dataset.step||button.dataset.reelHero!==undefined)return;
  if(button.dataset.part){activePart=system.parts.find(p=>p.id===button.dataset.part);note.textContent='';render();return}
  const action=button.dataset.action;
  note.textContent='';
  if(action==='radio'||action==='batch'){callRadio(action);return}
  if(action==='reveal'){revealRadio();return}
  if(action==='visit'){const hero=receipt.recruit;receipt=null;panel.close();$('garage-open').click();garageHero=hero;render();return}
  if(action==='signal')receipt=null;
  if(action==='parts'||action==='signal')tab=action;
  else{
   const oldLevel=progress.garage().levels[activePart.id];
   if(!progress.garageAction(action,activePart.id,tab==='parts'?garageHero:selectedHero)){note.textContent='저장 상태와 보유 재화를 확인하세요.';return}
   note.textContent=({equip:'장착했습니다.',upgrade:'강화 성공!',craft:'제작 완료!'})[action];
   if(action==='upgrade'){
    const item=activePart,data=progress.garage();
    note.textContent=item.name+' 강화! '+item.label+' '+system.value(item,oldLevel)+item.unit+' → '+system.value(item,data.levels[item.id])+item.unit+
     (data.loads[garageHero][item.slot]===item.id?' · 적용 중':' · 장착 시 적용');
   }
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
  const stride=()=>fiveReel?Math.max(75,Math.min(215,(surface()?.clientWidth||320)*.265)):Math.max(90,Math.min(190,(surface()?.clientWidth||320)*.47));
  const indexOf=(id)=>roster().indexOf(id);
  const fiveReel=selector==='.hero-options';
  const heroScreen=()=>['selection','results'].includes($('overlay')?.dataset?.screen);

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
  // Full card UI for every reel position: original 192px bitmap portrait,
  // character name overlaid on the lower right of the artwork and the same
  // equipment stat box that appears on the centered card. No new art assets.
  function heroReelCardMarkup(hero,source){
   const model=HEROES[hero];
   const art=source.querySelector?.('.hero-vehicle-portrait')?.outerHTML||
    source.innerHTML.match(/<span[^>]*class="[^"]*hero-vehicle-portrait[^"]*"[^>]*><\/span>/)?.[0]||
    source.innerHTML;
   const stats=source.querySelector?.('.hero-mini-stats')?.outerHTML||'';
   return '<div class="hero-reel-artwork">'+art+
    '<span class="hero-class-badge" style="--hero-accent:'+(model.accent||'#d5fc71')+'">'+(model.role||'SURVIVOR')+'</span>'+
    '<div class="hero-reel-id"><b>'+model.name+'</b><small>'+(model.role||'')+'</small></div>'+
    '</div><div class="hero-reel-bottom">'+stats+'</div>';
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
    const markup=heroReelCardMarkup(hero,source);
    if(node.dataset.reelHero!==String(hero)||node.innerHTML!==markup){
     node.innerHTML=markup;
     node.dataset.reelHero=String(hero);
    }
    node.setAttribute('aria-label',source.textContent?.trim()||('캐릭터 '+(hero+1)));
    node.setAttribute('aria-current',offset===0?'true':'false');
    node.tabIndex=offset===0?0:-1;
   }
  }
  const items=()=>Array.from(surface()?.querySelectorAll?.(
   fiveReel&&heroScreen()?'.hero-reel-proxy':
   fiveReel?'.hero-card:not(.hero-reel-proxy)':'[data-reel-hero],.hero-card'
  )||[]);
  function itemHero(item){
   return item.dataset?.reelHero!==undefined?Number(item.dataset.reelHero):Number(item.id?.slice(5));
  }
  function paint(progress=0){
   const heroes=roster(),count=heroes.length,origin=indexOf(current()),step=stride();
   if(!count)return;
   if(fiveReel&&heroScreen()){
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
     // Do not light temporary pass-through cards during swipe/snap.
     // Only the fixed center slot is allowed to glow once the wheel rests.
     node.dataset.reelFocus=offset===0&&Math.abs(progress)<.001?'true':'false';
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
  dialog.addEventListener('close',()=>{
   if(prefix==='radio'){clearTimeout(receiveTimer);receiving=false}
   if(panel===dialog)cancelAnimationFrame(frame);
  });
 }
})();
