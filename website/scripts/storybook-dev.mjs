import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { dev } from 'astro';

// Polling also supports workspaces whose filesystem does not forward native watch events.
process.env.CHOKIDAR_USEPOLLING = 'true';

// The programmatic API stays in this process, including in an agent environment.
const server = await dev({
  configFile: './astro.catalog.config.mjs',
  server: { host: '127.0.0.1', port: 4322 },
  vite: { server: { strictPort: true, watch: { usePolling: true, interval: 250 } } },
});
const require = createRequire(import.meta.url);
const bin = resolve(dirname(require.resolve('storybook/package.json')), 'dist/bin/dispatcher.js');
const child = spawn(
  process.execPath,
  [bin, 'dev', '-p', '6006', '--host', '127.0.0.1', '--no-open', '--ci'],
  {
    stdio: 'inherit',
    env: { ...process.env, STORYBOOK_ASTRO_DEV: 'true', STORYBOOK_DISABLE_TELEMETRY: '1' },
  },
);
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  child.kill('SIGTERM');
  await server.stop();
  process.exitCode = code;
}
child.on('error', (error) => {
  console.error(error);
  void stop(1);
});
child.on('exit', (code) => {
  void stop(code ?? 0);
});
process.on('SIGINT', () => {
  void stop();
});
process.on('SIGTERM', () => {
  void stop();
});
