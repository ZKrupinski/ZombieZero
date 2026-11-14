/* ZOMBIE ZERO · 3 player vehicles with 8 high-resolution attack frames each.
   PNG: 1536×576, cells 192×192, 3 rows, original source 2048×768.
   1: Ace racket / yellow jeep; 2: Ruby bat / pink car;
   3: Liam hammer / blue utility SUV. Visual-only, no hitbox changes. */
(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined')return;
 const atlas=new Image();atlas.decoding='async';
 const pack={image:atlas,ready:false,cell:192,columns:8,rows:3};
 window.ZZHeroCarAttack=pack;
 atlas.onload=()=>{pack.ready=atlas.naturalWidth===1536&&atlas.naturalHeight===576;
  if(typeof document!=='undefined'&&document.documentElement)
   document.documentElement.dataset.zzHeroAtlas=pack.ready?'ready':'bad-size';
 };
 atlas.onerror=()=>{pack.ready=false;
  if(typeof document!=='undefined'&&document.documentElement)
   document.documentElement.dataset.zzHeroAtlas='load-error';
 };
 atlas.src='assets/ip/hero-car-attack.png?v=38-clean-hero-sprite';
})();
