// Gameplay sprite review overlay, drawing the SAME art atlas/renderer as the game.
// Does not change game state, physics, scoring or saved progress.
(function(){
'use strict';
function setup(){
 const trigger=document.getElementById('object-cast-demo-open');
 const atlas=window.ZZObjectSprite;
 if(!trigger||!atlas)return;
 const dialog=document.createElement('dialog');dialog.id='object-cast-demo-dialog';dialog.className='object-cast-demo';
 dialog.innerHTML='<button type="button" class="dialog-close" id="object-cast-demo-close">닫기 ✕</button><h2>ZOMBIE ZERO 원작 좀비 10종</h2><p>실제 게임이 로드하는 128px 투명 PNG 아틀라스의 이동·피격·사망 애니메이션입니다.</p><div class="object-cast-controls" role="group" aria-label="애니메이션 선택"></div><div class="object-cast-grid" role="list"></div>';
 document.body.appendChild(dialog);
 const grid=dialog.querySelector('.object-cast-grid'),controls=dialog.querySelector('.object-cast-controls');
 const keys=['green_zombie',...Object.keys(atlas.names)],canvases=[];
 for(const key of keys){
  const card=document.createElement('article');card.className='object-cast-card';card.setAttribute('role','listitem');
  const c=document.createElement('canvas');c.width=148;c.height=168;c.setAttribute('aria-label',(key==='green_zombie'?'그린 좀비':atlas.names[key])+' 애니메이션');
  const label=document.createElement('strong');label.textContent=key==='green_zombie'?'그린 좀비':atlas.names[key];
  card.append(c,label);grid.append(card);canvases.push({key,c});
 }
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
   const ctx=c.getContext('2d');if(!ctx)continue;
   ctx.clearRect(0,0,c.width,c.height);
   const isGreen=key==='green_zombie';
   const pack=isGreen?window.ZZGreenWalk:atlas;
   const entry=isGreen?pack:pack.images[key];
   const img=isGreen?pack?.image:entry?.image;
   if(!(isGreen?pack?.ready:entry?.ready)||!img)continue;
   let frame=0,rect,source=img;
   if(mode==='normal'||mode==='critical'){
    if(isGreen){
     const death=window.ZZGreenDeath;
     if(!death?.ready)continue;
     const clip=death[mode],elapsed=(seconds%clip.duration)*1000;
     frame=Math.min(clip.count-1,Math.floor(elapsed/clip.frameMs));
     rect=[frame*48,clip.row*48,48,48];source=death.image;
    }else{
     const first=mode==='normal'?26:28;
     frame=first+Math.floor((seconds%(.52))/(.52/2));
     rect=pack.sourceRect({boss:key==='big_zombie'||key==='trash_can',
       bossForm:pack.bosses.indexOf(key),form:pack.normal.indexOf(key)},frame);
    }
   }else{
    const vx=mode==='left'?-1:mode==='right'?1:0;
    const actor={form:pack.normal?.indexOf(key)??0,bossForm:pack.bosses?.indexOf(key)??0,
      boss:key==='big_zombie'||key==='trash_can',seed:0,moveDir:vx,
      recoil:mode==='hurt'?.21-(seconds%.22):0};
    frame=mode==='hurt'?24+Math.floor((seconds%(.22))/.11):
      pack.getFrame(actor,seconds);
    rect=isGreen?pack.sourceRect(frame):pack.sourceRect(actor,frame);
   }
   const [sx,sy,sw,sh]=rect;
   const scale=Math.min((c.width-12)/sw,(c.height-12)/sh);
   const w=sw*scale,h=sh*scale,x=(c.width-w)/2,y=(c.height-h)/2;
   ctx.imageSmoothingEnabled=true;
   ctx.drawImage(source,sx,sy,sw,sh,x,y,w,h);
  }
  raf=requestAnimationFrame(render);
 }
 function open(){if(!dialog.open){dialog.showModal();started=0;raf=requestAnimationFrame(render)}}
 function close(){dialog.close();if(raf)cancelAnimationFrame(raf);raf=0}
 trigger.addEventListener('click',open);
 dialog.querySelector('#object-cast-demo-close').onclick=close;
 dialog.addEventListener('close',()=>{if(raf)cancelAnimationFrame(raf);raf=0});
 if(new URLSearchParams(window.location.search).get('demo')==='cast')requestAnimationFrame(open);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();