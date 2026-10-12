import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Cannot verify repository state');
  return result.stdout.trim();
}

try {
  // Git supplies destination refs, including refspecs such as dev:main.
  const updates = readFileSync(0, 'utf8').trim().split('\n').filter(Boolean)
    .map((line) => line.trim().split(/\s+/))
    .filter(([, object, target]) => !/^0+$/.test(object)
      && ['refs/heads/main', 'refs/heads/master'].includes(target));
  if (updates.length) {
    const head = git(['rev-parse', 'HEAD']);
    const assertPushState = () => {
      for (const [, object] of updates) {
        if (object !== head) throw new Error('Check out the exact commit being pushed to main/master before pushing');
      }
      if (git(['rev-parse', 'HEAD']) !== head
        || git(['status', '--porcelain=v1', '--untracked-files=all'])) {
        throw new Error('Push to main/master requires a clean worktree and unchanged HEAD');
      }
    };
    assertPushState();
    console.log('[pre-push] checking production commit locally');
    const check = spawnSync('bun', ['run', 'release:check'], {
      cwd: git(['rev-parse', '--show-toplevel']),
      stdio: 'inherit',
      env: { ...process.env, PUBLIC_WEBSITE_URL: 'https://zotov.kz', PUBLIC_ALLOW_INDEXING: 'true' },
    });
    if (check.error || check.status !== 0) throw new Error('Local release checks failed; push stopped');
    assertPushState();
  }
} catch (error) {
  console.error(`[pre-push] ${error.message}`);
  process.exitCode = 1;
}
