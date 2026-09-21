#!/usr/bin/env node

import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { requireSuccess, runCommand as defaultRunCommand } from './command.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(scriptDirectory, '../..');

export function runSecurityChecks({ cwd = defaultRoot, runCommand = defaultRunCommand } = {}) {
  const checks = [
    ['bun audit', 'bun', ['audit']],
    ['installed dependency pins', process.execPath, ['scripts/security/check-installed.mjs']],
    ['secret scan', process.execPath, ['scripts/security/check-secrets.mjs']],
    ['SVG scan', process.execPath, ['scripts/security/check-svg.mjs']],
  ];

  for (const [label, command, args] of checks) {
    console.log(`[security] ${label}`);
    requireSuccess(runCommand(command, args, { cwd, env: process.env }), label);
  }
  console.log('[security] all checks passed');
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  try {
    runSecurityChecks();
  } catch (error) {
    console.error(`[security] ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
