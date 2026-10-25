#!/usr/bin/env bash
# Pull every environment variable for this project from Vercel and Railway
# into local, git-ignored files.
#
# Outputs
#   .env.vercel.<environment>            production | preview | development
#   .env.railway.<service>.production     one file per Railway service
#
# Vercel "Secret" type variables can never be read back (not by CLI, API or
# dashboard). They are written as "[SENSITIVE]" placeholders and must be
# re-entered by hand. See docs/env-pull.md.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

VERCEL_ENVIRONMENTS=("production" "preview" "development")

# Railway project/service identifiers for this repo.
CERTIFY_AI_PROJECT_ID="064bdc27-471a-4c21-8750-f50f4f4441c3"
CERTIFY_AI_SERVICES=(
  "Postgres"
  "backup-worker"
  "setup-pg-extensions"
  "pg-install-extension"
  "install-pg-stat-statements"
)
AI_WORKER_PROJECT_ID="af43b5df-8b7b-4a19-a845-6dbf0a8f8136"
AI_WORKER_SERVICE="ai-worker"

require_cli() {
  local binary="$1"
  local install_hint="$2"
  if ! command -v "$binary" >/dev/null 2>&1; then
    echo "Error: '$binary' is not installed. Install it with:" >&2
    echo "  $install_hint" >&2
    exit 1
  fi
}

require_cli "vercel" "npm install -g vercel"
require_cli "railway" "npm install -g @railway/cli"

if ! vercel whoami >/dev/null 2>&1; then
  echo "Error: not logged in to Vercel. Run: vercel login" >&2
  exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
  echo "Error: not logged in to Railway. Run: railway login" >&2
  exit 1
fi

echo "Pulling Vercel environment variables (project: ai_certify)"
for environment in "${VERCEL_ENVIRONMENTS[@]}"; do
  target=".env.vercel.$environment"
  vercel env pull "$target" --environment="$environment" --yes
  echo "  -> $target"
done

pull_railway_service() {
  local project_id="$1"
  local service="$2"
  # Slug the service name: macOS filesystems are case-insensitive, so
  # "Postgres" and "postgres" would collide on the same file.
  local slug
  slug="$(printf '%s' "$service" | tr '[:upper:]' '[:lower:]')"
  local target=".env.railway.$slug.production"

  if railway variables \
    --project "$project_id" \
    --service "$service" \
    --environment production \
    --kv >"$target" 2>/dev/null; then
    echo "  -> $target"
  else
    echo "  !! failed to pull Railway service '$service'" >&2
    rm -f "$target"
  fi
}

echo "Pulling Railway environment variables (project: Certify-AI)"
for service in "${CERTIFY_AI_SERVICES[@]}"; do
  pull_railway_service "$CERTIFY_AI_PROJECT_ID" "$service"
done

echo "Pulling Railway environment variables (project: ai-worker)"
pull_railway_service "$AI_WORKER_PROJECT_ID" "$AI_WORKER_SERVICE"

echo
echo "Done. Compare the refresh against your existing .env.local before replacing it."
echo "Placeholders marked \"[SENSITIVE]\" could not be decrypted by the CLI."
