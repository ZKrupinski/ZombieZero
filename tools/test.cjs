'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'tests')).filter(f => f.endsWith('.test.cjs')).sort();
let failed = 0;
for (const file of files) {
  console.log('\n=== ' + file + ' ===');
  const result = spawnSync(process.execPath, [path.join(root, 'tests', file)], {cwd: root, stdio: 'inherit'});
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) failed++;
}
console.log('\nTest files: ' + files.length + ', failed: ' + failed);
process.exitCode = failed ? 1 : 0;
