# Военное право — шпаргалки (PWA)

Карманный справочник: модули курса, шпаргалки, быстрый поиск. Работает как **приложение на телефоне** (офлайн после первого открытия).

## Как пользоваться

1. Откройте сайт по ссылке (GitHub Pages или любой HTTPS-хост).
2. **Android (Chrome):** меню → «Установить приложение» / «На главный экран».
3. **iPhone (Safari):** «Поделиться» → «На экран „Домой“».
4. После установки — иконка на рабочем столе, без адреса браузера. Контент кэшируется service worker’ом.

Коллегам достаточно той же ссылки. В Google сайт не попадает (`noindex`).

## GitHub Pages

Settings → Pages → Deploy from branch **main** / **root**.

Адрес: `https://simaklawyer.github.io/voennoe-pravo/`

Репозиторий можно сделать **public** — meta `robots=noindex` снижает индексацию; ссылку лучше не публиковать широко.

## Локально

```bash
cd voennoe-pravo
python3 -m http.server 8080
# http://localhost:8080
```

## Структура

```
index.html              — оболочка + PWA meta
manifest.webmanifest    — имя, иконки, standalone
sw.js                   — offline-кэш
icon-192/512.png        — иконки приложения
css/styles.css          — темы (день / тёмная / ночь)
js/app.js               — поиск, навигация, установка
data/part1.json + part2 — контент
```

Контент из курса «Военное право» (Профсоюз).
