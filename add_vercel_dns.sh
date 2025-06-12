#!/bin/bash

# Prompt for API token if not set
if [ -z "$CF_API_TOKEN" ]; then
  read -sp "Enter your Cloudflare API Token: " CF_API_TOKEN
  echo
fi

# Prompt for zone name if not set
if [ -z "$ZONE_NAME" ]; then
  read -p "Enter your Cloudflare Zone Name (e.g. fire-call.com): " ZONE_NAME
fi

# Check for jq and install if missing (macOS/Homebrew or Ubuntu/Apt)
if ! command -v jq &> /dev/null; then
  echo "jq not found. Installing..."
  if command -v brew &> /dev/null; then
    brew install jq
  elif command -v apt-get &> /dev/null; then
    sudo apt-get update && sudo apt-get install -y jq
  else
    echo "Please install jq manually."
    exit 1
  fi
fi

# Get the Zone ID
echo "Fetching Zone ID for $ZONE_NAME..."
ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$ZONE_NAME" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" | jq -r '.result[0].id')

if [ -z "$ZONE_ID" ] || [ "$ZONE_ID" == "null" ]; then
  echo "Could not find Zone ID for $ZONE_NAME"
  exit 1
fi

echo "Zone ID for $ZONE_NAME is $ZONE_ID"

# Function to add or update a DNS record
add_or_update_record() {
  local TYPE=$1
  local NAME=$2
  local CONTENT=$3
  # Check if record exists
  RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=$TYPE&name=$NAME" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" | jq -r '.result[0].id')

  if [ -n "$RECORD_ID" ] && [ "$RECORD_ID" != "null" ]; then
    echo "Updating $TYPE record for $NAME..."
    curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data '{"type":"'$TYPE'","name":"'$NAME'","content":"'$CONTENT'","ttl":1,"proxied":false}' | jq
  else
    echo "Creating $TYPE record for $NAME..."
    curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data '{"type":"'$TYPE'","name":"'$NAME'","content":"'$CONTENT'","ttl":1,"proxied":false}' | jq
  fi
}

# Add or update A record for root domain
add_or_update_record "A" "$ZONE_NAME" "76.76.21.21"

# Add or update CNAME record for www
add_or_update_record "CNAME" "www.$ZONE_NAME" "cname.vercel-dns.com"

echo "DNS records for Vercel have been added or updated for $ZONE_NAME." 