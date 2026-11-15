/* ZOMBIE ZERO / Ria conservative original-art restore v54.
 * v53 erroneously enlarged the red-haired heroine's crown by up to 22%
 * and redrew 28 scanlines, making her head larger and flatter. Undo this.
 * Keep the approved SOURCE art completely intact in all eight 192px cells;
 * copy the entire 192x192 cell to 179x179 integer pixels at X+7, Y+18.
 * This preserves 18px transparent headroom and 13px bottom allowance,
 * without touching her hair, face, glasses, weapon, car, or any physics.
 * The other two hero rows stay byte-for-byte identical in the atlas.
 */

(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined')return;
 const atlas=new Image();atlas.decoding='async';
 const CELL=192, COLUMNS=8, ROWS=3, LIAM_ROW=2;
 const pack={image:atlas,ready:false,cell:CELL,columns:COLUMNS,rows:ROWS,liamReframed:false,riaHeadroomVersion:54};
 window.ZZHeroCarAttack=pack;


 // Ria's own original hair pixels must never be stretched, widened,
 // cloned or overpainted: v53 altered her head proportions and accentuated
 // the source's flat crown. Use only the identical full-cell sprite scaled
 // uniformly into safe transparent cell margins.

 function makeCorrectedAtlas(){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');
  canvas.width=atlas.naturalWidth;canvas.height=atlas.naturalHeight;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  ctx.imageSmoothingEnabled=false; // crisp low-poly pixel edges; no 93% interpolation
  ctx.drawImage(atlas,0,0);
  ctx.clearRect(0,LIAM_ROW*CELL,canvas.width,CELL);
  const size=Math.round(CELL*.93); // 179px, no sub-pixel sampling of voxel corners
  const insetX=Math.round((CELL-size)/2); // 7px, integer centered
  const insetY=18;           // preserve corrected wheel baseline
  for(let i=0;i<COLUMNS;i++){
   const sx=i*CELL, sy=LIAM_ROW*CELL;
   ctx.drawImage(atlas,sx,sy,CELL,CELL,sx+insetX,sy+insetY,size,size);
  }
  return canvas;
 }
 function applyPortraitSheet(canvas){
  // Hero-selection CSS uses the same corrected atlas as in-game canvas.
  // Blob URL avoids placing a huge base64 image string into DOM styles.
  if(typeof document==='undefined'||!document.documentElement)return;
  const install=blob=>{
   if(!blob||!window.URL||typeof window.URL.createObjectURL!=='function')return;
   const objectUrl=window.URL.createObjectURL(blob);
   document.documentElement.style.setProperty('--zz-hero-car-frames','url("'+objectUrl+'")');
   pack.portraitBlobUrl=objectUrl;
  };
  // On Android the async toBlob callback can leave the card briefly
  // showing the raw source row with only 2px top padding. Install the corrected
  // image synchronously first, then switch to the memory-efficient blob URL.
  if(typeof canvas.toDataURL==='function'){
   try{
    const immediate=canvas.toDataURL('image/png');
    if(immediate.startsWith('data:image/png'))
     document.documentElement.style.setProperty('--zz-hero-car-frames',
       'url("'+immediate+'")');
   }catch(e){/* fall back to blob or raw source */}
  }
  if(typeof canvas.toBlob==='function'){
   try{canvas.toBlob(install,'image/png');}catch(e){/* keep synchronous preview */}
  }
 }
 atlas.onload=()=>{
  const correctSize=atlas.naturalWidth===COLUMNS*CELL&&atlas.naturalHeight===ROWS*CELL;
  if(correctSize){
   try{
    const corrected=makeCorrectedAtlas();
    if(corrected){
     pack.image=corrected;
     pack.liamReframed=true;
     applyPortraitSheet(corrected);
    }
   }catch(e){pack.image=atlas;pack.liamReframed=false;}
  }
  pack.ready=correctSize;
  if(typeof document!=='undefined'&&document.documentElement)
   document.documentElement.dataset.zzHeroAtlas=pack.ready?(pack.liamReframed?'aligned':'ready'):'bad-size';
 };
 atlas.onerror=()=>{
  pack.ready=false;
  if(typeof document!=='undefined'&&document.documentElement)
   document.documentElement.dataset.zzHeroAtlas='load-error';
 };
 atlas.src='assets/ip/hero-car-attack.png?v=54-original-hair';
})();
