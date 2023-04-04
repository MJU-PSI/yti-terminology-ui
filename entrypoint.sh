#!/bin/sh
set -e

# It is possible to overwrite configuration via environment variables.
envsubst < /usr/share/nginx/html/configuration/configuration.template.json > /usr/share/nginx/html/configuration/configuration.json

# Starg nginx
nginx -g 'daemon off;'
