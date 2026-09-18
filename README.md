# Zotov Landing

Публичный сайт пекарни, реализуемый по макету Figma.

## Стек

- Astro + TypeScript — статичные SEO-страницы.
- Tailwind CSS 4 — стили и дизайн-токены.
- React — только для будущих интерактивных островков.
- Bun — зависимости и команды проекта.
- Cloudflare Pages — production и preview-деплои.

Бэкенд, база данных, личный кабинет и оплата намеренно не входят в первый этап. При появлении формы заказа добавим минимальную Pages Function с Turnstile, не меняя публичную архитектуру сайта.

## Локальный запуск

Нужен Bun `1.3.14`.

```bash
bun install
bun run dev
```

Проверки и сборка:

```bash
bun run check:ui
bun run security:check  # audit, установленные версии, секреты и SVG
bun run release:check   # полный локальный барьер перед публикацией
```

`release:check` требует `PUBLIC_WEBSITE_URL` с HTTPS-origin без пути, проверяет
закреплённую версию Bun, выполняет frozen install, security checks, Node-тесты,
typecheck, новую production-сборку, проверку артефакта и browser smoke.

Для browser smoke один раз установите Chromium из закреплённой версии Playwright:

```bash
node node_modules/playwright/cli.js install --only-shell chromium
```

На Linux/CI добавьте `--with-deps` для системных библиотек. Сканер секретов
автоматически загружает закреплённый Gitleaks с проверкой SHA-256, проверяет
текущие исходники и доступную Git-историю; ему нужен доступ к GitHub.

```bash
PUBLIC_WEBSITE_URL=https://example.com bun run release:check
```

[Исходный аудит](docs/security-audit-2026-09-18.md) и
[статус исправлений и оставшиеся проверки production](docs/security-remediation-2026-09-18.md).

## Библиотека компонентов

Все UI-компоненты находятся плоско в `website/src/components/`. Визуальные стили принадлежат компоненту; внешнее размещение задаётся через `Wrapper`.

```bash
bun run storybook        # Storybook :6006 + Astro-примеры :4322, обновление из исходников
bun run build:storybook  # автономная библиотека в website/storybook-static
```

У каждого компонента есть история. `bun run check:ui` проверяет архитектурные границы и покрытие историями. [Отчёт по файлам, API и проверкам](docs/ui-refactor.md).

## Cloudflare Pages

Конфигурация Pages хранится в `wrangler.jsonc`. Production-деплой разрешён только
из чистой ветки `dev`; preview — из отдельной feature-ветки и публикуется под
branch alias `preview`. Обе команды сначала повторно выполняют полный release check:

```bash
PUBLIC_WEBSITE_URL=https://example.com bun run cf:deploy
PUBLIC_WEBSITE_URL=https://preview.example.com bun run cf:deploy:preview
```

GitHub Actions запускает те же release gates для pull request и push в `dev`, без
deploy credentials и без публикации. Чтобы Cloudflare Git integration не обходила
этот барьер, в dashboard нужно отдельно задать `bun run release:check` как build
command, установить Chromium headless shell и его системные зависимости в build
environment, а также включить required check/branch protection до автодеплоя.
До этой настройки прохождение workflow само по себе не блокирует Cloudflare.
`https://zotov-landing.pages.dev` в workflow — только безопасный CI fixture для
canonical-проверок, а не утверждение о реальном production-домене.

После создания проекта в Cloudflare Pages замените значение `name` в `wrangler.jsonc` на имя Pages-проекта, если оно будет отличаться от `zotov-landing`.
