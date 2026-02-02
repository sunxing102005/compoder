#!/bin/sh
set -e

APP_ENV="${K8S_ENV:-production}"
PORT="3200"

echo "env11 is ${APP_ENV}, port is ${PORT}"

export NODE_ENV="${APP_ENV}"
export PORT

# start service
mkdir -p ./pm2
if [ ! -e ./dist/standalone/dist ]; then
  # next standalone server expects distDir at ./dist relative to standalone dir
  ln -s .. ./dist/standalone/dist
fi
pm2-runtime start ./ecosystem.json
