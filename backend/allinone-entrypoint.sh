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
exec honcho start
