import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// A frozen lockfile alone does not detect stale workspace-local packages.
export function checkInstalled(root = process.cwd()) {
  const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
  const manifest = read(join(root, 'package.json'));
  const website = read(join(root, 'website/package.json'));
  const exactPins = Object.fromEntries(
    [manifest.dependencies, manifest.devDependencies, website.dependencies, website.devDependencies]
      .flatMap((dependencies) => Object.entries(dependencies ?? {}))
      .filter(([, version]) => /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)),
  );
  const expected = { ...exactPins, ...manifest.overrides };
  const seen = new Set();
  const found = new Set();
  function visit(directory) {
    if (!existsSync(directory)) return;
    const real = realpathSync(directory);
    if (seen.has(real)) return;
    seen.add(real);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const path = join(directory, entry.name);
      if (entry.name.startsWith('@')) { visit(path); continue; }
      const packagePath = join(path, 'package.json');
      if (!existsSync(packagePath)) continue;
      const pkg = read(packagePath);
      if (Object.hasOwn(expected, pkg.name)) {
        if (pkg.version !== expected[pkg.name]) throw new Error(`Installed ${pkg.name}@${pkg.version} does not match pinned ${expected[pkg.name]}`);
        found.add(pkg.name);
      }
      visit(join(path, 'node_modules'));
    }
  }
  visit(join(root, 'node_modules'));
  visit(join(root, 'website/node_modules'));
  for (const name of Object.keys(expected)) {
    if (!found.has(name)) throw new Error(`Missing installed pinned dependency: ${name}`);
  }
  return found.size;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { console.log(`Installed dependency pins OK: ${checkInstalled()} packages.`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
