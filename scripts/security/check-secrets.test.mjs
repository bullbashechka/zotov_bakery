import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  GITLEAKS_VERSION,
  ensureGitleaks,
  repositoryRoot,
  scanTarget,
  verifyDevVarsIgnore,
  verifySyntheticRejection,
} from "./check-secrets.mjs";

test("the pinned Gitleaks installer returns the expected verified version", async () => {
  const binary = await ensureGitleaks();
  assert.match(binary, new RegExp(`gitleaks-${GITLEAKS_VERSION.replaceAll(".", "\\.")}`));
});

test("Wrangler secret files are ignored while example files remain available", () => {
  verifyDevVarsIgnore(repositoryRoot());
});

test("Gitleaks rejects a synthetic credential without exposing it", async () => {
  const binary = await ensureGitleaks();
  assert.doesNotThrow(() => verifySyntheticRejection(binary));
});

test("scanner unavailability fails closed", () => {
  const missingBinary = join(tmpdir(), "zotov-intentionally-missing-gitleaks");
  assert.throws(() => scanTarget(missingBinary, "dir", repositoryRoot()));
});
