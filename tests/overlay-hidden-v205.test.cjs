'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('dist/style.css', 'utf8');
assert.match(css, /\.overlay\[hidden\]\s*\{\s*display:none/);
for (const rule of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  if (!/(?:^|;)\s*display\s*:\s*(?:flex|grid|block)/.test(rule[2])) continue;
  for (const selector of rule[1].split(',')) {
    if (/#overlay\[data-screen="(?:selection|results|pause)"\](?::not\(\[hidden\]\))?\s*$/.test(selector)) {
      assert.ok(selector.includes(':not([hidden])'), selector + ' must respect hidden state');
    }
  }
}
