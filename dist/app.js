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
 root.style.setProperty('--app-height',height+'px');
 root.style.setProperty('--board-width',width+'px');
 root.style.setProperty('--board-height',height+'px');
 // HUD measurements use one stable 450-unit coordinate system. Phone width
 // changes only the uniform scale, never the position or number of HUD cells.
 const boardWidth=portrait?width:Math.min(width,height*450/710);
 root.style.setProperty('--ui-scale',String(Math.max(.55,Math.min(1.3,boardWidth/450))));
 resizeCanvas();
}
function updateLabels(){button('fullscreen').textContent=document.fullscreenElement?'⛶ 화면 복귀':'⛶ 전체화면';button('install').textContent=standalone()?'✓ 설치 실행 중':'↓ 앱 설치'}

 // Native mobile fullscreen requires a real user gesture. The game-start
 // button supplies that gesture; never try to request fullscreen on load.
 // Unsupported WebViews / iOS Safari keep the existing immersive CSS layout.
 const mobileDevice=()=>navigator.maxTouchPoints>0||
   /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
 function enterMobileFullscreen(){
  if(!mobileDevice()||document.fullscreenElement||standalone())return;
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
  button(id)?.addEventListener('click',enterMobileFullscreen,{capture:true});

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
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);document.addEventListener('fullscreenchange',()=>{fit();updateLabels()});
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});}
fit();updateLabels();requestAnimationFrame(fit);
})();
