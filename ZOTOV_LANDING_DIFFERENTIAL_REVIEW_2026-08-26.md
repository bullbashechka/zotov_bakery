# Differential Security Review — ZOTOV Landing

**Дата ревью:** 2026-08-26  
**Baseline:** `21105280ad8eb72d62c1eb198b11d4080080ec96`  
**Цель ревью:** незакоммиченные изменения рабочей директории относительно `HEAD`  
**Стратегия:** FOCUSED — проект содержит 23 исполняемых/стилевых файла

## 1. Executive Summary

| Severity | Count |
|----------|------:|
| 🔴 CRITICAL | 0 |
| 🟠 HIGH | 0 |
| 🟡 MEDIUM | 0 |
| 🟢 LOW | 0 |

**Overall Risk:** LOW  
**Recommendation:** APPROVE  
**Confidence:** HIGH для security-границ изменённого кода; MEDIUM для визуального поведения во всех браузерах

**Key Metrics:**

- Files analyzed: 8/8 changed files (100%)
- One-hop consumers analyzed: 100%
- Test coverage gaps: 1 изменённая клиентская ветка без автоматизированного теста
- High blast radius changes: 0
- Security regressions detected: 0
- Red flags from git history: 0

Изменения затрагивают только разметку, CSS, локальные изображения и обработку ошибки загрузки декоративного изображения. Новых внешних вызовов, пользовательского ввода, авторизации, хранения данных, зависимостей или публичных программных API нет.

## 2. What Changed

**Commit Range:** `21105280…worktree`  
**Commits:** 0 — изменения ещё не закоммичены  
**Timeline:** baseline 2026-08-26, review 2026-08-26

| File | +Lines | -Lines | Risk | Direct Consumers / Blast Radius |
|------|-------:|-------:|------|---------------------------------|
| `website/src/components/Hero.astro` | 10 | 4 | LOW | 1 page / LOW |
| `website/src/components/SiteHeader.astro` | 5 | 10 | LOW | 1 page / LOW |
| `website/src/layouts/BaseLayout.astro` | 2 | 2 | LOW | 1 page / LOW |
| `website/src/styles/global.css` | 208 | 120 | LOW | 1 route, all its sections / LOW security impact |
| `website/public/advantages/baking-since-1992.svg` | 0 | 1 | LOW | 1 static image reference / LOW |
| `website/public/advantages/family-recipes.svg` | 0 | 1 | LOW | 1 static image reference / LOW |
| `website/public/advantages/natural-ingredients.svg` | 0 | 1 | LOW | 1 static image reference / LOW |
| `website/public/advantages/own-production.svg` | 0 | 1 | LOW | 1 static image reference / LOW |

**Total:** +225, -140 lines across 8 files.

Основные поведенческие изменения:

- responsive art direction и новые размеры первого экрана;
- отказ от тёмной темы в CSS, метаданных, логотипе, иконках и SVG;
- fixed-шапка с отдельным layout-spacer вместо sticky-шапки с отрицательным отступом;
- локальный fallback при ошибке загрузки hero-изображения;
- preload локального шрифта Bergamasco;
- повторяемая SVG-mask для нижнего края hero.

## 3. Critical Findings

CRITICAL, HIGH и MEDIUM findings не обнаружены.

### Security boundary review

| Boundary | Result | Evidence |
|----------|--------|----------|
| User-controlled input | Не добавлен | Все CTA и section IDs заданы константами; `Hero.astro:L37-L51` |
| External network calls | Не добавлены | Hero, header, fonts и SVG используют локальные assets |
| Dynamic HTML execution | Не добавлено | Нет новых `innerHTML`, `eval`, `document.write` или script injection |
| DOM selector handling | Без новой attack surface | Изменённая ветка `Hero.astro:L63-L75` работает только с локальным `<img>`; существующие hash-селекторы не изменены |
| SVG active content | Поверхность уменьшена | Из четырёх локальных SVG удалены только embedded CSS media rules; script/event handlers не добавлены |
| Security headers | Не изменены | `website/public/_headers:L1-L5` продолжает задавать nosniff, referrer policy, permissions policy и frame denial |

Новая функция `fallback` в `Hero.astro:L66-L70` изменяет только локальные DOM-атрибуты `data-error` и `hidden`. Источник изображения создаётся Astro из импортированного локального файла, поэтому атакующий не может подменить URL через пользовательский ввод. При ошибке результат ограничен бежевым фоном hero; данные и привилегии не затрагиваются.

## 4. Test Coverage Analysis

Автоматизированный test runner в репозитории не настроен, test/spec-файлы отсутствуют.

| Changed behavior | Automated coverage | Risk | Impact if broken |
|------------------|--------------------|------|------------------|
| Hero image load/error fallback (`Hero.astro:L63-L75`) | NO | LOW | Декоративное изображение может остаться невидимым или не перейти на бежевый фон |
| Responsive CSS at 390/768/1024/1440 | NO | LOW security risk | Визуальная регрессия или пересечение контента |
| Fixed/compact header geometry (`global.css:L773-L816`) | NO | LOW security risk | Layout jump или перекрытие контента |
| Light-only theme | NO | LOW security risk | Непоследовательные цвета в отдельных assets |

Выполненные проверки:

- ✅ `bun run typecheck`: 0 errors, 0 warnings, 0 hints
- ✅ `bun run build`: static build completed, 1 page built
- ✅ `git diff --check`: clean
- ✅ Во время реализации проведена ручная browser-проверка целевых ширин, отсутствия горизонтального overflow, поведения CTA/focus и сжатия header

Отсутствие тестов не повышает security-риск до блокирующего уровня, поскольку изменённая логика не пересекает trust boundary и не обрабатывает чувствительные данные. Это остаётся продуктовым regression-risk.

## 5. Blast Radius Analysis

| Changed unit | Direct callers/consumers | Transitive scope | Classification |
|--------------|-------------------------:|------------------|----------------|
| `Hero.astro` | 1 (`index.astro`) | Первый экран одной статической страницы | LOW |
| `SiteHeader.astro` | 1 (`index.astro`) | Header одной статической страницы | LOW |
| `BaseLayout.astro` | 1 (`index.astro`) | HTML shell одной статической страницы | LOW |
| `global.css` | 1 import (`index.astro`) | Все секции одной страницы | LOW security / MEDIUM visual |
| Advantage SVGs | 1 reference each (`Advantages.astro`) | Четыре декоративные карточки | LOW |

Нет модифицированных функций с 6+ caller-ами, нет публичных API и нет transitive server-side consumers. Максимальный blast radius относится к визуальному layout всей единственной страницы, а не к security-состоянию.

## 6. Historical Context

Удалённый код проверен через `git blame` и pickaxe search:

| Removed behavior | Origin commit | Commit message | Security origin |
|------------------|---------------|----------------|-----------------|
| Light/dark tokens and theme-color | `590fabe5` (2026-08-19) | `feat: build ZOTOV bakery landing page foundation` | NO |
| Dark logo/phone sources and sticky header base | `4e2409d2` (2026-08-19) | `Implement responsive site header navigation` | NO |
| Hero veil, image sizing and loading handler | `febdd1cc` (2026-08-20) | `Build responsive hero section with local Nunito fonts` | NO |
| Embedded dark-theme CSS in advantage SVGs | `20554ff9` (2026-08-20) | `Implement responsive brand advantages section` | NO |
| Later header/scallop refinements | `ac83c7c9` (2026-08-20) | `Refine compact header styling and responsive hero scallops` | NO |

Ни один удалённый фрагмент не был добавлен security-, CVE-, vulnerability- или hardening-коммитом. Повторного добавления ранее исправленной уязвимой конструкции не обнаружено.

## 7. Recommendations

### Immediate (Blocking)

- Нет блокирующих действий.

### Before Production

- [ ] Добавить минимальный browser/e2e smoke test для hero image error fallback.
- [ ] Зафиксировать visual regression snapshots на 390, 768, 1024 и 1440 px.
- [ ] Проверять fixed-header и hash-navigation после дальнейших изменений высоты header.

### Technical Debt / Hardening

- [ ] Рассмотреть Content-Security-Policy в `website/public/_headers`. Это существующее ограничение baseline, а не регрессия данного diff. Поскольку проект использует inline-скрипты Astro-компонентов, внедрение CSP потребует nonce/hash-стратегии или выноса скриптов.
- [ ] Удалить неиспользуемые dark assets отдельным согласованным изменением, если они больше не нужны продукту; текущий diff корректно перестал на них ссылаться, но не удаляет файлы.

## 8. Analysis Methodology

**Strategy:** FOCUSED (23 code/style/SVG files, MEDIUM codebase by skill thresholds).

**Analysis Scope:**

- Changed files reviewed: 8/8 (100%)
- One-hop dependencies reviewed: `index.astro`, `site.ts`, `Advantages.astro`, asset references and deployment headers
- HIGH-risk changes: none
- MEDIUM-risk changes: none
- LOW-risk changes: 100% reviewed

**Techniques applied:**

- full worktree diff and numstat analysis;
- baseline reconstruction from `HEAD`;
- `git blame` for removed behavior;
- pickaxe history search for removed dark theme, veil and header positioning;
- security-pattern scan for dynamic HTML, external calls, validation/auth removal and secrets;
- quantitative direct-consumer search with `rg`;
- automated typecheck, production build and whitespace validation;
- review of existing security response headers.

**Adversarial phase:** not invoked because triage found no HIGH-risk changes or red flags.

**Limitations:**

- No automated runtime or visual regression suite exists.
- External dependency vulnerability scanning was not run because package manifests and lockfile are unchanged.
- No deployed environment or CDN response was inspected; `_headers` was reviewed statically.
- Review focuses on security regressions in this diff, not a full security audit of pre-existing application code.

**Confidence:** HIGH that this diff does not introduce a security regression; MEDIUM for cross-browser visual correctness.

## 9. Appendices

### Verification commands

```bash
git diff --stat
git diff --numstat
git diff --check
git blame HEAD -- <changed-file>
git log -S '<removed-pattern>' --all -- <changed-file>
rg -n '<changed-component-or-asset>' website/src website/public
bun run typecheck
bun run build
```

### Final disposition

**APPROVE** from a differential security perspective. Optional automated regression coverage is recommended before production, but there is no evidence of a security regression in the reviewed changes.
