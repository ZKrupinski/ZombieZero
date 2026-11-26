'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const sw=fs.readFileSync('dist/sw.js','utf8');
const begin=game.indexOf('function drawCriticalPopups(){');
const end=game.indexOf('function drawImpactFlashes(){',begin);
assert(begin>=0&&end>begin);
const popup=game.slice(begin,end);
assert(popup.includes("const word='CRITICAL!';"),'all critical hits share the CRITICAL! label');
assert(!game.includes('PIERCE CRIT!'),'old pierce-specific text is removed');
assert(popup.includes("f.pierce?'#ffda49':'#fff2a3'"),'pierce-specific golden art remains intact');
assert(popup.includes('arcadeGlowText(word,0,0,12)'), 'label remains rendered with additive glow');
assert(html.includes('v152-critical-label'),'new game script cache-busted');
assert(sw.includes('v152-critical-label'),'offline cache bumped');
console.log('PASS V152: CRITICAL! for piercing and standard crits, original VFX retained');


// v272 — cosmetic-only cleanup: no zombie hit/kill digits or boss name
// caption may appear, while boss burst / combat logic / CRITICAL! remain.
const damageStart=game.indexOf('function damage(z,n=1,');
const damageEnd=game.indexOf('// Fire has a hard simultaneous cap',damageStart);
assert(damageStart>=0&&damageEnd>damageStart,'zombie damage handler located');
const combat=game.slice(damageStart,damageEnd);
assert(!combat.includes("'+'+(100*z.max)"),'no floating kill-score number');
assert(!combat.includes("'-'+amount"),'no floating minus-damage number');
assert(combat.includes("z.hp-=amount;"),'damage remains functional');
assert(combat.includes("score+=z.hp<=0"),'scoring remains functional');
assert(combat.includes("'CRITICAL!'"),'critical impact feedback remains available');
const formation=game.slice(game.indexOf('function rack(){'),game.indexOf('const sprites=window.ZZObjectSprite;',game.indexOf('function rack(){')));
assert(formation.includes('if(bossStage){'),'check the boss spawn path');
assert(!/\beffect\s*\(/.test(formation),'forming a stage never emits a combat burst');
assert(!game.includes("'WARNING · '+BOSS_FORMS"),'boss name is absent from wave banner');
assert(game.includes("'BOSS WAVE':stageRosterLabel(stage)"),'boss name excluded from encounter status');
assert(html.includes('v272-clean-hit-captions')&&sw.includes('v272-clean-hit-captions'),'game and offline caches refreshed');
console.log('PASS v272: no damage numbers or boss-name text; scores, critical labels and impacts intact');
