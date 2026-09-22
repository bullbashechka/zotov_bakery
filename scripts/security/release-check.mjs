#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { validateSearchIndexing, validateWebsiteOrigin } from '../../website/src/lib/site-origin.mjs';
import { requireSuccess, runCommand as defaultRunCommand } from './command.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(scriptDirectory, '../..');

function readPinnedBunVersion(cwd) {
  const versionFile = readFileSync(join(cwd, '.bun-version'), 'utf8').trim();
  const manifest = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
  const packageManager = /^bun@(.+)$/.exec(manifest.packageManager ?? '');
  if (!versionFile || !packageManager || packageManager[1] !== versionFile) {
    throw new Error('Bun pins in .bun-version and package.json must match');
  }
  return versionFile;
}

function findNodeTests(cwd) {
  const roots = ['scripts', 'website/src'];
  const tests = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name.endsWith('.test.mjs')) {
        tests.push(relative(cwd, path).replaceAll('\\', '/'));
      }
    }
  }
  for (const root of roots) walk(join(cwd, root));
  return tests.sort();
}

export function runReleaseCheck({
  cwd = defaultRoot,
  env = process.env,
  runCommand = defaultRunCommand,
} = {}) {
  const origin = validateWebsiteOrigin(env.PUBLIC_WEBSITE_URL, { required: true });
  const allowIndexing = validateSearchIndexing(env.PUBLIC_ALLOW_INDEXING, { required: true });
  const expectedBun = readPinnedBunVersion(cwd);
  const versionResult = runCommand('bun', ['--version'], { cwd, env, capture: true });
  requireSuccess(versionResult, 'Bun version check');
  if (versionResult.stdout.trim() !== expectedBun) {
    throw new Error(`Bun ${expectedBun} is required`);
  }

  const releaseEnv = {
    ...env,
    PUBLIC_WEBSITE_URL: origin,
    PUBLIC_ALLOW_INDEXING: String(allowIndexing),
  };
  const steps = [
    ['frozen dependency install', 'bun', ['install', '--frozen-lockfile']],
    ['security checks', process.execPath, ['scripts/security/security-check.mjs']],
    ['Node tests', process.execPath, ['--test', ...findNodeTests(cwd)]],
    ['typecheck', 'bun', ['run', 'typecheck']],
  ];
  for (const [label, command, args] of steps) {
    console.log(`[release] ${label}`);
    requireSuccess(runCommand(command, args, { cwd, env: releaseEnv }), label);
  }

  console.log('[release] fresh production build');
  requireSuccess(runCommand('bun', ['run', 'build'], { cwd, env: releaseEnv }), 'production build');

  for (const [label, script, args = []] of [
    ['artifact checks', 'scripts/security/check-artifacts.mjs'],
    ['browser smoke', 'scripts/security/browser-smoke.mjs'],
  ]) {
    console.log(`[release] ${label}`);
    requireSuccess(runCommand(process.execPath, [script, ...args], { cwd, env: releaseEnv }), label);
  }
  console.log('[release] all gates passed');
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  try {
    runReleaseCheck();
  } catch (error) {
    console.error(`[release] ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
