#!/bin/sh
set -e

# Default backend URL (for staging)
BACKEND_API_URL=${BACKEND_API_URL:-https://stage-pipeline-api.klimatkollen.se}

# Extract hostname from BACKEND_API_URL for Host header
# Remove protocol (http:// or https://) and path, keep only hostname:port
BACKEND_HOST=$(echo "$BACKEND_API_URL" | sed -E 's|^https?://||' | sed -E 's|/.*$||')

# Export for envsubst
export BACKEND_API_URL
export BACKEND_HOST

# Substitute environment variables in nginx config template
envsubst '${BACKEND_API_URL} ${BACKEND_HOST}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
