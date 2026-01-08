#!/bin/sh
set -e

# Default backend URL (for staging)
BACKEND_API_URL=${BACKEND_API_URL:-https://stage-pipeline-api.klimatkollen.se}

# Substitute environment variables in nginx config template
envsubst '${BACKEND_API_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
