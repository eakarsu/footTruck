#!/usr/bin/env bash
set -euo pipefail

runtime_port="${PORT:-${BACKEND_PORT:-}}"
frontend_port="${FRONTEND_PORT:-${CLIENT_PORT:-}}"
[[ "$runtime_port" =~ ^[0-9]+$ ]] || { echo "PORT or BACKEND_PORT must be an assigned numeric port" >&2; exit 2; }
[[ "$frontend_port" =~ ^[0-9]+$ ]] || { echo "FRONTEND_PORT or CLIENT_PORT must be an assigned numeric port" >&2; exit 2; }
if lsof -tiTCP:"$runtime_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Assigned backend port $runtime_port is already in use; no process was stopped" >&2
  exit 1
fi
export PORT="$runtime_port" BACKEND_PORT="$runtime_port"
export CUSTOMER_TOKEN_SECRET="${CUSTOMER_TOKEN_SECRET:-${REFRESH_TOKEN_SECRET:-}}"
export CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-http://127.0.0.1:$frontend_port}"

: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${JWT_SECRET:?JWT_SECRET must be set}"
: "${CUSTOMER_TOKEN_SECRET:?CUSTOMER_TOKEN_SECRET or REFRESH_TOKEN_SECRET must be set}"
: "${CORS_ALLOWED_ORIGINS:?CORS_ALLOWED_ORIGINS must be set}"

if [ "${#JWT_SECRET}" -lt 32 ] || [ "${#CUSTOMER_TOKEN_SECRET}" -lt 32 ]; then
  echo "JWT_SECRET and CUSTOMER_TOKEN_SECRET must each contain at least 32 characters" >&2
  exit 1
fi

service_name="${1:-backend}"
project_root="$(cd "$(dirname "$0")" && pwd)"

case "$service_name" in
  backend)
    cd "$project_root/backend"
    exec npm start
    ;;
  frontend)
    if lsof -tiTCP:"$frontend_port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "Assigned frontend port $frontend_port is already in use; no process was stopped" >&2
      exit 1
    fi
    cd "$project_root/frontend"
    exec npm run dev -- --host 127.0.0.1 --port "$frontend_port"
    ;;
  *)
    echo "Usage: ./start.sh [backend|frontend]" >&2
    exit 2
    ;;
esac
