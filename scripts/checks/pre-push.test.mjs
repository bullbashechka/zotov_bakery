import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const script = resolve(import.meta.dirname, 'pre-push.mjs');
const installer = resolve(import.meta.dirname, 'install-hooks.mjs');

// Exercise real Git refs/status and hook stdin. Only the expensive release
// command is replaced; no network, workspace commits or remote pushes occur.
test('pre-push validates the destination commit and fails closed', () => {
  const root = mkdtempSync(join(tmpdir(), 'zotov-push-check-'));
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')));
  Object.assign(env, {
    GIT_AUTHOR_NAME: 'Fixture', GIT_COMMITTER_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  });
  const run = (command, args, options = {}) => spawnSync(command, args, { cwd: root, env, encoding: 'utf8', ...options });
  const git = (args, input) => {
    const result = run('git', args, { input });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const zero = '0'.repeat(40);
  const line = (object, target = 'main') => `refs/heads/dev ${object} refs/heads/${target} ${zero}\n`;
  try {
    git(['init', '--quiet']);
    writeFileSync(join(root, '.gitignore'), '.test-bin/\n');
    writeFileSync(join(root, 'source.txt'), 'original');
    git(['add', '.']);
    const tree = git(['write-tree']);
    const previous = git(['commit-tree', tree], 'first fixture\n');
    const head = git(['commit-tree', tree, '-p', previous], 'second fixture\n');
    git(['update-ref', 'HEAD', head]);
    const bin = join(root, '.test-bin');
    mkdirSync(bin);
    const log = join(bin, 'calls');
    writeFileSync(join(bin, 'bun'), `#!/bin/sh\necho "$PUBLIC_WEBSITE_URL $PUBLIC_ALLOW_INDEXING $*" >> '${log}'\nif [ "$FIXTURE_MODE" = mutate ]; then echo changed > source.txt; fi\nif [ "$FIXTURE_MODE" = fail ]; then exit 1; fi\n`, { mode: 0o755 });
    env.PATH = `${bin}:${env.PATH}`;
    const push = (input, mode = '') => run(process.execPath, [script], { input, env: { ...env, FIXTURE_MODE: mode } });
    assert.equal(push(line(previous, 'dev')).status, 0, 'feature pushes skip release');
    assert.equal(push(`(delete) ${zero} refs/heads/main ${head}\n`).status, 0, 'deletion is not a release');
    assert.notEqual(push(line(previous)).status, 0, 'non-HEAD push must not check unrelated HEAD');
    writeFileSync(join(root, 'source.txt'), 'dirty');
    assert.notEqual(push(line(head)).status, 0, 'dirty worktree must stop');
    writeFileSync(join(root, 'source.txt'), 'original');
    assert.notEqual(push(line(head), 'fail').status, 0, 'release failure must stop');
    assert.equal(push(line(head, 'dev') + line(head) + line(head, 'master')).status, 0, 'one release for multiple protected destinations');
    assert.equal(readFileSync(log, 'utf8').trim().split('\n').length, 2);
    assert.match(readFileSync(log, 'utf8'), /https:\/\/zotov.kz true run release:check/);
    assert.notEqual(push(line(head), 'mutate').status, 0, 'changes during checks must stop');
    // Installation must preserve another hook and existing hook managers.
    writeFileSync(join(root, '.git/hooks/pre-push'), '#!/bin/sh\n# custom hook\n');
    assert.notEqual(run(process.execPath, [installer]).status, 0);
    assert.match(readFileSync(join(root, '.git/hooks/pre-push'), 'utf8'), /custom hook/);
    rmSync(join(root, '.git/hooks/pre-push'));
    symlinkSync(join(root, 'missing-hook'), join(root, '.git/hooks/pre-push'));
    assert.notEqual(run(process.execPath, [installer]).status, 0);
    assert(lstatSync(join(root, '.git/hooks/pre-push')).isSymbolicLink(), 'preserve dangling hooks too');
    git(['config', 'core.hooksPath', '.custom-hooks']);
    assert.notEqual(run(process.execPath, [installer]).status, 0);
    assert.equal(git(['config', '--get', 'core.hooksPath']), '.custom-hooks');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
