// ZOMBIE ZERO 2026 · original 10 object zombies + 3 survivors.
(function(){
  'use strict';
  const encoded=window.ZZObjectCastB64;
  if(typeof encoded!=='string'||encoded.length!==13156)return;
  const atlas=new Image();
  atlas.decoding='async';
  atlas.src='data:image/png;base64,'+encoded;
  window.ZZObjectCast={
    atlas,cell:64,columns:4,rows:4,
    ids:['green-zombie','red-barrel','black-barrel','red-brain-cube',
         'cardboard-box','wooden-crate','black-brain-cube','yellow-brain-cube',
         'big-zombie','garbage-zombie','survivor-boy','survivor-blonde',
         'survivor-redglasses'],
    // Form 0-7: exactly eight regular roster members; boss forms use 8/9.
    enemyIndex:[0,1,2,3,4,5,6,7],
    bossIndex:[8,9,8,9],
    heroIndex:[10,11,12]
  };
  window.ZZObjectCastB64=null; // leave a single image decode buffer in memory
  const labels=['그린 좀비','드럼통 좀비 · 레드','드럼통 좀비 · 블랙',
    '브레인 큐브 · 레드','일회용 포장 박스 좀비','나무 상자 좀비',
    '브레인 큐브 · 블랙','브레인 큐브 · 옐로','빅 좀비','쓰레기통 좀비',
    '생존자 소년','금발 소녀','빨간 안경 소녀'];
  function showCollection(){
    const root=document.getElementById('canon-collection');
    if(!root||root.childElementCount)return;
    root.style.setProperty('--object-atlas','url("'+atlas.src+'")');
    labels.forEach((name,index)=>{
      const card=document.createElement('article'),art=document.createElement('span');
      const label=document.createElement('strong');
      card.className='canon-card';art.className='canon-art';
      art.setAttribute('role','img');art.setAttribute('aria-label',name);
      art.style.backgroundPosition='-'+(index%4*64)+'px -'+(Math.floor(index/4)*64)+'px';
      label.textContent=name;
      card.appendChild(art);card.appendChild(label);root.appendChild(card);
    });
  }
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showCollection,{once:true});
    else showCollection();
  }
})();
