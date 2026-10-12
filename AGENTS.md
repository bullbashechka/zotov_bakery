# Repository Guidelines

## Architecture & Code Discovery

This is a Bun workspace with one Astro site in `website/`. Global styles and design tokens live in `website/src/styles/global.css`.

Keep public, SEO-critical content in `.astro` files. Use React only for isolated client interactions. Follow the style of the existing code.

Use `$code-scout` for non-trivial repository discovery to delegate broad code reading to a lower-cost subagent scout and keep irrelevant file contents out of the primary agent's context.

## Commands & Verification

Run commands from the repository root using the Bun version pinned in `.bun-version`.

```bash
bun install       # install dependencies
bun run dev       # start Astro locally
bun run typecheck # run Astro and TypeScript diagnostics
bun run build     # create website/dist
bun run preview   # serve the production build
bun run hooks:install # install the local pre-push guard once per clone
PUBLIC_WEBSITE_URL=https://zotov.kz PUBLIC_ALLOW_INDEXING=true bun run release:check
```

After code changes, run `bun run typecheck` and `bun run build` with explicit SEO environment values. Fix failures introduced by the changes; report pre-existing failures or environment blockers separately. Documentation-only changes do not require these checks during editing.

Run every release gate locally before each push that updates remote `main` (or `master`), and before a PR merge into that branch. `release:check` is the authoritative command: frozen install, dependency audit/pins, secret/SVG scans, the small Node test suite, UI/Astro/type checks, fresh build, SEO/security artifact checks, and critical browser scenarios. Use `https://zotov.kz` with indexing enabled for production. It does not publish anything.

Install the hook in each clone with `bun run hooks:install`; do not replace an existing hook or hook manager. The guard uses remote destination refs, including `dev:main`, checks a clean checkout of the exact pushed HEAD, and rechecks it after the gates. Feature-branch pushes and deletions do not trigger a release. Local hooks can be bypassed and do not run for GitHub UI merges; the obligation to run all checks still applies. Do not add GitHub Actions workflows or automatic CI/CD without an explicit change to this policy.

Keep tests proportional to risk: prefer integration checks of real contracts and short e2e scenarios for critical user actions. Retain a few cheap unit fixtures only for important logic such as SEO URL validation or malicious content rejection. Delete obsolete, duplicate and maintenance-heavy tests instead of preserving them for test counts. This static site has no backend to test. Keep the existing component ownership gate; avoid duplicating it with snapshot or styling tests.

Validate visual changes in the browser at desktop and mobile widths; compare against Figma when a reference is provided. Include screenshots in PRs when they help review visual changes.

Stop dev or preview processes you started for verification, unless the user requested that they remain running for review.

## Change Boundaries & Configuration

Preserve unrelated changes and data. Removing obsolete files within the requested task is allowed. Never edit generated `website/dist/` or `website/.astro/`.

Do not commit or print `.env` values, Cloudflare tokens, or private data.

Set the public canonical URL through `PUBLIC_WEBSITE_URL`; update `website/public/_headers` when adding third-party scripts or embeds.

## Actions Requiring Authorization

Require explicit user authorization before adding a production dependency, committing, pushing, deploying, switching branches, or discarding changes. Authorization already given for the task does not need to be requested again.

Production is the static site at `https://zotov.kz` on Hoster.kz. Before deployment, verify the branch, remote, and clean worktree, then run the local release gates. `scripts/deploy/hoster.htaccess` provides the Apache configuration; check real HTTPS, redirects, headers and 404 behavior on Hoster after an authorized publication. Browser smoke serves build files locally and does not validate the host configuration. Preserve existing production ZIP artifacts unless replacing them is part of the authorized task.

Cloudflare Pages commands and `wrangler.jsonc` are retained for optional technical previews/legacy deployments, not the primary production path. Deployment still requires explicit authorization.
