'use strict';
const c=document.getElementById('game');let g=c.getContext('2d');const $=id=>document.getElementById(id),W=450;let H=710,PY=584,VIEW_DELTA=0;
// Preserve normal drawing; collect only luminous shapes for the additive pass.
let fxRenderer=null;
function luminous(draw){
 draw();
 if(!fxEnabled||!fxRenderer)return;
 const original=g;
 fxRenderer.capture(original,context=>{g=context;try{draw()}finally{g=original}});
}
const TYPES=[{color:'#a9d67c',top:'#dcf3b1',side:'#60945b',hp:1,name:'그린'},{color:'#78d4e5',top:'#bbf3f6',side:'#367e98',hp:2,name:'블루'},{color:'#eabb58',top:'#ffdf96',side:'#a57932',hp:3,name:'골드'},{color:'#df87b5',top:'#ffc3e3',side:'#92527c',hp:4,name:'퍼플'},{color:'#ed7966',top:'#ffb091',side:'#a1403f',hp:5,name:'레드'}];
const SKILLS={bazooka:{name:'시민 바주카',duration:12,color:'#ffd16c',desc:'시민이 3초마다 희귀 광역 로켓 · 피해 8',icon:'<path d="m5 21 15-15 7 7-15 15zM18 8l6 6M6 22l-2 6 6-2M19 3l2-2M28 10l3-1M26 3l3-3"/>'},dual:{name:'더블볼',duration:16,color:'#aee8ff',desc:'공 2개',icon:'<circle cx="9" cy="12" r="5"/><circle cx="23" cy="20" r="5"/>'},triple:{name:'트리플볼',duration:16,color:'#c0a5ff',desc:'공 3개',icon:'<circle cx="16" cy="7" r="4"/><circle cx="7" cy="23" r="4"/><circle cx="25" cy="23" r="4"/>'},power:{name:'파워볼',duration:14,color:'#f5d470',desc:'크기·공격력 ×2',icon:'<circle cx="16" cy="16" r="12"/><path d="m17 6-7 12h6l-1 8 8-13h-6z"/>'},fire:{name:'화염볼',duration:10,color:'#ff9763',desc:'점화 최대 2명 · 전염 1회',icon:'<path d="M17 3c4 9-4 9 2 14l5-6c9 12 1 19-8 18S3 21 8 13l3 5c4-4 0-8 6-15Z"/>'},slow:{name:'슬로우',duration:12,color:'#86f2e0',desc:'공·좀비 감속',icon:'<circle cx="16" cy="17" r="11"/><path d="M16 10v8l6 3M12 2h8M16 2v4"/>'},pierce:{name:'관통샷',duration:10,color:'#ffe88a',desc:'10초간 적을 관통 · 충돌당 크리티컬 피해 ×2',icon:'<circle cx="7" cy="16" r="4"/><path d="M12 16h17M22 8l7 8-7 8M17 11h7"/>'},shield:{name:'보호막',duration:18,color:'#b9f684',desc:'바닥에서 공 반사',icon:'<path d="m16 3 11 4v10c0 6-11 12-11 12S5 23 5 17V7Z"/><path d="m10 16 4 4 8-9"/>'}};
let mode='menu',score=0,wave=1,lives=3,best=0,car=225,target=225,balls=[],foes=[],items=[],particles=[],keys={},swing=0,combo=0,ballVanish=[],criticalPopups=[],clock=0,last=0,active={},sound=true,toastTimer,stageDelay=0,audio,master,musicBus,nextBeat=0,beat=0,lastSkillMarkup='';
try{best=+(localStorage.getItem('zr-best')||0)}catch{}
const HEROES=[
{id:'ace',name:'에이스',role:'안정형',color:'#ed684c',hair:'#503627',skin:'#ffd4a0',speed:500,paddle:68,damage:1,lives:3,duration:1,desc:'넓은 라켓 · 목숨 3',stats:'이동 500 · 공격 1 · 라켓 136'},
{id:'ruby',name:'루비',role:'기동형',color:'#5ecba7',hair:'#e7843c',skin:'#ffe0ba',speed:660,paddle:51,damage:1,lives:3,duration:1.25,desc:'배트 · 이동 +32% · 스킬 +25%',stats:'이동 660 · 공격 1 · 반사 폭 102'},
{id:'liam',name:'리암',role:'공격형',color:'#f0b84e',hair:'#ed6c34',skin:'#f1bc87',speed:390,paddle:55,damage:2,lives:2,duration:1,desc:'해머 · 공격력 ×2 · 목숨 2',stats:'이동 390 · 공격 2 · 반사 폭 110'}];
let touchUsed=false,lastBuzz=0,bubbles=[],bubbleTimer=.25;
const HERO_ATTACK_DURATION=.42;let heroAttackTime=0;
let selectedHero=0,clearTime=0,clearBurst=0,resumeMode='playing',crowdTimer=3.5,junk=[],cheerTime=0;
const hero=()=>HEROES[selectedHero];
// Nine nearly touching lanes fill the full 450px road without squeezing 128px source art.
// 9 tightly packed columns span the full road, from x=23 to x=394.
// The 33px colliders stay unchanged; only their formation positions move.
const ENEMY_COLUMNS=9,ENEMY_PITCH=46.375,ENEMY_LEFT_X=23,ENEMY_ROW_PITCH=58;
const ZOMBIE_FORMS=[{name:'그린 좀비',unlock:1},{name:'드럼통 좀비 · 레드',unlock:6},{name:'드럼통 좀비 · 블랙',unlock:32},{name:'브레인 큐브 · 레드',unlock:9},{name:'일회용 포장 박스 좀비',unlock:24},{name:'나무 상자 좀비',unlock:28},{name:'브레인 큐브 · 블랙',unlock:16},{name:'브레인 큐브 · 옐로',unlock:4}];
const BOSS_FORMS=['빅 좀비','쓰레기통 좀비','빅 좀비','쓰레기통 좀비'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const has=k=>(active[k]||0)>0;
function rect(x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function poly(p,color){g.fillStyle=color;g.beginPath();p.forEach((v,i)=>i?g.lineTo(...v):g.moveTo(...v));g.closePath();g.fill()}
function cube(x,y,w,h,front,top,side){rect(x-2,y-1,w+4,h+3,'#111724');rect(x,y,w,h,front);poly([[x,y],[x+6,y-6],[x+w+6,y-6],[x+w,y]],top);poly([[x+w,y],[x+w+6,y-6],[x+w+6,y+h-6],[x+w,y+h]],side)}
let musicEnabled=true,fxEnabled=true,fx=[],cameraKick=0,musicTheme='',noiseBuffer,echo,lastSfx={};
const hz=n=>440*Math.pow(2,(n-69)/12);
function audioRunning(){return !!(audio&&master&&musicBus&&(!audio.state||audio.state==='running'))}
function audioUI(){const blocked=sound&&!audioRunning();$('sound').textContent=!sound?'♫ OFF':blocked?'♫ 재생':'♫ ON';$('sound').setAttribute('aria-label',!sound?'음악과 효과음 켜기':blocked?'소리 재생 다시 시도':'음악과 효과음 끄기')}
function unlockAudio(){
 try{
  if(!audio||audio.state==='closed'||!master||!musicBus){
   const AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor){audioUI();return}
   const ctx=new AudioCtor(),main=ctx.createGain(),bus=ctx.createGain();
   // Keep the essential output path independent of optional effects.
   main.connect(ctx.destination);bus.connect(main);
   audio=ctx;master=main;musicBus=bus;noiseBuffer=null;echo=null;lastSfx={};nextBeat=0;musicTheme='';
   try{if(ctx.createDelay){const delay=ctx.createDelay(),wet=ctx.createGain();delay.delayTime.value=.18;wet.gain.value=.16;bus.connect(delay);delay.connect(wet);wet.connect(main);echo=delay}}catch{}
   ctx.onstatechange=()=>{if(audio!==ctx)return;if(ctx.state==='running'){nextBeat=ctx.currentTime;lastSfx={}}audioUI()};
  }
  master.gain.value=sound?.58:0;
  if(!audioRunning()){
   const ctx=audio;
   const ready=()=>{if(audio!==ctx)return;nextBeat=ctx.currentTime;lastSfx={};audioUI();if(audioRunning()){music();if(sound)sfx('serve')}};
   const pending=ctx.resume();if(pending?.then)pending.then(ready).catch(()=>audioUI());else ready();
  }
  audioUI();
 }catch{audioUI()}
}
// Touch release is a user activation even when dragging suppresses synthetic clicks.
function recoverAudio(e){if(e?.target?.closest?.('#sound,#bgm'))return;if(sound&&!audioRunning())unlockAudio()}
for(const event of ['touchend','pointerup','click','keydown'])document.addEventListener(event,recoverAudio,{passive:true});
window.addEventListener('pageshow',()=>{if(audio&&sound)unlockAudio()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&audio&&sound)unlockAudio()});

function tone(f,d=.1,type='square',vol=.08,delay=0,music=false,endFreq=0){if(!audioRunning()||!sound)return;let t=audio.currentTime+delay,o=audio.createOscillator(),v=audio.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(15,endFreq),t+d);o.connect(v);v.connect(music?musicBus:master);v.gain.setValueAtTime(vol,t);v.gain.exponentialRampToValueAtTime(.001,t+d);o.start(t);o.stop(t+d+.01)}
function noise(d=.09,vol=.08,delay=0,mus=false){if(!audioRunning()||!sound||!audio.createBuffer)return;if(!noiseBuffer){noiseBuffer=audio.createBuffer(1,audio.sampleRate*.5,audio.sampleRate);let a=noiseBuffer.getChannelData(0),hold=0;for(let i=0;i<a.length;i++){if(i%5===0)hold=Math.random()*2-1;a[i]=hold}}let o=audio.createBufferSource(),v=audio.createGain(),t=audio.currentTime+delay;o.buffer=noiseBuffer;o.connect(v);v.connect(mus?musicBus:master);v.gain.setValueAtTime(vol,t);v.gain.exponentialRampToValueAtTime(.001,t+d);o.start(t);o.stop(t+d)}
function sfx(name){if(!audioRunning()||!sound)return;let now=audio.currentTime;if(now-(lastSfx[name]??-10)<({wall:.085,hit:.065,kill:.065,fire:.15}[name]||0))return;lastSfx[name]=now;
const sounds={launch:[55,67,79],blast:[36,48,55],serve:[72,79,84],wall:[67],racket:[79,86,91],car:[76,83,88],citizen:[84,79,67],return:[72,76,79,84,91],bosshit:[43,55,62],powerhit:[55,67,79],hit:[60,67],kill:[72,76,79],item:[72,76,79,84,88],expire:[72,67],miss:[64,60,55],start:[60,64,67,72,76,79],wave:[60,64,67,72,79,84],boss:[43,50,55,62],bosskill:[60,67,72,76,79,84,88],fire:[55,62],shield:[79,84,91],pause:[72,67],over:[67,64,60,55]};const notes=sounds[name]||[72],rise=['kill','hit','powerhit'].includes(name)?Math.min(7,Math.floor(combo/2)):0,comboGain=1+Math.min(combo,10)*.025,spacing=Math.max(.024,.045-Math.min(combo,10)*.002),accent=['item','return','wave','bosskill','start'].includes(name);
notes.forEach((n,i)=>{tone(hz(n+rise),accent?.16:.085,'triangle',name==='wall'?.035:.1*comboGain,i*spacing);if(name!=='wall')tone(hz(n+rise),.055,'square',.023*comboGain,i*spacing)});
if(['racket','car','citizen'].includes(name))tone(500,.065,'square',.045,0,false,1250);
if(['hit','kill','powerhit','bosshit'].includes(name)){tone(name==='kill'?160:110,.07,'triangle',.15,0,false,45);noise(.035,.04)}
if(name==='launch'){tone(180,.14,'sawtooth',.07,0,false,650);noise(.06,.08)}if(name==='blast'){tone(110,.22,'sine',.2,0,false,30);noise(.18,.1)}if(name==='fire'){noise(.07,.055);tone(160,.08,'triangle',.07,0,false,420)}
if(accent){[0,4,7].forEach(n=>tone(hz(60+n),.35,'triangle',.045,.07));tone(145,.19,'sine',.18,0,false,42);if(name==='wave'||name==='bosskill')noise(.16,.06,.12)}
if(name==='boss'){tone(82,.32,'triangle',.16,0,false,41);noise(.13,.055)}
if(name==='bosshit'){tone(95,.11,'triangle',.18,0,false,35);noise(.045,.065)}if(name==='powerhit')tone(165,.09,'triangle',.18,0,false,50);
if(name==='miss')tone(250,.18,'triangle',.12,0,false,70);}
const THEMES=[{name:'SUNNY RALLY',root:60,chords:[0,5,7,0],mel:[12,19,16,19,24,19,16,14,12,16,19,21,19,16,14,7]}, {name:'TURBO PARADE',root:57,chords:[0,5,7,5],mel:[12,16,19,21,24,21,19,16,14,17,21,24,23,19,16,14]}, {name:'VICTORY DRIVE',root:62,chords:[0,7,5,0],mel:[19,19,21,19,16,12,14,16,24,23,21,19,16,14,11,12]}, {name:'BOSS RUSH',root:50,chords:[0,5,7,0],mel:[24,19,24,27,24,19,22,19,24,27,31,27,26,22,19,15]}];
function music(){if(!audioRunning())return;musicBus.gain.value=mode==='playing'&&sound&&musicEnabled?.6:0;if(mode!=='playing'||!sound||!musicEnabled)return;const boss=foes.some(z=>z.boss),theme=THEMES[boss?3:(wave-1-Math.floor(wave/3))%3],tempo=boss?172:146+((wave-1)%3)*4,step=60/tempo/4;if(musicTheme!==theme.name){musicTheme=theme.name;beat=0;nextBeat=audio.currentTime;$('track').textContent='♫ '+theme.name}if(nextBeat<audio.currentTime-.2)nextBeat=audio.currentTime;
let guard=0;while(nextBeat<audio.currentTime+.09&&guard++<4){let i=beat%64,bar=Math.floor(i/16),sub=i%16,root=theme.root+theme.chords[bar],delay=Math.max(0,nextBeat-audio.currentTime),arp=boss?[0,7,12,15,19,15,12,7]:[0,7,12,16,19,16,12,7];
if([0,2,4,6,7,10,12,14].includes(sub)){let phrase=Math.floor(beat/64)%4,melody=root+theme.mel[(Math.floor(i/2)+(phrase%2)*4)%16]+(phrase===3&&sub>=12?12:0);tone(hz(melody),step*1.45,'square',.046,delay,true);if(bar===3||Math.floor(beat/64)%4===2)tone(hz(melody-12),step*1.6,'triangle',.065,delay,true)}
tone(hz(root+12+arp[sub%8]),step*.72,'square',.024,delay,true);
if(sub%2===0)tone(hz(root-12+([0,0,7,12][Math.floor(sub/4)])),step*1.7,'triangle',.23,delay,true);
if(sub===0||sub===6||sub===8||boss&&sub===10)tone(130,.13,'sine',.31,delay,true,32);
if(sub===4||sub===12){noise(.065,.105,delay,true);tone(200,.055,'triangle',.1,delay,true,85)}else noise(sub===14?.06:.018,sub%2===0?.028:.014,delay,true);if(bar===3&&sub>=13){noise(.035,.06,delay,true);tone(hz(root+12+(sub-13)*3),.055,'triangle',.055,delay,true)}
if(sub===0&&bar%2===0){[0,boss?3:4,7,12].forEach(n=>tone(hz(root+n),step*7,'triangle',.036,delay,true))}beat++;nextBeat+=step;}}
function effect(x,y,color,size=45,text=''){if(!fxEnabled)return;fx.push({x,y,color,size,text,t:0,life:text?.85:.48});if(fx.length>45)fx.shift();cameraKick=Math.max(cameraKick,size>=120?5.2:size>=70?3.2:size>=45?2:.9)}
function drawEffects(labels=false){if(!fxEnabled)return;for(const f of fx){let a=1-f.t/f.life,r=8+f.t/f.life*f.size;g.globalAlpha=a;if(!labels){g.strokeStyle=f.color;g.lineWidth=3;g.beginPath();for(let i=0;i<=8;i++){let ang=i*Math.PI/4;let x=f.x+Math.cos(ang)*r,y=f.y+Math.sin(ang)*r;i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke();for(let i=0;i<8;i++){let ang=i*Math.PI/4;rect(f.x+Math.cos(ang)*r*1.3,f.y+Math.sin(ang)*r*1.3,4,4,f.color)}}if(labels&&f.text){g.font='bold 15px monospace';g.textAlign='center';g.fillStyle='#081322';g.fillText(f.text,f.x+2,f.y-18-f.t*36+2);g.fillStyle=f.color;g.fillText(f.text,f.x,f.y-18-f.t*36)}}g.globalAlpha=1}
function icon(k){return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+SKILLS[k].icon+'</svg>'}
// Previous timer cards are intentionally gone. Effects are communicated
// through tiny, image-only badges anchored to the moving car inside canvas.
function skillUI(){
 const el=$('skills');
 if(!el)return;
 if(el.innerHTML)el.innerHTML='';
 el.hidden=true;
}
let DEFENSE_Y=565;
let runMode='campaign',endlessUnlocked=false,lastStandUsed=false,resistFlash=0,failureScene=null,lastLostBall=null;
try{endlessUnlocked=localStorage.getItem('zb-endless-unlocked')==='1'}catch{}
function endlessUI(){const el=$('endless');el.hidden=!endlessUnlocked||!['menu','over'].includes(mode);el.textContent='∞ 무한 모드 시작';el.onclick=()=>start('endless')}
function triggerLastStand(){if(wave<20||lastStandUsed)return false;lastStandUsed=true;resistFlash=1.4;
 const sorted=[...foes].sort((a,b)=>a.y-b.y),placed=[];
 for(const z of sorted){if(Number.isFinite(z.breakoutTime)){delete z.breakoutTime;delete z.breakoutDuration;z.moveDir=0;z.col=Math.max(0,Math.min(ENEMY_COLUMNS-1,Math.round((z.x-ENEMY_LEFT_X)/ENEMY_PITCH)));z.breakoutCooldownUntil=clock+4}const old=z.y;let y=Math.max(36,z.y-180);for(const above of placed)if(!(Number.isInteger(z.row)&&z.row===above.row)&&z.x-8<above.x+above.w+8&&z.x+z.w+8>above.x-8)y=Math.max(y,above.y+above.h+(z.boss?25:10));z.y=Math.min(old,y);z.flash=.12;z.recoil=.22;z.hitAt=clock;z.hitHold=.05;placed.push(z);burst(z.x+z.w/2,z.y+z.h/2,'#9debea',8)}
 // Crowded late-stage boss formations may hit the upper packing boundary and
 // leave a front enemy too close after the first push. Translate the entire
 // already-spaced formation to guarantee a visible 125px recovery window,
 // preserving collision order and every zombie's HP.
 if(foes.length){
  const furthest=Math.max(...foes.map(z=>z.y+z.h));
  const extra=Math.max(0,furthest-(DEFENSE_Y-125));
  if(extra>0)for(const z of foes)z.y-=extra;
 }
 effect(225,DEFENSE_Y,'#b3fff0',140,'LAST STAND!');sfx('bosskill');haptic([20,30,20]);toast('최후의 저항! · 좀비 전원 밀쳐내기 · 이번 판 1회');return true}
function finishCampaign(){endlessUnlocked=true;try{localStorage.setItem('zb-endless-unlocked','1')}catch{}mode='over';best=Math.max(best,score);try{localStorage.setItem('zr-best',best)}catch{}$('result-stage').textContent='50 스테이지 완주';$('result-cleared').textContent='50개 스테이지 클리어';$('result-score').textContent=score.toLocaleString('ko-KR');$('result-best').textContent=best.toLocaleString('ko-KR');overlay('50 STAGES<br><em>CLEAR!</em>','도시를 지켜냈습니다! 무한 모드가 해금되었습니다.','일반 모드 다시 시작','VICTORY');endlessUI();sfx('wave')}
function drawDanger(){if(mode!=='playing'||balls[0]?.held||!foes.length)return;const nearest=foes.reduce((a,b)=>a.y+a.h>b.y+b.h?a:b);if(nearest.y+nearest.h<DEFENSE_Y-70)return;g.save();g.globalAlpha=.55+.25*Math.sin(clock*9);rect(20,DEFENSE_Y-2,410,4,'#ff6278');g.fillStyle='#ffe5ba';g.textAlign='center';g.font='bold 13px Arial, sans-serif';g.fillText('위험! 좀비가 방어선에 접근 중',225,DEFENSE_Y-12);g.restore()}
function drawOutcome(){if(resistFlash>0){const t=1-resistFlash/1.4;g.save();g.globalAlpha=(1-t)*.75;g.strokeStyle='#a7ffea';g.lineWidth=8;g.beginPath();g.arc(225,DEFENSE_Y,30+t*560,Math.PI,Math.PI*2);g.stroke();g.fillStyle='#caffef';g.font='bold 24px Arial, sans-serif';g.textAlign='center';g.fillText('LAST STAND!',225,400);g.font='bold 14px Arial, sans-serif';g.fillText('최후의 저항 · 전원 밀쳐내기',225,426);g.restore()}
 if(!failureScene)return;const f=failureScene;g.save();rect(20,16,410,H-20,'#160d2444');g.strokeStyle='#ff6278';g.lineWidth=4;
 if(f.type==='breach'){rect(20,DEFENSE_Y-3,410,6,'#ff546c');g.beginPath();g.arc(f.x,f.y,42+Math.sin(f.t*15)*4,0,Math.PI*2);g.stroke();g.fillStyle='#ffd8ce';g.font='bold 14px Arial, sans-serif';g.textAlign='center';g.fillText('이 적이 방어선을 돌파했습니다',225,DEFENSE_Y+26)}else{g.beginPath();g.moveTo(f.x,H-95);g.lineTo(f.x,H-11);g.stroke();poly([[f.x-12,H-28],[f.x,H-8],[f.x+12,H-28]],'#ff7182');g.textAlign='center';g.font='bold 25px Arial, sans-serif';g.fillStyle='#ff9b9b';g.fillText('♡  0',225,H-55)}
 rect(38,264,374,142,'#251827ed');g.fillStyle='#ffad9f';g.font='bold 25px Arial, sans-serif';g.textAlign='center';g.fillText(f.type==='breach'?'방어선 돌파!':'마지막 공을 놓쳤습니다!',225,299);g.font='bold 14px Arial, sans-serif';g.fillStyle='#fff0d4';g.fillText(f.type==='breach'?'하트가 남아 있어도':'남은 하트가 0이 되어',225,329);g.fillText(f.type==='breach'?'방어선이 뚫리면 패배합니다.':'게임이 종료됩니다.',225,350);g.fillText((runMode==='endless'?'ENDLESS '+(wave-50):'STAGE '+wave)+' · SCORE '+score.toLocaleString('ko-KR'),225,382);g.restore()}
function hud(){$('score').textContent=score.toLocaleString('ko-KR');$('wave').textContent=runMode==='endless'?'∞ '+(wave-50):String(wave).padStart(2,'0');$('progress').textContent=runMode==='endless'?'ENDLESS · '+(wave-51)+' 웨이브 생존':(wave-1)+'/50 스테이지 클리어';$('lives').textContent='♥ '.repeat(lives)+'♡ '.repeat(Math.max(0,hero().lives-lives));$('status').textContent=balls[0]?.held?'TAP TO SERVE':'BALLS '+balls.length;skillUI()}
function toast(t){$('toast').textContent=t;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,1400)}
// A separate density meter controls rare actual diagonal breakouts, not UI.
let waveInitialRegulars=0,breakoutNextCheck=0;
// Green is always the majority. New colors arrive in order:
// yellow (4), red (9), black (16); each gradually increases from 1 to 3.
// The exploding red barrel is a rare tactical target (1–2 per stage).
const STAGE_SPECIALS=[
 {form:1,at:[6,18]},        // red exploding barrel
 {form:7,at:[4,8,15]},      // yellow brain cube
 {form:3,at:[9,16,23]},     // red brain cube
 {form:6,at:[16,25,35]},    // black brain cube
 {form:4,at:[24]},          // packaging cameo
 {form:5,at:[28]},          // wooden crate cameo
 {form:2,at:[32]}           // black barrel cameo
];
function stageRoster(stage,slots){
 const cap=Math.floor(slots*.42); // >=58% regular green even on short foldable screens.
 const activeSpecs=STAGE_SPECIALS.map(spec=>({
  form:spec.form,want:spec.at.filter(at=>stage>=at).length
 })).filter(spec=>spec.want>0);
 const chosen=[],counts={};
 // Each newly unlocked form gets an initial one-character appearance.
 for(const spec of activeSpecs)if(chosen.length<cap){chosen.push(spec.form);counts[spec.form]=1}
 // Later stages gradually add a second and third of each colored form.
 for(let tier=2;tier<=3&&chosen.length<cap;tier++)
  for(const spec of activeSpecs)
   if(chosen.length<cap&&spec.want>=tier){
    chosen.push(spec.form);counts[spec.form]=(counts[spec.form]||0)+1;
   }
 return chosen;
}
function stageFeaturedForm(stage){
 let best=0;
 for(let i=1;i<ZOMBIE_FORMS.length;i++)
  if(ZOMBIE_FORMS[i].unlock<=stage&&
    ZOMBIE_FORMS[i].unlock>ZOMBIE_FORMS[best].unlock)best=i;
 return best;
}
function stageRosterLabel(stage){
 const latest=stageFeaturedForm(stage);
 return stage>1&&ZOMBIE_FORMS[latest].unlock===stage
  ? 'NEW · '+ZOMBIE_FORMS[latest].name
  : '그린 좀비 중심 대열';
}
// Character durability is independent from palette/tier; green survives
// several normal hits and featured variants endure longer without boss HP.
function zombieHP(form,kind=0,stage=wave){
 // Opening two stages use low durability before the full progression starts.
 const base=(stage<=2?2:3)+(stage>=20?1:0)+(stage>=38?1:0);
 const tier=Math.floor(kind/2);
 const bonus=[0,2,3,3,2,2,4,2][form??0]??0;
 return base+tier+bonus;
}
function setStageForms(regulars,stage){
 const forms=stageRoster(stage,regulars.length);
 // Shuffle slots, not the counts: no stage ever fills randomly with rare types.
 const available=regulars.slice();
 for(let i=available.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [available[i],available[j]]=[available[j],available[i]];
 }
 const deployedBarrels=[];
 for(const form of forms){
  let index=available.findIndex(z=>form!==1||z.row>0&&
    deployedBarrels.every(other=>Math.hypot(z.x-other.x,z.y-other.y)>95));
  if(index<0)index=available.findIndex(z=>form!==1||
    deployedBarrels.every(other=>Math.hypot(z.x-other.x,z.y-other.y)>65));
  if(index<0)index=0;
  const [z]=available.splice(index,1);
  if(!z)break;
  z.form=form;
  if(form===1)deployedBarrels.push(z);
 }
 for(const z of regulars)z.hp=z.max=zombieHP(z.form,z.kind,stage);
}
function rack(){
 foes=[];stageDelay=0;fireDropsThisWave=0;stageLootCount=0;supportDropsThisWave=0;
 const rows=wave===1&&runMode==='campaign'?2:Math.min(4,Math.max(2,Math.min(
  Math.floor((DEFENSE_Y-142)/ENEMY_ROW_PITCH)+1,
  Math.max(3,Math.round(Math.min(5,3+Math.floor(wave/2))*7/ENEMY_COLUMNS))
 )));
 const bossStage=wave%3===0;
 for(let r=0;r<rows;r++)for(let col=0;col<ENEMY_COLUMNS;col++){
  if(bossStage&&r<2&&Math.abs(col-4)<=1)continue;
  const maxKind=Math.min(4,1+Math.floor(wave/2));
  const kind=Math.floor(Math.pow(Math.random(),Math.max(.45,1.7-wave*.12))*(maxKind+1));
  const hp=zombieHP(0,kind,wave);
  foes.push({x:ENEMY_LEFT_X+col*ENEMY_PITCH,y:70+r*ENEMY_ROW_PITCH,
   row:r,col,w:33,h:44,hp,max:hp,kind,form:0,flash:0,
   seed:Math.random()*20,burn:0,burnTick:0,spreadTick:0});
 }
 setStageForms(foes,wave);
 if(bossStage){
  const hp=Math.round(24+Math.min(wave,10)*4+Math.max(0,wave-10)*1.2);
  const bossForm=(wave/3-1)%BOSS_FORMS.length;
  foes.push({x:192,y:74,row:-1,col:4,w:66,h:88,hp,max:hp,kind:4,
   form:3,bossForm,boss:true,flash:0,seed:0,burn:0,burnTick:0,spreadTick:0});
  sfx('boss');effect(225,130,'#ff687e',145,BOSS_FORMS[bossForm]);
 }
 $('encounter').textContent=(runMode==='endless'?'ENDLESS '+(wave-50):'STAGE '+wave)
  +' · '+(bossStage?BOSS_FORMS[(wave/3-1)%4]:stageRosterLabel(wave))
  +' / 진군 속도 '+marchBase().toFixed(1);
 waveInitialRegulars=foes.filter(z=>!z.boss).length;
 breakoutNextCheck=clock+.85;
}
function marchBase(){const stage=Math.min(50,wave),n=Math.min(9,Math.max(0,stage-1)),late=Math.max(0,stage-10);return 2.7+.22*n+.006*n*n+.07*late+.0008*late*late+(runMode==='endless'?Math.min(9,Math.max(0,wave-50)*.035):0)}
function enemySpeed(z){
 const seed=Number.isFinite(z.seed)?z.seed:0;
 const pace=Number.isFinite(z.seed)?.80+.43*((seed*.61803398875)%1):1;
 const pulse=Number.isFinite(z.seed)?1+.14*Math.sin(clock*.8+seed*1.73):1;
 return marchBase()*(z.boss?.62:[1.1,1.04,.97,.89,.82][z.kind])*
   pace*pulse*(has('slow')?.4:1);
}
// Frequent short physical steps blend down/front/left/right animations even
// while the full horde is intact. The sprites face the ACTUAL movement vector.
const BREAKOUT_DENSITY=.86,BREAKOUT_MIN_KILLS=3,BREAKOUT_MAX_ACTIVE=3;
function tryStartBreakouts(){
 if(clock<breakoutNextCheck)return;
 breakoutNextCheck=clock+.8+Math.random()*.7;
 const living=foes.filter(z=>!z.boss),activeCount=living.filter(z=>Number.isFinite(z.breakoutTime)).length;
 if(activeCount>=BREAKOUT_MAX_ACTIVE||waveInitialRegulars<9||
    waveInitialRegulars-living.length<BREAKOUT_MIN_KILLS||
    living.length>waveInitialRegulars*BREAKOUT_DENSITY)return;
 // More deliberate breakthroughs as the formation opens up, but never random
 // sideways animations without actual diagonal displacement.
 if(Math.random()>.82)return;
 const chosen=[],available=foes.filter(z=>!z.boss);
 const occupied=new Set(available.filter(z=>Number.isInteger(z.row)&&Number.isInteger(z.col))
  .map(z=>z.row+':'+z.col));
 const density=living.length/waveInitialRegulars;
 const capacity=Math.min(BREAKOUT_MAX_ACTIVE-activeCount,
   density<.52?3:density<.72?2:1);
 const count=1+(capacity>1&&Math.random()<.7?1:0)+
   (capacity>2&&Math.random()<.36?1:0);
 for(let k=0;k<count;k++){
  const choices=[];
  for(const z of living){
   if(chosen.some(c=>c.z===z||c.z.row===z.row)||Number.isFinite(z.breakoutTime)||
      !Number.isInteger(z.col)||!Number.isInteger(z.row)||
      z.row===0||z.y+z.h>=DEFENSE_Y-125||
      (z.breakoutCooldownUntil||0)>clock||
      (z.hitHold||0)>0||(z.recoil||0)>.015)continue;
   for(const dir of [-1,1]){
    for(const distance of [1,2]){
     if(distance===2&&Math.random()<.32)continue;
     const destCol=z.col+distance*dir;
     if(destCol<0||destCol>=ENEMY_COLUMNS)continue;
     // The path must stay clear, not merely its destination.
     let free=true;
     for(let step=1;step<=distance;step++)
      if(occupied.has(z.row+':'+(z.col+dir*step)))free=false;
     if(!free)continue;
     const dest=ENEMY_LEFT_X+ENEMY_PITCH*destCol;
     if(dest<20||dest+z.w>W-20)continue;
     if(foes.some(other=>other!==z&&(
       other.boss&&Math.abs(other.x+other.w/2-(dest+z.w/2))<70&&
                     Math.abs(other.y+other.h/2-(z.y+z.h/2+25))<110
       )))continue;
     choices.push({z,destCol,dest,distance});
    }
   }
  }
  if(!choices.length)break;
  const pick=choices[Math.floor(Math.random()*choices.length)];
  const z=pick.z,duration=.30+Math.random()*.42;
  clearShortStep(z,duration+.65);
  z.breakoutTime=0;z.breakoutDuration=duration;
  z.breakoutVX=(pick.dest-z.x)/duration;
  z.breakoutVY=(22+Math.random()*42)/duration;
  z.breakoutTargetX=pick.dest;z.breakoutTargetCol=pick.destCol;
  z.breakoutCooldownUntil=clock+duration+1.5+Math.random()*2.2;
  chosen.push(pick);
  // Reserve destinations during this batch so multiple movers never converge.
  occupied.delete(z.row+':'+z.col);
  occupied.add(z.row+':'+pick.destCol);
 }
}

 // Per-zombie short diagonal footwork. In the packed nine-column formation,
 // +/-6px still leaves a gap between adjacent 33px collision rectangles.
 // 0.38–0.66s travel + 0.27–0.65s front-facing pause, per enemy.
 const SHORT_STEP_RADIUS=6;
 function shortStepNoise(z,salt){
   const n=(z.seed||0)*31.73+(z.col||0)*23.81+(z.row||0)*13.71+
     (z.shortStepCount||0)*17.13+salt*7.31;
   const value=Math.sin(n)*43758.5453;
   return value-Math.floor(value);
 }
 function clearShortStep(z,wait=.35){
   delete z.shortStepElapsed;delete z.shortStepDuration;
   delete z.shortStepFromX;delete z.shortStepTargetX;
   z.shortStepNext=clock+wait;
 }
 function shortDiagonalStep(z,dt){
   z.moveDir=0;
   if(z.boss||!Number.isInteger(z.row)||!Number.isInteger(z.col))return;
   if(z.shortStepCol!==z.col){
     z.shortStepCol=z.col;
     z.shortStepHomeX=ENEMY_LEFT_X+z.col*ENEMY_PITCH;
     clearShortStep(z,.22+shortStepNoise(z,1)*.5);
   }
   // Recoil, chain knockback and rare long breakout own movement first.
   if((z.recoil||0)>.015||(z.hitHold||0)>0||(z.knockTime||0)>0){
     if((z.knockTime||0)>0)z.shortStepHomeX=z.x;
     clearShortStep(z,.35);
     return;
   }
   if(!Number.isFinite(z.shortStepNext))
     z.shortStepNext=clock+.12+shortStepNoise(z,2)*.62;
   if(!Number.isFinite(z.shortStepElapsed)){
     if(clock<z.shortStepNext)return;
     z.shortStepCount=(z.shortStepCount||0)+1;
     let home=z.shortStepHomeX;
     if(!Number.isFinite(home)||Math.abs(z.x-home)>SHORT_STEP_RADIUS+4){
       home=z.x;z.shortStepHomeX=home;
     }
     const magnitude=4+shortStepNoise(z,3)*2;
     const sign=shortStepNoise(z,4)<.5?-1:1;
     let dest=clamp(home+sign*magnitude,20,W-20-z.w);
     if(Math.abs(dest-z.x)<3)
       dest=clamp(home-sign*magnitude,20,W-20-z.w);
     if(Math.abs(dest-z.x)<2||!canKnockback(z,dest,z.y)){
       z.shortStepNext=clock+.24+shortStepNoise(z,5)*.38;
       return;
     }
     z.shortStepFromX=z.x;z.shortStepTargetX=dest;
     z.shortStepElapsed=0;
     z.shortStepDuration=.38+shortStepNoise(z,6)*.28;
   }
   const d=Math.min(dt*(has('slow')?.4:1),
     z.shortStepDuration-z.shortStepElapsed);
   if(d<=0){clearShortStep(z,.3);return}
   const t=(z.shortStepElapsed+d)/z.shortStepDuration;
   const eased=t*t*(3-2*t); // eased turning, no position teleport
   const nextX=z.shortStepFromX+
     (z.shortStepTargetX-z.shortStepFromX)*eased;
   if(!canKnockback(z,nextX,z.y)){
     clearShortStep(z,.35+shortStepNoise(z,7)*.3);
     return;
   }
   const lastX=z.x;
   z.x=nextX;
   z.shortStepElapsed+=d;
   z.moveDir=Math.sign(z.x-lastX);
   if(z.shortStepElapsed>=z.shortStepDuration-1e-5)
     clearShortStep(z,.27+shortStepNoise(z,8)*.38);
 }
function march(dt){
 tryStartBreakouts();
 const sorted=[...foes].sort((a,b)=>b.y-a.y),done=[];
 for(const z of sorted){
  let extraY=0;
  if(!z.boss&&Number.isFinite(z.breakoutTime)){
   const timeStep=Math.max(0,Math.min(dt*(has('slow')?.4:1),
     z.breakoutDuration-z.breakoutTime));
   const previousX=z.x;
   const proposedX=clamp(z.x+z.breakoutVX*timeStep,20,W-20-z.w);
   // An adjacent lane may have closed after an ally was knocked into it.
   // Stop the dash rather than ghosting through a zombie then teleporting.
   if(canKnockback(z,proposedX,z.y)){
    z.x=proposedX;extraY=z.breakoutVY*timeStep;
    z.breakoutTime+=timeStep;
    z.moveDir=Math.sign(z.x-previousX);
    if(z.breakoutTime>=z.breakoutDuration-1e-6){
     if(canKnockback(z,z.breakoutTargetX,z.y)){
      z.x=z.breakoutTargetX;z.col=z.breakoutTargetCol;
     }
     delete z.breakoutTime;delete z.breakoutDuration;
     z.breakoutCooldownUntil=Math.max(z.breakoutCooldownUntil||0,clock+1.3);
    }
   }else{
    delete z.breakoutTime;delete z.breakoutDuration;z.moveDir=0;
    z.breakoutCooldownUntil=clock+1.7;
   }
  }else shortDiagonalStep(z,dt);
  let next=z.y+enemySpeed(z)*dt+extraY;
  for(const front of done){
   if(Number.isInteger(z.row)&&z.row===front.row)continue;
   if(z.x-8<front.x+front.w+8&&z.x+z.w+8>front.x-8)
    next=Math.min(next,front.y-z.h-(front.boss?25:10));
  }
  z.y=Math.max(z.y,next);
  done.push(z);
 }
 // Collision-box guard for independently paced marchers, knockback chains
 // and diagonally repositioned rogues. The sprites may touch, never interpenetrate.
 for(let pass=0;pass<2;pass++){
  let corrected=0;
  for(let i=0;i<foes.length;i++)for(let j=i+1;j<foes.length;j++){
   const a=foes[i],b=foes[j],pa={x:a.x,y:a.y},pb={x:b.x,y:b.y};
   if(!zombieBoxesOverlap(a,pa,b,pb,0))continue;
   const dx=a.x+a.w/2-b.x-b.w/2,dy=a.y+a.h/2-b.y-b.h/2,
     overlapX=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),
     overlapY=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
   const horizontal=overlapX<overlapY||a.row===b.row,
     push=horizontal?{x:dx>=0?1:-1,y:0}:{x:0,y:dy>=0?1:-1};
   if(applyKnockback(a,push,3)||applyKnockback(b,{x:-push.x,y:-push.y},3))
    corrected++;
  }
  if(!corrected)break;
 }
}
function beginClear(){if(mode!=='playing')return;mode='clearing';clearTime=0;clearBurst=0;items=[];for(const b of balls)retireBall(b,'clear');balls=[];junk=[];rockets=[];for(const p of citizens)p.shooting=0;active={};score+=500;cheerTime=3;sfx('wave');effect(225,340,'#edfc8d',130,'STAGE CLEAR');$('toast').style.opacity=0;hud();$('status').textContent='CITIZENS SAVED!'}
function advanceStage(){if(runMode==='campaign'&&wave===50){finishCampaign();return}wave++;if((wave-1)%5===0)lives=Math.min(hero().lives,lives+1);mode='playing';clearTime=0;clearSkills();rack();resetBalls();crowdTimer=3.5;toast(wave%3===0?'WARNING · '+BOSS_FORMS[(wave/3-1)%4]:(runMode==='endless'?'ENDLESS '+(wave-50):'STAGE '+String(wave).padStart(2,'0'))+' · '+stageRosterLabel(wave))}
function newBall(x=car,y=PY-17,vx=0,vy=0,held=true){return{x,y,vx,vy,held,trail:[],lastHit:null,hitLock:0,pierceContacts:new Set()}}
function resetBalls(){killCombo=0;killTimer=0;comboPop=0;comboDisplayTime=0;balls=[newBall()];combo=0;hud()}
function clearSkills(){active={};items=[];rockets=[];bazookaBlasts=[];bazookaTimer=0;skillUI()}
function start(selectedMode='campaign'){if(selectedMode==='endless'&&!endlessUnlocked)return;runMode=selectedMode;lastStandUsed=false;resistFlash=0;failureScene=null;lastLostBall=null;lastSupportAt=clock-60;supportDangerTime=0;resetCitizens();releaseInput();$('results').hidden=true;unlockAudio();score=0;wave=runMode==='endless'?51:1;lives=hero().lives;car=target=225;clearTime=0;heroAttackTime=0;junk=[];crowdTimer=3.5;cheerTime=0;particles=[];ballVanish=[];criticalPopups=[];fx=[];enemyDeaths=[];enemyPieces=[];barrelBlasts=[];hitFlashes=[];cameraKick=0;lastFireDropAt=-1e6;lastFireDropWave=0;recentLootKinds=[];clearSkills();rack();resetBalls();mode='playing';$('overlay').hidden=true;$('heroes').hidden=true;nextBeat=0;beat=0;sfx('start');hud();endlessUI();toast(runMode==='endless'?'ENDLESS · 끝없는 생존 도전!':'STAGE 01 · 준비!')}
function serve(){unlockAudio();if(mode==='playing'&&balls[0]?.held){balls[0].held=false;balls[0].vx=125;balls[0].vy=-365;syncMulti();sfx('serve');hud()}}
function overlay(title,message,button,label){$('overlay').setAttribute('data-title','false');$('results').hidden=!['GAME OVER','VICTORY'].includes(label);$('heroes').hidden=!['GAME OVER','VICTORY'].includes(label);$('title').innerHTML=title;$('message').innerHTML=message;$('start').innerHTML=button+' <span>↗</span>';$('label').textContent=label;$('overlay').hidden=false;endlessUI()}
function pause(){releaseInput();if(mode==='playing'||mode==='clearing'){resumeMode=mode;mode='paused';sfx('pause');overlay('잠깐,<br><em>숨 고르기.</em>','게임과 스킬 지속시간이 멈췄습니다.','계속하기','PAUSED')}else if(mode==='paused'){unlockAudio();mode=resumeMode;$('overlay').hidden=true;nextBeat=0}}
function end(reason,detail=null){if(mode==='over')return;releaseInput();mode='over';best=Math.max(best,score);try{localStorage.setItem('zr-best',best)}catch{}$('result-stage').textContent=runMode==='endless'?'무한 '+(wave-50)+' 웨이브':wave+' 스테이지';$('result-cleared').textContent=runMode==='endless'?(wave-51)+' 웨이브 생존':(wave-1)+'개 클리어';$('result-score').textContent=score.toLocaleString('ko-KR');$('result-best').textContent=best.toLocaleString('ko-KR');overlay('게임 오버',reason,'다시 시작','GAME OVER');sfx('over');if(detail){failureScene={...detail,t:0};$('overlay').hidden=true;cameraKick=fxEnabled?4:0;haptic([30,40,30])}}
// A visual retirement is distinct from a missed-heart penalty. Expiring
// extra balls dissolve at their ACTUAL world positions rather than popping.
function retireBall(b,reason='expire'){
 if(!b||b.held)return;
 ballVanish.push({x:b.x,y:clamp(b.y,18,H-14),trail:(b.trail||[]).slice(0,8),
   reason,t:0,life:reason==='lost'?.65:.5});
 if(ballVanish.length>22)ballVanish.splice(0,ballVanish.length-22);
 if(fxEnabled)burst(b.x,clamp(b.y,24,H-24),reason==='lost'?'#ff9d9f':'#b8f9ef',6);
}
function burst(x,y,color,n=12){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*230,vy:(Math.random()-.6)*230,t:.5+Math.random()*.3,color,size:3+Math.random()*4});if(particles.length>400)particles.splice(0,particles.length-400)}
function multiCount(){return (has('dual')?2:1)*(has('triple')?3:1)}
function syncMulti(){if(!balls.length||balls[0].held)return;const n=multiCount(),src=balls[0];while(balls.length<n){const angles=[-1.1,...balls.map(b=>clamp(Math.atan2(b.vx,Math.abs(b.vy)),-1.1,1.1)),1.1].sort((a,b)=>a-b);let gap=0,a=0;for(let i=1;i<angles.length;i++)if(angles[i]-angles[i-1]>gap){gap=angles[i]-angles[i-1];a=(angles[i]+angles[i-1])/2}const sp=Math.max(350,Math.hypot(src.vx,src.vy));balls.push(newBall(src.x,src.y,Math.sin(a)*sp,-Math.cos(a)*sp,false))}if(balls.length>n){for(const b of balls.slice(n))retireBall(b);balls=balls.slice(0,n)}hud()}
function activate(k){active[k]=SKILLS[k].duration*hero().duration;if(k==='dual'||k==='triple'){syncMulti()}if(k==='bazooka'){bazookaTimer=0;lastSupportAt=clock}sfx('item');effect(car,PY-20,SKILLS[k].color,65);burst(car,PY,SKILLS[k].color,12);hud()}
// Support is rare while safe, weighted toward danger, and rate-limited per run.
let lastSupportAt=-60,supportDangerTime=0,supportDropsThisWave=0;
function supportRisk(){if(!foes.length)return 0;const bottom=Math.max(...foes.map(z=>z.y+z.h)),alive=citizens.filter(p=>p.alive).length;return bottom>=475||(bottom>=380&&(lives===1||alive<=5))?2:bottom>=390||lives===1||alive<=8?1:0}
function supportAvailable(){return wave>=3&&supportDropsThisWave<1&&citizens.some(p=>p.alive)&&clock-lastSupportAt>=45&&!has('bazooka')&&!items.some(i=>i.k==='bazooka')&&!rockets.length}
function supportChance(){return supportAvailable()?[.005,.1,.28][supportRisk()]:0}
function updateEmergencySupport(dt){if(mode!=='playing'||balls[0]?.held||!supportAvailable()||supportRisk()<2){supportDangerTime=0;return}supportDangerTime+=dt;if(supportDangerTime<3||items.length>=LOOT_MAX_VISIBLE)return;const pos=pickupLocation(car,PY-119);if(!pos)return;items.push({...pos,k:'bazooka',phase:0});lastSupportAt=clock;supportDropsThisWave++;supportDangerTime=0;toast('긴급 지원! · 바주카를 받아주세요');sfx('item')}
// Controlled loot: a few meaningful, non-duplicate pickups per wave.
// Fire is recoverably rare (guaranteed after a dry streak of stages), not absent.
const LOOT_DROP_CHANCE=.19,LOOT_MAX_VISIBLE=2,LOOT_MAX_STAGE=3,LOOT_SPACING=72;
const FIRE_DROP_CHANCE=.20,FIRE_DROP_COOLDOWN=24,FIRE_DROP_STAGE_GAP=2,FIRE_PITY_STAGES=3;
let fireDropsThisWave=0,lastFireDropAt=-1e6,lastFireDropWave=0;
let stageLootCount=0,recentLootKinds=[];
function fireCanDrop(){
 return fireDropsThisWave===0&&wave-lastFireDropWave>=FIRE_DROP_STAGE_GAP&&
   clock-lastFireDropAt>=FIRE_DROP_COOLDOWN&&!has('fire')&&
   !items.some(item=>item.k==='fire');
}
function pickupLocation(x,y){
 // Pickup icons have 38px silhouettes; keep them apart while they fall.
 const offsets=[[0,0],[72,0],[-72,0],[0,-72],[0,72],[144,0],[-144,0],
  [72,-72],[-72,-72],[72,72],[-72,72],[0,-144],[0,144]];
 for(const [dx,dy] of offsets){
  const px=clamp(x+dx,40,410),py=clamp(y+dy,35,H-65);
  if(items.every(item=>Math.hypot(item.x-px,item.y-py)>=LOOT_SPACING))
   return {x:px,y:py};
 }
 return null;
}
function drop(z){
 if(z.max<2&&!z.boss)return;
 const boss=!!z.boss,fireReady=fireCanDrop();
 const pity=fireReady&&wave>=3&&wave-lastFireDropWave>=FIRE_PITY_STAGES;
 // An overdue fire reward takes priority over ordinary random drops.
 if(!boss&&stageLootCount>=LOOT_MAX_STAGE)return;
 if(!boss&&!pity&&Math.random()>=LOOT_DROP_CHANCE)return;
 // Fire pity and boss rewards can replace one uncollected regular pickup.
 if(items.length>=LOOT_MAX_VISIBLE){
  if(!boss&&!pity)return;
  const replaceIndex=items.findIndex(item=>item.k!=='fire');
  if(replaceIndex<0)return;
  items.splice(replaceIndex,1);
 }
 let k=null;
 if(fireReady&&(pity||Math.random()<FIRE_DROP_CHANCE)){
  k='fire';
 }else if(supportAvailable()&&Math.random()<supportChance()){
  k='bazooka';
 }else{
  const choices=Object.keys(SKILLS).filter(key=>key!=='fire'&&key!=='bazooka'&&
   !has(key)&&!items.some(item=>item.k===key));
  const fresh=choices.filter(key=>!recentLootKinds.includes(key));
  const oldest=Math.min(...choices.map(key=>recentLootKinds.lastIndexOf(key)));
  const pool=fresh.length?fresh:choices.filter(key=>recentLootKinds.lastIndexOf(key)===oldest);
  if(!pool.length)return;
  k=pool[Math.floor(Math.random()*pool.length)];
 }
 if(items.some(item=>item.k===k))return;
 const pos=pickupLocation(z.x+z.w/2,z.y+z.h/2);
 if(!pos)return;
 items.push({...pos,k,phase:Math.random()*6});
 stageLootCount++;
 recentLootKinds.push(k);
 if(recentLootKinds.length>4)recentLootKinds.shift();
 if(k==='fire'){
  fireDropsThisWave++;lastFireDropAt=clock;lastFireDropWave=wave;
 }
 if(k==='bazooka'){lastSupportAt=clock;supportDropsThisWave++}
}
const RED_BARREL_RADIUS=86;
function explodeRedBarrel(z){
 const x=z.x+z.w/2,y=z.y+z.h/2;
 barrelBlasts.push({x,y,t:0,life:.58,seed:Math.random()*6.28});
 if(barrelBlasts.length>6)barrelBlasts.shift();
 effect(x,y,'#ffac48',112);burst(x,y,'#ff913b',48);
 sfx('blast');haptic(12);
 // Fire spreads to nearby enemy collision rectangles, not to the player or civilians.
 const victims=foes.map(other=>{
  const dx=x-clamp(x,other.x,other.x+other.w);
  const dy=y-clamp(y,other.y,other.y+other.h);
  return {other,dist:dx*dx+dy*dy};
 }).filter(v=>v.dist<=RED_BARREL_RADIUS*RED_BARREL_RADIUS)
   .sort((a,b)=>a.dist-b.dist);
 let ignited=0;
 for(const v of victims)if(ignite(v.other,0)&&++ignited>=FIRE_BARREL_TARGETS)break;
}
// A CRITICAL is a probability-driven, full-health single-strike knockout.
// Power/rocket overkill and burning kills are not critical finishers.
const CRITICAL_GREEN_CHANCE=.15,CRITICAL_SPECIAL_CHANCE=.09;
function criticalEligible(z){return !z.boss&&Number.isInteger(z.form)&&z.hp>=z.max&&z.max>=3}
// Push a small chain of zombies when a hit has room to travel. Compute all
// destinations first, so no zombie moves if a wall, boss or crowded rank blocks
// the chain. This keeps collision rectangles separate and prevents phantom hits.
const KNOCK_CHAIN_LIMIT=8,KNOCK_TRAIL_LIFE=.32,KNOCK_TWEEN_LIFE=.20;
// Safe collider destinations are committed immediately; the animated sprite
// travels there over ~12 frames rather than visibly teleporting in one frame.
function knockVisualPosition(z){
 if(!(z.knockTime>0)||!Number.isFinite(z.knockFromX))return z;
 const t=clamp((KNOCK_TRAIL_LIFE-z.knockTime)/KNOCK_TWEEN_LIFE,0,1);
 const ease=1-Math.pow(1-t,3);
 return {...z,x:z.knockFromX+(z.x-z.knockFromX)*ease,
              y:z.knockFromY+(z.y-z.knockFromY)*ease};
}
function zombieBoxesOverlap(a,pa,b,pb,gap=.5){
 return pa.x<pb.x+b.w+gap&&pa.x+a.w+gap>pb.x&&
        pa.y<pb.y+b.h+gap&&pa.y+a.h+gap>pb.y;
}
function insideZombieRoad(z,p){
 return p.x>=20&&p.x+z.w<=430&&p.y>=18&&p.y+z.h<=DEFENSE_Y-16;
}
function canKnockback(z,x,y){
 const pos={x,y};
 return insideZombieRoad(z,pos)&&!foes.some(other=>other!==z&&
   zombieBoxesOverlap(z,pos,other,{x:other.x,y:other.y},1));
}
function planKnockPush(z,dx,dy,plans,depth=0){
 // Knockback must NEVER move an enemy toward the defense line (positive Y),
 // including recursive pushes and the overlap-repair pass in march().
 if(dy>0||z.boss||depth>KNOCK_CHAIN_LIMIT||plans.has(z))return false;
 const pos={x:z.x+dx,y:z.y+dy};
 if(!insideZombieRoad(z,pos))return false;
 plans.set(z,pos);
 const pushX=Math.abs(dx)>=Math.abs(dy);
 const direction=Math.sign(pushX?dx:dy);
 if(!direction)return false;
 for(const other of foes){
  if(other===z)continue;
  const otherPos=plans.get(other)||{x:other.x,y:other.y};
  if(!zombieBoxesOverlap(z,pos,other,otherPos,1))continue;
  if(other.boss||plans.has(other))return false;
  const overlapX=direction>0?pos.x+z.w+1-otherPos.x:
    otherPos.x+other.w+1-pos.x;
  const overlapY=direction>0?pos.y+z.h+1-otherPos.y:
    otherPos.y+other.h+1-pos.y;
  const push=pushX?{dx:direction*Math.max(1,overlapX),dy:0}:
                  {dx:0,dy:direction*Math.max(1,overlapY)};
  if(!planKnockPush(other,push.dx,push.dy,plans,depth+1))return false;
 }
 return true;
}
function applyKnockback(z,impact,n=1){
 if(!impact||z.boss)return false;
 // Incoming balls can hit the back/top of a zombie while travelling DOWN.
 // Remove only the forward Y impulse: keep the existing upward and sideways
 // knockback distances, directions, chain count and smooth visual tween.
 const vx=impact.x||0,vy=Math.min(0,impact.y||0),mag=Math.hypot(vx,vy);
 if(mag<.01)return false;
 // Contact transfers displacement to successive zombies. Attempt shorter
 // shoves when tightly packed ranks, bosses or road edges block the impulse.
 const distance=Math.min(50,36+Math.min(n,5)*3);
 const dirX=vx/mag,dirY=vy/mag;
 for(const factor of [1,.85,.7,.55,.4,.25,.12]){
  const plans=new Map();
  if(!planKnockPush(z,dirX*distance*factor,dirY*distance*factor,plans))continue;
  let valid=true;
  for(const [a,pa] of plans)
   for(const other of foes){
    if(a===other)continue;
    const pb=plans.get(other)||{x:other.x,y:other.y};
    if(zombieBoxesOverlap(a,pa,other,pb,.5)){valid=false;break}
   }
  if(!valid)continue;
  for(const [actor,pos] of plans){
   // Repeated hits restart from the current rendered position, not a
   // previous distant collider destination.
   const before=knockVisualPosition(actor);
   const beforeX=before.x,beforeY=before.y; // snapshot values before actor mutates
   actor.x=pos.x;actor.y=pos.y;
   actor.knockFromX=beforeX;actor.knockFromY=beforeY;
   actor.knockTime=KNOCK_TRAIL_LIFE;actor.knockChain=actor!==z;
   // Chain pushes interrupt the short step and re-anchor at the new x.
   clearShortStep(actor,.48);actor.shortStepHomeX=pos.x;
   if(actor!==z){
    actor.flinch=Math.max(actor.flinch||0,.32);
    actor.recoil=Math.max(actor.recoil||0,.2);
    hitFlashes.push({x:beforeX+actor.w/2,y:beforeY+actor.h/2,t:0,life:.16,critical:false});
    burst(beforeX+actor.w/2,beforeY+actor.h/2,'#d2ffdc',4);
   }
   // Active diagonal animation must not snap the pushed zombie back
   // onto its old target column or teleport through an ally.
   if(Number.isFinite(actor.breakoutTime)){
    delete actor.breakoutTime;delete actor.breakoutDuration;actor.moveDir=0;
    actor.breakoutCooldownUntil=clock+2;
   }
  }
  if(hitFlashes.length>36)hitFlashes.splice(0,hitFlashes.length-36);
  return true;
 }
 return false;
}
function damage(z,n=1,burning=false,impact=null,criticalHit=false,piercingCritical=false){
 if(!foes.includes(z))return;
 const fullHP=z.hp>=z.max,criticalKnockout=!burning&&!!criticalHit&&fullHP&&!z.boss;
 const critical=criticalKnockout||(!burning&&piercingCritical);
 const amount=criticalKnockout?z.hp:n;
 z.hp-=amount;
 z.flash=burning?.12:.22;
 enemyReaction(z,amount,impact);
 if(!burning){
  hitFlashes.push({x:z.x+z.w/2,y:z.y+z.h/2,t:0,life:critical?.32:.22,critical});
  if(hitFlashes.length>36)hitFlashes.shift();
  cameraKick=fxEnabled?Math.max(cameraKick,critical?7.5:z.boss?6:4.7):0;
  haptic(critical?[25,18,25]:z.boss?20:16);
  if(z.hp>0&&!piercingCritical)applyKnockback(z,impact,amount);
 }
 const hitPosition=knockVisualPosition(z);
 if(critical){criticalPopups.push({x:hitPosition.x+z.w/2,y:hitPosition.y+z.h/2,t:0,life:.72,pierce:piercingCritical});if(criticalPopups.length>12)criticalPopups.shift()}
 effect(hitPosition.x+z.w/2,hitPosition.y+z.h/2,burning?'#ffac48':critical?'#fff3b2':TYPES[z.kind].color,
  z.hp<=0?(z.boss?150:55):burning?20:38,
  z.hp<=0?(z.boss?'BOSS BREAK!':critical?'CRITICAL!':'+'+(100*z.max)):burning?'':'-'+amount);
 score+=z.hp<=0?(z.boss?1500:100*z.max)+Math.min(combo,10)*10:25;
 burst(hitPosition.x+z.w/2,hitPosition.y+z.h/2,burning?'#ff985f':critical?'#fff6be':TYPES[z.kind].color,
  z.boss?20:burning?3:12);
 if(!burning&&amount>=2&&!z.boss)sfx('powerhit');
 if(!burning&&z.hp>0){
  if(z.boss)sfx('bosshit');
  else if(amount<2)sfx('hit');
 }
 if(z.hp<=0){
  enemyDeath(z,critical);
  if(critical)burst(z.x+z.w/2,z.y+8,'#fff0ad',17);
  recordKill();foes.splice(foes.indexOf(z),1);
  if(!z.boss&&z.form===1)explodeRedBarrel(z);
  drop(z);sfx(z.boss?'boss':'kill');
  if(z.boss){toast('BOSS DOWN · +1500');haptic([18,25,28])}
 }
 hud();if(!foes.length)beginClear();
}
// Fire has a hard simultaneous cap and at most one single-hop spread per
// directly ignited zombie. Propagated flames cannot propagate again.
const FIRE_MAX_ACTIVE=5,FIRE_DURATION=2.4,FIRE_TICK_INTERVAL=1.05,FIRE_TICK_DAMAGE=.75;
const FIRE_SPREAD_RADIUS=52,FIRE_SPREAD_DEPTH=1,FIRE_DIRECT_TARGETS=2,FIRE_BARREL_TARGETS=3;
function ignite(z,depth=0){
 if(!foes.includes(z)||z.burn>0||foes.filter(other=>other.burn>0).length>=FIRE_MAX_ACTIVE)
  return false;
 z.burn=FIRE_DURATION;z.burnTick=0;z.spreadTick=0;
 z.burnDepth=depth;z.spreadDone=false;
 return true;
}
function fireTargetsNear(z,radius){
 return foes.filter(other=>other!==z&&other.burn<=0&&
  Math.hypot(other.x+other.w/2-z.x-z.w/2,
             other.y+other.h/2-z.y-z.h/2)<=radius)
  .sort((a,b)=>Math.hypot(a.x-z.x,a.y-z.y)-Math.hypot(b.x-z.x,b.y-z.y));
}
function hit(z,impact=null,piercing=false){
 combo++;
 const critical=!piercing&&criticalEligible(z)&&Math.random()<(z.form===0?CRITICAL_GREEN_CHANCE:CRITICAL_SPECIAL_CHANCE);
 // Piercing deals two times the normal damage to ALL enemies, including
 // bosses, but never turns a full-health boss into a one-hit kill.
 damage(z,hero().damage*(has('power')?2:1)*(piercing?2:1),false,impact,critical,piercing);
 if(has('fire')){
  const targets=foes.includes(z)?[z,...fireTargetsNear(z,82)]:foes.filter(other=>
   Math.hypot(other.x+other.w/2-z.x-z.w/2,other.y+other.h/2-z.y-z.h/2)<82);
  let count=0;
  for(const other of targets)if(ignite(other,0)&&++count>=FIRE_DIRECT_TARGETS)break;
  if(count)sfx('fire');
 }
}
function update(dt){
 // Visual FX can finish even while a final-ball loss freezes the game scene.
 if(mode!=='paused'){
  for(const f of ballVanish)f.t+=dt;
  ballVanish=ballVanish.filter(f=>f.t<f.life);
  for(const f of criticalPopups)f.t+=dt;
  criticalPopups=criticalPopups.filter(f=>f.t<f.life);
 }
 if(mode==='over'&&failureScene){failureScene.t+=dt;clock+=dt;cameraKick*=Math.exp(-dt*10);if(failureScene.t>=1.8){failureScene=null;$('overlay').hidden=false}return}if(mode!=='playing'&&mode!=='clearing')return;clock+=dt;resistFlash=Math.max(0,resistFlash-dt);updateEnemyVisuals(dt);cameraKick*=Math.exp(-dt*23);if(cameraKick<.06)cameraKick=0;fx=fx.filter(f=>(f.t+=dt)<f.life);swing=Math.max(0,swing-dt);heroAttackTime=Math.max(0,heroAttackTime-dt);particles=particles.filter(p=>p.t>0);for(const p of particles){p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt}
if(mode==='playing'){killTimer=Math.max(0,killTimer-dt);if(!killTimer)killCombo=0;comboPop=Math.max(0,comboPop-dt);comboDisplayTime=Math.max(0,comboDisplayTime-dt)}
updateCrowd(dt);updateEmergencySupport(dt);
if(mode==='clearing'){clearTime+=dt;clearBurst+=dt;car+=(225-car)*Math.min(1,dt*3);if(fxEnabled&&clearBurst>.22){clearBurst=0;burst(35+Math.random()*380,160+Math.random()*200,['#ffe97a','#8df3c8','#f9a2de'][Math.floor(Math.random()*3)],14)}if(clearTime>=2.8)advanceStage();return}
if(!foes.length){beginClear();return}
const previousCar=car;if(keys.ArrowLeft||keys.a)target-=hero().speed*dt;if(keys.ArrowRight||keys.d)target+=hero().speed*dt;target=clamp(target,72,W-72);car+=clamp(target-car,-hero().speed*dt,hero().speed*dt);
for(const k of Object.keys(active)){active[k]-=dt;if(active[k]<=0){delete active[k];if(k==='dual'||k==='triple'){const n=multiCount();for(const b of balls.slice(n))retireBall(b);balls=balls.slice(0,n)}if(k==='pierce')for(const b of balls)b.pierceContacts?.clear();sfx('expire');hud()}}skillUI();
for(const item of [...items]){item.y+=105*dt;if(item.y>=PY-2&&item.y<=PY+61&&Math.abs(item.x-car)<65){items.splice(items.indexOf(item),1);activate(item.k)}else if(item.y>H+20)items.splice(items.indexOf(item),1)}
if(balls[0]?.held){balls[0].x=car;balls[0].y=PY-17;return}
march(dt);for(const z of [...foes]){z.flash=Math.max(0,z.flash-dt);if(z.burn>0){
 z.burn=Math.max(0,z.burn-dt);z.burnTick+=dt;z.spreadTick+=dt;
 if(z.spreadTick>=.95&&!z.spreadDone){
  z.spreadDone=true;
  if((z.burnDepth||0)<FIRE_SPREAD_DEPTH){
   const neighbour=fireTargetsNear(z,FIRE_SPREAD_RADIUS)[0];
   if(neighbour)ignite(neighbour,(z.burnDepth||0)+1);
  }
 }
 if(z.burnTick>=FIRE_TICK_INTERVAL){
  z.burnTick-=FIRE_TICK_INTERVAL;
  damage(z,FIRE_TICK_DAMAGE,true);
  if(mode!=='playing')return;
 }
}if(foes.includes(z)&&z.y+z.h>=DEFENSE_Y){if(triggerLastStand())return;end(z.boss?'보스가 방어선을 돌파했습니다. 하트와 관계없이 패배합니다.':'좀비가 방어선을 돌파했습니다. 하트와 관계없이 패배합니다.',{type:'breach',x:z.x+z.w/2,y:z.y+z.h/2});return}}
for(const b of [...balls]){const radius=has('power')?16:8,rate=has('slow')?.66:1,steps=Math.max(1,Math.ceil(Math.max(Math.hypot(b.vx,b.vy)*dt*rate,Math.abs(car-previousCar))/4)),d=dt*rate/steps;
for(let s=0;s<steps;s++){const ox=b.x,oy=b.y;b.hitLock=Math.max(0,b.hitLock-d);b.x+=b.vx*d;b.y+=b.vy*d;if(b.x<20+radius){b.x=20+radius;b.vx=Math.abs(b.vx);sfx('wall')}if(b.x>430-radius){b.x=430-radius;b.vx=-Math.abs(b.vx);sfx('wall')}if(b.y<16+radius){b.y=16+radius;b.vy=Math.abs(b.vy);sfx('wall')}
 // Each ball can strike multiple enemies in a line without flipping its
 // velocity, but never repeatedly damage one enemy during a single overlap.
 // Once it fully exits that enemy, the contact can be struck on a later pass.
 const piercing=has('pierce');
 if(piercing){
  for(const z of b.pierceContacts){
   if(!foes.includes(z)||b.x+radius<=z.x||b.x-radius>=z.x+z.w||
      b.y+radius<=z.y||b.y-radius>=z.y+z.h)b.pierceContacts.delete(z);
  }
 }
 for(const z of foes){
  if(piercing?b.pierceContacts.has(z):(b.lastHit===z&&b.hitLock>0))continue;
  if(b.x+radius>z.x&&b.x-radius<z.x+z.w&&b.y+radius>z.y&&b.y-radius<z.y+z.h){
   const impact={x:b.vx,y:b.vy};
   if(piercing){
    b.pierceContacts.add(z);
    // Keep both vx and vy: three or more packed zombies can be pierced.
   }else if(ox+radius<=z.x||ox-radius>=z.x+z.w){b.vx*=-1;b.x=ox}
   else{b.vy*=-1;b.y=oy}
   b.lastHit=z;b.hitLock=.1;hit(z,impact,piercing);
   if(mode!=='playing')return;
   break;
  }
 }
if(b.vy>0&&oy+radius<=PY&&b.y+radius>=PY&&Math.abs(b.x-car)<hero().paddle+radius/2){const offset=clamp((b.x-car)/hero().paddle,-1,1),speed=Math.min(600,Math.hypot(b.vx,b.vy)+7),angle=offset*1.06;b.vx=Math.sin(angle)*speed;b.vy=-Math.cos(angle)*speed;b.y=PY-radius-1;swing=.22;heroAttackTime=HERO_ATTACK_DURATION;combo=0;effect(b.x,PY,'#e8ff93',30);burst(b.x,PY,'#e4ff9c',8);sfx('racket');haptic(8)}
carCollision(b,radius,previousCar+(car-previousCar)*(s+1)/steps);
if(has('shield')&&b.vy>0&&b.y+radius>=H-35){b.y=H-35-radius;b.vy=-Math.abs(b.vy);sfx('shield');effect(b.x,H-35,'#a1fbe6',75,'SAVE!');burst(b.x,H-35,'#b9f684',10)}
if(!has('shield'))citizenCollision(b,radius);
if(b.y>H+20){lastLostBall={x:clamp(b.x,28,422),y:H-11};retireBall(b,'lost');balls.splice(balls.indexOf(b),1);hud();break}}
b.trail.unshift({x:b.x,y:b.y});if(b.trail.length>13)b.trail.pop()}
if(!balls.length){lives--;effect(car,PY,'#ff7089',85,'MISS');sfx('miss');clearSkills();if(!lives){if(triggerLastStand()){lives=1;resetBalls();active.shield=4;hud();return}hud();end('마지막 공이 떨어져 하트가 모두 소진되었습니다.',{type:'ball',x:lastLostBall?.x||car,y:H-11});return}resetBalls();toast('공 낙하! · 하트 '+lives+'개 남음 · 탭해서 서브')}
}
function background(){// Readability-first road tones: brighter, largely neutral gray with a restrained
// warm/cool shift per stage. Keep colored zombie silhouettes in the foreground.
const palette=[['#444e53','#566064','#4e595d','#77878a'],
               ['#514b55','#615c66','#58545d','#817b83'],
               ['#48554f','#5a685f','#526057','#7a8b7e']][(wave-1)%3];rect(0,0,W,H,palette[0]);for(let row=0;row<Math.ceil(H/49)+1;row++)for(let col=0;col<9;col++){let x=20+col*47,y=row*49,k=(row*7+col*13)%5;rect(x,y,45,47,palette[k%2+1]);rect(x,y,45,2,'#b9c7c11b');if(k===1){rect(x+7,y+25,11,2,'#24303835');rect(x+16,y+27,2,7,'#24303835')}}
for(let side of [0,432]){rect(side,0,18,H,'#343e43');for(let y=0;y<H;y+=42){rect(side+4,y,10,24,palette[3]);rect(side+6,y+2,3,18,'#8b9b97')}}
g.globalAlpha=.10;for(let y=-60;y<H;y+=92)rect(222,y+(clock*12)%92,6,34,palette[3]);g.globalAlpha=1;g.strokeStyle=palette[3]+'24';g.lineWidth=2;g.strokeRect(29,27,392,DEFENSE_Y-45);
for(let i=0;i<16;i++){let x=25+(i*137)%400,y=(i*97+clock*9)%(DEFENSE_Y-15);rect(x,y,2,2,palette[3]+'30')}
g.setLineDash([8,7]);g.strokeStyle='#ff947b99';g.beginPath();g.moveTo(23,DEFENSE_Y);g.lineTo(427,DEFENSE_Y);g.stroke();g.setLineDash([]);g.fillStyle='#ffc794aa';g.font='10px Arial, sans-serif';g.textAlign='left';g.fillText('DEFENSE LINE / 넘기면 끝!',30,DEFENSE_Y+14);rect(20,H-50,410,50,'#17252baa');
if(has('slow')){g.strokeStyle='#86f2e050';g.strokeRect(24,22,402,DEFENSE_Y-30)}
}
function player(){
 const sprite=window.ZZHeroCarAttack;
 if(sprite&&sprite.ready&&sprite.image){
  // 70% of the original onscreen car/hero size. Re-center on the OLD 154px
  // rectangle's midpoint rather than anchoring its bottom; the raised
  // bounce line now runs through the seated hero's weapon-hand height.
  // Physics width and the forgiving car body emergency save stay unchanged.
  const t=heroAttackTime>0?1-heroAttackTime/HERO_ATTACK_DURATION:0;
  const order=[2,3,4,5,6,7,0];
  const n=heroAttackTime>0?order[Math.min(order.length-1,Math.floor(t*order.length))]:0;
  const w=108,h=108; // 154×154 → 108×108 (~70%); preserve the 192px master atlas
  const win=mode==='clearing'||mode==='paused'&&resumeMode==='clearing';
  g.save();g.translate(0,VIEW_DELTA);
  if(win)g.translate(0,-Math.abs(Math.sin(clearTime*7))*4);
  // The line visual and actual bounce test use the same raised PY height.
  const paddleY=PY-VIEW_DELTA;
  g.strokeStyle=swing>0?'#e5ff9e':'#c9ed9388';
  g.lineWidth=swing>0?3:2;
  g.beginPath();g.moveTo(car-hero().paddle,paddleY);
  g.lineTo(car+hero().paddle,paddleY);g.stroke();
  g.drawImage(sprite.image,n*192,selectedHero*192,192,192,
    car-w/2,579-h/2,w,h);
  g.restore();
  return;
 }
 let x=car;const h=hero(),win=mode==='clearing'||mode==='paused'&&resumeMode==='clearing';g.save();g.translate(0,VIEW_DELTA);if(win)g.translate(0,-Math.abs(Math.sin(clearTime*7))*4);/* no baked vehicle ground shadow */rect(x-57,626,13,24,'#14251f');rect(x+44,626,13,24,'#14251f');cube(x-52,621,104,25,h.color,'#ffbc72','#54313a');rect(x-45,625,90,5,'#ff9c58');cube(x-27,612,53,18,'#182e2a','#3d5441','#18221d');heroSprite(x,600,1,win);rect(x-46,635,18,6,'#fff2b2');rect(x+29,635,18,6,'#fff2b2');rect(x-47,649,95,5,'#b1b59b');g.strokeStyle='#e6d399';g.lineWidth=6;g.beginPath();g.moveTo(x+14,611);g.lineTo(x+32,602);g.stroke();g.save();g.translate(x+34,604-5);g.rotate(swing>0?-.25:0);g.strokeStyle='#e7c696';g.lineWidth=5;g.beginPath();g.ellipse(0,0,24,13,0,0,Math.PI*2);g.stroke();g.lineWidth=.8;g.strokeStyle='#f7f4dbaa';for(let i=-16;i<=16;i+=8){g.beginPath();g.moveTo(i,-9);g.lineTo(i,9);g.stroke()}for(let i=-6;i<=6;i+=6){g.beginPath();g.moveTo(-19,i);g.lineTo(19,i);g.stroke()}g.restore();g.strokeStyle=swing>0?'#e5ff9e':'#c9ed9366';g.lineWidth=swing>0?4:2;g.beginPath();g.moveTo(x-h.paddle,PY-VIEW_DELTA);g.lineTo(x+h.paddle,PY-VIEW_DELTA);g.stroke();g.restore()}
// Cosmetic poses only: no pose or death fragment participates in physics.
let enemyDeaths=[],enemyPieces=[],barrelBlasts=[],hitFlashes=[];
const ENEMY_CLOTH=['#65535a','#242b39','#302139','#574b66','#68415a','#e4d6b0','#d49b39','#733e65'];
const fract=n=>n-Math.floor(n);
function enemyAnim(z){if(z.anim)return z.anim;const seed=(z.seed||0)*13.71+z.x*.31+z.y*.17+(z.form||0)*7.13;const r=n=>fract(Math.sin(seed+n*19.17)*43758.5453);return z.anim={type:Math.floor(r(1)*6),phase:r(2)*6.28,speed:2.5+r(3)*1.8,amp:.7+r(4)*.6,period:3+r(5)*3,side:r(6)>.5?1:-1,seed}}
function enemyPose(z){const a=enemyAnim(z),t=z.hitHold>0?z.hitAt:clock,b=z.boss,person=b?[1,3,2,5][z.bossForm||0]:a.type,speed=b?[1.7,3.2,2.3,2.7][z.bossForm||0]:a.speed,q=t*speed+a.phase,low=b&&z.hp/z.max<.3?1.35:1,amp=a.amp*low*(fxEnabled?1:.6),cycle=Math.floor((t+a.phase)/a.period),u=(t+a.phase)%a.period,gate=fract(Math.sin(a.seed+cycle*8.3)*919.1),twitch=(person===2||person===5)&&u<.2?Math.sin(u*65)*.08:0,roar=b&&u>.5&&u<1.2?Math.sin((u-.5)/.7*Math.PI):0;
const hit=clamp((z.recoil||0)/.22,0,1),dx=z.impactX||0,dy=z.impactY||-1,neighbor=(z.flinch||0)/.3;
return {lean:clamp(Math.sin(q)*(person===0?.068:.037)*amp+twitch+neighbor*.035*(z.flinchSide||1)+hit*dx*.06,-.13,.13),bob:Math.sin(q*1.8)*.8*amp,head:clamp(Math.sin(q-.65)*.045*amp+(person===4?.04:0)*a.side+twitch*(person===2?1.3:.8)-hit*.09, -.16,.16),left:Math.sin(q*.91)*.24*amp+(person===1?.28:person===3?-.28:0)+hit*.35,right:Math.sin(q*1.13+1.8)*.24*amp+(person===3?-.3:0)-hit*.3,shoulder:Math.sin(q*2.31)*.7+roar*1.5,jaw:clamp((person===1?2:person===5?2.5:.4)+Math.max(0,Math.sin(q*.64))*1.7+(gate>.4&&u<.5?Math.sin(u*42)*.7:0)+roar*4,0,7),lidL:person===4?4:((gate<.65&&u<.23)?7*Math.sin(u/.23*Math.PI):1),lidR:person===1?3:((gate>.65&&u>.3&&u<.53)?8*Math.sin((u-.3)/.23*Math.PI):0),eye:gate>.45&&u>1.3&&u<1.7?a.side*2:0,legL:Math.sin(q+1.1)*1.3,legR:Math.sin(q*.94+3)*1.1,hit,dx,dy,roar};}
function enemyReaction(z,n,impact){const length=Math.hypot(impact?.x??0,impact?.y??-1)||1;z.impactX=(impact?.x??0)/length;z.impactY=(impact?.y??-1)/length;z.recoil=.22;z.hitHold=z.boss?.065:.04;z.hitAt=clock;if(n>=2||z.boss)for(const other of foes){if(other!==z&&Math.hypot(other.x+other.w/2-z.x-z.w/2,other.y+other.h/2-z.y-z.h/2)<100){other.flinch=.3;other.flinchSide=other.x<z.x?-1:1}}}
function enemyDeath(z,critical=false){
 enemyAnim(z);
 // The green mascot uses its approved 8+10-frame death atlas, rather than
 // the generic 2-key critical/death poses shared by the other 9 object types.
 const isGreen=!z.boss&&(z.form??0)===0;
 const objectSprite=!isGreen&&window.ZZObjectSprite?.available(z)===true;
 const greenSprite=isGreen&&window.ZZGreenDeath?.ready===true;
 const spriteMode=objectSprite||greenSprite;
 const split=objectSprite?(z.boss?(critical?.94:.78):(critical?.58:.52)):(greenSprite?(critical?.580:.520):(critical?.580:(z.boss?.32:.12)));
 enemyDeaths.push({z:{...z,flash:.1},critical,spriteMode,t:0,split,done:false});if(enemyDeaths.length>24)enemyDeaths.shift()}
function scatterEnemy(d){const z=d.z,sc=z.boss?2:1,a=enemyAnim(z),count=z.boss&&fxEnabled?20:6;for(let i=0;i<count;i++){const part=i<6?i:6,r=fract(Math.sin(a.seed+i*17.31)*4831.71),angle=-Math.PI+r*Math.PI*2,speed=(z.boss?180:70)+r*(z.boss?170:90),center=[[16.5,14],[16.5,35],[-1,28],[34,28],[8,41],[27,41]][i%6];enemyPieces.push({z,part,criticalGreen:!!d.critical,x:z.x+center[0]*sc,y:z.y+center[1]*sc,vx:Math.cos(angle)*speed,vy:-90-Math.abs(Math.sin(angle))*speed,angle:0,spin:(r-.5)*12,t:0,life:z.boss?1.25:.7,sc,color:i%2?TYPES[z.kind].color:ENEMY_CLOTH[z.boss?[3,4,7,1][z.bossForm||0]:z.form||0]})}if(enemyPieces.length>160)enemyPieces.splice(0,enemyPieces.length-160);effect(z.x+z.w/2,z.y+z.h/2,TYPES[z.kind].top,z.boss?150:48);burst(z.x+z.w/2,z.y+z.h/2,'#c9b99a',z.boss?24:8);if(z.boss){sfx('bosskill');haptic([18,25,28])}}
function updateEnemyVisuals(dt){hitFlashes=hitFlashes.filter(f=>(f.t+=dt)<f.life);barrelBlasts=barrelBlasts.filter(b=>(b.t+=dt)<b.life);bazookaBlasts=bazookaBlasts.filter(b=>(b.t+=dt)<b.life);for(const z of foes){z.recoil=Math.max(0,(z.recoil||0)-dt);z.hitHold=Math.max(0,(z.hitHold||0)-dt);z.flinch=Math.max(0,(z.flinch||0)-dt);z.knockTime=Math.max(0,(z.knockTime||0)-dt)}for(const d of enemyDeaths){d.t+=dt;if(!d.done&&d.t>=d.split){d.done=true;
 // Final bitmap already depicts lying down / cute brain debris; do not duplicate
 // the old procedural blast or turn a normal backward fall into a side explosion.
 if(!d.spriteMode)scatterEnemy(d)
}}enemyDeaths=enemyDeaths.filter(d=>!d.done);for(const p of enemyPieces){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=420*dt;p.angle+=p.spin*dt}enemyPieces=enemyPieces.filter(p=>p.t<p.life)}
// Original ZOMBIE ZERO mascot critical death: hinged black head lid reveals
// a bright pink brain. Fixed front/elevated-top gameplay camera; NO floor shadow.
// This only changes the cosmetic death queue (never HP, scoring or colliders).
function drawCriticalGreenDeath(d){
 const z=d.z,t=clamp(d.t/d.split,0,1),open=clamp((t-.06)/.29,0,1);
 const rise=clamp((t-.27)/.3,0,1),fall=clamp((t-.42)/.46,0,1);
 g.save();g.translate(z.x+z.w/2,z.y+23);
 g.translate(0,fall*11);g.scale(1+fall*.12,1-fall*.52);
 g.translate(-17,-23);
 // Feet and clothes, held under the face: recognizable as the green mascot.
 rect(5,30,23,10,'#d84851');rect(7,37,7,6,'#25272b');rect(23,37,7,6,'#25272b');
 rect(-4,27,9,7,'#66ce5c');rect(31,27,9,7,'#66ce5c');
 rect(0,0,34,30,'#58c65b');rect(0,1,34,5,'#7fed77');
 // Top cavity must be visible in the game's slight top-down camera.
 if(open>0){rect(3,1,28,Math.max(1,Math.round(9*open)),'#23873f');rect(6,2,22,Math.max(1,Math.round(6*open)),'#17452b')}
 // Two oversized original eyes; two pink pupils + strong separate eyebrows.
 g.fillStyle='#fffaf5';g.beginPath();g.ellipse(9,18,7,9,0,0,Math.PI*2);g.ellipse(25,18,7,9,0,0,Math.PI*2);g.fill();
 rect(9,17,3,5,'#ee5a78');rect(24,17,3,5,'#ee5a78');
 rect(3,9,12,3,'#312b29');rect(20,9,11,3,'#312b29');
 rect(14,24,7,5,'#e95476');rect(3,27,4,6,'#fff1e7');rect(28,27,4,6,'#fff1e7');
 // Pink brain rises from under the hinged lid. No background shadow plate.
 if(rise>0){
  g.save();g.translate(17,2-6*rise);
  g.fillStyle='#fa5b91';g.beginPath();
  g.arc(-3.3,2,3,0,Math.PI*2);g.arc(0,0,3.8,0,Math.PI*2);g.arc(3.3,2,3,0,Math.PI*2);g.fill();
  g.strokeStyle='#c93168';g.lineWidth=1.3;g.beginPath();g.moveTo(-3,3);g.lineTo(-1,1);g.lineTo(1,3);g.lineTo(3,1);g.stroke();
  g.restore();
 }
 // Rigid rectangular black skull cap rotates away from the cavity.
 g.save();g.translate(17,-1);g.rotate(-open*.62);
 rect(-17,-6-7*open,34,9,'#302c29');rect(-15,-6-7*open,30,2,'#403b36');
 g.restore();
 if(t>.49){const glow=Math.max(0,1-Math.abs(t-.68)/.3);
  g.globalAlpha=glow*.85;g.strokeStyle='#ff4d9c';g.lineWidth=2;
  for(let i=0;i<4;i++){const a=i*Math.PI/2;g.beginPath();g.moveTo(17+Math.cos(a)*15,2+Math.sin(a)*11);g.lineTo(17+Math.cos(a)*20,2+Math.sin(a)*14);g.stroke()}
 }
 g.restore();
}
function drawEnemyDeaths(){for(const d of enemyDeaths){
 if(d.spriteMode&&window.ZZObjectSprite?.available(d.z)===true){
   window.ZZObjectSprite.drawDeath(g,d.z,d.critical,d.t,d.split);
 }else if(d.spriteMode&&window.ZZGreenDeath?.ready===true){
   window.ZZGreenDeath.draw(g,d.z,d.critical,d.t);
 }else if(d.critical)drawCriticalGreenDeath(d);
 else zombie(d.z,d)
}for(const p of enemyPieces){g.save();g.globalAlpha=Math.min(1,(p.life-p.t)/.3);g.translate(p.x,p.y);g.rotate(p.angle);g.scale(p.sc,p.sc);const f=p.z.boss?[3,4,7,1][p.z.bossForm||0]:p.z.form||0,col=TYPES[p.z.kind],pose={jaw:2,lidL:3,lidR:0,eye:0};// When original sprites are active, scatter actual sampled character pieces
// instead of switching to the older generic procedural humanoid fragments.
const cast=window.ZZObjectCast,atlas=cast&&cast.gameplayCompatible===true?cast.gameplayAtlas:null;
const artIndex=cast?(p.z.boss?cast.bossIndex[p.z.bossForm??0]:cast.enemyIndex[p.z.form??0]):undefined;
if(p.criticalGreen){
 if(p.part===0){rect(-13,-5,26,8,'#302c29');rect(-11,-5,22,2,'#47413b')}
 else if(p.part===1){g.fillStyle='#f65d92';g.beginPath();g.arc(-2,1,3.4,0,Math.PI*2);g.arc(2,-1,3.9,0,Math.PI*2);g.fill();g.strokeStyle='#c22c68';g.lineWidth=1;g.beginPath();g.moveTo(-2,0);g.lineTo(2,2);g.stroke()}
 else if(p.part<6){rect(-5,-5,10,10,p.part===5?'#d84851':'#61cf61');rect(-5,-5,10,3,'#91ef7a')}
}else if(p.part<6&&atlas&&atlas.complete&&atlas.naturalWidth===256&&Number.isInteger(artIndex)){
 const cuts=[[5,5,54,33],[16,35,32,20],[0,30,25,25],[39,30,25,25],[12,49,24,15],[37,49,24,15]];
 const cut=cuts[p.part],ax=artIndex%4*64+cut[0],ay=Math.floor(artIndex/4)*64+cut[1];
 g.drawImage(atlas,ax,ay,cut[2],cut[3],-cut[2]/2,-cut[3]/2,cut[2],cut[3]);
}else if(p.part===0){g.translate(-16.5,-14);enemyHead(p.z,f,col,col.color,pose)}else if(p.part===1){g.translate(-16.5,-35);enemyTorso(f,col)}else if(p.part===2||p.part===3){g.translate(p.part===2?1:-34,-28);enemyArm(f,col,col.color,p.part===2?0:1,0,0)}else if(p.part<6){rect(-5,-3,10,6,'#273748')}else{rect(-3,-2,6,4,p.color);rect(-3,-2,6,1,col.top)}g.restore()}}
function enemyTorso(f,p){rect(5,30,23,10,ENEMY_CLOTH[f]);if(f===0){rect(6,32,4,7,'#a89478');rect(21,34,6,2,'#9b6d70')}if(f===2){rect(2,30,31,9,'#252638');for(let i=0;i<3;i++)rect(5+i*10,32,3,3,'#bfc8c7')}if(f===3)rect(18,32,10,5,'#b98495');if(f===5){rect(5,30,24,10,'#d9d4b5');rect(17,31,3,8,'#637998')}if(f===6)rect(15,32,5,6,'#202e36');if(f===7){rect(-5,29,43,11,'#944e77');rect(0,31,33,6,'#312b47');for(let i=0;i<5;i++)rect(2+i*6,31,4,4,'#f4d9a5')}}
function enemyArm(f,p,skin,side,angle,lift){const x=side?34:-1;g.save();g.translate(x,24+lift);g.rotate(angle*(side?-1:1));g.translate(-x,-24);rect(side?30:-5,side?23:24,8,9,skin);rect(side?31:-4,31,6,3,p.side);if(f===2&&!side)rect(-5,27,8,5,'#323145');if(f===4)for(let i=0;i<3;i++)rect((side?31:-5)+i*3,side?29:30,2,6,'#e2cdab');if(f===7){rect(side?32:-8,side?26:27,side?11:10,side?13:12,'#708995');rect(side?34:-6,side?29:30,6,side?7:6,'#252c49')}g.restore()}
function enemyHead(z,f,p,skin,a){
rect(0,0,33,29,skin);rect(3,-3,27,4,p.top);rect(0,26,33,3,p.side);
rect(2,6,13,12,'#693c54');rect(19,5,12,13,'#693c54');rect(4,8,9,8,'#f7e6cb');rect(21,7,8,10,'#f7e6cb');rect(8+a.eye,10,3,5,'#5c7899');rect(23+a.eye,10,3,4,'#b44251');rect(4,8,9,a.lidL,skin);rect(21,7,8,a.lidR,skin);rect(13,17,6,3,p.side);
rect(6,21,23,10+a.jaw,'#533043');rect(9,22,4,4,'#fff0c2');rect(20,22,4,3,'#fff0c2');rect(13,28+a.jaw,9,5,'#d76c85');rect(6,31+a.jaw,23,2,p.side);rect(1,16,4,3,p.side);rect(27,19,5,3,p.side);
if(f===0){rect(0,-2,33,6,'#3d353b');rect(3,1,5,7,'#3d353b')}
if(f===1){rect(4,19,27,18+a.jaw,'#543047');rect(6,21,23,12+a.jaw,'#391c35');for(let i=0;i<4;i++)rect(7+i*6,21,4,4,'#efdfb6');rect(11,29+a.jaw,15,6,'#d86087');rect(8,36+a.jaw,23,3,p.side);rect(8,32+a.jaw,3,3,'#f7e4c2')}
if(f===2){rect(12,-8,9,12,'#e8848a');rect(15,-12,6,6,'#f4ad67')}
if(f===3){rect(1,-4,30,7,'#776255');rect(20,0,12,10,'#d58d9f');rect(-7,8,7,4,'#c3bc91');rect(33,8,7,4,'#c3bc91');for(let i=0;i<4;i++){rect(18+i*3,3+i*2,5,1,'#603c56');rect(19+i*3,2+i*2,1,4,'#e0c6a6')}}
if(f===4){poly([[0,7],[-4,-10],[11,0]],skin);poly([[23,0],[37,-10],[33,8]],skin);poly([[2,4],[0,-5],[8,2]],'#ac5c78');poly([[26,2],[34,-5],[31,5]],'#ac5c78');rect(9,15,16,9,p.side);rect(13,15,8,4,'#522d43');rect(4,22,26,12+a.jaw,'#50263e');poly([[7,22],[10,29],[13,22]],'#fff2cd');poly([[23,22],[26,29],[29,22]],'#fff2cd');rect(14,29+a.jaw,10,8,'#e07688')}
if(f===5){rect(3,-5,28,8,'#e49fa7');for(let i=0;i<4;i++)rect(5+i*6,-3,2,5,'#ac617e');rect(6,10,22,3,'#342b4a');rect(6,8,9,7,'#bdd0bb');rect(20,8,9,7,'#bdd0bb');rect(6,8,9,a.lidL,p.side);rect(20,8,9,a.lidR,p.side)}
if(f===6){rect(-2,-4,37,7,'#e8ba5b');rect(-2,0,4,29,'#cf9740');rect(32,0,4,29,'#cf9740');rect(10,20,17,11,'#3b4a55');rect(8,22,5,6,'#b5c9b9');rect(25,22,5,6,'#b5c9b9');rect(13,23+Math.min(1,a.jaw/4),11,2,'#869b8c')}
if(f===7){rect(2,-5,29,8,'#ecaa78');for(let i=0;i<4;i++)rect(5+i*6,-3,2,5,'#a35b70')}
}
// The combo uses the 66–164 logical-pixel band. Move ONLY the boss
// health UI below it (never the boss sprite, hitbox, or falling speed).
function bossHpOffset(z){
 const minBarY=killCombo>=2&&comboDisplayTime>0?122:90;
 return Math.max(0,minBarY-(z.y-32));
}
function zombie(z,death=null){
const originalObject=window.ZZObjectSprite;
if(!death&&originalObject?.draw(g,z,clock)){
 // The original colours are character identity, not HP tint.
 if(z.boss){
  // Keep original enemy spawn/hitbox but clamp only the HP overlay below HUD.
  g.save();g.translate(0,bossHpOffset(z));
  rect(z.x-14,z.y-32,100,8,'#211e27');
  rect(z.x-14,z.y-32,100*Math.max(0,z.hp/z.max),8,'#f67968');
  g.fillStyle='#ffdec5';g.font='bold 11px Arial, sans-serif';g.textAlign='center';
  g.fillText(BOSS_FORMS[z.bossForm??0]+' '+Math.ceil(Math.max(0,z.hp))+'/'+z.max,z.x+36,z.y-38);
  g.restore();
 }
 if(z.burn>0){g.save();g.globalAlpha=.8;g.fillStyle='#ffb066';
  for(let i=0;i<3;i++)g.fillRect(z.x+6+i*11,z.y-9+Math.sin(clock*13+i)*4,3,9);
  g.restore()}
 return;
}
// Distinct mascot atlas: preserve the original cube geometry and 8-frame
// diagonal footsteps, without changing the enemy collision rectangle.
const mascot=window.ZZGreenWalk;
if(!death&&!z.boss&&(z.form??0)===0&&mascot?.draw(g,z,clock)){
 if(z.burn>0){g.save();g.globalAlpha=.8;g.fillStyle='#ffb066';
  for(let i=0;i<3;i++)g.fillRect(z.x+6+i*11,z.y-9+Math.sin(clock*13+i)*4,3,9);
  g.restore()}
 return;
}
const f=z.boss?[3,4,7,1][z.bossForm??0]:(z.form??0),sc=z.boss?2:1,p=TYPES[z.kind],skin=z.flash>0?'#fff':p.color,a=enemyPose(z);g.save();g.translate(z.x,z.y);g.scale(sc,sc);/* no baked character ground shadow; gameplay floor handles depth */
// Local pivots keep the sprite centered on its unchanged collision rectangle.
g.translate(16.5,25);g.rotate(a.lean);g.translate(a.dx*a.hit*1.5,a.dy*a.hit*1.5+a.bob);let sx=1+a.hit*(Math.abs(a.dy)-Math.abs(a.dx))*.1,sy=1-a.hit*(Math.abs(a.dy)-Math.abs(a.dx))*.1;
if(death){const t=death.t/death.split;const squash=t<.45?Math.sin(t/.45*Math.PI/2):1-(t-.45)/.55;sx*=1+squash*(z.boss?.2:.14);sy*=1-squash*.18;if(z.boss&&t>.55){sx*=1+(t-.55)*.28;sy*=1+(t-.55)*.28}/* no sideways flop: front/back projected collapse */}g.scale(sx,sy);g.translate(-16.5,-25);
// Original art pilot: render the canonical green cube zombie from its transparent
// PNG bitmap. Keep existing pose transforms / collision coordinates unchanged.
// Other types and missing/failed bitmap loads fall back to procedural art.
// Canonical cast atlas: all 10 object zombies use their original identity
// irrespective of numeric HP tier. The old procedural version remains a fallback.
const cast=window.ZZObjectCast;
// The supplied isometric collection atlas is a reference, NOT gameplay art.
const atlas=cast&&cast.gameplayCompatible===true?cast.gameplayAtlas:null;
const artIndex=cast?(z.boss?cast.bossIndex[z.bossForm??0]:cast.enemyIndex[z.form??0]):undefined;
if(atlas&&atlas.complete&&atlas.naturalWidth===256&&Number.isInteger(artIndex)){
 g.save();
 if(z.flash>0)g.filter='brightness(1.7)';
 g.drawImage(atlas,(artIndex%4)*64,Math.floor(artIndex/4)*64,64,64,-4,-8,41,52);
 g.restore();
 if(z.burn>0){g.globalAlpha=.8;for(let i=0;i<3;i++){let x=4+i*12,h=12+Math.sin(clock*14+i)*5;poly([[x-5,39],[x,39-h],[x+4,31],[x+8,40]],'#ff793c');rect(x,34,4,5,'#ffe68b')}g.globalAlpha=1}
 g.restore();
 if(z.boss&&!death){g.save();g.translate(0,bossHpOffset(z));rect(z.x-14,z.y-32,100,8,'#211e27');rect(z.x-14,z.y-32,100*Math.max(0,z.hp/z.max),8,'#f67968');g.fillStyle='#ffdec5';g.font='bold 11px Arial, sans-serif';g.textAlign='center';g.fillText((BOSS_FORMS[z.bossForm??0])+' '+Math.ceil(Math.max(0,z.hp))+'/'+z.max,z.x+36,z.y-38);g.restore()}
 return;
}
// Actual top/front-oriented sprite pilot: same approved artwork as normal and
// critical death, so the green enemy does not change drawing style on death.
// No ground shadow, no isometric artwork; physics/HP colliders remain unchanged.
const greenSprite=window.ZZGreenDeath;
if(!death&&!z.boss&&(z.form??0)===0&&greenSprite?.ready===true){
 g.save();
 if(z.flash>0)g.filter='brightness(1.55)';
 greenSprite.draw(g,{x:0,y:0,w:33,h:44},false,0);
 g.restore();
 if(z.burn>0){g.globalAlpha=.8;for(let i=0;i<3;i++){let x=4+i*12,h=12+Math.sin(clock*14+i)*5;poly([[x-5,39],[x,39-h],[x+4,31],[x+8,40]],'#ff793c');rect(x,34,4,5,'#ffe68b')}g.globalAlpha=1}
 g.restore();return;
}
// Legacy isometric green-zombie bitmap intentionally disabled in current gameplay.
// A front-oriented, slightly elevated sprite atlas is required before enabling art.
rect(3,38+a.legL,10,6,'#273748');rect(22,38+a.legR,10,6,'#273748');enemyTorso(f,p);
enemyArm(f,p,skin,0,a.left+(death?Math.sin(death.t*60)*.3:0),a.shoulder);enemyArm(f,p,skin,1,a.right-(death?Math.sin(death.t*49)*.3:0),-a.shoulder*.7);
g.save();g.translate(16.5,23);g.rotate(a.head);g.translate(-16.5,-23-a.hit*1.3);enemyHead(z,f,p,skin,a);g.restore();
if(z.boss){rect(2,34,4,4,'#ffd27b');rect(26,34,4,4,'#ffd27b')}
if(z.burn>0){g.globalAlpha=.8;for(let i=0;i<3;i++){let x=4+i*12,h=12+Math.sin(clock*14+i)*5;poly([[x-5,39],[x,39-h],[x+4,31],[x+8,40]],'#ff793c');rect(x,34,4,5,'#ffe68b')}g.globalAlpha=1}g.restore();if(z.boss&&!death){g.save();g.translate(0,bossHpOffset(z));rect(z.x-14,z.y-32,100,8,'#211e27');rect(z.x-14,z.y-32,100*Math.max(0,z.hp/z.max),8,'#f67968');g.fillStyle='#ffdec5';g.font='bold 11px Arial, sans-serif';g.textAlign='center';g.fillText((BOSS_FORMS[z.bossForm??0])+' '+Math.ceil(Math.max(0,z.hp))+'/'+z.max,z.x+36,z.y-38);g.restore()}}
const ITEM_ICON_KEYS=['bazooka','dual','triple','power','fire','slow','pierce','shield'];
function drawItemArtwork(k,x,y,size=24){
 const atlas=window.ZZItemIcons,ix=ITEM_ICON_KEYS.indexOf(k);
 if(ix>=0&&atlas?.ready&&atlas.image){
  g.drawImage(atlas.image,ix*128,0,128,128,x-size/2,y-size/2,size,size);
 }else{g.save();g.translate(x,y);g.scale(size/24,size/24);drawIcon(k,0,0);g.restore()} // same-sized fallback
}
// Small power-up symbols, not a toolbar: no timer text, solid panels or
// changing screen anchors. The faint ring alone indicates duration remaining.
function drawActiveItemIcons(){
 const keys=ITEM_ICON_KEYS.filter(has);
 if(!keys.length||!['playing','clearing','paused'].includes(mode))return;
 const size=17,step=20;
 const total=(keys.length-1)*step+size;
 const center=clamp(car,total/2+8,W-total/2-8);
 const first=center-(keys.length-1)*step/2;
 const y=649+VIEW_DELTA;
 for(let i=0;i<keys.length;i++){
  const key=keys[i],x=first+i*step;
  const skill=SKILLS[key],ratio=clamp(active[key]/(skill.duration*hero().duration),0,1);
  g.save();g.globalAlpha=.95;
  g.shadowColor=skill.color;g.shadowBlur=3;
  drawItemArtwork(key,x,y,size);g.shadowBlur=0;
  // A fine radial remaining-time indicator; intentionally no numbers.
  g.lineWidth=1.4;g.strokeStyle='#1b283a99';
  g.beginPath();g.arc(x,y,10.5,-Math.PI/2,Math.PI*1.5);g.stroke();
  g.strokeStyle=skill.color;
  g.beginPath();g.arc(x,y,10.5,-Math.PI/2,-Math.PI/2+Math.PI*2*ratio);g.stroke();
  g.restore();
 }
}
function drawIcon(k,x,y){g.save();g.translate(x-12,y-12);g.scale(.75,.75);g.strokeStyle=SKILLS[k].color;g.lineWidth=2.5;g.lineCap='round';g.lineJoin='round';const circle=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke()};if(k==='dual'){circle(9,12,5);circle(23,20,5)}if(k==='triple'){circle(16,7,4);circle(7,23,4);circle(25,23,4)}if(k==='power'){circle(16,16,12);g.stroke(new Path2D('M17 6 10 18H16L15 26 23 13H17Z'))}if(k==='fire')g.stroke(new Path2D('M17 3C21 12 13 12 19 17L24 11C33 23 25 30 16 29S3 21 8 13L11 18C15 14 11 10 17 3Z'));if(k==='slow'){circle(16,17,11);g.stroke(new Path2D('M16 10V18L22 21M12 2H20M16 2V4'))}if(k==='bazooka')g.stroke(new Path2D('M5 21 20 6 27 13 12 28ZM18 8 24 14M6 22 4 28 10 26M19 3 21 1M28 10 31 9M26 3 29 0'));if(k==='pierce'){circle(6,16,4);g.beginPath();g.moveTo(12,16);g.lineTo(29,16);g.moveTo(22,9);g.lineTo(29,16);g.lineTo(22,23);g.stroke()}if(k==='shield')g.stroke(new Path2D('M16 3 27 7V17C27 23 16 29 16 29S5 23 5 17V7ZM10 16 14 20 22 11'));g.restore()}
// Fire stays attached to each burning enemy and sits on top of its sprite.
function drawBurningOverlays(){
 if(!fxEnabled)return;
 luminous(()=>{for(const actor of foes){
  const z=knockVisualPosition(actor);
  if(!(z.burn>0))continue;
  const cx=z.x+z.w/2,base=z.y+z.h-3,t=clock*11+(z.seed||0),
        flicker=.86+.14*Math.sin(t),height=z.boss?48:28;
  g.save();g.globalAlpha=.86*Math.min(1,z.burn/.3);
  g.shadowColor='#ff7d25';g.shadowBlur=13;
  g.strokeStyle='#ffac3e';g.lineWidth=z.boss?4:2.5;
  g.strokeRect(z.x-3,z.y+5,z.w+6,z.h-9);
  for(let i=-1;i<=1;i++){
   const x=cx+i*(z.boss?16:10)+Math.sin(t+i*3)*2;
   const h=(height-5*Math.abs(i))*flicker;
   g.fillStyle=i===0?'#ffb94e':'#ff7927';
   g.beginPath();g.moveTo(x-8,base);g.quadraticCurveTo(x-11,base-h*.42,x-3,base-h*.7);
   g.quadraticCurveTo(x+Math.sin(t+i)*5,base-h*1.12,x+3,base-h);
   g.quadraticCurveTo(x+12,base-h*.54,x+8,base);g.closePath();g.fill();
   g.fillStyle='#fff1a4';g.beginPath();g.moveTo(x-3,base);
   g.quadraticCurveTo(x-6,base-h*.34,x,base-h*.66);
   g.quadraticCurveTo(x+5,base-h*.3,x+4,base);g.closePath();g.fill();
  }
  g.restore();
 }});
}
function drawBallVanish(){
 // A short cyan/gold dissolve for extra-ball timeout / stage clear, and
 // a pink splash at the boundary for a truly lost ball.
 for(const f of ballVanish){
  const t=clamp(f.t/f.life,0,1),fade=Math.pow(1-t,1.25);
  const col=f.reason==='lost'?'#ff9bad':f.reason==='clear'?'#fff2a0':'#b8f9ed';
  g.save();g.globalAlpha=fade;g.strokeStyle=col;g.lineWidth=(1-t)*2.6+1;
  g.shadowColor=col;g.shadowBlur=fxEnabled?12*fade:0;
  const r=8+t*28;g.beginPath();g.arc(f.x,f.y,r,0,Math.PI*2);g.stroke();
  const spin=t*.4;for(let i=0;i<8;i++){
   const a=i*Math.PI/4+spin,d=7+t*(19+i%2*8);
   rect(f.x+Math.cos(a)*d-2,f.y+Math.sin(a)*d-2,4,4,col);
  }
  g.shadowBlur=0;
  for(let i=0;i<f.trail.length;i++){
   const p=f.trail[i],size=Math.max(1,4-i*.4);
   g.globalAlpha=fade*(1-i/f.trail.length)*.65;
   rect(p.x-size/2,p.y-size/2,size,size,col);
  }
  g.restore();
 }
}
function drawCriticalPopups(){
 // Pixel-block outlined title, readable across the muted roadway.
 for(const f of criticalPopups){
  const t=clamp(f.t/f.life,0,1),fade=Math.min(1,(1-t)*2.8);
  const x=clamp(f.x,95,W-95),y=clamp(f.y-24-t*28,131,DEFENSE_Y-40);
  const word=f.pierce?'PIERCE CRIT!':'CRITICAL!';
  g.save();g.translate(x,y);g.globalAlpha=fade;
  const sc=.78+.28*Math.sin(Math.min(1,t*4)*Math.PI/2);
  g.scale(sc,sc);g.textAlign='center';g.textBaseline='middle';
  g.font='900 18px monospace';g.lineJoin='bevel';
  g.shadowColor=f.pierce?'#ffe061':'#fff4bb';g.shadowBlur=fxEnabled?15*fade:0;
  g.strokeStyle='#17212b';g.lineWidth=5;g.strokeText(word,0,0);
  g.fillStyle=f.pierce?'#ffda49':'#fff2a3';g.fillText(word,0,0);
  g.shadowBlur=0;
  for(const side of [-1,1])for(let i=0;i<3;i++){
   const px=side*(68+9*i+16*t),py=(i-1)*9+t*(i%2?8:-8);
   rect(px,py,4+i%2,4+i%2,f.pierce?'#ffe769':'#fff5ad');
  }
  g.restore();
 }
}
function drawImpactFlashes(){
 if(!fxEnabled||!hitFlashes.length)return;
 luminous(()=>{for(const f of hitFlashes){
  const t=Math.min(1,f.t/f.life),r=(f.critical?32:23)*(1+t*.65);
  g.save();g.translate(f.x,f.y);g.globalAlpha=(1-t)*(f.critical?1:.86);
  g.shadowColor='#fff5a6';g.shadowBlur=f.critical?23:16;
  g.fillStyle='#fffcec';g.beginPath();g.arc(0,0,(f.critical?14:9)*(1-t*.7),0,Math.PI*2);g.fill();
  g.strokeStyle=f.critical?'#fff6a5':'#fff5da';g.lineWidth=f.critical?5:3;
  for(let i=0;i<4;i++){
   const a=i*Math.PI/4;
   g.beginPath();g.moveTo(Math.cos(a)*(-r),Math.sin(a)*(-r*.4));
   g.lineTo(Math.cos(a)*r,Math.sin(a)*r*.4);g.stroke();
  }
  g.restore();
 }});
}
function drawBarrelBlasts(){
 if(!barrelBlasts.length||!fxEnabled)return;
 luminous(()=>{for(const b of barrelBlasts){
  const t=clamp(b.t/b.life,0,1),ease=1-Math.pow(1-t,2),
        radius=12+ease*RED_BARREL_RADIUS,fade=1-t;
  g.save();g.translate(b.x,b.y);g.globalAlpha=Math.min(1,fade*1.1);
  g.shadowColor='#ff6d19';g.shadowBlur=26*fade;
  // Dense hot core and jagged external fire silhouette (not merely a ring).
  g.fillStyle='#fe812c';g.beginPath();
  for(let i=0;i<32;i++){
   const a=i*Math.PI/16+b.seed,rr=radius*(i%2?(.60+.06*Math.sin(i+b.seed)):1);
   i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);
  }g.closePath();g.fill();
  g.fillStyle='#ffd260';g.beginPath();g.arc(0,0,radius*.56,0,Math.PI*2);g.fill();
  g.fillStyle='#fffde6';g.beginPath();g.arc(0,0,radius*.28*fade+2,0,Math.PI*2);g.fill();
  g.strokeStyle='#ffe29b';g.lineWidth=6*(1-t)+1.2;
  g.beginPath();g.arc(0,0,radius,0,Math.PI*2);g.stroke();
  // Fast incandescent debris reaching the neighbouring zombies.
  g.strokeStyle='#ffbc48';g.lineWidth=2.5;
  for(let i=0;i<12;i++){
   const a=(i/12)*Math.PI*2+b.seed;
   g.beginPath();g.moveTo(Math.cos(a)*radius*.8,Math.sin(a)*radius*.8);
   g.lineTo(Math.cos(a)*(radius+14*fade),Math.sin(a)*(radius+14*fade));g.stroke();
  }
  g.restore();
 }});
}
function draw(){if((!fxRenderer||fxRenderer.height!==H)&&window.FXRenderer)fxRenderer=new window.FXRenderer(W,H);if(fxRenderer)fxRenderer.begin();g.clearRect(0,0,W,H);g.save();if(fxEnabled&&cameraKick>0)g.translate(Math.sin(clock*115)*cameraKick*.7,Math.cos(clock*139)*cameraKick*.4);background();drawCrowd();
 // Visible afterimage and impact line show actual displacement and chain hits.
 if(fxEnabled)for(const z of foes)if((z.knockTime||0)>0){
  const fade=z.knockTime/KNOCK_TRAIL_LIFE;
  g.save();g.globalAlpha=.4*fade;
  zombie({...z,x:z.knockFromX,y:z.knockFromY,flash:0,burn:0,knockTime:0});
  g.globalAlpha=.7*fade;g.strokeStyle=z.knockChain?'#b9ffe2':'#fff2bb';
  g.lineWidth=z.knockChain?3:4;g.lineCap='round';
  const visible=knockVisualPosition(z);
  g.beginPath();g.moveTo(z.knockFromX+z.w/2,z.knockFromY+z.h/2);
  g.lineTo(visible.x+z.w/2,visible.y+z.h/2);g.stroke();g.restore();
 }
 for(const z of foes)zombie(knockVisualPosition(z));drawBurningOverlays();drawEnemyDeaths();drawImpactFlashes();if(has('shield'))luminous(()=>{g.shadowColor='#b9f684';g.shadowBlur=15;rect(21,H-35,408,4,'#b9f684');g.shadowBlur=0});player();drawActiveItemIcons();drawBazooka();for(const item of items){g.save();g.translate(item.x,item.y);g.rotate(Math.sin(clock*3+item.phase)*.08);if(item.k==='fire'){g.shadowColor='#ff6d24';g.shadowBlur=12}drawItemArtwork(item.k,0,0,34);g.shadowBlur=0;g.restore();if(fxEnabled){g.globalAlpha=.45;rect(item.x-1,item.y-33,3,7,SKILLS[item.k].color);rect(item.x-4,item.y-30,9,2,SKILLS[item.k].color);g.globalAlpha=1}}
drawKillCombo();drawBarrelBlasts();for(const b of balls){const r=has('power')?16:8,col=has('pierce')?'#ffe77b':has('fire')?'#ff985f':'#d5f45a';b.trail.forEach((p,i)=>{g.globalAlpha=(1-i/b.trail.length)*.35;g.fillStyle=col;g.beginPath();g.arc(p.x,p.y,Math.max(1,r-i*.5),0,Math.PI*2);g.fill()});g.globalAlpha=1;g.shadowColor=col;g.shadowBlur=has('pierce')?25:has('fire')?25:15;g.fillStyle=col;g.beginPath();g.arc(b.x,b.y,r,0,Math.PI*2);g.fill();g.shadowBlur=0;g.strokeStyle='#ffffcf';g.lineWidth=1.5;g.beginPath();g.arc(b.x-r*.7,b.y,r*.85,-1.1,1.1);g.stroke();g.beginPath();g.arc(b.x+r*.7,b.y,r*.85,2,4.3);g.stroke();if(has('pierce')&&!b.held){g.strokeStyle='#fff8ae';g.lineWidth=2;g.strokeRect(b.x-r*.45,b.y-r*.45,r*.9,r*.9)}if(b.held&&mode==='playing'){g.setLineDash([4,6]);g.strokeStyle='#d8fa6370';g.beginPath();g.moveTo(b.x,b.y-22);g.lineTo(b.x+32,b.y-106);g.stroke();g.setLineDash([])}}drawBallVanish();if(particles.length)luminous(()=>{for(const p of particles){g.globalAlpha=Math.min(1,p.t*2);rect(p.x,p.y,p.size,p.size,p.color)}g.globalAlpha=1});drawJunk();if(fx.length)luminous(()=>drawEffects());if(fxEnabled&&fxRenderer)fxRenderer.composite(g);drawEffects(true);drawCriticalPopups();drawBubbles();g.restore();drawDanger();drawOutcome();if(mode==='clearing'||mode==='paused'&&resumeMode==='clearing')drawClear();}
function frame(t){let dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();music();requestAnimationFrame(frame)}
function heroSprite(x,y,scale=1,win=false){let h=hero();
 const cast=window.ZZObjectCast,atlas=cast&&cast.gameplayCompatible===true?cast.gameplayAtlas:null,ix=cast&&cast.heroIndex[selectedHero];
 if(atlas&&atlas.complete&&atlas.naturalWidth===256&&Number.isInteger(ix)){
  g.save();g.translate(x,y);g.scale(scale,scale);
  if(win)g.translate(0,-Math.abs(Math.sin(clearTime*7))*4);
  g.drawImage(atlas,(ix%4)*64,Math.floor(ix/4)*64,64,64,-28,-44,56,65);
  g.restore();return;
 }
 g.save();g.translate(x,y);g.scale(scale,scale);rect(-14,-3,29,22,h.color);rect(-10,4,4,10,'#fcf2cb');rect(5,4,4,10,'#fcf2cb');rect(-19,-27,37,29,h.skin);rect(-20,-31,38,9,h.hair);if(h.id==='ace'){rect(-22,-34,39,10,'#2b7181');rect(-23,-26,47,5,'#214757')}if(h.id==='ruby'){rect(-29,-24,10,13,h.hair);rect(18,-24,10,13,h.hair);rect(-25,-25,6,3,'#d3ef95');rect(20,-25,6,3,'#d3ef95');rect(-20,-29,6,13,h.hair)}if(h.id==='liam'){poly([[-17,-28],[-18,-38],[-9,-32],[-5,-41],[3,-33],[13,-38],[17,-28]],h.hair);rect(-20,-25,39,4,'#fcf0b5')}
if(win){rect(-12,-15,9,2,'#533a39');rect(-10,-17,5,2,'#533a39');rect(4,-15,9,2,'#533a39');rect(6,-17,5,2,'#533a39');rect(-8,-7,18,6,'#7d4546');rect(-6,-7,14,3,'#fff5d3');let waveY=-24+Math.sin(clearTime*14)*5;rect(-27,-2,9,7,h.skin);rect(-29,waveY,7,25-waveY,h.color);rect(-30,waveY-5,9,9,h.skin);rect(18,-6,11,7,h.skin);rect(24,-23,6,22,h.skin)}else{rect(-12,-18,9,10,'#fff4dc');rect(4,-18,9,10,'#fff4dc');rect(-7,-15,3,6,'#34404b');rect(5,-15,3,6,'#34404b');rect(-3,-3,8,2,'#945b4d')}g.restore()}
function portrait(h){
 const i=HEROES.indexOf(h);
 // 192px transparent car/hero art, sampled sharply for the narrow selection UI.
 // The stable names here are Ace/Ruby/Liam; artwork IP captions are not aliases.
 return '<span class="hero-portrait hero-vehicle-portrait row-'+i+'" role="img" aria-label="'+h.name+' · 차량과 전용 무기"></span>';
}
function renderHeroes(){for(let i=0;i<HEROES.length;i++){let h=HEROES[i],el=$('hero-'+i);el.innerHTML=portrait(h)+'<b>'+h.name+'</b><small>'+h.role+'</small><span>'+h.desc+'</span>';el.setAttribute('aria-pressed',String(i===selectedHero));el.onclick=()=>{if(mode!=='menu'&&mode!=='over')return;selectedHero=i;renderHeroes();draw()}}$('hero-stats').textContent=hero().stats;$('start').innerHTML=hero().name+'로 시작 <span>↗</span>'}

// Kill streak is independent of the rally hit counter and uses active play time.
let killCombo=0,killTimer=0,comboPop=0,comboDisplayTime=0;
function recordKill(){
 killCombo=killTimer>0?killCombo+1:1;killTimer=6;comboPop=.22;comboDisplayTime=1.45;
 if(killCombo%5!==0)return;
 const p=citizens.filter(p=>!p.alive&&p.absent>=8).sort((a,b)=>b.absent-a.absent)[0];
 if(!p)return;
 p.alive=true;p.dying=0;p.absent=0;p.returning=1.1;cheerTime=1.8;
 citizenCue(p,true);effect(p.x,p.y-12,'#91f4d0',65);burst(p.x,p.y-10,'#91f4d0',24);sfx('return');toast('시민 +1 복귀! · '+killCombo+' COMBO');
}
// The original 5-kill citizen returns remain unchanged; the banner uses
// six distinct tiers, with visible art/colors independent of combat balance.
const COMBO_STEPS=[
 {min:2,word:'NICE!'}, {min:5,word:'COOL!'},
 {min:10,word:'GREAT!'}, {min:15,word:'AWESOME!'},
 {min:20,word:'UNSTOPPABLE!'}, {min:30,word:'LEGENDARY!'}
];
let comboRenderedCount=-1,comboRenderedTier=-1;
function comboTier(count){
 let tier=0;
 for(let i=1;i<COMBO_STEPS.length;i++)if(count>=COMBO_STEPS[i].min)tier=i;
 return tier;
}
function drawKillCombo(){
 const el=$('combo-overlay');
 if(!el)return;
 if(killCombo<2||killTimer<=0||comboDisplayTime<=0||!['playing','clearing','paused'].includes(mode)){
  el.hidden=true;comboRenderedCount=-1;comboRenderedTier=-1;return;
 }
 const tier=comboTier(killCombo),count=String(killCombo);
 if(count!==String(comboRenderedCount)||tier!==comboRenderedTier){
  $('combo-number').textContent=count;
  $('combo-praise').textContent=COMBO_STEPS[tier].word;
  if(!el.dataset)el.dataset={};
  el.dataset.tier=String(tier);
  el.setAttribute?.('aria-label',count+' 연속 처치 · '+COMBO_STEPS[tier].word);
  // A short pixel burst on each kill; never restart it on every 60fps frame.
  if(el.classList?.remove&&el.classList?.add){
   el.classList.remove('zz-combo-hit');
   void el.offsetWidth;
   el.classList.add('zz-combo-hit');
  }
  comboRenderedCount=killCombo;comboRenderedTier=tier;
 }
 el.hidden=false;
 // Visible briefly on each hit, then clears the top of the enemy formation.
 const fade=Math.min(1,comboDisplayTime/.48);
 el.style.opacity=String(Math.max(0,Math.min(1,fade)));
 el.style.setProperty?.('--combo-quiet',String(Math.max(0,Math.min(1,(1.45-comboDisplayTime)/1.45))));
 el.style.setProperty?.('--combo-progress',String(Math.max(0,Math.min(1,killTimer/6))));
}
const citizens=Array.from({length:18},(_,i)=>({x:26+i*23.4,y:682+VIEW_DELTA+(i%2)*5,skin:['#ffd6a4','#c48b68','#f3bb92','#92624f'][i%4],shirt:['#e69a72','#78b5cc','#b692d6','#e7cd72','#a5d398','#e58da7'][i%6],hair:['#49332f','#d89343','#d8d8cc','#333d50','#875645'][i%5],style:i%6,phase:i*.9,alive:true,dying:0}));
function resetCitizens(){for(const p of citizens){p.alive=true;p.dying=0;p.absent=0;p.returning=0;p.shooting=0}bubbles=[];bubbleTimer=.25}
function haptic(pattern){if(!fxEnabled||!touchUsed||typeof navigator==='undefined'||typeof navigator.vibrate!=='function')return;const now=Date.now();if(now-lastBuzz<100)return;lastBuzz=now;try{navigator.vibrate(pattern)}catch{}}
function circleRect(x,y,r,box){const dx=x-clamp(x,box.x,box.x+box.w),dy=y-clamp(y,box.y,box.y+box.h);return dx*dx+dy*dy<=r*r}
function upwardBounce(b,center,half,top,r){const speed=clamp(Math.hypot(b.vx,b.vy),350,600),angle=clamp((b.x-center)/half,-1,1)*.95;b.vx=Math.sin(angle)*speed;b.vy=-Math.max(210,Math.cos(angle)*speed);b.y=top-r-1;b.lastHit=null;b.hitLock=0;combo=0;b.trail=[]}
function carCollision(b,r,cx=car){const boxes=[{x:cx-52,y:621+VIEW_DELTA,w:104,h:33},{x:cx-57,y:626+VIEW_DELTA,w:13,h:24},{x:cx+44,y:626+VIEW_DELTA,w:13,h:24}];if(!boxes.some(box=>circleRect(b.x,b.y,r,box)))return false;upwardBounce(b,cx,57,621+VIEW_DELTA,r);swing=.18;heroAttackTime=HERO_ATTACK_DURATION;effect(b.x,623+VIEW_DELTA,'#fff49a',38,'NICE SAVE');burst(b.x,625+VIEW_DELTA,'#f8d87d',7);sfx('car');haptic(10);return true}
function citizenCollision(b,r){if(b.vy<=0)return false;for(const p of citizens){if(!p.alive)continue;const box={x:p.x-10,y:p.y-13,w:20,h:34};if(!circleRect(b.x,b.y,r,box))continue;p.alive=false;p.dying=.8;p.returning=0;p.absent=0;bubbles=bubbles.filter(q=>q.citizen!==p);upwardBounce(b,p.x,16,box.y,r);citizenCue(p,false);effect(p.x,box.y,'#ffb16f',65);burst(p.x,p.y-10,'#ffda86',22);sfx('citizen');haptic(14);return true}return false}
function citizenCue(p,back,text=null){
 const w=112,x=clamp(p.x-w/2,22,W-22-w);
 bubbles=bubbles.filter(q=>q.citizen!==p&&(q.x+(q.w||80)+8<=x||q.x>=x+w+8)).slice(-1);
 const lines=back?['다시 왔어!','나만 믿어!','한 번 더!']:['내가 막을게!','뒤를 부탁해!','으악! 막았다!'];
 bubbles.push({citizen:p,x,y:p.y-100,w,event:text?'bazooka':back?'return':'save',t:0,life:2.1,text:text||lines[Math.floor(Math.random()*lines.length)]});bubbleTimer=1;
}
const CHEERS=['파이팅!','막아줘!','멋져!','최고야!','조심해!','가자!'];
function updateBubbles(dt){bubbles=bubbles.filter(q=>(q.t+=dt)<q.life&&(q.event||q.citizen.alive));bubbleTimer-=dt;if(bubbleTimer>0||bubbles.length>=2)return;bubbleTimer=.7+Math.random()*.4;const options=citizens.filter(p=>p.alive&&Math.abs(p.x-car)>85).map(p=>({p,x:clamp(p.x-40,22,348)})).filter(o=>bubbles.every(q=>o.x+88<=q.x||o.x>=q.x+(q.w||80)+8));if(!options.length)return;const o=options[Math.floor(Math.random()*options.length)];bubbles.push({citizen:o.p,x:o.x,y:o.p.y-75,t:0,life:1.6,text:mode==='clearing'?'고마워!':CHEERS[Math.floor(Math.random()*CHEERS.length)]});cheerTime=Math.max(cheerTime,1)}
function drawBubbles(){for(const q of bubbles){const a=Math.min(1,q.t/.12,(q.life-q.t)/.3),x=q.x,y=q.y-(q.event?Math.sin(Math.min(1,q.t/.3)*Math.PI)*5:0),w=q.w||80,h=q.event?46:29,tail=clamp(q.citizen.x,x+10,x+w-10);g.save();g.globalAlpha=Math.max(0,a);g.fillStyle=q.event==='return'?'#c5ffe5':q.event?'#ffe2ae':'#fff6d8';g.strokeStyle=q.event==='return'?'#287760':q.event?'#974c35':'#28374b';g.lineWidth=q.event?3:2;g.beginPath();g.moveTo(x,y);g.lineTo(x+w,y);g.lineTo(x+w,y+h);g.lineTo(tail+6,y+h);g.lineTo(q.citizen.x,q.citizen.y-19);g.lineTo(tail-4,y+h);g.lineTo(x,y+h);g.closePath();g.fill();g.stroke();g.fillStyle='#263449';g.font='bold 15px Arial, sans-serif';g.textAlign='center';g.fillText(q.text,x+w/2,y+20);if(q.event){g.font='bold 11px Arial, sans-serif';g.fillText(q.event==='return'?'시민 +1 복귀!':q.event==='bazooka'?'광역 지원 사격!':'공을 지켜냈다!',x+w/2,y+37)}g.restore()}}
function updateCrowd(dt){updateBubbles(dt);for(const p of citizens){if(p.dying>0)p.dying=Math.max(0,p.dying-dt);if(!p.alive&&mode==='playing')p.absent=(p.absent||0)+dt;p.returning=Math.max(0,(p.returning||0)-dt);}cheerTime=Math.max(0,cheerTime-dt);if(mode==='clearing')return;updateBazooka(dt);if(mode!=='playing')return;for(const j of [...junk]){j.t+=dt;if(j.t>=j.duration){junk.splice(junk.indexOf(j),1);burst(j.tx,j.ty,'#d9c28b',4);if(foes.includes(j.target)&&Math.hypot(j.target.x+j.target.w/2-j.tx,j.target.y+j.target.h/2-j.ty)<32){damage(j.target,.25,true);if(mode!=='playing')return}}}if(balls[0]?.held||!foes.length)return;crowdTimer-=dt;if(crowdTimer<=0){crowdTimer=3.5+Math.random()*2;const alive=citizens.filter(p=>p.alive);if(!alive.length)return;let citizen=alive[Math.floor(Math.random()*alive.length)],target=foes[Math.floor(Math.random()*foes.length)];junk.push({sx:citizen.x,sy:citizen.y-15,tx:target.x+target.w/2,ty:target.y+target.h/2,target,t:0,duration:1.4,kind:Math.floor(Math.random()*4)});cheerTime=1.4;sfx('serve')}}
function drawCrowd(){rect(20,H-51,410,4,'#7189a2');rect(20,H-47,410,3,'#182d40');for(const p of citizens){if(!p.alive&&p.dying<=0)continue;g.save();if(p.returning>0){const t=1-p.returning/1.1;g.globalAlpha=Math.min(1,t*5);if(fxEnabled){g.strokeStyle='#91f4d0';g.lineWidth=3;g.beginPath();g.ellipse(p.x,p.y+12,12+t*24,5+t*8,0,0,Math.PI*2);g.stroke();for(let i=0;i<4;i++){const a=i*Math.PI/2+t*4;rect(p.x+Math.cos(a)*25,p.y-15+Math.sin(a)*23,4,4,'#ffed9b')}}g.translate(0,-Math.sin(t*Math.PI)*22)}if(!p.alive){const t=1-p.dying/.8;g.globalAlpha=Math.min(1,p.dying/.35);g.translate(p.x,p.y);g.rotate(Math.sin(t*13)*.22);g.scale(1+t*.15,1-t*.15);g.translate(-p.x,-p.y-30*Math.sin(t*Math.PI/2))}let cheer=mode==='clearing'||cheerTime>0||Math.sin(clock*1.5+p.phase)>.82,bob=cheer?Math.abs(Math.sin(clock*7+p.phase))*3:0,x=p.x,y=p.y-bob;rect(x-9,y+4,18,17,p.shirt);rect(x-8,y-10,16,16,p.skin);rect(x-9,y-13,18,5,p.hair);if(p.style===0){rect(x-11,y-15,22,4,p.shirt);rect(x-7,y-20,15,6,p.shirt)}if(p.style===1){rect(x-10,y-8,4,17,p.hair);rect(x+7,y-8,4,17,p.hair)}if(p.style===2){rect(x-8,y-7,16,2,'#263441');rect(x-7,y-5,5,4,'#d3ece1');rect(x+3,y-5,5,4,'#d3ece1')}else{rect(x-5,y-5,2,3,'#394149');rect(x+3,y-5,2,3,'#394149')}rect(x-3,y+1,6,2,'#984f4d');if(p.style===3){rect(x-6,y+12,13,3,'#f0e9c9');rect(x-2,y+4,4,14,'#f0e9c9')}if(p.style===4)rect(x-7,y,14,4,'#d3d4c0');if(cheer){rect(x-13,y-4,5,14,p.skin);rect(x+10,y-8,5,17,p.skin);rect(x-14,y-7,6,5,p.skin);rect(x+9,y-11,6,5,p.skin)}else{rect(x-12,y+7,4,12,p.skin);rect(x+9,y+7,4,12,p.skin)}g.restore()}}
// Citizen support uses its own projectiles; tennis ball physics stays unchanged.
const BAZOOKA_RADIUS=120,BAZOOKA_DAMAGE=8;
let rockets=[],bazookaTimer=0,bazookaBlasts=[];
function updateBazooka(dt){
 for(const p of citizens)p.shooting=Math.max(0,(p.shooting||0)-dt);
 for(const r of [...rockets]){r.t+=dt;if(r.t<r.duration)continue;rockets.splice(rockets.indexOf(r),1);bazookaBlasts.push({x:r.tx,y:r.ty,t:0,life:.85});if(bazookaBlasts.length>6)bazookaBlasts.shift();effect(r.tx,r.ty,'#ffd16c',115,'BAZOOKA!');burst(r.tx,r.ty,'#ffae65',40);sfx('blast');haptic(16);
  for(const z of [...foes]){const dx=r.tx-clamp(r.tx,z.x,z.x+z.w),dy=r.ty-clamp(r.ty,z.y,z.y+z.h);if(dx*dx+dy*dy<=BAZOOKA_RADIUS*BAZOOKA_RADIUS){damage(z,BAZOOKA_DAMAGE,false,{x:z.x+z.w/2-r.tx,y:z.y+z.h/2-r.ty});if(mode!=='playing')return}}
 }
 if(!has('bazooka')||!foes.length||balls[0]?.held)return;
 bazookaTimer-=dt;if(bazookaTimer>0)return;
 const alive=citizens.filter(p=>p.alive);if(!alive.length)return;
 const p=alive[Math.floor(Math.random()*alive.length)],z=foes[Math.floor(Math.random()*foes.length)],tx=z.x+z.w/2,ty=z.y+z.h/2;
 p.shooting=1.15;p.aim=Math.atan2(ty-(p.y-16),tx-p.x);bazookaTimer=3;
 rockets.push({sx:p.x,sy:p.y-16,tx,ty,t:0,duration:.7});citizenCue(p,false,'한 방 간다!');sfx('launch');burst(p.x,p.y-16,'#ffd16c',6);
}
function drawBazooka(){
 for(const p of citizens){if(!p.alive||!(p.shooting>0))continue;const elapsed=1.15-p.shooting,recoil=Math.max(0,1-elapsed/.2)*8;g.save();g.globalAlpha=Math.min(1,p.shooting/.2);g.strokeStyle='#ffe99b';g.lineWidth=2;g.beginPath();g.ellipse(p.x,p.y+17,20,6,0,0,Math.PI*2);g.stroke();g.translate(p.x,p.y-14);g.rotate(p.aim??-Math.PI/2);g.translate(-recoil,0);
 // Shoulder-stock, large tube, sight, front grip and two supporting hands.
 rect(-23,-9,53,18,'#1a2936');rect(-20,-7,48,14,'#708e57');rect(-18,-7,44,4,'#b9cd83');rect(-23,-11,10,22,'#415440');rect(23,-11,11,22,'#d3dda0');rect(29,-8,6,16,'#263640');rect(-5,-13,13,5,'#303d42');rect(-3,-14,5,2,'#ffdb81');rect(5,-6,5,12,'#36473a');rect(-9,7,7,11,'#374936');rect(13,7,6,9,'#374936');rect(-10,8,10,7,p.skin);rect(11,7,10,7,p.skin);
 if(elapsed<.2)luminous(()=>{poly([[35,-13],[52,-8],[65,0],[49,7],[35,13],[40,0]],'#ffab43');poly([[35,-6],[52,0],[35,6]],'#fff6c6');poly([[-24,-7],[-41,0],[-24,7]],'#ffbc60')});g.restore()}
 for(const r of rockets){const t=clamp(r.t/r.duration,0,1),x=r.sx+(r.tx-r.sx)*t,y=r.sy+(r.ty-r.sy)*t,travel=Math.hypot(x-r.sx,y-r.sy),trail=Math.min(155,travel);g.save();g.translate(x,y);g.rotate(Math.atan2(r.ty-r.sy,r.tx-r.sx));luminous(()=>{for(let i=12;i>=1;i--){const d=trail*i/12,fade=1-i/13;g.globalAlpha=fade*.8;rect(-d-10,-5-i*.3,13,10+i*.6,i%2?'#ff9b46':'#ffd777');g.globalAlpha=fade*.65;rect(-d-6,-2,10,4,'#fff0ab')}g.globalAlpha=1;poly([[-17,-7],[-38-Math.sin(clock*40)*8,0],[-17,7]],'#ff9f43');poly([[-17,-4],[-31,0],[-17,4]],'#fff6b0')});rect(-16,-8,29,16,'#1e3440');rect(-14,-6,26,12,'#dceb9b');rect(-10,-5,12,10,'#78995c');rect(2,-6,5,12,'#e69b54');poly([[13,-8],[24,0],[13,8]],'#ffae79');rect(-17,-12,7,24,'#618476');rect(-16,-11,5,3,'#dce8b4');g.restore()}
 if(bazookaBlasts.length)luminous(()=>{for(const b of bazookaBlasts){const t=b.t/b.life,fade=1-t;g.save();g.translate(b.x,b.y);g.globalAlpha=fade*.16;g.fillStyle='#ffb34d';g.beginPath();g.arc(0,0,BAZOOKA_RADIUS,0,Math.PI*2);g.fill();g.globalAlpha=fade*.85;g.strokeStyle='#ffe49a';g.lineWidth=3;g.setLineDash([10,6]);g.beginPath();g.arc(0,0,BAZOOKA_RADIUS,0,Math.PI*2);g.stroke();g.setLineDash([]);
 const rings=fxEnabled?3:1;for(let j=0;j<rings;j++){const radius=Math.min(BAZOOKA_RADIUS,12+t*170-j*18);if(radius<0)continue;g.globalAlpha=fade*(j?.5:.8);g.strokeStyle=j%2?'#ff9356':'#fff1b0';g.lineWidth=7-j*2;g.beginPath();g.arc(0,0,radius,0,Math.PI*2);g.stroke()}
 if(fxEnabled)for(let i=0;i<12;i++){const a=i*Math.PI/6,rr=(24+t*88),size=(1-t)*18;g.globalAlpha=fade*.7;rect(Math.cos(a)*rr-size/2,Math.sin(a)*rr-size/2,size,size,i%2?'#ffd172':'#ff8155')}
 g.globalAlpha=fade*.8;rect(-22*(1-t),-22*(1-t),44*(1-t),44*(1-t),'#fff5bc');g.restore()}});
}
function drawJunk(){for(const j of junk){let t=clamp(j.t/j.duration,0,1),x=j.sx+(j.tx-j.sx)*t,y=j.sy+(j.ty-j.sy)*t-Math.sin(Math.PI*t)*85;g.save();g.translate(x,y);g.rotate(t*10);if(j.kind===0){rect(-4,-6,8,12,'#9fc5cf');rect(-4,-6,8,2,'#eaf6da')}else if(j.kind===1){rect(-7,-2,13,6,'#cbb68e');rect(2,-6,4,5,'#ba9974')}else if(j.kind===2){rect(-4,-7,8,13,'#e8d6b0');rect(-2,-9,4,4,'#758496')}else{rect(-6,-4,12,8,'#c89f65');rect(-3,-6,6,3,'#f1cf84')}g.restore()}}
function drawClear(){g.fillStyle='#101a36df';g.fillRect(48,290,354,124);g.strokeStyle='#eff39e';g.lineWidth=2;g.strokeRect(48,290,354,124);g.textAlign='center';g.fillStyle='#eaf98a';g.font='bold 27px monospace';g.fillText((runMode==='endless'?'WAVE '+(wave-50):'STAGE '+String(wave).padStart(2,'0'))+' CLEAR',225,330);g.fillStyle='#faf1d1';g.font='bold 13px monospace';g.fillText('시민들을 지켜냈습니다!',225,357);g.fillStyle='#96e3cd';g.font='12px monospace';g.fillText('+500 BONUS  ·  '+hero().name+' WIN!',225,385)}
let inputPointer=null,inputX=0;
function releaseInput(){inputPointer=null}
function blocksInput(e){return !!e.target?.closest?.('button,a,input,select,textarea,summary,[role="button"],.overlay,.guide')}
function inputDown(e){if(mode!=='playing'||blocksInput(e)||inputPointer!==null||(e.button!==undefined&&e.button!==0))return;inputPointer=e.pointerId;inputX=e.clientX;touchUsed=e.pointerType==='touch';target=car;e.preventDefault?.();try{c.setPointerCapture?.(e.pointerId)}catch{}serve()}
function inputMove(e){if(mode!=='playing')return;if(inputPointer===e.pointerId){const r=c.getBoundingClientRect(),width=r.width||W;target=clamp(target+(e.clientX-inputX)*W/width,72,W-72);inputX=e.clientX;e.preventDefault?.()}else if(inputPointer===null&&e.pointerType==='mouse'&&e.target===c){const r=c.getBoundingClientRect();target=clamp((e.clientX-r.left)/(r.width||W)*W,72,W-72)}}
function inputEnd(e){if(e.pointerId===inputPointer)releaseInput()}
document.addEventListener('pointerdown',inputDown,{passive:false});document.addEventListener('pointermove',inputMove,{passive:false});document.addEventListener('pointerup',inputEnd);document.addEventListener('pointercancel',inputEnd);c.addEventListener('lostpointercapture',inputEnd);
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.key]=true;if(e.code==='Space'){if(mode==='menu'||mode==='over')start();else if(mode==='paused')pause();else serve()}if(e.code==='Escape')pause()});window.addEventListener('keyup',e=>keys[e.key]=false);window.addEventListener('blur',()=>{keys={};if(mode==='playing'||mode==='clearing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause()});$('start').onclick=()=>mode==='paused'?pause():start();$('pause').onclick=pause;$('sound').onclick=()=>{sound=sound&&!audioRunning()?true:!sound;unlockAudio();audioUI();if(sound)sfx('item')};$('legend').innerHTML=Object.entries(SKILLS).map(([k,s])=>'<div style="--skill:'+s.color+'">'+icon(k)+'<span><b>'+s.name+'</b><small>'+s.desc+' · '+s.duration+'초</small></span></div>').join('');rack();resetBalls();renderHeroes();endlessUI();requestAnimationFrame(frame);

$('bgm').onclick=()=>{musicEnabled=!musicEnabled;unlockAudio();$('bgm').textContent=musicEnabled?'BGM ON':'BGM OFF';$('bgm').setAttribute('aria-pressed',String(musicEnabled));nextBeat=0};
$('fx').onclick=()=>{fxEnabled=!fxEnabled;$('fx').textContent=fxEnabled?'FX FULL':'FX LIGHT';$('fx').setAttribute('aria-pressed',String(fxEnabled));if(!fxEnabled){fx=[];cameraKick=0}};
$('share').onclick=async()=>{const url=new URL('./',location.href).href;try{if(navigator.share){await navigator.share({title:'ZOMBIE ZERO',text:'테니스공으로 좀비를 물리쳐 보세요!',url});return}await navigator.clipboard.writeText(url);$('share').textContent='링크 복사 완료!'}catch(e){if(e.name==='AbortError')return;$('share-url').hidden=false;$('share-url').value=url;$('share-url').select()}};
// Keep the pixel-art shapes but render geometry and text at native display density.
// Mobile portrait world expands vertically instead of scaling 450×710 shapes
// into a distorted rectangle. Actual world collisions use the same coordinate
// system as the drawing surface, so the whole extra space is playable.
function resizeCanvas(){
 const bounds=c.getBoundingClientRect(),widthCss=bounds.width||W,heightCss=bounds.height||710;
 // All display sizes render the SAME logical 450×710 arena. App.fit() sizes
 // the CSS canvas as a contain-fit rectangle instead of resizing game physics.
 const targetH=710;
 if(targetH!==H){
  const oldH=H,delta=targetH-oldH;
  H=targetH;VIEW_DELTA=H-710;PY=H-126;DEFENSE_Y=H-145;
  // Keep live positions stable relative to the expanded screen.
  for(const citizen of citizens)citizen.y+=delta;
  for(const ball of balls){
   if(ball.held){ball.y=PY-17;continue}
   const progress=clamp((ball.y-16)/(oldH-16),0,1);
   ball.y+=delta*progress;
   if(ball.trail)for(const p of ball.trail)p.y+=delta*clamp((p.y-16)/(oldH-16),0,1);
  }
  for(const item of items)item.y+=delta*clamp((item.y-16)/(oldH-16),0,1);
  // Enemies keep their actual distances from the top entry point; the larger
  // runway to DEFENSE_Y is intentional when a taller phone is available.
  if(fxRenderer)fxRenderer=null;
 }
 const dpr=clamp(window.devicePixelRatio||1,1,3);
 const width=Math.max(1,Math.round(widthCss*dpr));
 const height=Math.max(1,Math.round(heightCss*dpr));
 if(c.width!==width||c.height!==height){c.width=width;c.height=height}
 g.setTransform(width/W,0,0,height/H,0,0);
 g.imageSmoothingEnabled=true;
 draw();
}
window.ZZGameLayout={getHeight:()=>H,getDefenseY:()=>DEFENSE_Y,getPaddleY:()=>PY,getViewDelta:()=>VIEW_DELTA};
resizeCanvas();window.addEventListener('resize',resizeCanvas);if(typeof ResizeObserver!=='undefined')new ResizeObserver(resizeCanvas).observe(c);

