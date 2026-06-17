#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${AWS_APP_DIR:-/opt/careerbuddy}"

cd "$APP_DIR"
if [ ! -f .env ]; then
  echo "Missing $APP_DIR/.env. Create it before deploying." >&2
  exit 1
fi

docker compose pull || true
docker compose up -d --build
docker compose exec -T backend alembic upgrade head
