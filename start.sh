#!/usr/bin/env bash
set -euo pipefail
# Runtime governance modes: check|migrate|start. Schema deployment remains explicit.
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$PROJECT_DIR/.env"
load_env_file(){ local line key value;while IFS= read -r line||[ -n "$line" ];do [[ "$line" =~ ^[[:space:]]*# || "$line" =~ ^[[:space:]]*$ ]]&&continue;line="${line#export }";key="${line%%=*}";value="${line#*=}";key="${key//[[:space:]]/}";[[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]||continue;[ -n "${!key+x}" ]&&continue;if [[ "$value" == \"*\" && "$value" == *\" ]];then value="${value:1:${#value}-2}";elif [[ "$value" == \'*\' && "$value" == *\' ]];then value="${value:1:${#value}-2}";fi;export "$key=$value";done < "$ENV_FILE"; }
[ -f "$ENV_FILE" ]||{ echo "Missing required file: $ENV_FILE" >&2;exit 1; };load_env_file
export PATH="/opt/homebrew/bin:$PATH"
case "${1:-start}" in
  check) cd "$PROJECT_DIR/backend";npm run lint ;;
  migrate) [[ "${ALLOW_SCHEMA_MIGRATION:-}" =~ ^(1|true)$ ]]||{ echo "Set ALLOW_SCHEMA_MIGRATION=1 for explicit migration" >&2;exit 1; };cd "$PROJECT_DIR/backend";exec npm run prisma:migrate ;;
  start) ;;
  *) echo "Usage: $0 [start|check|migrate]" >&2;exit 64 ;;
esac
: "${BACKEND_PORT:?BACKEND_PORT is required}";: "${FRONTEND_PORT:?FRONTEND_PORT is required}";: "${DATABASE_URL:?DATABASE_URL is required}"
: "${OPENROUTER_API_KEY:?OPENROUTER_API_KEY is required}";: "${OPENROUTER_MODEL:?OPENROUTER_MODEL is required}"
[ "${OPENROUTER_BASE_URL:-}" = "https://openrouter.ai/api/v1" ]||{ echo "Exact OPENROUTER_BASE_URL is required" >&2;exit 1; }
[ "$BACKEND_PORT" != "$FRONTEND_PORT" ]||{ echo "Assigned ports must differ" >&2;exit 1; }
for assigned_port in "$BACKEND_PORT" "$FRONTEND_PORT";do [[ "$assigned_port" =~ ^[0-9]+$ ]]||exit 1;nc -z 127.0.0.1 "$assigned_port" >/dev/null 2>&1&&{ echo "Assigned port $assigned_port is occupied" >&2;exit 1; };done
[ -d "$PROJECT_DIR/frontend/node_modules" ]&&[ -d "$PROJECT_DIR/backend/node_modules" ]||{ echo "Runtime dependencies are missing" >&2;exit 1; }
export RUNTIME_PROJECT_NAME=footTruck RUNTIME_AI_ENDPOINT=/api/ai/food-truck-operations-review RUNTIME_AI_FEATURE=food-truck-operations-review
export RUNTIME_AI_SYSTEM_PROMPT='You are a food-truck operations assistant. Review inventory, food safety, staffing, location, order, refund, and audit evidence with explicit operator approval gates.'
node "$PROJECT_DIR/runtime/setup.mjs"
CHILD_PIDS=()
(cd "$PROJECT_DIR"&&exec node runtime/api.mjs)&CHILD_PIDS+=("$!")
(cd "$PROJECT_DIR/frontend"&&exec npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT" --strictPort)&CHILD_PIDS+=("$!")
cleanup(){ trap - EXIT INT TERM;for pid in "${CHILD_PIDS[@]}";do kill "$pid" 2>/dev/null||true;done;for pid in "${CHILD_PIDS[@]}";do wait "$pid" 2>/dev/null||true;done; }
trap cleanup EXIT INT TERM
wait "${CHILD_PIDS[@]}"
