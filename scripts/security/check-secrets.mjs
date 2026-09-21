#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, platform, arch, tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const GITLEAKS_VERSION = "8.30.1";

const RELEASE_BASE = `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}`;
// Archive hashes come from the pinned release's checksums file. Binary hashes
// additionally protect cached extracted executables from later modification.
const INSTALLS = Object.freeze({
  "darwin-arm64": {
    archiveSha256: "b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5",
    binarySha256: "ba52fb1bfabbcde42f032afad3d6e0b19dff8ed105229a16e7caa338bbc0e84f",
  },
  "darwin-x64": {
    archiveSha256: "dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709",
    binarySha256: "cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291",
  },
  "linux-arm64": {
    archiveSha256: "e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080",
    binarySha256: "00e91bbe655bd7c47753e8cfe61cb76ea1a5d7e7702fe161ee40102b46b3823b",
  },
  "linux-x64": {
    archiveSha256: "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb",
    binarySha256: "88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509",
  },
});

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const SKIPPED_BINARY_EXTENSIONS = new Set([
  ".7z", ".avif", ".avi", ".bmp", ".br", ".eot", ".gif", ".gz", ".ico",
  ".jpeg", ".jpg", ".mov", ".mp3", ".mp4", ".otf", ".pdf", ".png", ".tar",
  ".tif", ".tiff", ".ttf", ".wav", ".webm", ".webp", ".woff", ".woff2", ".zip",
]);

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function cacheRoot() {
  const base = platform() === "darwin"
    ? join(homedir(), "Library", "Caches")
    : join(homedir(), ".cache");
  return join(base, "zotov-landing", "security-tools");
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: options.timeout ?? 30_000,
  });
}

function checkedGit(repoRoot, args) {
  const result = run("git", args, { cwd: repoRoot });
  if (result.error || result.status !== 0) {
    throw new Error("Git command failed");
  }
  return result.stdout;
}

export function repositoryRoot() {
  const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const gitRoot = checkedGit(scriptRoot, ["rev-parse", "--show-toplevel"]).trim();
  if (realpathSync(gitRoot) !== realpathSync(scriptRoot)) {
    throw new Error("Security script is not running from its expected repository");
  }
  return scriptRoot;
}

async function download(url, destination) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error("Pinned scanner download failed");
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()), { mode: 0o600 });
}

function verifyBinary(binaryPath, expectedSha256) {
  if (!existsSync(binaryPath) || sha256File(binaryPath) !== expectedSha256) return false;
  const result = run(binaryPath, ["version"]);
  return !result.error
    && result.status === 0
    && new RegExp(`(^|\\D)${GITLEAKS_VERSION.replaceAll(".", "\\.")}($|\\D)`).test(result.stdout);
}

export async function ensureGitleaks() {
  const targetKey = `${platform()}-${arch()}`;
  const metadata = INSTALLS[targetKey];
  if (!metadata) throw new Error("Unsupported platform for pinned scanner");

  const installDir = join(cacheRoot(), `gitleaks-${GITLEAKS_VERSION}-${targetKey}`);
  const binaryPath = join(installDir, "gitleaks");
  if (verifyBinary(binaryPath, metadata.binarySha256)) return binaryPath;

  mkdirSync(cacheRoot(), { recursive: true, mode: 0o700 });
  const workDir = mkdtempSync(join(cacheRoot(), ".install-"));
  try {
    const releaseTarget = targetKey.replace("-", "_");
    const archiveName = `gitleaks_${GITLEAKS_VERSION}_${releaseTarget}.tar.gz`;
    const archivePath = join(workDir, archiveName);
    await download(`${RELEASE_BASE}/${archiveName}`, archivePath);
    if (sha256File(archivePath) !== metadata.archiveSha256) {
      throw new Error("Pinned scanner archive checksum mismatch");
    }

    const extractResult = run("tar", ["-xzf", archivePath, "-C", workDir, "gitleaks"]);
    if (extractResult.error || extractResult.status !== 0) {
      throw new Error("Pinned scanner extraction failed");
    }
    const extracted = join(workDir, "gitleaks");
    if (sha256File(extracted) !== metadata.binarySha256) {
      throw new Error("Pinned scanner binary checksum mismatch");
    }
    chmodSync(extracted, 0o700);

    mkdirSync(installDir, { recursive: true, mode: 0o700 });
    const incoming = join(installDir, `.gitleaks-${process.pid}`);
    copyFileSync(extracted, incoming);
    chmodSync(incoming, 0o700);
    if (existsSync(binaryPath)) unlinkSync(binaryPath);
    renameSync(incoming, binaryPath);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }

  if (!verifyBinary(binaryPath, metadata.binarySha256)) {
    throw new Error("Pinned scanner verification failed after installation");
  }
  return binaryPath;
}

function parseReport(reportPath) {
  if (!existsSync(reportPath)) return null;
  try {
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    return Array.isArray(report) ? report.length : null;
  } catch {
    return null;
  }
}

export function scanTarget(binaryPath, command, target, options = {}) {
  const reportDir = mkdtempSync(join(tmpdir(), "zotov-gitleaks-report-"));
  const reportPath = join(reportDir, "report.json");
  try {
    const args = [
      command,
      "--no-banner",
      "--no-color",
      "--redact=100",
      "--ignore-gitleaks-allow",
      "--max-target-megabytes=5",
      "--exit-code=10",
      "--report-format=json",
      `--report-path=${reportPath}`,
      "--timeout=300",
    ];
    if (options.logOptions) args.push(`--log-opts=${options.logOptions}`);
    args.push(target);

    const result = run(binaryPath, args, { cwd: options.cwd, timeout: 330_000 });
    const findingCount = parseReport(reportPath);
    if (!result.error && result.status === 0 && findingCount === 0) {
      return { clean: true, findingCount: 0 };
    }
    if (!result.error && result.status === 10 && Number.isInteger(findingCount) && findingCount > 0) {
      return { clean: false, findingCount };
    }
    throw new Error("Secret scanner execution failed");
  } finally {
    rmSync(reportDir, { recursive: true, force: true });
  }
}

function safeRelativePath(repoRoot, file) {
  const absolute = resolve(repoRoot, file);
  const rel = relative(repoRoot, absolute);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || rel.startsWith(sep)) {
    throw new Error("Git returned a path outside the repository");
  }
  return { absolute, rel };
}

export function stageCurrentSource(repoRoot) {
  const stageDir = mkdtempSync(join(tmpdir(), "zotov-secret-source-"));
  let stagedCount = 0;
  let skippedCount = 0;
  try {
    const output = checkedGit(repoRoot, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
    const files = output.split("\0").filter(Boolean);
    for (const file of files) {
      const { absolute, rel } = safeRelativePath(repoRoot, file);
      if (!existsSync(absolute)) continue;
      const info = lstatSync(absolute);
      if (info.isDirectory()) continue;
      if (info.size > MAX_SOURCE_BYTES || SKIPPED_BINARY_EXTENSIONS.has(extname(file).toLowerCase())) {
        skippedCount += 1;
        continue;
      }

      const destination = join(stageDir, rel);
      mkdirSync(dirname(destination), { recursive: true });
      if (info.isSymbolicLink()) {
        writeFileSync(destination, readlinkSync(absolute));
      } else if (info.isFile()) {
        cpSync(absolute, destination);
      } else {
        skippedCount += 1;
        continue;
      }
      stagedCount += 1;
    }
    return { stageDir, stagedCount, skippedCount };
  } catch (error) {
    rmSync(stageDir, { recursive: true, force: true });
    throw error;
  }
}

export function verifyDevVarsIgnore(repoRoot) {
  const ignored = [".dev.vars", ".dev.vars.production", "website/.dev.vars", "website/.dev.vars.local"];
  for (const candidate of ignored) {
    const result = run("git", ["check-ignore", "--quiet", "--no-index", candidate], { cwd: repoRoot });
    if (result.error || result.status !== 0) throw new Error("Wrangler local secret ignore rule is missing");
  }
  for (const candidate of [".dev.vars.example", "website/.dev.vars.example"]) {
    const result = run("git", ["check-ignore", "--quiet", "--no-index", candidate], { cwd: repoRoot });
    if (result.error || result.status !== 1) throw new Error("Safe Wrangler example file is unexpectedly ignored");
  }
}

export function verifySyntheticRejection(binaryPath) {
  const fixtureDir = mkdtempSync(join(tmpdir(), "zotov-secret-negative-"));
  try {
    const fakeToken = ["ghp_", "aB3dE5fG7hJ9kL2mN4pQ6rS8tU1vW3xY5zA7"].join("");
    writeFileSync(join(fixtureDir, "fixture.js"), `const syntheticCredential = ${JSON.stringify(fakeToken)};\n`);
    const result = scanTarget(binaryPath, "dir", fixtureDir);
    if (result.clean || result.findingCount < 1) throw new Error("Synthetic credential was not rejected");
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
}

async function main() {
  const mode = process.argv[2] ?? "scan";
  if (!["scan", "--self-test", "--install-only"].includes(mode)) {
    throw new Error("Usage: node scripts/security/check-secrets.mjs [scan|--self-test|--install-only]");
  }

  const repoRoot = repositoryRoot();
  const binaryPath = await ensureGitleaks();
  console.log(`[secrets] verified Gitleaks ${GITLEAKS_VERSION}`);

  if (mode === "--install-only") return;
  verifyDevVarsIgnore(repoRoot);
  verifySyntheticRejection(binaryPath);
  console.log("[secrets] configuration and synthetic rejection: passed");
  if (mode === "--self-test") return;

  const staged = stageCurrentSource(repoRoot);
  let failed = false;
  try {
    const current = scanTarget(binaryPath, "dir", staged.stageDir);
    if (current.clean) {
      console.log(`[secrets] current source: clean (${staged.stagedCount} files; ${staged.skippedCount} binary/oversized skipped)`);
    } else {
      failed = true;
      console.error(`[secrets] current source: FAILED (${current.findingCount} finding(s); details suppressed)`);
    }
  } finally {
    rmSync(staged.stageDir, { recursive: true, force: true });
  }

  const history = scanTarget(binaryPath, "git", repoRoot, { cwd: repoRoot, logOptions: "--all" });
  if (history.clean) {
    console.log("[secrets] reachable Git history: clean");
  } else {
    failed = true;
    console.error(`[secrets] reachable Git history: FAILED (${history.findingCount} finding(s); details suppressed)`);
  }
  if (failed) process.exitCode = 1;
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  main().catch(() => {
    console.error("[secrets] ERROR: secret scanning could not complete safely; release must stop");
    process.exitCode = 1;
  });
}
