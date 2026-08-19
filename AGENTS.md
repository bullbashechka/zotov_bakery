# Repository Guidelines

## Operating Principles

Answer in the user's language. Inspect affected files before acting and verify uncertainty through code, docs, or command output. Work autonomously; ask only about open product choices or risky actions. Preserve unrelated changes and use the lightest workflow that proves the result.

Use `$code-scout` for non-trivial repository discovery to delegate broad code reading to a lower-cost subagent scout and keep irrelevant file contents out of the primary agent's context.

## Project Structure & Module Organization

This is a Bun workspace with one Astro site in `website/`.

- `website/src/pages/` holds routes; `index.astro` is the home page.
- `website/src/layouts/` and `components/` hold document shells, reusable UI, and React islands.
- `website/src/styles/global.css` owns Tailwind imports and design tokens.
- `website/public/` contains static assets, `robots.txt`, and Cloudflare `_headers`.
- `wrangler.jsonc` defines Cloudflare Pages output.

Keep public, SEO-critical content in `.astro` files. Use React only for isolated client interactions.

## Build, Test, and Development Commands

Use Bun `1.3.14` as pinned in `.bun-version`.

```bash
bun install       # install dependencies
bun run dev       # start Astro locally
bun run typecheck # run Astro and TypeScript diagnostics
bun run build     # create website/dist
bun run preview   # serve the production build
```

`bun run cf:dev` serves the build through Cloudflare Pages. Build before using a deploy command; never deploy without explicit approval.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, and single quotes in script blocks. Name components in PascalCase (`ProductCard.astro`), routes in lowercase (`about.astro`), and CSS classes in kebab-case (`site-container`). Prefer Tailwind and existing dependencies. Fix the owning layer, keep diffs focused, and avoid premature abstractions. Request approval before adding a production dependency.

## Testing Guidelines

No test runner is configured. Every code change must pass the smallest relevant checks, normally `bun run typecheck` and `bun run build`; a non-zero result means unfinished work. Add tests when behavior gains meaningful branches. Validate visual changes in the browser at desktop and mobile widths against Figma.

## Commit & Pull Request Guidelines

Use concise Conventional Commit-style subjects, for example `feat: add bakery hero section`. Pull requests should explain the visible change, link relevant issues, include desktop and mobile screenshots, and list checks run.

## Safety & Configuration

Do not commit or print `.env` values, Cloudflare tokens, or private data. Never edit generated `website/dist/` or `website/.astro/`. Do not commit, push, deploy, switch branches, delete files, or discard changes unless requested. Before deployment, verify the branch, remote, and clean worktree. Set the public canonical URL through `PUBLIC_WEBSITE_URL`; update `_headers` for third-party scripts or embeds.
