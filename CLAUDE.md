# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

The imported `AGENTS.md` holds the binding repository rules: commands, verification, release gates, change boundaries and actions that need authorization. This file adds only what is not in it.

## Project

Static marketing site for ZOTOV bakery (Petropavlovsk, Kazakhstan), built from a Figma layout. The site content, README and `docs/` are in Russian; keep user-facing copy in Russian. Bun workspace root with one package, `website/` (Astro 7 static output, Tailwind CSS 4, TypeScript strict, `@/*` → `website/src/*`). There are currently no React components; animations use GSAP/anime.js from Astro `<script>`s. Node ≥ 22.12 is also required.

## Commands not covered in AGENTS.md

```bash
bun run check:ui          # component ownership gate only (also runs as part of typecheck)
bun run security:check    # dependency audit/pins, Gitleaks, SVG scan
bun run storybook         # Storybook on :6006 + Astro catalog on :4322 (fixed ports)
bun run build:storybook   # standalone website/storybook-static/
node --test scripts/security/check-svg.test.mjs   # run a single Node test file
```

`bun run build` fails without both `PUBLIC_WEBSITE_URL` (HTTPS origin, no path) and `PUBLIC_ALLOW_INDEXING` (`true`/`false`). Use `false` and the preview origin for technical previews. These values are baked in at build time. `PUBLIC_YANDEX_METRIKA_ID` (digits only) enables Metrika and the consent banner; leave it empty to disable both.

`release:check` discovers Node tests automatically: every `*.test.mjs` under `scripts/` and `website/src/`. The browser smoke needs a one-time `node node_modules/playwright/cli.js install --only-shell chromium`. Screenshots and logs go to `artifacts/` (gitignored).

## Architecture

- **Pages** (`website/src/pages/`): `index`, `privacy`, `404`, plus generated `robots.txt.ts` and `sitemap.xml.ts`. Pages compute SEO data, including canonical URLs from `lib/site-origin.mjs`, robots and JSON-LD, then pass it to `layouts/BaseLayout.astro`. Pages and layouts may not contain `<style>`.
- **Content/data** lives in typed modules in `website/src/lib/`, not in components. `site.ts` holds contacts, navigation, section IDs and WhatsApp message templates. Section modules include `faq.ts`, `assortment.ts` and `history.ts`. JSON-LD on the home page must match the visible contacts; the artifact gate checks this.
- **Component ownership model** (see `docs/ui-refactor.md`): `website/src/components/` is flat, with no subfolders. Each component owns its own visuals. Public props never accept `style`/`class`/`className`/CSS objects, spreads or `HTMLAttributes`. External placement (margin, gap, flex/grid, position, with responsive overrides through `at={{ large: {...} }}`) is done only by wrapping the component in `Wrapper.astro`. `:global(...)` is allowed only for the generated markup allowlisted in `website/scripts/check-ui.mjs`. This is enforced by AST analysis in `check-ui.mjs`, which runs before `astro check`.
- **Adding a component** requires a typed example in `website/catalog/examples.ts` and `website/stories/<Name>.stories.ts`. The story uses `renderExample` against the real Astro build, not copied HTML; `check:ui` fails if the story is missing. `catalog/` is a separate Astro `srcDir` (`astro.catalog.config.mjs`), so its examples never become site routes.
- **CSP**: Astro generates a hash-based CSP (`website/astro.config.mjs`). Inline scripts in `website/src/scripts/*.inline.js` are imported with `?raw` and their SHA-256 hashes are computed in the config. A new inline script must be added to that hash list. Allowing a new third-party origin requires updating both the CSP directives there and `website/public/_headers`.
- **Release/security tooling** (`scripts/`): `security/release-check.mjs` orchestrates the gates. `security/check-artifacts.mjs` validates `website/dist` (SEO, CSP, no leaked sources), and `security/browser-smoke.mjs` runs Playwright at 390/1440 px and with JS disabled. `checks/pre-push.mjs` is the pre-push guard. `deploy/hoster.htaccess` is the production Apache config. `docs/local-checks.md` explains why each gate exists; older dated reports in `docs/` are historical snapshots.
- **Deployment**: Production is a manual upload to Hoster.kz (Plesk); see `docs/domain-launch.md`. `cf:deploy*` scripts are legacy Cloudflare Pages previews and run `release:check` first.
