#!/usr/bin/dumb-init bashio
set -e

bashio::log.info "==> Starting application"

exec node /app/app.js