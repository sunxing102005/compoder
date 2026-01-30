#!/bin/sh
set -e

if [ ! -d "./release" ]; then
  echo "release directory not found; run npm run release first."
  exit 1
fi

cd ./release

export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export CI=1
export PNPM_IGNORE_SCRIPTS=1

pnpm install --prod --frozen-lockfile --ignore-scripts --ignore-workspace
