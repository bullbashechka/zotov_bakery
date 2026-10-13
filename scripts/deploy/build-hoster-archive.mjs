#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, cp, mkdir, mkdtemp, open, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { requireSuccess, runCommand as defaultRunCommand } from '../security/command.mjs';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Public deployment profile. Local environment files cannot silently disable GA4.
export const productionEnvironment = Object.freeze({
  PUBLIC_WEBSITE_URL: 'https://zotov.kz',
  PUBLIC_ALLOW_INDEXING: 'true',
  PUBLIC_GOOGLE_ANALYTICS_ID: 'G-CJVPRBC0P6',
  PUBLIC_YANDEX_METRIKA_ID: '',
});

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function hashFiles(root) {
  const files = {};
  async function walk(directory) {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      assert(!entry.isSymbolicLink(), 'Archive must not contain symlinks');
      if (entry.isDirectory()) await walk(path);
      else {
        assert(entry.isFile(), 'Archive contains an unsupported file');
        files[relative(root, path).replaceAll('\\', '/')] = sha256(await readFile(path));
      }
    }
  }
  await walk(root);
  return files;
}

export async function buildHosterArchive({ cwd = defaultRoot, env = process.env, runCommand = defaultRunCommand } = {}) {
  const releaseEnv = { ...env, ...productionEnvironment };
  const run = (command, args, options = {}) => {
    const result = runCommand(command, args, { cwd, env: releaseEnv, ...options });
    requireSuccess(result, options.label ?? command);
    return result.stdout?.trim();
  };
  run('bun', ['--version'], { capture: true });
  run('zip', ['-v'], { capture: true });
  run('unzip', ['-v'], { capture: true });
  const commit = run('git', ['rev-parse', 'HEAD'], { capture: true });
  const branch = run('git', ['branch', '--show-current'], { capture: true });
  const localChanges = Boolean(run('git', ['status', '--porcelain=v1', '--untracked-files=all'], { capture: true }));
  // This is the authoritative gate, including the fresh build and consent smoke.
  run(process.execPath, ['scripts/security/release-check.mjs'], { label: 'release check' });
  // parse5/sax become available only after the gate's frozen installation.
  const { checkAnalyticsHtml } = await import('../security/check-artifacts.mjs');

  const temporary = await mkdtemp(join(tmpdir(), 'zotov-hoster-'));
  let archivePath;
  let archiveCreated = false;
  let metadataCreated = false;
  try {
    const stage = join(temporary, 'site');
    await cp(resolve(cwd, 'website/dist'), stage, { recursive: true });
    for (const name of ['_headers', '_redirects']) await rm(join(stage, name), { force: true });
    await copyFile(resolve(cwd, 'scripts/deploy/hoster.htaccess'), join(stage, '.htaccess'));
    const expectedAnalytics = { measurementId: productionEnvironment.PUBLIC_GOOGLE_ANALYTICS_ID };
    for (const page of ['index.html', 'privacy/index.html', '404.html']) {
      checkAnalyticsHtml(await readFile(join(stage, page), 'utf8'), page, expectedAnalytics);
    }
    const files = await hashFiles(stage);
    for (const required of ['index.html', 'privacy/index.html', '404.html', 'robots.txt', 'sitemap.xml', '.htaccess']) {
      assert(files[required], `Archive missing ${required}`);
    }
    const packed = join(temporary, 'site.zip');
    run('zip', ['-q', '-r', packed, '.'], { cwd: stage, label: 'ZIP creation' });
    run('unzip', ['-tq', packed], { capture: true, label: 'ZIP integrity check' });
    const extracted = join(temporary, 'extracted');
    await mkdir(extracted);
    run('unzip', ['-q', packed, '-d', extracted], { label: 'ZIP extraction check' });
    assert.deepEqual(await hashFiles(extracted), files, 'ZIP content differs from verified build');

    const builtAt = new Date().toISOString();
    const timestamp = builtAt.replace(/[-:]/g, '').replace('T', '-').replace(/\.\d+Z$/, 'Z');
    const filename = `zotov-kz-${timestamp}-${commit.slice(0, 12)}${localChanges ? '-dirty' : ''}.zip`;
    const destination = resolve(cwd, 'artifacts/deploy');
    await mkdir(destination, { recursive: true });
    archivePath = join(destination, filename);
    const bytes = await readFile(packed);
    const checksum = sha256(bytes);
    await copyFile(packed, archivePath, constants.COPYFILE_EXCL);
    archiveCreated = true;
    const metadata = await open(`${archivePath}.json`, 'wx');
    metadataCreated = true;
    try {
      await metadata.writeFile(JSON.stringify({
        archive: filename, builtAt, branch, commit, localChanges,
        environment: productionEnvironment, bytes: bytes.length, sha256: checksum, files,
      }, null, 2) + '\n');
    } finally {
      await metadata.close();
    }
    console.log(`[archive] ${archivePath}\n[archive] ${Object.keys(files).length} files; ${bytes.length} bytes\n[archive] SHA-256 ${checksum}`);
    return archivePath;
  } catch (error) {
    if (metadataCreated) await rm(`${archivePath}.json`, { force: true });
    if (archiveCreated) await rm(archivePath, { force: true });
    throw error;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    assert.equal(process.argv.length, 2, 'Usage: bun run deploy:archive');
    await buildHosterArchive();
  } catch (error) {
    console.error(`[archive] ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
