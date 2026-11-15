'use strict';
(()=>{
const root=document.documentElement,main=document.querySelector('main'),machine=document.querySelector('.machine'),stage=document.querySelector('.stage'),bar=document.querySelector('.app-bar'),button=id=>document.getElementById(id);
let installPrompt=null;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
function inform(title,message){if(mode==='playing'||mode==='clearing')pause();button('app-title').textContent=title;button('app-message').textContent=message;button('app-dialog').showModal()}
const options=button('options-dialog'),optionsActions=button('options-actions');
// No bottom app bar or independent sound/FX row during play.
// Retain their real controls (and keyboard handlers) inside the options dialog.
for(const id of ['sound','bgm','fx','fullscreen','install','share','help','share-url']){
 const item=button(id);
 if(item)optionsActions.appendChild(item);
}
function fit(){
 const width=Math.max(1,window.visualViewport?.width||window.innerWidth);
 const height=Math.max(1,window.visualViewport?.height||window.innerHeight);
 // The former 1.3 height/width threshold excluded many square foldables.
 // Any tall-or-square screen now fills the entire available width AND height.
 const portrait=height>=width;
 root.classList.toggle('compact-app',true);
 root.classList.toggle('portrait-play',portrait);
 root.classList.toggle('landscape-game',!portrait);
 // Fullscreen belongs to the application shell, not the gameplay world.
 // Contain the original 450:710 board at ONE uniform scale, with symmetric
 // decorative letterboxing instead of stretching the physical arena.
 const scale=Math.min(width/450,height/710);
 const boardWidth=450*scale,boardHeight=710*scale;
 root.classList.toggle('zz-compact-hud',boardWidth<=330);
 root.style.setProperty('--app-height',height+'px');
 root.style.setProperty('--board-width',boardWidth+'px');
 root.style.setProperty('--board-height',boardHeight+'px');
 root.style.setProperty('--board-offset-x',((width-boardWidth)/2)+'px');
 root.style.setProperty('--board-offset-y',((height-boardHeight)/2)+'px');
 // Use precisely the same scale for the HUD and canvas so foldable/tall
 // phones don't change control placements or gameplay distances.
 root.style.setProperty('--ui-scale',String(scale));
 resizeCanvas();
}
function updateLabels(){
 button('fullscreen').textContent=document.fullscreenElement?'⛶ 화면 복귀':'⛶ 전체화면';
 button('install').textContent=standalone()?'✓ 설치 실행 중':'↓ 앱 설치';
 // Android in-app browsers can revoke native fullscreen on game end.
 // Offer a visible one-tap, user-gesture retry rather than claiming success.
 const retry=button('overlay-fullscreen');
 if(retry)retry.hidden=!!document.fullscreenElement||standalone();
}

 // Native mobile fullscreen requires a real user gesture. The game-start
 // button supplies that gesture; never try to request fullscreen on load.
 // Unsupported WebViews / iOS Safari keep the existing immersive CSS layout.
 const mobileDevice=()=>navigator.maxTouchPoints>0||
   /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
 function enterMobileFullscreen(force=false){
  if((!mobileDevice()&&!force)||document.fullscreenElement||standalone())return;
  const fn=root.requestFullscreen||root.webkitRequestFullscreen;
  if(typeof fn!=='function')return;
  try{
   const result=fn.call(root,{navigationUI:'hide'});
   result?.catch?.(()=>{}); // permission/platform refusal is nonfatal
  }catch{
   try{const fallback=fn.call(root);fallback?.catch?.(()=>{})}catch{}
  }
 }
 for(const id of ['start','endless'])
  button(id)?.addEventListener('click',()=>enterMobileFullscreen(),{capture:true});
 button('overlay-fullscreen')?.addEventListener('click',()=>enterMobileFullscreen(true),{capture:true});
 // Dedicated first-launch attract screen. Native fullscreen is requested
 // in the *same click gesture*, before revealing the existing hero picker.

 // v80: A genuine standalone title scene. The game board remains visually
 // hidden until every asset needed by the hero picker and first play frame is
 // loaded and decoded; the user's click is still the native fullscreen gesture.
 const boot=button('boot-screen'),bootScene=button('boot-scene');
 const bootStart=button('boot-start'),bootStatus=button('boot-load-status'),
       bootMeter=button('boot-load-meter'),bootFill=button('boot-load-fill');
 let sceneLoading=false;
 function collectInitialImages(){
  const found=new Set(),images=[];
  const add=img=>{
   if(!img||!img.src||typeof img.addEventListener!=='function'||found.has(img))return;
   found.add(img);images.push(img);
  };
  for(const img of Array.from(document.images||[]))add(img);
  const hero=window.ZZHeroAnimationsV55;
  add(hero?.idle);add(hero?.attack);
  add(window.ZZHeroCarAttack?.image);
  for(const img of window.ZZHeroBallsV58?.images||[])add(img);
  add(window.ZZCitizenCast?.cheer);add(window.ZZCitizenCast?.attack);
  add(window.ZZGreenWalk?.image);add(window.ZZGreenDeath?.image);
  add(window.ZZItemIcons?.image);
  for(const entry of Object.values(window.ZZObjectSprite?.images||{}))add(entry.image);
  // Other stage backgrounds continue to load in their normal stage pipeline.
  // Only the first frame's background must block hero selection.
  add(window.ZZStageArt?.images?.[0]);
  return images;
 }
 function awaitDecodedImage(img){
  // Reload the SAME image object on failure so the original loader's onload
  // handler updates its ready flags and restores approved sprite art.
  const source=img.src;
  const oneTry=()=>new Promise((resolve,reject)=>{
   if(img.complete){
    if(img.naturalWidth>0){resolve();return}
    reject(new Error('이미지를 불러오지 못했습니다'));return;
   }
   let done=false,timer;
   const cleanup=()=>{
    img.removeEventListener('load',onLoad);
    img.removeEventListener('error',onError);
    if(timer)clearTimeout(timer);
   };
   const onLoad=()=>{if(done)return;done=true;cleanup();img.naturalWidth>0?resolve():reject(new Error('이미지 크기 오류'))};
   const onError=()=>{if(done)return;done=true;cleanup();reject(new Error('이미지 요청 실패'))};
   img.addEventListener('load',onLoad);
   img.addEventListener('error',onError);
   timer=setTimeout(onError,30000);
  });
  return (async()=>{
   for(let attempt=0;attempt<3;attempt++){
    if(attempt){
     img.src=source+(source.includes('?')?'&':'?')+'zz_scene_retry='+attempt+'_'+Date.now();
    }
    try{
     await oneTry();
     if(typeof img.decode==='function')await img.decode();
     if(img.naturalWidth>0)return;
    }catch(error){
     if(attempt===2)throw new Error('리소스 로딩 실패: '+source.split('/').pop(),{cause:error});
    }
   }
  })();
 }
 async function preloadInitialScene(){
  const assets=collectInitialImages();
  let loaded=0;
  const progress=()=>{
   const percent=assets.length?Math.round(100*loaded/assets.length):100;
   if(bootStatus)bootStatus.textContent='이미지 준비 중 '+loaded+' / '+assets.length+' ('+percent+'%)';
   if(bootFill)bootFill.style.width=percent+'%';
  };
  progress();
  await Promise.all(assets.map(img=>awaitDecodedImage(img).then(()=>{loaded++;progress()})));
  if(document.fonts?.ready)await document.fonts.ready;
  // Image decode and original sprite onload handlers both complete before
  // the selection cards become visible. Do not expose procedural placeholders.
  const required=[
   [window.ZZHeroAnimationsV55,'주인공 애니메이션'],
   [window.ZZHeroCarAttack,'캐릭터 선택 이미지'],
   [window.ZZCitizenCast,'시민 스프라이트'],
   [window.ZZGreenWalk,'좀비 스프라이트'],
   [window.ZZStageArt?.ready?.[0],'첫 스테이지 배경'],
  ];
  for(const [pack,name] of required){
   if(pack&&((typeof pack==='boolean'&&!pack)||(typeof pack==='object'&&pack.ready===false)))
    throw new Error(name+' 준비 실패');
  }
 }
 if(boot&&bootStart){
  bootStart.addEventListener('click',async()=>{
   if(sceneLoading||boot.hidden)return;
   sceneLoading=true;
   enterMobileFullscreen(true); // Must happen before the first await.
   root.classList.remove('zz-scene-title');
   root.classList.add('zz-scene-loading');
   bootStart.disabled=true;
   bootStart.textContent='LOADING...';
   if(bootStatus)bootStatus.hidden=false;
   if(bootMeter)bootMeter.hidden=false;
   try{
    await preloadInitialScene();
    // Commit the scene swap only when the first play-ready frame is complete.
    boot.hidden=true;
    if(bootScene)bootScene.hidden=true;
    root.classList.remove('zz-scene-loading');
    root.classList.add('zz-scene-selection','zz-boot-complete');
    updateLabels();fit();
   }catch(err){
    if(bootStatus)bootStatus.textContent='이미지 로딩에 실패했습니다. 네트워크 확인 후 다시 시도하세요.';
    root.classList.remove('zz-scene-loading');
    root.classList.add('zz-scene-title');
    bootStart.disabled=false;
    bootStart.textContent='다시 시도';
    console.warn('ZOMBIE ZERO scene preload:',err);
   }finally{sceneLoading=false}
  });
  window.addEventListener('keydown',e=>{
   if(!boot.hidden&&(e.code==='Space'||e.key==='Enter')){
    e.preventDefault();e.stopImmediatePropagation?.();
    if(!e.repeat&&!sceneLoading)bootStart.click();
   }
  },true);
 }
 button('overlay-fullscreen')?.addEventListener('click',()=>{fit();updateLabels()});


button('fullscreen').onclick=async()=>{try{if(document.fullscreenElement){await document.exitFullscreen()}else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen({navigationUI:'hide'})}else{inform('주소창 없이 플레이','이 브라우저에서는 전체화면 버튼을 지원하지 않습니다. Safari는 공유 → 홈 화면에 추가, Android Chrome은 메뉴 → 앱 설치 또는 홈 화면에 추가를 사용해 주세요.')}}catch{inform('전체화면 실행 안내','현재 브라우저에서 전체화면 요청이 허용되지 않았습니다. Chrome 또는 Safari에서 이 링크를 직접 열고, 홈 화면에 추가한 아이콘으로 실행해 주세요.')}fit();updateLabels()};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;button('install').textContent='↓ 앱 설치'});
window.addEventListener('appinstalled',()=>{installPrompt=null;button('install').textContent='✓ 설치됨'});
button('install').onclick=async()=>{if(mode==='playing'||mode==='clearing')pause();if(standalone()){inform('설치형으로 실행 중','현재 주소창 없는 앱 모드입니다. 홈 화면의 ZOMBIE ZERO 아이콘으로 다시 실행할 수 있습니다.');return}if(installPrompt){const prompt=installPrompt;installPrompt=null;try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')button('install').textContent='✓ 설치됨'}catch{inform('앱 설치 안내','브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택해 주세요.')}return}const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;inform('홈 화면에 설치',ios?'Safari에서 게임 링크를 열고 공유 버튼 → 홈 화면에 추가 → 추가를 누르세요. 생성된 아이콘으로 실행하면 주소창 없이 플레이합니다.':'Android Chrome에서 게임 링크를 직접 열고 ⋮ 메뉴 → 앱 설치 또는 홈 화면에 추가를 선택하세요. PC Chrome/Edge는 주소창의 설치 아이콘을 사용할 수 있습니다. 앱 내부 브라우저라면 먼저 외부 브라우저로 열어 주세요.')};
let resumeAfterOptions=false;
button('options-toggle').onclick=()=>{
 if(options.open)return;
 resumeAfterOptions=mode==='playing'||mode==='clearing';
 if(resumeAfterOptions)pause();
 options.showModal();
};
button('options-close').onclick=()=>options.close();
options.addEventListener?.('close',()=>{
 if(resumeAfterOptions&&mode==='paused'&&!button('help-dialog').open&&!button('app-dialog').open)pause();
 resumeAfterOptions=false;
});
button('help').onclick=()=>{
 resumeAfterOptions=false;
 if(options.open)options.close();
 if(mode==='playing'||mode==='clearing')pause();
 document.querySelector('.guide').open=true;
 button('help-dialog').showModal();
};
button('collection-shortcut').onclick=()=>{
 resumeAfterOptions=false;
 if(options.open)options.close();
 button('object-cast-demo-open')?.click();
};
button('help-close').onclick=()=>button('help-dialog').close();button('app-close').onclick=()=>button('app-dialog').close();
// Prevent vertical browser gestures on the play surface; modal contents keep their own scroll.
document.addEventListener('touchmove',e=>{if(root.classList.contains('compact-app')&&!e.target.closest('dialog,.overlay'))e.preventDefault()},{passive:false});
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);document.addEventListener('fullscreenchange',()=>{fit();updateLabels()});window.addEventListener('pageshow',()=>{fit();updateLabels()});
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});}
fit();updateLabels();requestAnimationFrame(fit);
})();
