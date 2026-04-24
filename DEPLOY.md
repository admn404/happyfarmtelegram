# GitHub Deploy

## Что уже подготовлено

- Локальный `git init`
- `.gitignore` для зависимостей, сборки, базы и секретов
- `server/ecosystem.config.cjs` для `pm2`
- `.github/workflows/deploy.yml` для автодеплоя по push в `main`

## Что нужно сделать в GitHub

1. Создать пустой репозиторий.
2. Добавить его как `origin`.
3. Запушить текущий проект в ветку `main`.
4. Добавить secrets в GitHub Actions:
   - `SERVER_HOST`
   - `SERVER_USER`
   - `SERVER_SSH_KEY`
   - `REPO_URL`

## Как работает деплой

Workflow подключается по SSH к серверу, обновляет репозиторий в `/opt/farm/repo`, собирает клиент, ставит серверные зависимости и обновляет live-файлы в `/opt/farm`, затем делает `pm2 startOrReload`.

## Важно

- `server/.env` не хранится в репозитории и должен остаться на сервере в `/opt/farm/server/.env`.
- `server/farm.db` и `server/uploads/` не входят в git и не перезатираются workflow.
