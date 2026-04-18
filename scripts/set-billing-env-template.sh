#!/bin/zsh
set -euo pipefail

# Usage:
# 1) Replace every placeholder value in this file with your ROTATED real values.
# 2) Make sure you are logged in:
#      vercel login
#      railway login
# 3) Link the correct projects if needed:
#      vercel link
#      railway link
# 4) Run:
#      chmod +x scripts/set-billing-env-template.sh
#      ./scripts/set-billing-env-template.sh
#
# Notes:
# - This template does NOT contain real secrets.
# - It sets Stripe env vars for both Vercel and Railway using their CLIs.
# - Edit the environment targets below to match your deployment setup.

# -----------------------------
# Replace these placeholders
# -----------------------------
STRIPE_SECRET_KEY="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"
STRIPE_WEBHOOK_SECRET="whsec_PaHz2gquvwUOEIWwIoXkP5iDsPq0uCgd"
STRIPE_VERIFICATION_PRICE_ID="price_1TKtiFPBgXHEoJJAOZ6TxUkr"

# Vercel environment targets to update.
# Supported examples: production preview development
VERCEL_ENVS=("production" "preview" "development")

# Railway service names to update.
# Replace with the actual linked service names if you use multiple services.
# Common examples in this repo:
# - web
# - railway-ai-worker
RAILWAY_SERVICES=("web" "railway-ai-worker")

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

validate_placeholders_replaced() {
  if [[ "$STRIPE_SECRET_KEY" == "sk_live_rotate_and_replace_me" ]]; then
    echo "Replace STRIPE_SECRET_KEY before running this script." >&2
    exit 1
  fi

  if [[ "$STRIPE_WEBHOOK_SECRET" == "whsec_rotate_and_replace_me" ]]; then
    echo "Replace STRIPE_WEBHOOK_SECRET before running this script." >&2
    exit 1
  fi
}

set_vercel_env() {
  local env_name="$1"
  local key="$2"
  local value="$3"

  echo "Setting Vercel env: ${key} (${env_name})"
  printf '%s' "$value" | vercel env add "$key" "$env_name" --force
}

set_railway_env_for_service() {
  local service_name="$1"

  echo "Setting Railway envs for service: ${service_name}"
  railway variables --service "$service_name" set \
    "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY" \
    "STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET" \
    "STRIPE_VERIFICATION_PRICE_ID=$STRIPE_VERIFICATION_PRICE_ID"
}

main() {
  require_cmd vercel
  require_cmd railway
  validate_placeholders_replaced

  echo "Updating Vercel environments..."
  for env_name in "${VERCEL_ENVS[@]}"; do
    set_vercel_env "$env_name" "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
    set_vercel_env "$env_name" "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
    set_vercel_env "$env_name" "STRIPE_VERIFICATION_PRICE_ID" "$STRIPE_VERIFICATION_PRICE_ID"
  done

  echo "Updating Railway services..."
  for service_name in "${RAILWAY_SERVICES[@]}"; do
    set_railway_env_for_service "$service_name"
  done

  echo "Done."
  echo "If Vercel or Railway prompts about linking/selecting projects, run 'vercel link' and 'railway link' first, then rerun this script."
}

main "$@"
