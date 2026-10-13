import assert from 'node:assert/strict';
import test from 'node:test';
import { copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { productionEnvironment } from './build-hoster-archive.mjs';

test('failed release gates preserve old archives and never start packaging', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'zotov-archive-test-'));
  try {
    // Import from a dependency-free checkout: bootstrap must reach frozen install.
    await mkdir(join(cwd, 'scripts/deploy'), { recursive: true });
    await mkdir(join(cwd, 'scripts/security'), { recursive: true });
    for (const file of ['deploy/build-hoster-archive.mjs', 'security/command.mjs']) {
      await copyFile(new URL(`../${file}`, import.meta.url), join(cwd, 'scripts', file));
    }
    const fresh = await import(pathToFileURL(join(cwd, 'scripts/deploy/build-hoster-archive.mjs')).href);
    await writeFile(join(cwd, 'previous.zip'), 'previous artifact');
    const calls = [];
    const runCommand = (command, args, options) => {
      calls.push([command, ...args]);
      if (args.includes('scripts/security/release-check.mjs')) {
        for (const [name, value] of Object.entries(productionEnvironment)) assert.equal(options.env[name], value);
        return { status: 1 };
      }
      return { status: 0, stdout: command === 'git' && args[0] === 'rev-parse' ? '0123456789abcdef' : '' };
    };
    await assert.rejects(fresh.buildHosterArchive({ cwd, env: { PUBLIC_GOOGLE_ANALYTICS_ID: 'G-WRONG', PUBLIC_YANDEX_METRIKA_ID: '123' }, runCommand }), /release check failed/);
    assert.deepEqual((await readdir(cwd)).sort(), ['previous.zip', 'scripts']);
    assert.equal(calls.some((call) => call.includes('-r')), false);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
