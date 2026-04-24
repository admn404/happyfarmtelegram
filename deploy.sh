#!/bin/bash

# Скрипт для деплоя Farm Mini App на сервер 192.168.0.5
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

SERVER="root@193.53.127.116"
DEST_DIR="/opt/farm"

echo "🚀 Начинаем деплой игры из папки $DIR..."

echo "1. Собираем свежий фронтенд..."
cd client
npm run build
cd ..

echo "2. Создаем директории на сервере..."
ssh $SERVER "mkdir -p $DEST_DIR/client/dist && mkdir -p $DEST_DIR/server"

echo "3. Копируем файлы сервера..."
scp server/index.js server/database.js server/package.json server/package-lock.json server/layout.json server/ecosystem.config.cjs server/.env $SERVER:$DEST_DIR/server/

echo "4. Копируем скомпилированные файлы клиента..."
scp -r client/dist/* $SERVER:$DEST_DIR/client/dist/

echo "5. Настраиваем и перезапускаем приложение через PM2..."
ssh $SERVER "cd $DEST_DIR/server && npm install && npm install -g pm2 && NODE_ENV=production pm2 startOrReload ecosystem.config.cjs --env production && pm2 save && pm2 startup"

echo "✅ Деплой успешно завершен!"
echo "Игра теперь работает на вашем сервере на порту 3000 в режиме production (с включенной защитой)."
