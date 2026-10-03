#!/bin/sh
# Generate the RS256 JWT keypair used by auth-service (sign) and gateway (verify).
# Run once on the machine that hosts the backend:
#   sudo ./scripts/gen-keys.sh
# Keys land in /etc/keys (mounted read-only into the containers).
set -eu

KEYS_DIR="${KEYS_DIR:-/etc/keys}"

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required (sudo apt install openssl)" >&2
  exit 1
fi

mkdir -p "$KEYS_DIR"
openssl genrsa -out "$KEYS_DIR/private.pem" 2048 2>/dev/null
openssl rsa -in "$KEYS_DIR/private.pem" -pubout -out "$KEYS_DIR/public.pem" 2>/dev/null
chmod 600 "$KEYS_DIR/private.pem"
chmod 644 "$KEYS_DIR/public.pem"
echo "Wrote $KEYS_DIR/private.pem and $KEYS_DIR/public.pem"
echo "IMPORTANT: back these up. Losing private.pem invalidates every login session."
