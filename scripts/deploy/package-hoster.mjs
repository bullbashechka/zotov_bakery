import { constants, copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireSuccess, runCommand } from '../security/command.mjs';
import { runReleaseCheck } from '../security/release-check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
let temporary;
try {
  // macOS includes zip; on Linux install it with the system package manager.
  requireSuccess(runCommand('zip', ['-v'], { cwd: root, capture: true }), 'zip availability');
  const git = (args) => {
    const result = runCommand('git', args, { cwd: root, capture: true });
    requireSuccess(result, 'Git metadata');
    return result.stdout.trim();
  };
  const commit = git(['rev-parse', '--short=12', 'HEAD']);
  const dirty = Boolean(git(['status', '--porcelain', '--untracked-files=all']));
  if (dirty) console.log('[package] Includes uncommitted changes (working-tree).');
  runReleaseCheck({
    cwd: root,
    env: { ...process.env, PUBLIC_WEBSITE_URL: 'https://zotov.kz', PUBLIC_ALLOW_INDEXING: 'true' },
  });

  temporary = mkdtempSync(join(tmpdir(), 'zotov-hoster-package-'));
  const staging = join(temporary, 'site');
  cpSync(join(root, 'website/dist'), staging, { recursive: true });
  for (const name of ['_headers', '_redirects']) rmSync(join(staging, name), { force: true });
  copyFileSync(join(root, 'scripts/deploy/hoster.htaccess'), join(staging, '.htaccess'));

  const archive = join(temporary, 'site.zip');
  requireSuccess(runCommand('zip', ['-q', '-r', archive, '.'], { cwd: staging }), 'ZIP creation');
  requireSuccess(runCommand('zip', ['-T', archive], { cwd: staging }), 'ZIP integrity');
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const filename = `zotov-kz-${stamp}-${commit}${dirty ? '-working-tree' : ''}.zip`;
  const output = join(root, 'artifacts/deploy', filename);
  mkdirSync(dirname(output), { recursive: true });
  // Never overwrite a previously published archive.
  copyFileSync(archive, output, constants.COPYFILE_EXCL);
  const sha = createHash('sha256').update(readFileSync(output)).digest('hex');
  console.log(`\n[package] Ready: ${output}\n[package] SHA256: ${sha}`);
  console.log('[package] Extract into /httpdocs with file replacement. No upload was performed.');
} catch (error) {
  console.error(`[package] ${error.message}`);
  process.exitCode = 1;
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
