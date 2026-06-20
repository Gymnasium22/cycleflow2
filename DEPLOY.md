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
   supabase secrets set BOT_TOKEN=your-telegram-bot-token
   supabase secrets set SB_URL=https://your-project.supabase.co
   supabase secrets set SB_SERVICE_ROLE_KEY=your-service-role-key
   supabase secrets set SB_ANON_KEY=your-anon-key
   ```

4. Задеплой функции:
   ```bash
   supabase functions deploy telegram-auth
   supabase functions deploy send-notifications
   ```

## 7. Настрой автодеплой Edge Functions через GitHub Actions (рекомендуется)

Чтобы не деплоить функции вручную каждый раз, настроим автодеплой при пуше в репозиторий.

1. Получи **Supabase Access Token**:
   - Зайди в [Supabase Dashboard](https://supabase.com/dashboard)
   - Перейди в **Account Settings → Access Tokens**
   - Нажми **New access token**, дай название и скопируй токен

2. Добавь секреты в GitHub:
   - Открой репозиторий на GitHub
   - Перейди в **Settings → Secrets and variables → Actions**
   - Нажми **New repository secret**
   - Добавь два секрета:
     - `SUPABASE_ACCESS_TOKEN` — токен из шага 1
     - `SUPABASE_PROJECT_ID` — `eofhvkiidqyxkrpimwer`

3. Готово. Теперь при каждом изменении файлов в `supabase/functions/` Edge Functions будут деплоиться автоматически.

Чтобы задеплоить вручную прямо сейчас:
- Перейди в репозиторий → **Actions**
- Выбери workflow **Deploy Supabase Edge Functions**
- Нажми **Run workflow**

## 8. Настрой уведомления (cron)

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

## 9. Настрой фронтенд

1. В корне проекта создай файл `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
2. В `vite.config.js` замени `base: '/cycleflow2/'` на имя своего репозитория, если оно другое.

## 10. Запушь на GitHub

1. Создай новый репозиторий на GitHub (без README, .gitignore и лицензии)
2. В терминале:
   ```bash
   git remote add origin https://github.com/ТВОЙ_НИК/ИМЯ_РЕПОЗИТОРИЯ.git
   git branch -M main
   git push -u origin main
   ```

## 11. Включи GitHub Pages

1. На странице репозитория перейди в **Settings → Pages**
2. В разделе **Source** выбери **GitHub Actions**
3. GitHub Actions автоматически задеплоит приложение
4. Дождись окончания деплоя (можно посмотреть статус во вкладке **Actions**)
5. Получи ссылку вида `https://твой_ник.github.io/имя_репо/`

## 12. Подключи Mini App к боту (обязательно для авторизации)

**Важно:** простая кнопка **Menu Button** не передаёт данные пользователя (`initData`) в полном объёме. Для полноценной авторизации нужно создать **Mini App** через BotFather.

1. Вернись к [@BotFather](https://t.me/BotFather)
2. Отправь команду `/newapp`
3. Выбери своего бота
4. Введи название приложения, например `Cicle`
5. Введи короткое описание
6. Загрузи картинку (640×360 px, JPEG/PNG)
7. Когда спросит URL, введи задеплоенную ссылку:
   ```
   https://gymnasium22.github.io/cycleflow2/
   ```
8. Выбери режим **Menu** — тогда приложение появится в меню бота
9. BotFather пришлёт ссылку на Mini App вида `https://t.me/твой_бот/app`

### Альтернатива: Menu Button (быстрый способ, но без initData)

Если нужна только кнопка внизу чата:
1. Отправь `/mybots` → выбери бота
2. Нажми **Bot Settings → Menu Button**
3. Выбери **Configure menu button**
4. Введи название кнопки, например `🌸 Cicle`
5. Введи URL задеплоенного приложения

## 13. Разреши домен GitHub Pages

1. Отправь `/mybots` → выбери бота
2. Нажми **Bot Settings → Domain**
3. Выбери **Add domain**
4. Введи домен:
   ```
   gymnasium22.github.io
   ```
   или полный URL:
   ```
   https://gymnasium22.github.io/cycleflow2/
   ```

## 14. Проверь работу

1. Открой бота в Telegram
2. Нажми кнопку меню / Mini App
3. Приложение должно открыться
4. Пройди авторизацию и проверь, что данные сохраняются

## Диагностика в Telegram

Если приложение открывается, но данные не сохраняются в Supabase:

1. Включи консоль WebView:
   - **Android:** нажми на три точки → "Инспектировать элемент" (нужен Telegram Beta + Chrome DevTools)
   - **iOS:** подключи Mac и используй Safari Web Inspector
   - **Desktop:** правый клик → "Inspect"

2. Посмотри в консоль на сообщения:
   - `[Telegram] WebApp detected` — WebApp API найден
   - `[Telegram] WebApp present but no initData` — домен не разрешён или открыто не через Mini App
   - `[Auth] telegram-auth response` — ответ от сервера авторизации

3. Если `initData` отсутствует:
   - Убедись, что приложение открыто через **Mini App**, а не через Menu Button
   - Проверь, что домен `gymnasium22.github.io` разрешён в BotFather
   - Подожди 5–10 минут после изменений в BotFather

## Проблемы и решения

**Приложение не открывается в Telegram**
- Проверь, что URL начинается с `https://`
- Убедись, что в `vite.config.js` правильный `base`
- Убедись, что GitHub Actions завершился успешно

**Ошибка авторизации "Invalid Telegram hash"**
- Проверь, что `BOT_TOKEN` правильный
- Убедись, что Edge Function `telegram-auth` задеплоена
- Проверь, что `initData` не изменяется перед отправкой

**Ошибка CORS**
- Проверь, что в Edge Function `telegram-auth` добавлены CORS-заголовки
- Убедись, что домен приложения указан в `ALLOWED_ORIGINS`

**Данные не сохраняются**
- Проверь, что таблицы созданы правильно
- Убедись, что RLS-политики настроены
- Проверь, что сессия получена после авторизации
