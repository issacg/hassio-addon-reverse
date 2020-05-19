#!bashio

set -e
bashio::log.debug "==> Querying Supervisor API"
PORT=$(bashio::api.supervisor GET /addons/self/info 0 .ingress_port)
bashio::log.info "==> Starting proxy $PORT:localhost:8080"
socat tcp-listen:8080,fork,reuseaddr,su=nobody tcp-connect:localhost:$PORT