#!/bin/bash
set -euo pipefail

REPO_DIR="/opt/farm/repo"
LIVE_DIR="/opt/farm"
SERVER_DIR="$LIVE_DIR/server"
CLIENT_DIR="$LIVE_DIR/client/dist"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Repository not found in $REPO_DIR" >&2
  exit 1
fi

cd "$REPO_DIR"
git fetch --all
git reset --hard origin/main

cd "$REPO_DIR/client"
npm ci
npm run build

cd "$REPO_DIR/server"
npm ci --omit=dev

mkdir -p "$CLIENT_DIR" "$SERVER_DIR"
rsync -a --delete "$REPO_DIR/client/dist/" "$CLIENT_DIR/"
rsync -a \
  "$REPO_DIR/server/index.js" \
  "$REPO_DIR/server/database.js" \
  "$REPO_DIR/server/package.json" \
  "$REPO_DIR/server/package-lock.json" \
  "$REPO_DIR/server/layout.json" \
  "$REPO_DIR/server/ecosystem.config.cjs" \
  "$SERVER_DIR/"

cd "$SERVER_DIR"
npm ci --omit=dev
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
