const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('dist/game.js','utf8');
const block=src.slice(src.indexOf('const THEMES='),src.indexOf('// V60 cube FX'));
const tracks=[],notes=[];
const c=vm.createContext({Math,audio:{currentTime:0},musicBus:{gain:{value:0}},mode:'playing',sound:true,musicEnabled:true,foes:[],wave:1,musicTheme:'',beat:0,nextBeat:0,audioRunning:()=>true,hz:n=>n,tone:(...args)=>notes.push(args),noise:()=>{},$:()=>({set textContent(x){tracks.push(x)}})});
vm.runInContext(block,c);const run=x=>vm.runInContext(x,c);
assert.equal(run('MUSIC_NORMAL.length'),18);assert.equal(run('MUSIC_BOSS.length'),8);
assert.equal(run('new Set([...MUSIC_NORMAL,...MUSIC_BOSS].map(t=>t.name)).size'),26);
for(const boss of [false,true]){
 const seen=new Set(),n=boss?8:18;
 for(let i=0;i<n;i++){const t=run('pickMusic('+boss+').name');assert(!seen.has(t));seen.add(t)}
 const last=run('musicLast['+(boss?1:0)+'].name');assert.notEqual(run('pickMusic('+boss+').name'),last);
}
run('music()');assert(notes.length>0);assert.equal(run('musicTempo'),146);
const first=run('musicTheme');run('wave=5;audio.currentTime=.1;music()');assert.equal(run('musicTheme'),first);assert.equal(run('musicTempo'),146);
run('beat=(musicTrack.bars||16)*16;nextBeat=audio.currentTime;music()');assert.notEqual(run('musicTheme'),first);assert.equal(run('musicTempo'),150);
run('foes=[{boss:true}];music()');assert.equal(run('musicTempo'),172);assert(run('MUSIC_BOSS.includes(musicTrack)'));
const position=run('beat');run('musicEnabled=false;music()');assert.equal(run('beat'),position);assert.equal(run('musicBus.gain.value'),0);
run('musicEnabled=true;mode="paused";music()');assert.equal(run('beat'),position);
run('mode="playing";foes=[];music()');assert(run('MUSIC_NORMAL.includes(musicTrack)'));
for(const t of run('MUSIC_NEW')){
 run('musicTrack=MUSIC_NEW.find(t=>t.name==='+JSON.stringify(t.name)+');musicTheme=musicTrack.name;musicBoss=musicTrack.boss;foes=musicBoss?[{boss:true}]:[];beat=0;nextBeat=audio.currentTime;musicTempo=musicBoss?172:146');
 for(let i=0;i<512;i++){run('audio.currentTime=nextBeat;music()')}
}
assert(notes.every(n=>Number.isFinite(n[0])&&n[0]>=20&&n[0]<=110&&n[3]<=.31));
console.log('PASS: 26 tracks, no repeats, wave continuity, timed transitions, boss tempo, mute/pause, all new notes');
