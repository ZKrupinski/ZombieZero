// ZOMBIE ZERO 2026 · original 10 object zombies + 3 survivors.
(function(){
  'use strict';
  const encoded=window.ZZObjectCastB64;
  if(typeof encoded!=='string'||encoded.length!==13156)return;
  const atlas=new Image();
  atlas.decoding='async';
  // Existing game is FRONT / slight 3/4 / elevated top view, NOT isometric.
  window.ZZArcadeCamera=Object.freeze({
    view:'front-three-quarter-elevated',yawDegrees:[0,30],elevationDegrees:[15,30],
    castCharacterGroundShadows:false
  });
  window.ZZObjectCast={
    atlas,cell:64,columns:4,rows:4,
    sourceView:'isometric',gameplayCompatible:false,gameplayAtlas:null,
    galleryAtlas:atlas,
    ids:['green-zombie','red-barrel','black-barrel','red-brain-cube',
         'cardboard-box','wooden-crate','black-brain-cube','yellow-brain-cube',
         'big-zombie','garbage-zombie','survivor-boy','survivor-blonde',
         'survivor-redglasses'],
    // Form 0-7: exactly eight regular roster members; boss forms use 8/9.
    enemyIndex:[0,1,2,3,4,5,6,7],
    bossIndex:[8,9,8,9],
    heroIndex:[10,11,12]
  };
  // This reference sheet must never appear as arcade gameplay sprites:
  // sideways isometric objects conflict with the existing forward-facing camera.
  // Remove only baked, grayscale floor shadows from the encyclopedia atlas.
  function removeFloorShadow(){
    if(typeof document==='undefined'||!document.createElement)return;
    try{
      const canvas=document.createElement('canvas');
      canvas.width=256;canvas.height=256;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(!ctx||!ctx.getImageData)return;
      ctx.drawImage(atlas,0,0);
      const im=ctx.getImageData(0,0,256,256),pixels=im.data;
      for(let y=0;y<256;y++)for(let x=0;x<256;x++){
        if((y%64)<44)continue; // protect eyes and structural upper planes
        const i=(y*256+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
        // Floor shadow in original artwork is flat neutral light grey.
        // Preserve coloured feet, dark shoes, white eyes and decorative outlines.
        if(a>0&&r>=174&&r<=248&&Math.max(r,g,b)-Math.min(r,g,b)<=13)pixels[i+3]=0;
      }
      ctx.putImageData(im,0,0);
      const shadowFree=new Image();
      shadowFree.decoding='async';
      shadowFree.onload=()=>{
        window.ZZObjectCast.galleryAtlas=shadowFree;
        const root=document.getElementById('canon-collection');
        if(root)root.style.setProperty('--object-atlas','url("'+shadowFree.src+'")');
      };
      shadowFree.src=canvas.toDataURL('image/png');
    }catch(e){ /* if Canvas is blocked, the original reference gallery remains visible */ }
  }
  atlas.onload=removeFloorShadow;
  atlas.src='data:image/png;base64,'+encoded;
  window.ZZObjectCastB64=null; // leave a single image decode buffer in memory
  const labels=['그린 좀비','드럼통 좀비 · 레드','드럼통 좀비 · 블랙',
    '브레인 큐브 · 레드','일회용 포장 박스 좀비','나무 상자 좀비',
    '브레인 큐브 · 블랙','브레인 큐브 · 옐로','빅 좀비','쓰레기통 좀비',
    '생존자 소년','금발 소녀','빨간 안경 소녀'];
  function showCollection(){
    const root=document.getElementById('canon-collection');
    if(!root||root.childElementCount)return;
    root.style.setProperty('--object-atlas','url("'+window.ZZObjectCast.galleryAtlas.src+'")');
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
