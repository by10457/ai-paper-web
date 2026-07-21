#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$WEB_ROOT/apps/web-antdv-next"
ARCHIVE_PATH="$APP_DIR/dist.zip"
API_ROOT="${AI_PAPER_API_DIR:-$(dirname -- "$WEB_ROOT")/ai-paper-api}"
PUBLIC_DIR="$API_ROOT/public"
TARGET_ARCHIVE_PATH="$PUBLIC_DIR/dist.zip"
TEMP_ARCHIVE_PATH="$PUBLIC_DIR/.dist.zip.tmp"

cleanup() {
  if [[ -f "$TEMP_ARCHIVE_PATH" ]]; then
    rm -f -- "$TEMP_ARCHIVE_PATH"
  fi
}

trap cleanup EXIT

for command_name in pnpm unzip; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "错误：缺少命令 $command_name" >&2
    exit 1
  fi
done

if [[ ! -d "$API_ROOT" ]]; then
  echo "错误：未找到后端项目目录：$API_ROOT" >&2
  echo "如后端不在相邻目录，请设置 AI_PAPER_API_DIR。" >&2
  exit 1
fi

if [[ ! -f "$API_ROOT/app.py" || ! -f "$API_ROOT/pyproject.toml" ]]; then
  echo "错误：目标目录不是有效的 ai-paper-api 项目：$API_ROOT" >&2
  exit 1
fi

if [[ -e "$PUBLIC_DIR" && ! -d "$PUBLIC_DIR" ]]; then
  echo "错误：后端 public 路径不是目录：$PUBLIC_DIR" >&2
  exit 1
fi

echo "[1/3] 构建前端生产包"
rm -f -- "$ARCHIVE_PATH"
(
  cd -- "$WEB_ROOT"
  pnpm run build
)

if [[ ! -s "$ARCHIVE_PATH" ]]; then
  echo "错误：构建完成后未生成有效压缩包：$ARCHIVE_PATH" >&2
  exit 1
fi

echo "[2/3] 校验 dist.zip"
unzip -tq "$ARCHIVE_PATH" >/dev/null

echo "[3/3] 复制压缩包到后端 public 目录"
mkdir -p -- "$PUBLIC_DIR"
cp -- "$ARCHIVE_PATH" "$TEMP_ARCHIVE_PATH"
mv -f -- "$TEMP_ARCHIVE_PATH" "$TARGET_ARCHIVE_PATH"

echo "前端构建包已更新：$TARGET_ARCHIVE_PATH"
echo "压缩包将在执行后端 start.sh 时解压部署。"
