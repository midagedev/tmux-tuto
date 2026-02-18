#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOCKERFILE_DIR="$ROOT_DIR/scripts/vm/alpine-tmux"
TOOLS_DIR="$ROOT_DIR/scripts/vm/tools"
TMP_DIR="$ROOT_DIR/.tmp/vm-image"
PUBLIC_VM_DIR="$ROOT_DIR/public/vm"
FLAT_DIR="$PUBLIC_VM_DIR/alpine-tmux-flat"
FSJSON_PATH="$PUBLIC_VM_DIR/alpine-tmux-fs.json"
ROOTFS_TAR="$TMP_DIR/alpine-tmux-rootfs.tar"
V86_BUILD_DIR="$ROOT_DIR/node_modules/v86/build"

V86_WASM_PATH="$PUBLIC_VM_DIR/v86.wasm"
V86_WASM_FALLBACK_PATH="$PUBLIC_VM_DIR/v86-fallback.wasm"
SEABIOS_PATH="$PUBLIC_VM_DIR/seabios.bin"
VGABIOS_PATH="$PUBLIC_VM_DIR/vgabios.bin"

IMAGE_NAME="local/alpine-v86-tmux"
CONTAINER_NAME="alpine-v86-tmux-build"

echo "[vm:build] preparing directories"
mkdir -p "$TOOLS_DIR" "$TMP_DIR" "$PUBLIC_VM_DIR" "$FLAT_DIR"

if [[ ! -d "$V86_BUILD_DIR" ]]; then
  echo "[vm:build] missing v86 runtime files. run npm install first." >&2
  exit 1
fi

echo "[vm:build] syncing v86 runtime assets"
cp "$V86_BUILD_DIR/v86.wasm" "$V86_WASM_PATH"
cp "$V86_BUILD_DIR/v86-fallback.wasm" "$V86_WASM_FALLBACK_PATH"

if [[ ! -f "$SEABIOS_PATH" ]]; then
  echo "[vm:build] downloading seabios.bin"
  curl -L --fail "https://copy.sh/v86/bios/seabios.bin" -o "$SEABIOS_PATH"
fi

if [[ ! -f "$VGABIOS_PATH" ]]; then
  echo "[vm:build] downloading vgabios.bin"
  curl -L --fail "https://copy.sh/v86/bios/vgabios.bin" -o "$VGABIOS_PATH"
fi

if [[ ! -f "$TOOLS_DIR/fs2json.py" ]]; then
  echo "[vm:build] downloading fs2json.py"
  curl -L --fail "https://raw.githubusercontent.com/copy/v86/master/tools/fs2json.py" -o "$TOOLS_DIR/fs2json.py"
fi

if [[ ! -f "$TOOLS_DIR/copy-to-sha256.py" ]]; then
  echo "[vm:build] downloading copy-to-sha256.py"
  curl -L --fail "https://raw.githubusercontent.com/copy/v86/master/tools/copy-to-sha256.py" -o "$TOOLS_DIR/copy-to-sha256.py"
fi

chmod +x "$TOOLS_DIR/fs2json.py" "$TOOLS_DIR/copy-to-sha256.py"

echo "[vm:build] building docker image ($IMAGE_NAME)"
docker build --platform linux/386 --rm -t "$IMAGE_NAME" "$DOCKERFILE_DIR"

echo "[vm:build] exporting root filesystem"
docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker create --platform linux/386 --name "$CONTAINER_NAME" "$IMAGE_NAME" >/dev/null
docker export "$CONTAINER_NAME" -o "$ROOTFS_TAR"
docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true

# Remove docker marker file if present
tar -f "$ROOTFS_TAR" --delete ".dockerenv" >/dev/null 2>&1 || true

echo "[vm:build] generating fs.json"
python3 "$TOOLS_DIR/fs2json.py" --zstd --out "$FSJSON_PATH" "$ROOTFS_TAR"

echo "[vm:build] generating hashed flat chunks"
python3 "$TOOLS_DIR/copy-to-sha256.py" --zstd "$ROOTFS_TAR" "$FLAT_DIR"

echo "[vm:build] done"
echo "[vm:build] fs.json: $FSJSON_PATH"
echo "[vm:build] flat dir: $FLAT_DIR"
