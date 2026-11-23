/* ZOMBIE ZERO v195: fixed 9:16, scroll-free help and encyclopedia pages. */
'use strict';
(function(){
 const dialog=document.getElementById('help-dialog');
 const legacy=dialog?.querySelector('.guide');
 if(!dialog||!legacy)return;
 const host=document.createElement('div');
 host.id='zz-help-pages';
 host.innerHTML='<header><small>ARCADE / MANUAL</small><h2 id="zz-help-title">조작 안내</h2></header>'+
  '<div id="zz-help-body"></div>'+
  '<nav id="zz-help-navigation" aria-label="도움말 페이지"><button type="button" id="zz-help-prev">◀ 이전</button><span id="zz-help-page-label" role="status" aria-live="polite">1 / 1</span><button type="button" id="zz-help-next">다음 ▶</button></nav>';
 legacy.before(host);
 const body=host.querySelector('#zz-help-body'),title=host.querySelector('#zz-help-title');
 const label=host.querySelector('#zz-help-page-label');
 const prev=host.querySelector('#zz-help-prev'),next=host.querySelector('#zz-help-next');
 let pages=[],page=0;
 const card=(lines)=>{
  const node=document.createElement('div');node.className='zz-help-instructions';
  for(const [head,value] of lines){
   const section=document.createElement('div');section.className='zz-help-instruction';
   const strong=document.createElement('strong');strong.textContent=head;
   const p=document.createElement('p');p.textContent=value;
   section.append(strong,p);node.append(section);
  }
  return node;
 };
 function add(title,section){pages.push({title,section})}
 function build(){
  pages=[];
  add('조작 · 플레이',card([
   ['이동','화면 좌우 드래그 또는 ← →. 터치하거나 SPACE를 눌러 공을 발사합니다.'],
   ['목표','공을 반사해 좀비를 물리치고, 도시 방어선과 시민들을 지키세요.'],
   ['웨이브','일반 모드는 50스테이지, ENDLESS WAVE는 무한 생존 도전입니다.'],
   ['영구 성장','선택 화면의 UPGRADE에서 Z-CHIP으로 23종 능력을 성장시킵니다.']
  ]));
  add('방벽 호드 · 건설',card([
   ['시작','캐릭터 선택 화면에서 BARRICADE HORDE를 누르면 빈 전장에서 건설이 시작됩니다.'],
   ['설치','빈칸을 드래그하면 재료가 허용하는 칸 수까지만 방벽 미리보기가 나타납니다. 재료가 소진되면 드래그 중에도 추가로 그려지지 않습니다. 손을 떼면 근처에 확인/취소가 표시됩니다.'],
   ['철거','이미 지어진 방벽을 드래그하면 빨간색 X로 표시됩니다. 확인하면 해당 칸을 삭제하고 칸당 자재 1개를 즉시 돌려받습니다.'],
   ['수리','하단의 수리 버튼을 켜고 손상된 방벽을 드래그하세요. 한 번의 확인에서 최대 5칸마다 자재 1개만 소모하며 선택한 방벽은 모두 체력 30으로 완전 복구됩니다.'],
   ['출전','캐릭터 근처의 준비 완료를 누르면 방벽을 피해서 미니 호드가 배치되고 전투가 시작됩니다. 공은 방벽에서 튕기지만 방벽 체력을 깎지 않습니다.'],
   ['다음 스테이지','생존 방벽은 유지됩니다. 지난 스테이지에서 좀비가 파괴한 칸은 자재 1개씩 환급되며, 추가 보급 자재도 별도로 지급됩니다.']
  ]));
  add('시민 · 방어',card([
   ['시민 복귀','연속 처치로 이탈한 시민이 복귀합니다. 성장 시 복귀 대기시간과 필요 콤보가 감소합니다.'],
   ['바주카 지원','위험 상황에서 시민이 광역 바주카를 지원합니다. 공격력과 사격 간격을 성장시킬 수 있습니다.'],
   ['최후의 저항','20스테이지부터 방어선 위기 시 좀비를 밀어냅니다. 성장하면 거리와 사용 횟수가 늘어납니다.'],
   ['중독','좀비 침과 쓰레기를 막으면 중독 게이지가 쌓입니다. 저항·해독·그로기 방어를 성장시킬 수 있습니다.']
  ]));
  const skills=Array.from(document.querySelector('#legend')?.children||[]);
  for(let offset=0;offset<skills.length;offset+=4){
   const container=document.createElement('div');container.className='zz-help-skill-grid';
   skills.slice(offset,offset+4).forEach(el=>container.append(el.cloneNode(true)));
   add('액티브 스킬 '+(Math.floor(offset/4)+1)+' / '+Math.ceil(skills.length/4),container);
  }
  const gallery=document.getElementById('canon-gallery');
  const atlas=document.getElementById('canon-collection');
  const collection=Array.from(gallery?.children||[]);
  for(let offset=0;offset<collection.length;offset+=4){
   const container=document.createElement('div');container.className='zz-help-canon';
   // Original encyclopedia has the approved bitmap atlas custom property.
   if(atlas&&typeof getComputedStyle==='function')
    container.style.setProperty('--object-atlas',getComputedStyle(atlas).getPropertyValue('--object-atlas'));
   collection.slice(offset,offset+4).forEach(el=>container.append(el.cloneNode(true)));
   add('좀비 도감 '+(Math.floor(offset/4)+1)+' / '+Math.ceil(collection.length/4),container);
  }
  if(!collection.length)add('좀비 도감',card([['원작 캐릭터','좀비·보스 및 생존자 일러스트가 준비되면 이곳에 표시됩니다.']]));
  const demos=document.createElement('div');demos.className='zz-help-demos';
  for(const [id,name,desc] of [
   ['object-cast-demo-open','원작 사물 좀비 10종','정면·좌하·우하 이동 / 피격 / 사망'],
   ['death-demo-open','그린 좀비 사망 연출','일반·크리티컬 사망 애니메이션']
  ]){
   const button=document.createElement('button');button.type='button';button.textContent=name;
   button.addEventListener('click',()=>document.getElementById(id)?.click());
   const small=document.createElement('small');small.textContent=desc;
   demos.append(button,small);
  }
  add('애니메이션 검수',demos);
 }
 function render(){
  if(!pages.length)build();
  page=Math.max(0,Math.min(pages.length-1,page));
  const current=pages[page];
  title.textContent=current.title;
  body.replaceChildren(current.section);
  label.textContent=(page+1)+' / '+pages.length;
  prev.disabled=page===0;
  next.disabled=page===pages.length-1;
 }
 prev.addEventListener('click',()=>{page--;render()});
 next.addEventListener('click',()=>{page++;render()});
 document.getElementById('help')?.addEventListener('click',()=>{page=0;build();render()});
 dialog.addEventListener('close',()=>{page=0});
 build();render();
 window.ZZHelpPager={next:()=>{page++;render()},previous:()=>{page--;render()},getCount:()=>pages.length};
})();
