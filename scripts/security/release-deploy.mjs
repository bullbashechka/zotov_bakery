#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { requireSuccess, runCommand as defaultRunCommand } from './command.mjs';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function parseJsonc(source) {
  let output = '';
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (quoted) {
      output += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') {
      quoted = true;
      output += character;
    } else if (character === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      output += '\n';
    } else if (character === '/' && next === '*') {
      index += 2;
      while (index < source.length - 1 && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
      index += 1;
    } else {
      output += character;
    }
  }
  return JSON.parse(output.replace(/,\s*([}\]])/g, '$1'));
}

export function readDeployConfiguration(cwd) {
  const config = parseJsonc(readFileSync(resolve(cwd, 'wrangler.jsonc'), 'utf8'));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(config.name ?? '')) throw new Error('Invalid Pages project name in wrangler.jsonc');
  if (resolve(cwd, config.pages_build_output_dir ?? '') !== resolve(cwd, 'website/dist')) {
    throw new Error('Wrangler output directory must be website/dist');
  }
  return { projectName: config.name };
}

function capturedGit(runCommand, cwd, args, label) {
  const result = runCommand('git', args, { cwd, env: process.env, capture: true });
  requireSuccess(result, label);
  return result.stdout.trim();
}

export function deployRelease({
  mode,
  cwd = defaultRoot,
  env = process.env,
  runCommand = defaultRunCommand,
} = {}) {
  if (!['production', 'preview'].includes(mode)) {
    throw new Error('Usage: release-deploy.mjs <production|preview>');
  }

  const status = capturedGit(runCommand, cwd, ['status', '--porcelain=v1', '--untracked-files=all'], 'Git status check');
  if (status) throw new Error('Deployment requires a clean worktree, including no untracked files');
  const branch = capturedGit(runCommand, cwd, ['branch', '--show-current'], 'Git branch check');
  if (!branch) throw new Error('Deployment is not allowed from a detached HEAD');
  if (mode === 'production' && branch !== 'main') throw new Error('Production deployment is only allowed from main');
  if (mode === 'preview' && ['dev', 'main'].includes(branch)) {
    throw new Error('Preview deployment requires a separate feature branch');
  }
  // Capture this value only to verify that the configured remote exists. Never print it.
  const remote = capturedGit(runCommand, cwd, ['config', '--get', 'remote.origin.url'], 'Git remote check');
  if (!remote) throw new Error('The origin remote is not configured');
  const head = capturedGit(runCommand, cwd, ['rev-parse', 'HEAD'], 'Git HEAD check');
  if (!head) throw new Error('Git HEAD could not be resolved');

  const { projectName } = readDeployConfiguration(cwd);
  requireSuccess(
    runCommand(process.execPath, ['scripts/security/release-check.mjs'], { cwd, env }),
    'release check',
  );

  const finalStatus = capturedGit(runCommand, cwd, ['status', '--porcelain=v1', '--untracked-files=all'], 'Final Git status check');
  const finalHead = capturedGit(runCommand, cwd, ['rev-parse', 'HEAD'], 'Final Git HEAD check');
  const finalBranch = capturedGit(runCommand, cwd, ['branch', '--show-current'], 'Final Git branch check');
  const finalRemote = capturedGit(runCommand, cwd, ['config', '--get', 'remote.origin.url'], 'Final Git remote check');
  if (finalStatus || finalHead !== head || finalBranch !== branch || finalRemote !== remote) {
    throw new Error('Repository state changed during release checks; refusing deployment');
  }

  const deploymentBranch = mode === 'production' ? 'main' : 'preview';
  const wrangler = resolve(cwd, 'node_modules/wrangler/bin/wrangler.js');
  const args = [
    wrangler,
    'pages',
    'deploy',
    'website/dist',
    `--project-name=${projectName}`,
    `--branch=${deploymentBranch}`,
  ];
  console.log(`[deploy] gates passed; deploying ${mode} artifact`);
  requireSuccess(runCommand(process.execPath, args, { cwd, env }), 'Wrangler Pages deployment');
  if (mode === 'preview') console.log('[deploy] preview branch alias: preview');
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: release-deploy.mjs <production|preview>');
    deployRelease({ mode: process.argv[2] });
  } catch (error) {
    console.error(`[deploy] ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
