/* ZOMBIE ZERO · three 8-frame player vehicle animations (1536×576 PNG).
 * Each cell is 192×192; rows 0/1 are preserved byte-for-byte at render time.
 * Ria (internally liam, row 2): pixel inspection of the SOURCE PNG showed
 * every red-haired frame starts with an unnaturally flat 37-48px forehead
 * silhouette at source Y=2, even BEFORE CSS cropping.
 * Reproject the ORIGINAL textured red hair to recover a natural cuboid top.
 * Preserve 93% size and 18px headroom, but align to INTEGER pixels and
 * disable interpolation so the source cube edges remain sharp, not blurred.
 * Only row 2 is altered. Ace, Ruby, cars, physics and hitboxes stay unchanged.
 */
(function(){
 'use strict';
 if(typeof window==='undefined'||typeof Image==='undefined')return;
 const atlas=new Image();atlas.decoding='async';
 const CELL=192, COLUMNS=8, ROWS=3, LIAM_ROW=2;
 const pack={image:atlas,ready:false,cell:CELL,columns:COLUMNS,rows:ROWS,liamReframed:false,riaHeadroomVersion:53};
 window.ZZHeroCarAttack=pack;


 // Per-frame head contours measured from the original pixel alpha at y=2.
 // All 8 cells have an unnaturally short, flat crown. Rather than covering
 // hand-painted hair with a synthetic solid-color polygon (which looks like
 // an attached hat), reproject actual SOURCE hair pixels into the upper area.
 // This preserves voxel color texture, facial features and attack animation.
 const RIA_CROWN_EDGES=[
  [93,132],[94,139],[100,147],[112,148],
  [112,150],[106,147],[115,152],[109,148]
 ];
 function restoreRiaCrown(ctx,frameIndex,cellX,cellY,insetX,size){
  const [left,right]=RIA_CROWN_EDGES[frameIndex];
  const minX=Math.max(0,left-32),maxX=Math.min(CELL,right+32);
  const sourceWidth=maxX-minX,mid=(left+right)/2;
  const scale=size/CELL;
  const centerX=cellX+insetX+mid*scale;
  const top=13,bottom=40;
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  // Stretch only the original head's top 22 source-pixel rows vertically.
  // The upper original hair moves 7px higher, while the lower boundary
  // returns to exactly its original y=40 position; no pasted-on hat seam.
  // 22% extra width at the top flattens rounded contours into a cuboid roof;
  // the width taper reaches the unaltered head by the last line.
  for(let y=top;y<=bottom;y++){
   const t=(y-top)/(bottom-top);
   const sourceY=2+Math.round(22*t);
   const widen=1+.22*Math.pow(1-t,1.1);
   const destWidth=Math.round(sourceWidth*scale*widen);
   const destX=Math.round(centerX-(mid-minX)*scale*widen);
   ctx.drawImage(atlas,cellX+minX,cellY+sourceY,sourceWidth,1,
                 destX,cellY+y,destWidth,1);
  }
  ctx.restore();
 }

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
   restoreRiaCrown(ctx,i,sx,sy,insetX,size);
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
 atlas.src='assets/ip/hero-car-attack.png?v=53-voxel-crown';
})();
