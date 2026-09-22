import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { runReleaseCheck } from './release-check.mjs';

const root = resolve(import.meta.dirname, '../..');
const bunVersion = readFileSync(resolve(root, '.bun-version'), 'utf8').trim();

test('release check validates the origin before running commands', () => {
  let calls = 0;
  assert.throws(() => runReleaseCheck({
    cwd: root,
    env: {},
    runCommand() { calls += 1; return { status: 0, stdout: bunVersion }; },
  }), /PUBLIC_WEBSITE_URL is required/);
  assert.equal(calls, 0);
});

test('release check requires an explicit indexing decision before running commands', () => {
  let calls = 0;
  assert.throws(() => runReleaseCheck({
    cwd: root,
    env: { PUBLIC_WEBSITE_URL: 'https://ci.example' },
    runCommand() { calls += 1; return { status: 0, stdout: bunVersion }; },
  }), /PUBLIC_ALLOW_INDEXING is required/);
  assert.equal(calls, 0);
});

test('release check stops immediately when an injected step fails', () => {
  const calls = [];
  assert.throws(() => runReleaseCheck({
    cwd: root,
    env: { PUBLIC_WEBSITE_URL: 'https://ci.example', PUBLIC_ALLOW_INDEXING: 'false' },
    runCommand(command, args) {
      calls.push([command, ...args]);
      if (args[0] === '--version') return { status: 0, stdout: `${bunVersion}\n` };
      return { status: args[0] === 'install' ? 1 : 0, stdout: '' };
    },
  }), /frozen dependency install failed/);
  assert.equal(calls.length, 2);
});
