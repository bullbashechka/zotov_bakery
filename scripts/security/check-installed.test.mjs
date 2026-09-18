import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { checkInstalled } from './check-installed.mjs';

test('installed pins detect stale workspace and nested copies, and missing packages', () => {
  const root = mkdtempSync(join(tmpdir(), 'zotov-pin-test-'));
  const put = (path, object) => {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, JSON.stringify(object));
  };
  try {
    put('package.json', { overrides: { sharp: '0.35.4' }, devDependencies: { wrangler: '4.124.0', parse5: '7.3.0' } });
    put('website/package.json', { dependencies: { astro: '7.2.8' }, devDependencies: { '@astrojs/compiler': '2.13.1' } });
    for (const [name, version] of [['astro', '7.2.8'], ['sharp', '0.35.4'], ['wrangler', '4.124.0'], ['parse5', '7.3.0'], ['@astrojs/compiler', '2.13.1']]) put(`node_modules/${name}/package.json`, { name, version });
    assert.equal(checkInstalled(root), 5);
    put('node_modules/parse5/package.json', { name: 'parse5', version: '7.2.0' });
    assert.throws(() => checkInstalled(root), /does not match pinned/);
    put('node_modules/parse5/package.json', { name: 'parse5', version: '7.3.0' });
    put('website/node_modules/astro/package.json', { name: 'astro', version: '7.3.3' });
    assert.throws(() => checkInstalled(root), /does not match pinned/);
    put('website/node_modules/astro/package.json', { name: 'astro', version: '7.2.8' });
    put('node_modules/wrangler/node_modules/sharp/package.json', { name: 'sharp', version: '0.35.2' });
    assert.throws(() => checkInstalled(root), /does not match pinned/);
    put('node_modules/wrangler/node_modules/sharp/package.json', { name: 'sharp', version: '0.35.4' });
    put('package.json', { overrides: { absent: '1.0.0' }, devDependencies: { wrangler: '4.124.0' } });
    assert.throws(() => checkInstalled(root), /Missing installed pinned dependency/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
