#!/bin/sh
# Entrypoint for the all-in-one image (free-platform deploys).
# JWT keys: prefer env vars (platform secret store), fall back to the
# /etc/keys volume mount used by docker-compose.
set -e
if [ -n "${JWT_PRIVATE_KEY:-}" ]; then
  mkdir -p /etc/keys
  printf '%b' "$JWT_PRIVATE_KEY" > /etc/keys/private.pem
  printf '%b' "${JWT_PUBLIC_KEY:-}" > /etc/keys/public.pem
  chmod 600 /etc/keys/private.pem
fi
PROCFILE=/app/Procfile
CUSTOM=/tmp/Procfile.custom
cp /app/Procfile "$CUSTOM"
if [ "${ENABLE_WORKER:-true}" != "true" ]; then
  # Free tiers (e.g. Render 512MB) can't fit the worker alongside the
  # services: run gateway + microservices only. Route optimization and CSV
  # report jobs stay queued; the admin dashboard falls back to live CSV.
  grep -v '^worker:' "$CUSTOM" > "$CUSTOM.tmp" && mv "$CUSTOM.tmp" "$CUSTOM"
  echo "busly: worker disabled via ENABLE_WORKER=false"
fi
if [ "${ENABLE_TENANT:-true}" != "true" ]; then
  # The tenant API is never called at runtime (the connection context lives
  # in Redis after provisioning): bootstrap once up front, then don't waste
  # RAM on the idle service.
  echo "busly: one-shot tenant bootstrap"
  python3 /app/backend/bootstrap_tenant.py
  grep -v '^tenant:' "$CUSTOM" > "$CUSTOM.tmp" && mv "$CUSTOM.tmp" "$CUSTOM"
  echo "busly: tenant service disabled via ENABLE_TENANT=false"
fi
if ! cmp -s /app/Procfile "$CUSTOM"; then
  PROCFILE="$CUSTOM"
fi
exec honcho -f "$PROCFILE" start
