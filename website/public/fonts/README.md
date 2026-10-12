# Локальные шрифты

- `Montserrat-Variable.woff2` и `Montserrat-VariableItalic.woff2` — семейство Montserrat, веса 100–900.
- `Vetrino-Regular.woff2` — шрифт Vetrino.
- `Bergamasco-Regular.woff` — шрифт Bergamasco для буквы «Z» в названии ZOTOV bakery.
- `Nunito-Regular-Cyrillic.woff2` и `Nunito-Regular-Latin.woff2` — Nunito Regular для
  вводного текста первого экрана.

Тексты лицензий сохранены в `licenses/`, включая `OFL-Nunito.txt`. Шрифты подключаются
только локально: страница не обращается за ними к сторонним сервисам.

## Montserrat: уменьшенные файлы v1

Сайт подключает `Montserrat-LatinCyrillic-v1.woff2` и
`Montserrat-LatinCyrillicItalic-v1.woff2`. Оригиналы выше сохранены для повторной
генерации; лицензия не меняется. Все веса 100–900 сохранены. Диапазон включает
латиницу, кириллицу (в том числе казахские буквы), пунктуацию и валюты, а не только
символы текущей страницы.

В отдельном Python-окружении установите `fonttools[woff]`, затем из корня проекта:

```bash
pyftsubset website/public/fonts/Montserrat-Variable.woff2 --output-file=website/public/fonts/Montserrat-LatinCyrillic-v1.woff2 --flavor=woff2 --unicodes='U+0000-052F,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2116,U+2122,U+2190-21FF,U+2212,U+FEFF,U+FFFD' --layout-features='*'
pyftsubset website/public/fonts/Montserrat-VariableItalic.woff2 --output-file=website/public/fonts/Montserrat-LatinCyrillicItalic-v1.woff2 --flavor=woff2 --unicodes='U+0000-052F,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2116,U+2122,U+2190-21FF,U+2212,U+FEFF,U+FFFD' --layout-features='*'
```

При следующем изменении увеличьте версию имени файла и обновите CSS/preload,
чтобы браузер не использовал старый файл из кеша. Fallback-метрики в global.css
рассчитаны по средним ширинам русского текста первого экрана и вертикальным
метрикам оригиналов, с Arial/Georgia как локальными заменами.
