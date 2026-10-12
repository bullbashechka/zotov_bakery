# Zotov Landing

Публичный сайт пекарни ZOTOV Bakery. Это статический Astro-сайт, созданный по макету Figma: основные страницы остаются в `.astro` для SEO, а React используется только там, где понадобится изолированная интерактивность.

## Стек

- Astro 7 и TypeScript
- Tailwind CSS 4
- React 19
- Bun 1.3.14
- Статический хостинг Hoster.kz (`https://zotov.kz`); Cloudflare Pages — дополнительный технический предпросмотр

## Требования

- Bun `1.3.14` — версия зафиксирована в [.bun-version](.bun-version).
- Node.js `22.12.0` или новее — требуется зависимостями сайта и вспомогательными скриптами.

## Быстрый старт

Установите зависимости из корня репозитория и запустите dev-сервер:

```bash
bun install
bun run hooks:install
bun run dev
```

Сайт будет доступен на адресе, который выведет Astro (обычно `http://localhost:4321`).

## Основные команды

| Команда | Назначение |
| --- | --- |
| `bun run dev` | Запустить сайт в режиме разработки. |
| `bun run typecheck` | Проверить UI-границы и TypeScript/Astro-диагностику. |
| `PUBLIC_WEBSITE_URL=… PUBLIC_ALLOW_INDEXING=… bun run build` | Собрать production-версию в `website/dist/`; обе SEO-переменные обязательны. |
| `bun run preview` | Открыть собранный сайт локально. |
| `bun run check:ui` | Проверить правила устройства UI-компонентов и наличие Storybook-историй. |
| `bun run security:check` | Проверить аудит зависимостей, секреты и SVG-файлы. |
| `bun run release:check` | Выполнить полный локальный набор проверок перед публикацией. |
| `bun run hooks:install` | Один раз на клон установить проверки перед пушем в `main`/`master`. |
| `bun run package:hoster` | Пройти локальные release-проверки и создать ZIP для загрузки в Plesk. |
| `bun run storybook` | Запустить библиотеку компонентов на `:6006` и Astro-примеры на `:4322`. |
| `bun run build:storybook` | Собрать автономную библиотеку в `website/storybook-static/`. |

После изменения кода запустите:

```bash
bun run typecheck
PUBLIC_WEBSITE_URL=https://zotov.kz PUBLIC_ALLOW_INDEXING=true bun run build
```

## Переменные окружения

`PUBLIC_WEBSITE_URL` задаёт публичный HTTPS-origin сайта. Он используется для canonical URL, sitemap, Open Graph и структурированных данных. Значение должно быть origin без пути, query-параметров, fragment и учётных данных. Production-сборка требует переменную.

`PUBLIC_ALLOW_INDEXING` принимает только `true` или `false`. Production-сборка требует явный выбор: при `false` страницы получают `noindex,follow`, robots.txt не объявляет sitemap, а sitemap остаётся пустым. Для preview и временных технических доменов используйте `false`.

Для Cloudflare Pages безопасные значения временного запуска также явно закреплены в `wrangler.jsonc` для Preview и Production: домен `zotov-landing.pages.dev`, индексация выключена. При подключении брендового домена обновите Wrangler-конфигурацию вместе с переменными окружения и только после проверки переключите индексацию на `true`.

SEO-переменные необходимо передавать до запуска сборки Astro. Изменение окружения после сборки не переписывает готовые HTML, robots.txt и sitemap.xml: требуется новая сборка. Для основного сайта используйте `PUBLIC_WEBSITE_URL=https://zotov.kz` и `PUBLIC_ALLOW_INDEXING=true`; технические предпросмотры собирайте со своим origin и `false`.

Проверка артефактов входит в `release:check` и контролирует метаданные, canonical, robots, XML sitemap и соответствие JSON-LD видимым контактам. Короткий browser smoke запускает готовые файлы локально, проверяет основные взаимодействия на 390/1440 px и доступность контента без JavaScript; снимки сохраняются в `artifacts/checks/`. Сервер и браузер останавливаются автоматически. Он не подтверждает настройки Apache/Hoster: HTTPS, редиректы, HTTP-заголовки и 404 проверяются на опубликованном домене отдельно.

```bash
PUBLIC_WEBSITE_URL=https://zotov.kz \
PUBLIC_ALLOW_INDEXING=true \
bun run release:check
```

`PUBLIC_YANDEX_METRIKA_ID` включает Яндекс Метрику и баннер согласия. Значение должно состоять только из цифр; пустая переменная отключает оба элемента.

```bash
PUBLIC_WEBSITE_URL=https://example.com \
PUBLIC_ALLOW_INDEXING=true \
PUBLIC_YANDEX_METRIKA_ID=12345678 \
bun run release:check
```

Для Метрики создайте JavaScript-события `whatsapp_click`, `phone_click`, `map_bakery_click`, `map_aimer_click` и `instagram_click`. Вебвизор и автоматическое отслеживание ссылок должны быть выключены.

`release:check` выполняет frozen install, security checks, тесты, typecheck, production-сборку, проверку артефакта и browser smoke. Для последней проверки один раз установите Chromium из зафиксированной версии Playwright:

```bash
node node_modules/playwright/cli.js install --only-shell chromium
```

В Linux добавьте `--with-deps`, чтобы поставить системные зависимости браузера. Проверка секретов скачивает закреплённый Gitleaks при первом запуске и проверяет его хеш. Аудит зависимостей требует доступа к реестру; недоступность проверки останавливает пуш.

## Локальные проверки перед main

GitHub Actions удалены. Перед каждым пушем в production-ветку `main` (также `master`) и перед merge через GitHub выполните весь `release:check` с production-переменными из примера выше. Команда ничего не публикует. Не обходите проверки через `--no-verify`.

`bun run hooks:install` устанавливает только `pre-push`, сохраняя остальные hooks. При существующем `pre-push` или `core.hooksPath` установщик останавливается: подключите [.githooks/pre-push](.githooks/pre-push) к своему менеджеру hooks вручную, передавая stdin Git. Установка локальная: после клонирования её нужно повторить.

Hook смотрит на целевую ветку remote, поэтому работает и для `git push origin dev:main`. Он требует чистое рабочее дерево и checkout отправляемого коммита, запускает все проверки с `https://zotov.kz` и `PUBLIC_ALLOW_INDEXING=true`, затем повторно сверяет состояние. Другие ветки и удаление refs не запускают release-проверки. GitHub UI не запускает локальные hooks; перед merge требуется самостоятельный локальный прогон соответствующего состояния кода. Публикация на Hoster остаётся отдельным согласованным действием.

Обоснование состава проверок и удалений: [локальный аудит](docs/local-checks.md).

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
scripts/checks/     локальная установка hook и проверка отправляемого коммита
docs/               аудиты и технические отчёты
```

Визуальные стили принадлежат компонентам, а внешнее размещение задаёт `Wrapper`. Подробности о UI-библиотеке, API компонентов и проверках — в [docs/ui-refactor.md](docs/ui-refactor.md).

## Дополнительный предпросмотр Cloudflare Pages

[wrangler.jsonc](wrangler.jsonc) задаёт имя Pages-проекта и каталог сборки `website/dist`. Перед первой публикацией замените `name`, если имя проекта в Cloudflare отличается от `zotov-landing`.

```bash
# Локальный запуск production-сборки через Cloudflare Pages
bun run cf:dev

# Production и preview-публикация
PUBLIC_WEBSITE_URL=https://example.com PUBLIC_ALLOW_INDEXING=true bun run cf:deploy
PUBLIC_WEBSITE_URL=https://preview.example.com PUBLIC_ALLOW_INDEXING=false bun run cf:deploy:preview
```

Команды публикации сначала выполняют `release:check`. Production-публикация разрешена из чистой ветки `main`, preview — из отдельной feature-ветки с alias `preview`.

Эти команды сохранены для старого Pages-проекта и технического предпросмотра. Основной сайт публикуется на Hoster по [инструкции запуска](docs/domain-launch.md), с [Apache-конфигурацией](scripts/deploy/hoster.htaccess). Пуш в GitHub сам по себе не должен публиковать сайт.

## Документация

- [Аудит безопасности](docs/security-audit-2026-09-18.md)
- [Статус исправлений и оставшиеся production-проверки](docs/security-remediation-2026-09-18.md)
- [Готовность этапа 15](docs/stage15-readiness.md)
- [Список задач](TASKS.md)
