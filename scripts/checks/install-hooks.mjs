import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, lstatSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Cannot resolve Git hooks directory');
  return result.stdout.trim();
}

try {
  const root = git(['rev-parse', '--show-toplevel']);
  const configured = spawnSync('git', ['config', '--get', 'core.hooksPath'], { encoding: 'utf8' });
  if (configured.status !== 1) {
    throw new Error('Existing core.hooksPath configuration: integrate .githooks/pre-push into your hook manager manually');
  }
  const target = resolve(root, git(['rev-parse', '--git-path', 'hooks/pre-push']));
  const existing = lstatSync(target, { throwIfNoEntry: false });
  if (existing && (existing.isSymbolicLink()
    || !readFileSync(target, 'utf8').includes('# zotov-local-pre-push:'))) {
    throw new Error('Existing pre-push hook: integrate .githooks/pre-push manually; it was not overwritten');
  }
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(resolve(root, '.githooks/pre-push'), target);
  chmodSync(target, 0o755);
  console.log('Local main/master pre-push checks installed; other Git hooks are unchanged.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
