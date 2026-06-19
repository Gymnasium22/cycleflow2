# Cicle — Трекер менструального цикла в Telegram

Полноценное Mini App для отслеживания менструального цикла прямо внутри Telegram.

## Технологии

- **React 19** + **Vite** — фронтенд
- **Tailwind CSS v4** — стили
- **React Router** — навигация (HashRouter для GitHub Pages)
- **Recharts** — графики (будут позже)
- **i18next** — мультиязычность (русский + английский)
- **Supabase** — база данных, авторизация, уведомления
- **GitHub Pages** — хостинг

## Быстрый старт

```bash
# Установить зависимости
npm install

# Запустить локально
npm run dev

# Собрать для продакшена
npm run build
```

## Как задеплоить

1. Создай репозиторий на GitHub
2. Запушь этот проект:
   ```bash
   git remote add origin https://github.com/ТВОЙ_НИК/cikl3.git
   git branch -M main
   git push -u origin main
   ```
3. В настройках репозитория включи GitHub Pages:
   - Settings → Pages → Source: GitHub Actions
4. GitHub Actions автоматически соберёт и выложит приложение
5. Получи ссылку вида `https://твой_ник.github.io/cikl3/`

## Настройка Telegram бота

1. Напиши [@BotFather](https://t.me/BotFather)
2. Создай бота: `/newbot`
3. Получи токен и сохрани его
4. Подключи Mini App:
   - `/mybots` → выбери бота → Bot Settings → Menu Button
   - Укажи название кнопки и URL задеплоенного приложения
5. Готово! Открывай приложение из меню бота

## Структура проекта

```
src/
  components/       # Переиспользуемые компоненты
  context/          # React Context (Telegram, авторизация)
  i18n/             # Переводы
  pages/            # Экраны приложения
  utils/            # Утилиты (расчёт цикла)
```

## Статус

Проект в активной разработке. Следующие шаги:
- [ ] Подключение Supabase
- [ ] Авторизация через Telegram
- [ ] Сохранение данных в облаке
- [ ] Уведомления
- [ ] Расширенная аналитика с графиками
