#!/bin/bash

# Cloudflare API credentials
CF_API_TOKEN="-DeqOGVQ7BmPEPI6V10OgWE8Ep-XaT7nBVx0TGKI"
ZONE_ID="80078b60da55e56fcc83ed6229a4b3fb"
DOMAIN="ai-certificates.app"

# Function to add DNS record
add_dns_record() {
    local type=$1
    local name=$2
    local content=$3
    local ttl=$4
    local proxied=$5
    local priority=$6

    echo "Adding $type record for $name..."
    if [ "$type" == "MX" ]; then
        response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
            -H "Authorization: Bearer $CF_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data "{
                \"type\": \"$type\",
                \"name\": \"$name\",
                \"content\": \"$content\",
                \"ttl\": $ttl,
                \"priority\": $priority,
                \"proxied\": $proxied
            }")
    else
        response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
            -H "Authorization: Bearer $CF_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data "{
                \"type\": \"$type\",
                \"name\": \"$name\",
                \"content\": \"$content\",
                \"ttl\": $ttl,
                \"proxied\": $proxied
            }")
    fi
    
    # Check if the request was successful
    if [[ $response == *"\"success\":true"* ]]; then
        echo "Successfully added $type record for $name"
    else
        echo "Failed to add $type record for $name"
        echo "Response: $response"
    fi
}

# Add CNAME record for email verification
add_dns_record "CNAME" "email.$DOMAIN" "verify.bounces.google.com" 1 false

# Add MX records for Google Workspace
add_dns_record "MX" "$DOMAIN" "aspmx.l.google.com" 1 false 1
add_dns_record "MX" "$DOMAIN" "alt1.aspmx.l.google.com" 1 false 5
add_dns_record "MX" "$DOMAIN" "alt2.aspmx.l.google.com" 1 false 5
add_dns_record "MX" "$DOMAIN" "alt3.aspmx.l.google.com" 1 false 10
add_dns_record "MX" "$DOMAIN" "alt4.aspmx.l.google.com" 1 false 10

# Add _dmarc record
add_dns_record "TXT" "_dmarc.$DOMAIN" "v=DMARC1; p=reject; rua=mailto:dmarc@$DOMAIN" 1 false

echo "DNS records have been added successfully!" 