# Запуск на zotovbakery.kz

Изменения подготовлены локально. Покупка домена, настройка DNS, публикация и
действия в Search Console выполняются отдельно после готовности домена.
Технический адрес до запуска остаётся закрыт от индексации.

1. Добавить `zotovbakery.kz` в Custom domains проекта Cloudflare Pages
   `zotov-landing`, настроить предложенные DNS-записи, дождаться Active и HTTPS.
   Для корневого домена Cloudflare Pages потребуется зона домена в Cloudflare.
2. Установить для production **до сборки**:
   `PUBLIC_WEBSITE_URL=https://zotovbakery.kz`, `PUBLIC_ALLOW_INDEXING=true`.
   Preview оставить с `PUBLIC_ALLOW_INDEXING=false` и техническим URL.
   Значения в wrangler.jsonc должны соответствовать среде выпуска.
3. Проверить ветку main, remote и чистое рабочее дерево. Запустить
   `PUBLIC_WEBSITE_URL=https://zotovbakery.kz PUBLIC_ALLOW_INDEXING=true bun run release:check`.
   Публикация требует отдельного разрешения; использовать штатный `cf:deploy`.
4. Настроить два точных постоянных редиректа 301 через Cloudflare Bulk Redirects:
   `zotov-landing.pages.dev` → `zotovbakery.kz` и
   `www.zotovbakery.kz` → `zotovbakery.kz`, с сохранением пути и query.
   Подключить www как custom domain и обеспечить сертификат.
   Не включать Include subdomains: адреса preview должны остаться доступны
   для проверки и закрыты от индексации. Проверить `/privacy/` и URL с query.
5. На опубликованном домене проверить: HTTPS; один canonical на текущий путь;
   og:url и JSON-LD с новым доменом; отсутствие noindex и X-Robots-Tag noindex;
   robots.txt разрешает обход; sitemap.xml содержит только production-адреса;
   неизвестный путь отдаёт 404; контакты и WhatsApp работают.
6. Проверить страницу в Google Rich Results Test. При наличии доступа подтвердить
   домен в Google Search Console и отправить sitemap.xml. Затем повторить
   мобильный Lighthouse на публичном домене: локальные замеры не отражают CDN/DNS.

Если домен или сертификат ещё не готовы, оставить indexing=false. Не открывать
индексацию технического адреса ради повышения балла Lighthouse SEO.
