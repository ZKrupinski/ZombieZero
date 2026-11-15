/* ZOMBIE ZERO approved bitmap hero animations v55.
 * 3 cast members × 8 frames × 192px RGBA cells, row order: Ace/Ruby/Ria.
 * Existing gameplay collision boxes, ball physics and timings are unchanged.
 */
(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined')return;
 const pack={
  ready:false, cell:192, frames:8, characters:3,
  idle:null, attack:null, errors:[],
  version:55
 };
 window.ZZHeroAnimationsV55=pack;
 const sources={
  idle:'assets/ip/hero-idle-v55.png?v=55-approved-cast',
  attack:'assets/ip/hero-attack-v55.png?v=55-approved-cast'
 };
 let loaded=0;
 for(const kind of ['idle','attack']){
  const im=new Image();im.decoding='async';
   pack[kind]=im; // v80: expose in-flight image for scene loading/retries
  im.onload=()=>{
   if(im.naturalWidth!==1536||im.naturalHeight!==576){
    pack.errors.push(kind+':wrong-dimensions');return;
   }
   pack[kind]=im;
   loaded++;
   pack.ready=loaded===2;
   if(pack.ready&&typeof document!=='undefined')
    document.documentElement.dataset.zzHeroAnimations='ready';
  };
  im.onerror=()=>{
   pack.errors.push(kind+':load-error');
   if(typeof document!=='undefined')
    document.documentElement.dataset.zzHeroAnimations='fallback';
  };
  im.src=sources[kind];
 }
})();