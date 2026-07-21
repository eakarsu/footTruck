#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
project_root="$(cd "$(dirname "$0")" && pwd)"
cd "$project_root/backend"
exec npx prisma migrate deploy
