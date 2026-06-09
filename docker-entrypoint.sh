#!/bin/sh
set -e

# Pipeline backend (default: staging)
BACKEND_API_URL=${BACKEND_API_URL:-https://stage-pipeline-api.klimatkollen.se}
# Unearth HTTP API (default: staging, includes /api suffix)
UNEARTH_API_URL=${UNEARTH_API_URL:-https://stage-api.unearthdata.ai/api}
# Garbo API — queue-archive only (default: staging klimatkollen)
GARBO_API_URL=${GARBO_API_URL:-https://stage-api.klimatkollen.se/api}
# API keys for proxied requests (injected as X-API-Key)
GARBO_ALL_ACCESS_API_KEY=${GARBO_ALL_ACCESS_API_KEY:-}
GARBO_STAGE_ALL_ACCESS_API_KEY=${GARBO_STAGE_ALL_ACCESS_API_KEY:-}
GARBO_PROD_ALL_ACCESS_API_KEY=${GARBO_PROD_ALL_ACCESS_API_KEY:-}

# Extract hostnames for Host header (required when using variable in proxy_pass)
BACKEND_HOST=$(echo "$BACKEND_API_URL" | sed -E 's|^https?://||' | sed -E 's|/.*$||')
UNEARTH_HOST=$(echo "$UNEARTH_API_URL" | sed -E 's|^https?://||' | sed -E 's|/.*$||')
GARBO_HOST=$(echo "$GARBO_API_URL" | sed -E 's|^https?://||' | sed -E 's|/.*$||')

export BACKEND_API_URL
export BACKEND_HOST
export UNEARTH_API_URL
export UNEARTH_HOST
export GARBO_API_URL
export GARBO_HOST
export GARBO_ALL_ACCESS_API_KEY
export GARBO_STAGE_ALL_ACCESS_API_KEY
export GARBO_PROD_ALL_ACCESS_API_KEY

envsubst '${BACKEND_API_URL} ${BACKEND_HOST} ${UNEARTH_API_URL} ${UNEARTH_HOST} ${GARBO_API_URL} ${GARBO_HOST} ${GARBO_ALL_ACCESS_API_KEY} ${GARBO_STAGE_ALL_ACCESS_API_KEY} ${GARBO_PROD_ALL_ACCESS_API_KEY}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
