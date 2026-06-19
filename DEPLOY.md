# Пошаговая инструкция по запуску

## 1. Подготовь аккаунты

Тебе понадобятся:
- GitHub аккаунт: https://github.com
- Supabase аккаунт: https://supabase.com
- Telegram (мобильное приложение или десктоп)

## 2. Создай бота в Telegram

1. Открой Telegram и найди [@BotFather](https://t.me/BotFather)
2. Отправь команду `/newbot`
3. Придумай название и username для бота (username должен заканчиваться на `bot`)
4. Сохрани полученный **токен** — он выглядит как `123456789:ABCdef...`

## 3. Создай проект в Supabase

1. Зайди в [Supabase Dashboard](https://supabase.com/dashboard)
2. Нажми "New Project"
3. Придумай название проекта и пароль базы данных (сохрани его)
4. Дождись окончания создания

## 4. Настрой базу данных

1. В проекте перейди в раздел **SQL Editor**
2. Создай новый запрос
3. Скопируй содержимое файла `supabase/migrations/001_initial.sql` из этого репозитория
4. Вставь в SQL Editor и нажми **Run**

## 5. Получи ключи Supabase

1. Перейди в **Project Settings → API**
2. Скопируй:
   - `URL` (например, `https://abcdefgh12345678.supabase.co`)
   - `anon public` ключ
   - `service_role` ключ (он секретный!)

## 6. Настрой Edge Functions

1. Установи Supabase CLI: https://supabase.com/docs/guides/cli/getting-started
2. В терминале выполни:
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   ```
   `your-project-ref` — это часть URL проекта (например, `abcdefgh12345678`)

3. Задай секретные переменные:
   ```bash
   supabase secrets set TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   supabase secrets set SUPABASE_URL=https://your-project.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   supabase secrets set SUPABASE_ANON_KEY=your-anon-key
   ```

4. Задеплой функции:
   ```bash
   supabase functions deploy telegram-auth
   supabase functions deploy send-notifications
   ```

## 7. Настрой уведомления (cron)

1. В Supabase Dashboard перейди в **Database → Extensions**
2. Включи расширение `pg_cron`
3. Перейди в **SQL Editor** и выполни:
   ```sql
   SELECT cron.schedule(
     'send-cycle-notifications',
     '0 9 * * *',
     $$ SELECT net.http_post(
       url := 'https://your-project.supabase.co/functions/v1/send-notifications',
       headers := '{"Content-Type": "application/json", "Authorization": "Bearer your-anon-key"}'::jsonb
     ) $$
   );
   ```
   Замени URL и anon key на свои.

## 8. Настрой фронтенд

1. В корне проекта создай файл `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
2. В `vite.config.js` замени `base: '/cikl3/'` на имя своего репозитория, если оно другое.

## 9. Запушь на GitHub

1. Создай новый репозиторий на GitHub (без README, .gitignore и лицензии)
2. В терминале:
   ```bash
   git remote add origin https://github.com/ТВОЙ_НИК/ИМЯ_РЕПОЗИТОРИЯ.git
   git branch -M main
   git push -u origin main
   ```

## 10. Включи GitHub Pages

1. На странице репозитория перейди в **Settings → Pages**
2. В разделе **Source** выбери **GitHub Actions**
3. GitHub Actions автоматически задеплоит приложение
4. Дождись окончания деплоя (можно посмотреть статус во вкладке **Actions**)
5. Получи ссылку вида `https://твой_ник.github.io/имя_репо/`

## 11. Подключи Mini App к боту

1. Вернись к [@BotFather](https://t.me/BotFather)
2. Отправь `/mybots` → выбери своего бота
3. Нажми **Bot Settings → Menu Button**
4. Выбери **Configure menu button**
5. Введи название кнопки, например `🌸 Cicle`
6. Введи URL своего задеплоенного приложения

## 12. Проверь работу

1. Открой бота в Telegram
2. Нажми кнопку меню
3. Приложение должно открыться
4. Пройди авторизацию и проверь, что данные сохраняются

## Проблемы и решения

**Приложение не открывается в Telegram**
- Проверь, что URL начинается с `https://`
- Убедись, что в `vite.config.js` правильный `base`

**Ошибка авторизации**
- Проверь, что `TELEGRAM_BOT_TOKEN` правильный
- Убедись, что Edge Function `telegram-auth` задеплоена
- Проверь CORS в Supabase Functions

**Данные не сохраняются**
- Проверь, что таблицы созданы правильно
- Убедись, что RLS-политики настроены
- Проверь, что сессия получена после авторизации
