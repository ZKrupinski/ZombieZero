// Gameplay sprite review overlay, drawing the SAME art atlas/renderer as the game.
// Does not change game state, physics, scoring or saved progress.
(function(){
'use strict';
function setup(){
 const trigger=document.getElementById('object-cast-demo-open');
 const atlas=window.ZZObjectSprite;
 if(!trigger||!atlas)return;
 const dialog=document.createElement('dialog');dialog.id='object-cast-demo-dialog';dialog.className='object-cast-demo';
 dialog.innerHTML='<button type="button" class="dialog-close" id="object-cast-demo-close">닫기 ✕</button><h2>ZOMBIE ZERO 원작 좀비 10종</h2><p>이동·피격은 기본 원화, 사망은 실제 게임에 적용된 일반/크리티컬 애니메이션을 재생합니다.</p><div class="object-cast-controls" role="group" aria-label="애니메이션 선택"></div><div class="object-cast-grid" role="list"></div>';
 document.body.appendChild(dialog);
 const grid=dialog.querySelector('.object-cast-grid'),controls=dialog.querySelector('.object-cast-controls');
 const keys=['green_zombie',...Object.keys(atlas.names)],canvases=[];
 const width=148,height=168;
 const density=Math.min(3,Math.max(1,window.devicePixelRatio||1));
 for(const key of keys){
  const card=document.createElement('article');card.className='object-cast-card';card.setAttribute('role','listitem');
  const c=document.createElement('canvas');c.width=Math.round(width*density);c.height=Math.round(height*density);c.setAttribute('aria-label',(key==='green_zombie'?'그린 좀비':atlas.names[key])+' 애니메이션');
  const label=document.createElement('strong');label.textContent=key==='green_zombie'?'그린 좀비':atlas.names[key];
  card.append(c,label);grid.append(card);canvases.push({key,c});
 }
 // Four original bitmap characters per fixed-height 9:16 page. No scrolling.
 const PAGE_SIZE=4;
 let page=0;
 const pager=document.createElement('nav');
 pager.className='object-cast-pager';
 pager.setAttribute('aria-label','좀비 애니메이션 도감 페이지');
 pager.innerHTML='<button type="button" class="object-cast-prev">◀ 이전</button><span class="object-cast-page" role="status" aria-live="polite"></span><button type="button" class="object-cast-next">다음 ▶</button>';
 grid.after(pager);
 const prev=pager.querySelector('.object-cast-prev'),next=pager.querySelector('.object-cast-next'),status=pager.querySelector('.object-cast-page');
 function showPage(){
  const pageCount=Math.max(1,Math.ceil(canvases.length/PAGE_SIZE));
  page=Math.max(0,Math.min(pageCount-1,page));
  canvases.forEach(({c},i)=>{c.parentElement.hidden=i<page*PAGE_SIZE||i>=(page+1)*PAGE_SIZE});
  if(dialog.open)atlas.preview(keys.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE));
  status.textContent=(page+1)+' / '+pageCount;
  prev.disabled=page===0;next.disabled=page===pageCount-1;
 }
 prev.addEventListener('click',()=>{page--;showPage()});
 next.addEventListener('click',()=>{page++;showPage()});
 showPage();
 const modes=[['down','정면 하강'],['left','좌하 이동'],['right','우하 이동'],['hurt','피격'],['normal','일반 사망'],['critical','크리티컬 사망']];
 let mode='down',started=0,raf=0;
 for(const [value,label] of modes){
  const btn=document.createElement('button');btn.type='button';btn.textContent=label;
  btn.dataset.mode=value;btn.setAttribute('aria-pressed',String(value===mode));
  btn.onclick=()=>{mode=value;started=0;controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)))};
  controls.append(btn);
 }
 function render(timestamp){
  if(!dialog.open){raf=0;return}
  if(!started)started=timestamp;
  const seconds=(timestamp-started)/1000;
  for(const {key,c} of canvases){
   if(c.parentElement.hidden)continue;
   const ctx=c.getContext('2d');if(!ctx)continue;
   ctx.setTransform(c.width/width,0,0,c.height/height,0,0);
   ctx.clearRect(0,0,width,height);
   const isGreen=key==='green_zombie';
   const pack=isGreen?window.ZZGreenWalk:atlas;
   const entry=isGreen?pack:pack.images[key];
   const actor={form:pack.normal?.indexOf(key)??0,bossForm:pack.bosses?.indexOf(key)??0,
     boss:key==='big_zombie'||key==='trash_can',seed:0,moveDir:0,recoil:0};
   const img=isGreen?pack?.image:pack.activeImage(actor);
   if(!(isGreen?pack?.ready:pack.available(actor))||!img)continue;
   let frame=0,rect,source=img;
   if(mode==='normal'||mode==='critical'){
    // Match the gameplay render path, not old raw atlas indices 26~29.
    // P1/P2 finished PNGs appear here immediately after they load.
    if(!isGreen){
     const critical=mode==='critical',duration=actor.boss?(critical?.94:.78):(critical?.58:.52);
     const w=actor.boss?66:33,h=actor.boss?88:44;
     const preview={...actor,x:(width-w)/2,y:height-h-16,w,h,flash:0};
     pack.drawDeath(ctx,preview,critical,seconds%duration,duration);
     continue;
    }
    const death=window.ZZGreenDeath;
    if(death?.ready){
     const preview={...actor,x:(width-33)/2,y:height-60,w:33,h:44};
     death.draw(ctx,preview,mode==='critical',seconds%death[mode].duration);
    }
    continue;
   }else{
    const vx=mode==='left'?-1:mode==='right'?1:0;
    actor.moveDir=vx;
    actor.recoil=mode==='hurt'?.21-(seconds%.22):0;
    frame=mode==='hurt'?24+Math.floor((seconds%(.22))/.11):
      pack.getFrame(actor,seconds);
    rect=isGreen?pack.sourceRect(frame):pack.sourceRect(actor,frame,img);
   }
   if(!isGreen&&pack.frameImage){
    const cleaned=pack.frameImage(actor,frame,img);
    if(cleaned&&cleaned!==img){
     source=cleaned;
     rect=[rect[0]%256,rect[1]%256,rect[2],rect[3]];
    }
   }
   const [sx,sy,sw,sh]=rect;
   const scale=Math.min((width-12)/sw,(height-12)/sh);
   const w=sw*scale,h=sh*scale,x=(width-w)/2,y=(height-h)/2;
   ctx.imageSmoothingEnabled=true;
   ctx.drawImage(source,sx,sy,sw,sh,x,y,w,h);
  }
  raf=requestAnimationFrame(render);
 }
 function open(){if(!dialog.open){page=0;dialog.showModal();showPage();started=0;raf=requestAnimationFrame(render)}}
 function close(){dialog.close();if(raf)cancelAnimationFrame(raf);raf=0}
 trigger.addEventListener('click',open);
 dialog.querySelector('#object-cast-demo-close').onclick=close;
 dialog.addEventListener('close',()=>{atlas.preview([]);if(raf)cancelAnimationFrame(raf);raf=0});
 if(new URLSearchParams(window.location.search).get('demo')==='cast')requestAnimationFrame(open);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();