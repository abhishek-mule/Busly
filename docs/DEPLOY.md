# Busly Deployment Guide (Rs 0, no credit card)

Two free paths. **Path 1 works right now** with what's on your laptop.
Path 2 removes the laptop but needs two free accounts (no card for either).

---

## Path 1 — Laptop + Cloudflare Tunnel (verified working)

**You need:** Docker + Compose, Node 22, Python 3, Expo Go on phone.
Laptop stays on + online while anyone uses it.

```bash
cd ~/Desktop/projects/Busly

# FIRST TIME ONLY: JWT keys
sudo ./scripts/gen-keys.sh

# EVERY TIME (also after reboot): deploy everything, print live URLs
./scripts/demo-up.sh --seed
```

The script prints copy-paste commands with the **current** tunnel URLs.
Run the two it shows, each in its own terminal:

```bash
# Terminal 2 — admin dashboard (URL comes from the script output)
cd admin && NEXT_PUBLIC_API_URL=<API-URL>/api/v1 npm run dev
# open http://localhost:3000/login

# Terminal 3 — phone app (phone on any network)
cd busly-app && EXPO_PUBLIC_API_URL=<API-URL>/api/v1 npx expo start --tunnel
# scan QR with Expo Go
```

**Verify:** script's health/login checks pass → admin login
(`admin@busly.com` / `admin123`) → driver starts trip → parent sees the bus.

**Rules of this setup:**
- Tunnel URLs **rotate** when containers recreate. Re-run `demo-up.sh`
  and use the fresh URLs (they're baked into clients at startup).
- Public dashboard URL 502s until the admin dev server (Terminal 2) is up.
- Same-WiFi demo? Skip tunnels: `docker compose up -d` + LAN-IP URLs.
- Stop everything: `docker compose down`. Check status: `docker compose ps`.

---

## Path 2 — Rs 0 split across free platforms (no laptop, no card)

Each piece lives where it's free. Nothing is bought, no card anywhere:

| Piece | Free home | Why it fits |
|---|---|---|
| Backend (1 container) | HuggingFace Spaces, Docker SDK, free CPU | 16GB RAM (our image uses ~600MB); repo already has root `Dockerfile` + Space config in README |
| Postgres + PostGIS | Neon free tier | Real Postgres, `CREATE DATABASE` + PostGIS supported |
| Redis (cache + Celery broker) | Upstash free tier | TLS `rediss://` URLs; RabbitMQ not needed |
| Admin dashboard | Vercel Hobby | Already configured via `vercel.json` |
| Phone app | Expo Go / EAS free | Already configured via `eas.json` |

### Step 1 — Neon Postgres (free, email signup)

1. New Project at neon.tech → open SQL Editor, run:
   `CREATE EXTENSION postgis;`
2. Confirm tenant provisioning works, run:
   `CREATE DATABASE tenant_default;` — must succeed.
3. Copy the connection string, add `?sslmode=require`. Fill:
   - `SHARED_DB_URL=postgresql://USER:PASSWORD@HOST/dbname?sslmode=require`
   - `ASYNC_PREFIX=postgresql+asyncpg://USER:PASSWORD@HOST`
   - plus `DB_USER / DB_PASSWORD / DB_HOST / DB_PORT=5432`.

### Step 2 — Upstash Redis (free, email signup)

1. New Redis database at upstash.com → copy the **TLS** endpoint.
2. Set all three:
   - `REDIS_URL=rediss://default:PASSWORD@HOST:6379`
   - `BROKER_URL=rediss://default:PASSWORD@HOST:6379/0`
   - `RESULT_BACKEND=rediss://default:PASSWORD@HOST:6379/0`

### Step 3 — JWT keys (generate once, paste as text)

```bash
sudo ./scripts/gen-keys.sh
cat /etc/keys/private.pem     # paste whole output as JWT_PRIVATE_KEY
cat /etc/keys/public.pem      # paste whole output as JWT_PUBLIC_KEY
```

### Step 4 — Backend on HuggingFace Spaces (free, email signup)

1. huggingface.co → New Space → name it `busly-api` → SDK **Docker** →
   hardware **free CPU** → Create.
2. Push this repo to the Space (or link it), so the root `Dockerfile`
   builds. The Space reads its config from this repo's README header.
3. Space → Settings → **Variables and secrets**: paste every variable from
   `.env.allinone.example` (Steps 1–3 values + the 7 `BUSLY_*_URL`
   localhost lines + `ALLOWED_ORIGINS=https://<your-admin-url>`).
   `PORT` is pre-set to 7860 by the image — leave it.
4. Wait for the build → your backend is `https://<you>-busly-api.hf.space`.

### Step 5 — Verify + seed + connect clients

```bash
curl https://<you>-busly-api.hf.space/health       # {"status":"ok",...}
API=https://<you>-busly-api.hf.space/api/v1 python3 scripts/demo-seed.py
```

- Admin on Vercel (free): import repo, Root Directory `admin`,
  `NEXT_PUBLIC_API_URL=https://<you>-busly-api.hf.space/api/v1`, Deploy.
- Phone: Expo Go with
  `EXPO_PUBLIC_API_URL=https://<you>-busly-api.hf.space/api/v1`
  (or EAS build with the same URL baked in).
- Logins: `admin@busly.com / admin123`, `driver@busly.com / driver123`,
  `teacher@busly.com / teacher123`, `parent@busly.com / parent123`.

### Honest caveats (free cloud)

- Free Spaces **sleep after ~48h idle** → first request wakes in 30–60s.
  (Keep Path 1 as your always-ready fallback.)
- No persistent disk on free compute — report CSVs regenerate on demand
  (the admin already falls back to live CSVs).
- Free DB tiers have storage/connection caps — fine for demos, not production.
- Providers change free plans without notice.
- The backend cannot run on Vercel itself (serverless) — only the admin can.

---

## Which path when?

| Situation | Use |
|---|---|
| College demo, same room | Path 1, same-WiFi LAN-IP mode (most reliable) |
| Remote viewers / phone on mobile data | Path 1, tunnel mode |
| Laptop can't stay on | Path 2 (accept sleep + cold starts) |
| Grading / handover | Path 1 + hand over the repo + this file |

---

## Appendix: cheapest VPS if you outgrow free (prices checked Oct 2026)

Free first — a VPS is only worth it when a real school uses Busly daily.
Minimum spec: **2GB RAM** (all-in-one image uses ~600MB + Postgres/Redis),
**4GB RAM** comfortable for the full 12-container compose stack.

| Host | Plan | Specs | Price | Pays without credit card? |
|---|---|---|---|---|
| HeavenCloud (Mumbai) | Budget 2GB | 2 cores / 2GB / 15GB SSD | ~₹340–390/mo | ✅ UPI, INR |
| HeavenCloud (Mumbai) | Budget 4GB ⭐ | 3 cores / 4GB / 50GB SSD | ~₹440–490/mo | ✅ UPI, INR |
| Hostinger India | KVM 1 | 1 vCPU / 4GB / 50GB NVMe | ₹599/mo intro, **renews ₹999/mo + 18% GST** | ✅ UPI, RuPay, GPay |

**Pick:** HeavenCloud 4GB is the cheapest comfortable fit (~₹5,500/year).
Hostinger is the bigger brand (AMD EPYC, weekly backups) but costs ~2x on
renewal — never budget on the intro price, always on the renewal price.

Deploy on it is the same one-command flow: Ubuntu 22/24 → install Docker →
`git clone` → `gen-keys.sh` → `docker compose up -d` → `demo-seed.py` — then
point a Cloudflare Tunnel (or the VPS's own IP + UFW) at `:8000`.
