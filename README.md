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
bun run typecheck
bun run build
```

## Библиотека компонентов

Все UI-компоненты находятся плоско в `website/src/components/`. Визуальные стили принадлежат компоненту; внешнее размещение задаётся через `Wrapper`.

```bash
bun run storybook        # Storybook :6006 + Astro-примеры :4322, обновление из исходников
bun run build:storybook  # автономная библиотека в website/storybook-static
```

У каждого компонента есть история. `bun run check:ui` проверяет архитектурные границы и покрытие историями. [Отчёт по файлам, API и проверкам](docs/ui-refactor.md).

## Cloudflare Pages

Подключите GitHub-репозиторий в Cloudflare Pages и укажите:

| Настройка | Значение |
| --- | --- |
| Production branch | `dev` |
| Build command | `bun install --frozen-lockfile && bun run build` |
| Build output directory | `website/dist` |
| Root directory | оставить пустым |

Каждый push в `dev` публикует production-версию, а pull request получает отдельный preview URL. Перед ручным деплоем соберите проект (`bun run build`), затем используйте `bun run cf:deploy` или `bun run cf:deploy:preview`.

После создания проекта в Cloudflare Pages замените значение `name` в `wrangler.jsonc` на имя Pages-проекта, если оно будет отличаться от `zotov-landing`.
