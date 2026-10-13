#!/usr/bin/env bash
# One-command free deployment for Busly (self-host + Cloudflare Tunnel).
#   ./scripts/demo-up.sh           bring everything up, print URLs + next commands
#   ./scripts/demo-up.sh --seed    also refresh demo data (accounts, today's trips, live GPS)
#
# Cost: Rs 0. No credit card. No accounts. Laptop must stay on + online.
set -u
cd "$(dirname "$0")/.."

SEED=0
[ "${1:-}" = "--seed" ] && SEED=1

echo "==> Starting backend + tunnels..."
docker compose --profile tunnel up -d >/dev/null 2>&1

echo "==> Waiting for gateway..."
for i in $(seq 1 30); do
  if curl -s -m 5 -o /dev/null http://localhost:8000/health 2>/dev/null; then
    echo "    gateway OK"
    break
  fi
  [ "$i" = "30" ] && { echo "ERROR: gateway did not start. Run: docker compose logs gateway"; exit 1; }
  sleep 4
done

if [ "$SEED" = "1" ]; then
  echo "==> Seeding demo data..."
  python3 scripts/demo-seed.py || echo "    (seed failed - backend still usable, check output above)"
fi

echo "==> Waiting for tunnel URLs..."
API_URL=""
ADMIN_URL=""
for i in $(seq 1 20); do
  API_URL=$(docker compose logs cloudflared 2>/dev/null | grep -o "https://[a-z0-9-]*\.trycloudflare\.com" | sort -u | tail -1)
  ADMIN_URL=$(docker compose logs cloudflared-admin 2>/dev/null | grep -o "https://[a-z0-9-]*\.trycloudflare\.com" | sort -u | tail -1)
  [ -n "$API_URL" ] && [ -n "$ADMIN_URL" ] && break
  sleep 5
done
[ -z "$API_URL" ] && { echo "ERROR: API tunnel URL not found. Run: docker compose logs cloudflared"; exit 1; }
[ -z "$ADMIN_URL" ] && echo "WARN: admin tunnel URL not found (admin tunnel may still be connecting)."

echo
echo "==================== DEPLOYED (Rs 0) ===================="
echo " API (public):     $API_URL"
if curl -s -m 8 -o /dev/null http://localhost:3000/login 2>/dev/null; then
  echo " Dashboard (public): ${ADMIN_URL:-"(admin tunnel not ready - check logs)"}"
else
  echo " Dashboard (public): ${ADMIN_URL:-"(not ready)"}  <-- starts working once you run the Admin command below"
fi
echo " Dashboard (laptop): http://localhost:3000"
echo
echo "--- run these in separate terminals ---"
echo " Admin (local UI, live data via tunnel):"
echo "   cd admin && NEXT_PUBLIC_API_URL=$API_URL/api/v1 npm run dev"
echo
echo " Phone app (Expo Go, any network):"
echo "   cd busly-app && EXPO_PUBLIC_API_URL=$API_URL/api/v1 npx expo start --tunnel"
echo
echo "--- logins ---"
echo " admin@busly.com / admin123 | driver@busly.com / driver123"
echo " teacher@busly.com / teacher123 | parent@busly.com / parent123"
echo "=========================================================="
echo "NOTE: tunnel URLs rotate when containers recreate. Re-run this"
echo "script after any 'docker compose up' and use the fresh URLs."
