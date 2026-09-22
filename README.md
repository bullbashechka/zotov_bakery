# Zotov Landing

Публичный сайт пекарни ZOTOV Bakery. Это статический Astro-сайт, созданный по макету Figma: основные страницы остаются в `.astro` для SEO, а React используется только там, где понадобится изолированная интерактивность.

## Стек

- Astro 7 и TypeScript
- Tailwind CSS 4
- React 19
- Bun 1.3.14
- Cloudflare Pages

## Требования

- Bun `1.3.14` — версия зафиксирована в [.bun-version](.bun-version).
- Node.js `22.12.0` или новее — требуется зависимостями сайта и вспомогательными скриптами.

## Быстрый старт

Установите зависимости из корня репозитория и запустите dev-сервер:

```bash
bun install
bun run dev
```

Сайт будет доступен на адресе, который выведет Astro (обычно `http://localhost:4321`).

## Основные команды

| Команда | Назначение |
| --- | --- |
| `bun run dev` | Запустить сайт в режиме разработки. |
| `bun run typecheck` | Проверить UI-границы и TypeScript/Astro-диагностику. |
| `bun run build` | Собрать production-версию в `website/dist/`. |
| `bun run preview` | Открыть собранный сайт локально. |
| `bun run check:ui` | Проверить правила устройства UI-компонентов и наличие Storybook-историй. |
| `bun run security:check` | Проверить аудит зависимостей, секреты и SVG-файлы. |
| `bun run release:check` | Выполнить полный локальный набор проверок перед публикацией. |
| `bun run storybook` | Запустить библиотеку компонентов на `:6006` и Astro-примеры на `:4322`. |
| `bun run build:storybook` | Собрать автономную библиотеку в `website/storybook-static/`. |

После изменения кода запустите:

```bash
bun run typecheck
bun run build
```

## Переменные окружения

`PUBLIC_WEBSITE_URL` задаёт публичный HTTPS-origin сайта. Он используется для canonical URL, sitemap, Open Graph и структурированных данных. Значение должно быть origin без пути, query-параметров, fragment и учётных данных.

```bash
PUBLIC_WEBSITE_URL=https://example.com bun run release:check
```

`PUBLIC_YANDEX_METRIKA_ID` включает Яндекс Метрику и баннер согласия. Значение должно состоять только из цифр; пустая переменная отключает оба элемента.

```bash
PUBLIC_WEBSITE_URL=https://example.com \
PUBLIC_YANDEX_METRIKA_ID=12345678 \
bun run release:check
```

Для Метрики создайте JavaScript-события `whatsapp_click`, `phone_click`, `map_bakery_click`, `map_aimer_click` и `instagram_click`. Вебвизор и автоматическое отслеживание ссылок должны быть выключены.

`release:check` выполняет frozen install, security checks, тесты, typecheck, production-сборку, проверку артефакта и browser smoke. Для последней проверки один раз установите Chromium из зафиксированной версии Playwright:

```bash
node node_modules/playwright/cli.js install --only-shell chromium
```

В Linux или CI добавьте `--with-deps`, чтобы поставить системные зависимости браузера. Проверка секретов скачивает закреплённый Gitleaks и требует доступа к GitHub.

## Структура

```text
website/
  src/pages/        SEO-страницы и маршруты
  src/components/   Astro-компоненты сайта
  src/styles/       глобальные стили и дизайн-токены
  src/lib/          данные и общая логика
  public/           шрифты, SVG и статические изображения
  stories/          истории компонентов
scripts/security/   проверки безопасности и release-процедуры
docs/               аудиты и технические отчёты
```

Визуальные стили принадлежат компонентам, а внешнее размещение задаёт `Wrapper`. Подробности о UI-библиотеке, API компонентов и проверках — в [docs/ui-refactor.md](docs/ui-refactor.md).

## Cloudflare Pages

[wrangler.jsonc](wrangler.jsonc) задаёт имя Pages-проекта и каталог сборки `website/dist`. Перед первой публикацией замените `name`, если имя проекта в Cloudflare отличается от `zotov-landing`.

```bash
# Локальный запуск production-сборки через Cloudflare Pages
bun run cf:dev

# Production и preview-публикация
PUBLIC_WEBSITE_URL=https://example.com bun run cf:deploy
PUBLIC_WEBSITE_URL=https://preview.example.com bun run cf:deploy:preview
```

Команды публикации сначала выполняют `release:check`. Production-публикация разрешена из чистой ветки `dev`, preview — из отдельной feature-ветки с alias `preview`.

## Документация

- [Аудит безопасности](docs/security-audit-2026-09-18.md)
- [Статус исправлений и оставшиеся production-проверки](docs/security-remediation-2026-09-18.md)
- [Готовность этапа 15](docs/stage15-readiness.md)
- [Список задач](TASKS.md)
