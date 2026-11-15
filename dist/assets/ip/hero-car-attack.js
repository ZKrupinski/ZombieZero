/* ZOMBIE ZERO · three 8-frame player vehicle animations (1536×576 PNG).
 * Each cell is 192×192; rows 0/1 are preserved byte-for-byte at render time.
 * Liam (row 2) had almost no top padding and a high-floating car baseline.
 * Reframe ONLY those eight original bitmap frames into fresh 192px cells:
 * - 95% original content size, horizontal centering.
 * - 14px top inset, giving full hair clearance and matching wheel baseline.
 * The source art, other heroes, combat physics, and hitboxes stay untouched.
 */
(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined')return;
 const atlas=new Image();atlas.decoding='async';
 const CELL=192, COLUMNS=8, ROWS=3, LIAM_ROW=2;
 const pack={image:atlas,ready:false,cell:CELL,columns:COLUMNS,rows:ROWS,liamReframed:false};
 window.ZZHeroCarAttack=pack;

 function makeCorrectedAtlas(){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');
  canvas.width=atlas.naturalWidth;canvas.height=atlas.naturalHeight;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  ctx.imageSmoothingEnabled=true;
  if('imageSmoothingQuality' in ctx)ctx.imageSmoothingQuality='high';
  ctx.drawImage(atlas,0,0);
  ctx.clearRect(0,LIAM_ROW*CELL,canvas.width,CELL);
  const size=CELL*.95;
  const insetX=(CELL-size)/2; // keep the car horizontally centered
  const insetY=14;           // preserve hair and lower the tires to Ace/Ruby baseline
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
  if(typeof canvas.toBlob==='function'){
   try{canvas.toBlob(install,'image/png');}catch(e){/* original CSS atlas is fallback */}
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
 atlas.src='assets/ip/hero-car-attack.png?v=40-aligned-heroes';
})();
