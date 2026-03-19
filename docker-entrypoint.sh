#!/bin/sh
set -e

# Pipeline backend (default: staging)
BACKEND_API_URL=${BACKEND_API_URL:-https://stage-pipeline-api.klimatkollen.se}
# Garbo backend (default: staging API base including /api)
GARBO_API_URL=${GARBO_API_URL:-https://stage-api.klimatkollen.se/api}

# Extract hostnames for Host header (required when using variable in proxy_pass)
BACKEND_HOST=$(echo "$BACKEND_API_URL" | sed -E 's|^https?://||' | sed -E 's|/.*$||')
GARBO_HOST=$(echo "$GARBO_API_URL" | sed -E 's|^https?://||' | sed -E 's|/.*$||')

export BACKEND_API_URL
export BACKEND_HOST
export GARBO_API_URL
export GARBO_HOST

# Substitute environment variables in nginx config template
envsubst '${BACKEND_API_URL} ${BACKEND_HOST} ${GARBO_API_URL} ${GARBO_HOST}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
