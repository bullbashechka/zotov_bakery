import { spawnSync } from 'node:child_process';

export function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
}

export function requireSuccess(result, label) {
  if (result.error) throw new Error(`${label} could not start`);
  if (result.status !== 0) throw new Error(`${label} failed`);
}
