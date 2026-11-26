// ZOMBIE ZERO · Canonical green mascot, normal/down-left/down-right 8-frame
// animation, 128x128 transparent source frame, front-dominant elevated camera.
// Gameplay collision and damage are controlled by game.js, NOT by the bitmap.
(function(){
 'use strict';
 const image=new Image();
 image.decoding='async';
 const hairSheets={},rawHairSheets={};
 for(const color of ['chestnut','blond','red']){
   const sheet=new Image();
   sheet.decoding='async';
   sheet.src='assets/ip/v2/green_zombie-'+color+'.webp';
   rawHairSheets[color]=sheet;
 }
 // Colors never render directly from the source WebPs: those files have
 // opaque horizontal junk across the sprite sheet. Only their sanitized,
 // canonical-hair-masked canvases may be painted.
 function refreshHairSheets(){
  if(!pack.ready)return;
  for(const [color,sheet] of Object.entries(rawHairSheets)){
   if(hairSheets[color]||sheet.naturalWidth!==1024||sheet.naturalHeight!==512)continue;
   const clean=window.ZZGreenPalette?.cleanHairOverlay?.(image,sheet);
   if(clean)hairSheets[color]=clean;
  }
 }
 // Build both expressions on top of the original pixels only.
 // Never render the v284-v288 WebP exports: they carry nontransparent
 // background bands and extra eyebrow shapes between atlas frames.
 let expressions={};
 const pack={
   image,ready:false,failed:false,cell:128,variants:[image],
   groups:{down:[0,8],left:[8,8],right:[16,8],hurt:[24,2]},
   getFrame(z,t){
     // A hit temporarily swaps the 8-frame face for unedited hurt frames,
     // which made rare eyes/lids appear to twitch on every ball impact.
     // Preserve the expression's walk face during recoil; hit flash,
     // knockback and the rest of the damage response remain unchanged.
     if((z.recoil||0)>.015&&!z.expression)
       return 24+Math.min(1,Math.floor(Math.max(0,.22-z.recoil)/.11));
     const vx=z.moveDir||0;
     const [start,count]=vx<-.3?pack.groups.left:vx>.3?pack.groups.right:pack.groups.down;
     // Match all object zombies: slower steps, individual phase and +/-8% pace.
     const seed=Number.isFinite(z.seed)?Math.max(0,z.seed):0;
     const fps=6.4*(.92+.16*((seed*.61803398875)%1));
     const phase=((seed*.41421356237)%1)*8;
     return start+Math.floor((Math.max(0,t)*fps+phase)%count);
   },
   sourceRect(frame){
     const geom=window.ZZSpriteGeometry?.green_zombie||{};
     const group=frame<8?'down':frame<16?'left':frame<24?'right':'hurt';
     const b=geom[group]||[0,0,128,128];
     return [(frame%8)*128+b[0],Math.floor(frame/8)*128+b[1],b[2],b[3]];
   },
   draw(ctx,z,t){
     if(!pack.ready)return false;
     if(checkSheets)checkCachedSheets();
     const frame=pack.getFrame(z,t),rect=pack.sourceRect(frame);
     const palette=window.ZZGreenPalette;
     const selected=palette?.paletteFor(z)??0;
     const bitmap=expressions[z.expression]?.[selected]||pack.variants[selected]||image;
     const walk=window.ZZSpriteGeometry?.green_zombie?.walkUnion||[0,0,128,128];
     // 66px tall mascot: its face and cube almost touch adjacent 46px lanes.
     const scale=Math.min(66/walk[3],55/walk[3],43/walk[2]);
     const x=z.x+z.w/2-(rect[2]*scale)/2;
     const y=z.y+z.h+2-rect[3]*scale;
     ctx.save();
     if(z.flash>0)ctx.filter='brightness(2.1) saturate(1.3)';
     ctx.drawImage(bitmap,...rect,x,y,rect[2]*scale,rect[3]*scale);
     const hair=hairSheets[z.hairColor];
     if(hair?.width===1024)
       ctx.drawImage(hair,...rect,x,y,rect[2]*scale,rect[3]*scale);
     ctx.restore();
     return true;
   }
 };
 window.ZZGreenWalk=pack;
 function rebuildSheets(){
  // Drop derived canvases first. All replacement layers use the file-backed PNG.
  pack.variants=[image];
  expressions={};
  for(const color of Object.keys(hairSheets))delete hairSheets[color];
  pack.variants=window.ZZGreenPalette?.variants(image)||[image];
  expressions=window.ZZGreenPalette?.createFaceExpressions?.(image)||{};
  refreshHairSheets();
 }
 let checkSheets=false;
 function checkOnResume(){checkSheets=true}
 function missingPixels(sheet,y){
  if(!sheet||sheet===image)return false;
  const ctx=sheet.getContext('2d');
  // First front frame: x=64 lies inside the cap at y=15 and body at y=64.
  return !ctx||ctx.isContextLost?.()||!ctx.getImageData(64,y,1,1).data[3];
 }
 function checkCachedSheets(){
  checkSheets=false;
  for(const set of [pack.variants,...Object.values(expressions)]){
   for(let i=0;i<set.length;i++){
    // Checking must not allocate the lazy color variants of unused faces.
    const sheet=Object.getOwnPropertyDescriptor(set,i)?.value;
    if(missingPixels(sheet,64)){rebuildSheets();return}
   }
  }
  if(Object.values(hairSheets).some(sheet=>missingPixels(sheet,15)))rebuildSheets();
 }
 if(typeof document!=='undefined'){
  document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)checkOnResume()});
  document.addEventListener?.('resume',checkOnResume);
  document.addEventListener?.('contextrestored',checkOnResume,true);
 }
 window.addEventListener?.('pageshow',checkOnResume);
 window.addEventListener?.('focus',checkOnResume);
 image.onload=()=>{
  pack.ready=image.naturalWidth===1024&&image.naturalHeight===512;
  pack.failed=!pack.ready;
  if(pack.ready)rebuildSheets();
 };
 image.onerror=()=>{pack.failed=true;pack.ready=false};
 image.src='assets/ip/v2/green_zombie.png';
 for(const sheet of Object.values(rawHairSheets))sheet.onload=refreshHairSheets;
})();