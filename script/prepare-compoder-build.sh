#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST_DIR="$ROOT_DIR/../compoder-build"

IM_MOBILE_SRC="$ROOT_DIR/artifacts/im-mobile-renderer"
IM_MOBILE_DEST="$DEST_DIR/artifacts/im-mobile-renderer"

ANTD_SRC="$ROOT_DIR/artifacts/antd-renderer"
ANTD_DEST="$DEST_DIR/artifacts/antd-renderer"

mkdir -p "$DEST_DIR"

export DEST_DIR
export IM_MOBILE_DEST
export ANTD_DEST

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required but not found." >&2
  exit 1
fi

echo "Copying release folder (excluding node_modules)..."
rsync -a --delete --exclude "node_modules" "$ROOT_DIR/release/" "$DEST_DIR/release/"

echo "Replacing localhost in release/data/codegens.json..."
python3 - <<'PY'
from pathlib import Path
import os

path = Path(os.environ["DEST_DIR"]) / "release" / "data" / "codegens.json"
text = path.read_text(encoding="utf-8")
text = text.replace("localhost", "10.182.100.137")
path.write_text(text, encoding="utf-8")
PY

echo "Copying Dockerfile and docker-compose.yml..."
cp -f "$ROOT_DIR/Dockerfile" "$DEST_DIR/Dockerfile"
cp -f "$ROOT_DIR/docker-compose.yml" "$DEST_DIR/docker-compose.yml"
cp -f "$ROOT_DIR/package.json" "$DEST_DIR/package.json"
cp -f "$ROOT_DIR/pnpm-lock.yaml" "$DEST_DIR/pnpm-lock.yaml"
echo "Replacing localhost in docker-compose.yml..."
python3 - <<'PY'
from pathlib import Path
import os

path = Path(os.environ["DEST_DIR"]) / "docker-compose.yml"
text = path.read_text(encoding="utf-8")
text = text.replace("localhost", "10.182.100.137")
path.write_text(text, encoding="utf-8")
PY

echo "Copying im-mobile-renderer (excluding .next and node_modules; keep immotors-ui/tools)..."
rsync -a --delete --exclude ".next" --exclude "node_modules" --exclude "immotors-ui" --exclude "immotors-tools" "$IM_MOBILE_SRC/" "$IM_MOBILE_DEST/"

echo "Updating im-mobile-renderer package.json..."
python3 - <<'PY'
import json
import os
from pathlib import Path

path = Path(os.environ["IM_MOBILE_DEST"]) / "package.json"
data = json.loads(path.read_text(encoding="utf-8"))

deps = data.get("dependencies", {})
deps["@capp/immotors-tools"] = "file:./immotors-tools"
deps["@capp/immotors-ui"] = "file:./immotors-ui"
data["dependencies"] = deps

path.write_text(json.dumps(data, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
PY

echo "Removing registry-related settings from im-mobile-renderer Dockerfile..."
python3 - <<'PY'
import os
from pathlib import Path

path = Path(os.environ["IM_MOBILE_DEST"]) / "Dockerfile"
lines = path.read_text(encoding="utf-8").splitlines()

out = []
for line in lines:
    stripped = line.strip()
    if stripped.startswith("ARG proxy"):
        continue
    if "pnpm config set registry" in stripped:
        continue
    if "npm config set registry" in stripped:
        continue
    if "pnpm install --registry" in stripped:
        continue
    out.append(line)

text = "\n".join(out)
text = text.replace(
    "RUN if [ -n \"$proxy\" ]; then npm install -g pnpm@9.8.0 --registry=http://10.184.152.63:8081/repository/npm-group/; else npm install -g pnpm@9.8.0; fi",
    "RUN npm install -g pnpm@9.8.0",
)
text = text.replace(
    "RUN pnpm install --registry=http://10.184.152.63:8081/repository/npm-group/",
    "RUN pnpm install",
)

if "RUN npm install -g pnpm@9.8.0" not in text:
    text = text.replace(
        "WORKDIR /app\n\n# Install pnpm with optional npm registry override\n",
        "WORKDIR /app\n\n# Install pnpm\nRUN npm install -g pnpm@9.8.0\n\n",
    )

if "COPY immotors-ui ./immotors-ui" not in text:
    text = text.replace(
        "COPY package.json ./\n",
        "COPY package.json ./\nCOPY immotors-ui ./immotors-ui\nCOPY immotors-tools ./immotors-tools\n",
    )

if "RUN pnpm install" not in text:
    text = text.replace(
        "COPY immotors-tools ./immotors-tools\n\n# Install dependencies\n",
        "COPY immotors-tools ./immotors-tools\n\n# Install dependencies\nRUN pnpm install\n",
    )

path.write_text(text + "\n", encoding="utf-8")
PY

echo "Copying antd-renderer (excluding .next and node_modules)..."
rsync -a --delete --exclude ".next" --exclude "node_modules" "$ANTD_SRC/" "$ANTD_DEST/"

echo "Done. Build assets prepared in $DEST_DIR"
