import assert from 'node:assert/strict';
import test from 'node:test';

import { runSecurityChecks } from './security-check.mjs';

test('security checks run audit, installed pins, secrets and SVG checks in order', () => {
  const calls = [];
  runSecurityChecks({
    cwd: '/repo',
    runCommand(command, args) {
      calls.push([command, ...args]);
      return { status: 0 };
    },
  });
  assert.deepEqual(calls, [
    ['bun', 'audit'],
    [process.execPath, 'scripts/security/check-installed.mjs'],
    [process.execPath, 'scripts/security/check-secrets.mjs'],
    [process.execPath, 'scripts/security/check-svg.mjs'],
  ]);
});

test('security checks fail closed and stop after the first failure', () => {
  const calls = [];
  assert.throws(() => runSecurityChecks({
    runCommand(command, args) {
      calls.push([command, ...args]);
      return { status: command === 'bun' ? 1 : 0 };
    },
  }), /bun audit failed/);
  assert.equal(calls.length, 1);
});
