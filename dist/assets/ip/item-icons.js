/* ZOMBIE ZERO – refined premium loot chest bitmap items v56. 8 × 128px RGBA cells.
   bazooka, dual, triple, power, fire, slow, pierce, shield
   Symbols: rocket / two balls / three balls / powered ball / fire / ice / pierce / shield.
   Nonvisual fallback remains available while the PNG loads/offline. */
(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined')return;
 const image=new Image();image.decoding='async';
 const atlas={image,ready:false,cell:128,keys:['bazooka','dual','triple','power','fire','slow','pierce','shield']};
 window.ZZItemIcons=atlas;
 image.onload=()=>{atlas.ready=image.naturalWidth===1024&&image.naturalHeight===128;};
 image.onerror=()=>{atlas.ready=false;};
 image.src='assets/ip/item-icons-v56.png?v=56-clean-alpha-crates';
})();
