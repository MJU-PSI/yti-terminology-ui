#!/bin/sh
set -e

# It is possible to overwrite configuration via environment variables.
envsubst < /usr/share/nginx/html/configuration/configuration.template.json > /usr/share/nginx/html/configuration/configuration.json
envsubst '${TERMINOLOGY_API_URL},${MESSAGING_API_URL}' < /etc/nginx/conf.d/nginx.template > /etc/nginx/conf.d/default.conf

# Replace base href in index.html
if [[ $ANGULAR_BASE_HREF != */ ]] # * is used for pattern matching
then
  ANGULAR_BASE_HREF="${ANGULAR_BASE_HREF}/";
  sed -i 's#<base href="/">#<base href="'"${ANGULAR_BASE_HREF}"'">#' /usr/share/nginx/html/index.html
fi

# Start nginx
nginx -g 'daemon off;'
