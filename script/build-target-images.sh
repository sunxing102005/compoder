#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROXY_ARG="${PROXY_ARG:-}"

echo "Building Docker images for tusk and selected renderers..."

echo "Building tusk (root) image..."
cd "$ROOT_DIR"
docker build -t tusk:latest ${PROXY_ARG:+--build-arg "proxy=$PROXY_ARG"} .

echo "Building im-mobile-renderer image..."
cd "$ROOT_DIR/artifacts/im-mobile-renderer"
docker build -t im-mobile-renderer:latest ${PROXY_ARG:+--build-arg "proxy=$PROXY_ARG"} .

echo "Building antd-renderer image..."
cd "$ROOT_DIR/artifacts/antd-renderer"
docker build -t antd-renderer:latest ${PROXY_ARG:+--build-arg "proxy=$PROXY_ARG"} .

echo "All target images built successfully."
