# Колечко — Трекер менструального цикла в Telegram

Полноценное Mini App для отслеживания менструального цикла прямо внутри Telegram.

## Возможности

- 📅 Календарь цикла с цветовой индикацией фаз
- 🔮 Прогноз следующих месячных и овуляции
- 📝 Логирование симптомов, настроения и самочувствия
- 📊 Аналитика и графики циклов
- 🌍 Мультиязычность (русский + английский)
- 🔔 Уведомления в Telegram
- 🎨 Адаптация под тему Telegram

## Технологии

- **React 19** + **Vite**
- **Tailwind CSS v4**
- **React Router** (HashRouter для GitHub Pages)
- **Recharts** для графиков
- **i18next** для переводов
- **Supabase** (PostgreSQL + Edge Functions)
- **GitHub Pages** для хостинга

## Быстрый старт

```bash
npm install
npm run dev
```

## Полная инструкция по запуску

См. [DEPLOY.md](./DEPLOY.md) — там пошаговое руководство по настройке Supabase, Telegram бота и GitHub Pages.

## Структура проекта

```
src/
  components/       # UI-компоненты
  context/          # React Context (Telegram, Auth)
  hooks/            # Кастомные хуки для Supabase
  i18n/             # Переводы
  lib/              # Клиент Supabase
  pages/            # Экраны приложения
  utils/            # Утилиты расчёта цикла
supabase/
  functions/        # Edge Functions
  migrations/       # SQL-миграции
```

## Переменные окружения

Создай файл `.env` в корне проекта:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Лицензия

MIT
