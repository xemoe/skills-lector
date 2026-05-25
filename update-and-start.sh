#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Pulling latest from main..."
git checkout main
git pull origin main

echo "==> Building..."
npm run build

echo "==> Starting portless production server..."
npm run start:portless
