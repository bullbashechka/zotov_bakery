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
```

After code changes, run `bun run typecheck` and `bun run build`. Fix failures introduced by the changes; report pre-existing failures or environment blockers separately. Documentation-only changes do not require these checks. No test runner is configured.

Validate visual changes in the browser at desktop and mobile widths; compare against Figma when a reference is provided. Include screenshots in PRs when they help review visual changes.

Stop dev or preview processes you started for verification, unless the user requested that they remain running for review.

## Change Boundaries & Configuration

Preserve unrelated changes and data. Removing obsolete files within the requested task is allowed. Never edit generated `website/dist/` or `website/.astro/`.

Do not commit or print `.env` values, Cloudflare tokens, or private data.

Set the public canonical URL through `PUBLIC_WEBSITE_URL`; update `website/public/_headers` when adding third-party scripts or embeds.

## Actions Requiring Authorization

Require explicit user authorization before adding a production dependency, committing, pushing, deploying, switching branches, or discarding changes. Authorization already given for the task does not need to be requested again.

Before deployment, verify the branch, remote, and clean worktree, then run the build. `wrangler.jsonc` defines Cloudflare Pages output; `bun run cf:dev` serves the build locally through Cloudflare Pages.
