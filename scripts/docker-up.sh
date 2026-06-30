#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD=false
BOOTSTRAP=false
HEALTH_TIMEOUT_SEC=60
BOOTSTRAP_TIMEOUT_SEC=180

usage() {
  cat <<'EOF'
Usage: scripts/docker-up.sh [--build] [--bootstrap]

  --build       Run docker compose build before starting
  --bootstrap   Trigger data refresh and wait until overall_status != error
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) BUILD=true; shift ;;
    --bootstrap) BOOTSTRAP=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

ensure_env_files() {
  if [[ ! -f "$ROOT/backend/.env" ]]; then
    echo "backend/.env is missing." >&2
    echo "Copy backend/.env.example to backend/.env and set FRED_API_KEY and TIINGO_API_KEY." >&2
    exit 1
  fi

  if [[ ! -f "$ROOT/frontend/.env.local" ]]; then
    if [[ -f "$ROOT/frontend/.env.local.example" ]]; then
      cp "$ROOT/frontend/.env.local.example" "$ROOT/frontend/.env.local"
      echo "Created frontend/.env.local from .env.local.example"
    else
      printf 'NEXT_PUBLIC_API_URL=http://localhost:8000\n' > "$ROOT/frontend/.env.local"
      echo "Created frontend/.env.local with default API URL"
    fi
  fi
}

wait_backend_health() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SEC))
  local url="http://localhost:8000/health"

  echo "Waiting for backend health at $url ..."
  while (( SECONDS < deadline )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "Backend is healthy."
      return 0
    fi
    sleep 2
  done
  echo "Backend did not become healthy within ${HEALTH_TIMEOUT_SEC}s. Check: docker compose logs backend" >&2
  exit 1
}

invoke_data_bootstrap() {
  local deadline=$((SECONDS + BOOTSTRAP_TIMEOUT_SEC))
  local status_url="http://localhost:8000/api/v1/data-status"
  local refresh_url="http://localhost:8000/api/v1/data-status/refresh"

  echo "Triggering initial data refresh ..."
  curl -fsS -X POST "$refresh_url" >/dev/null

  echo "Polling data status until overall_status is not error ..."
  while (( SECONDS < deadline )); do
    overall_status="$(curl -fsS "$status_url" | python3 -c "import sys,json; print(json.load(sys.stdin).get('overall_status','error'))")"
    if [[ "$overall_status" != "error" ]]; then
      echo "Data status: $overall_status"
      return 0
    fi
    sleep 5
  done
  echo "Data bootstrap did not complete within ${BOOTSTRAP_TIMEOUT_SEC}s. Check: GET $status_url" >&2
  exit 1
}

ensure_env_files

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

cd "$ROOT"

if [[ "$BUILD" == true ]]; then
  echo "Building images (docker compose build) ..."
  docker compose build
fi

echo "Starting services (docker compose up -d) ..."
docker compose up -d

wait_backend_health

if [[ "$BOOTSTRAP" == true ]]; then
  invoke_data_bootstrap
fi

cat <<'EOF'

Risk Dashboard is running:
  Frontend:  http://localhost:3000
  API docs:  http://localhost:8000/docs
  Health:    http://localhost:8000/health
EOF

if [[ "$BOOTSTRAP" != true ]]; then
  echo ""
  echo "Tip: run with --bootstrap on first launch to refresh market data."
fi

echo ""
echo "Logs: docker compose logs -f"
echo "Stop: docker compose down"
