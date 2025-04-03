#!/bin/sh
set -e

# Replace environment variables in the nginx configuration
envsubst '${API_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Execute the main container command
exec "$@"
