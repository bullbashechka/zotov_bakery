import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';

import { deployRelease } from './release-deploy.mjs';

const root = resolve(import.meta.dirname, '../..');

function fakeRepository({ branch = 'main', releaseStatus = 0 } = {}) {
  const calls = [];
  function runCommand(command, args) {
    calls.push([command, ...args]);
    if (command === 'git' && args[0] === 'status') return { status: 0, stdout: '' };
    if (command === 'git' && args[0] === 'branch') return { status: 0, stdout: `${branch}\n` };
    if (command === 'git' && args[0] === 'config') return { status: 0, stdout: 'configured-without-printing\n' };
    if (command === 'git' && args[0] === 'rev-parse') return { status: 0, stdout: '0123456789abcdef\n' };
    if (args.includes('scripts/security/release-check.mjs')) return { status: releaseStatus, stdout: '' };
    return { status: 0, stdout: '' };
  }
  return { calls, runCommand };
}

test('a failed release gate never calls Wrangler deployment', () => {
  const fake = fakeRepository({ releaseStatus: 1 });
  assert.throws(() => deployRelease({ mode: 'production', cwd: root, runCommand: fake.runCommand }), /release check failed/);
  assert.equal(fake.calls.some((call) => call.includes('deploy')), false);
});

test('a repository change during checks prevents deployment', () => {
  const fake = fakeRepository();
  const baseRunner = fake.runCommand;
  let headChecks = 0;
  fake.runCommand = (command, args) => {
    if (command === 'git' && args[0] === 'rev-parse') {
      headChecks += 1;
      fake.calls.push([command, ...args]);
      return { status: 0, stdout: headChecks === 1 ? 'before\n' : 'after\n' };
    }
    return baseRunner(command, args);
  };
  assert.throws(() => deployRelease({ mode: 'production', cwd: root, runCommand: fake.runCommand }), /state changed/);
  assert.equal(fake.calls.some((call) => call.includes('deploy')), false);
});

test('production deploy uses the configured project and fixed artifact directory', () => {
  const fake = fakeRepository();
  deployRelease({ mode: 'production', cwd: root, runCommand: fake.runCommand });
  const deploy = fake.calls.find((call) => call.includes('deploy'));
  assert(deploy);
  assert(deploy.includes('website/dist'));
  assert(deploy.includes('--project-name=zotov-landing'));
  assert(deploy.includes('--branch=main'));
});

test('preview deploy requires a separate branch and uses the preview alias', () => {
  assert.throws(() => deployRelease({ mode: 'preview', cwd: root, runCommand: fakeRepository({ branch: 'dev' }).runCommand }), /separate feature branch/);
  const fake = fakeRepository({ branch: 'release-review' });
  deployRelease({ mode: 'preview', cwd: root, runCommand: fake.runCommand });
  assert(fake.calls.find((call) => call.includes('deploy')).includes('--branch=preview'));
});
