#!/bin/sh
set -e

if [ "${RUN_MIGRATE_CODEGEN:-1}" = "1" ]; then
  echo "Running migrate-codegen..."
  npm run migrate-codegen
fi

exec sh ./start.sh
