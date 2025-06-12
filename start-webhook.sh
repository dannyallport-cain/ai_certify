#!/bin/bash

echo "Starting Stripe webhook listener..."
echo "This will forward webhook events from Stripe to your local app"
echo "Keep this running in a separate terminal window"
echo ""
echo "Webhook endpoint: http://localhost:4000/api/stripe/webhook"
echo ""

stripe listen --forward-to localhost:4000/api/stripe/webhook 