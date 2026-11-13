// ZOMBIE ZERO 2026 · original 10 object zombies + 3 survivors.
(function(){
  'use strict';
  const encoded=window.ZZObjectCastB64;
  if(typeof encoded!=='string'||encoded.length!==13156)return;
  const atlas=new Image();
  atlas.decoding='async';
  atlas.src='data:image/png;base64,'+encoded;
  window.ZZObjectCast={
    atlas,cell:64,columns:4,rows:4,
    ids:['green-zombie','red-barrel','black-barrel','red-brain-cube',
         'cardboard-box','wooden-crate','black-brain-cube','yellow-brain-cube',
         'big-zombie','garbage-zombie','survivor-boy','survivor-blonde',
         'survivor-redglasses'],
    // Form 0-7: exactly eight regular roster members; boss forms use 8/9.
    enemyIndex:[0,1,2,3,4,5,6,7],
    bossIndex:[8,9,8,9],
    heroIndex:[10,11,12]
  };
  window.ZZObjectCastB64=null; // leave a single image decode buffer in memory
})();
