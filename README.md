<div align="center">

<img src="docs/busly-logo.png" width="120" alt="Busly logo" />

# 🚌 Busly

**Live GPS school-bus tracking, trip attendance & fleet management — at zero cost.**

[![Stack](https://img.shields.io/badge/stack-Docker_%E2%80%A2_FastAPI_%E2%80%A2_Next.js_14_%E2%80%A2_Expo_57-4F46E5)](https://github.com/abhishek-mule/Busly)
[![Database](https://img.shields.io/badge/db-PostGIS_%E2%80%A2_Redis_%E2%80%A2_RabbitMQ-0E7490)](https://github.com/abhishek-mule/Busly)
[![Cost](https://img.shields.io/badge/cost-%240_forever-success)](https://github.com/abhishek-mule/Busly)
[![License](https://img.shields.io/badge/license-All_rights_reserved-lightgrey)](LICENSE)

[📖 User Manual (PDF)](docs/busly_manual.pdf) · [🎬 Demo Video](#-demo-video) · [🚀 Setup from Scratch](#-setup-from-scratch) · [🎭 Demo Script](#-the-5-minute-demo)

</div>

---

## 🎬 Demo Video

<video src="https://github.com/abhishek-mule/Busly/releases/download/v1.0-demo/busly_demo.mp4" controls width="640"></video>

> 📥 Also attached to the [**v1.0-demo release**](https://github.com/abhishek-mule/Busly/releases/tag/v1.0-demo). Full written guide: [📖 User Manual (PDF)](docs/busly_manual.pdf).

---

## ✨ What it does

| Who | Where | What they get |
|---|---|---|
| 🚍 **Driver** | 📱 phone | Today's trips, Start/End trip, live GPS sharing, mark attendance |
| 👪 **Parent** | 📱 phone | Live bus map with stops + route, linked children, attendance history |
| 👩‍🏫 **Teacher** | 📱 phone | Class roster with search, daily roll-call, fleet-wide live map |
| 🛠️ **Admin** | 💻 browser | Dashboard, vehicles, conductors, routes, students, live map, alerts, reports |

One login per role — the app reshapes itself around who you are.

---

## 🎭 The 5-minute demo

Tell **one story** across four logins:

1. **Driver** starts the morning pickup → the bus goes **Live** 🟢
2. **Parent** opens Tracking → watches the bus move along the route line 🗺️
3. **Teacher** takes roll-call from the Roster ✅
4. **Admin** opens the dashboard → everything that just happened is already there 📊

---

## 🚀 Setup from Scratch

### Step 0 — Install prerequisites (Ubuntu/Debian)

```bash
# Docker + Compose
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker
docker --version && docker compose version

# Node.js 22 (for admin dashboard + mobile app)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # expect v22.x

# Python 3 (for the demo-seed script)
sudo apt install -y python3
python3 --version

# On your phone: install "Expo Go" from Play Store / App Store
```

> 🪟 **Windows?** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Compose) + [Node.js 22 LTS](https://nodejs.org/) + Python 3, then use the same commands below in PowerShell (`hostname -I` → use `ipconfig` instead).
> 🍎 **macOS?** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) + Node.js 22 + Python 3 (via `brew install node@22 python3`), then follow below (`ipconfig getifaddr en0` for the LAN IP).

### Step 1 — Get the code

```bash
git clone https://github.com/abhishek-mule/Busly.git
cd Busly
```

### Step 2 — Backend keys (one time only)

```bash
sudo ./scripts/gen-keys.sh
# creates /etc/keys/private.pem + public.pem (RS256 JWT signing)
# back up /etc/keys somewhere safe
```

### Step 3 — Start the backend (12 services)

```bash
docker compose up -d
curl localhost:8000/health
# expect: {"status":"ok","service":"gateway",...}
```

<details>
<summary><b>🔎 What just started?</b></summary>

| Container | Port | Job |
|---|---|---|
| `gateway` | `8000` (public) | Auth, roles, rate limits, routing to services |
| `auth-service` | internal | Login, users, JWT tokens |
| `fleet-service` | internal | Vehicles, conductors, maintenance |
| `routing-service` | internal | Routes, stops, trips, optimizer |
| `student-service` | internal | Students, attendance |
| `geo-service` | internal | GPS ingest, live positions, geofences |
| `tenant-service` | internal | One database per school |
| `notification-service` | internal | In-app alerts feed |
| `celery-worker` | — | Background jobs (optimizer, CSV reports) |
| `postgres` | `5433` | Database (PostGIS) |
| `redis` | `6380` | Cache, rate limits, revoked tokens |
| `rabbitmq` | `5672` / `15672` | Job queue |

Host ports `5433`/`6380` avoid clashing with system Postgres/Redis.

</details>

### Step 4 — Seed demo data (idempotent: only creates what's missing)

```bash
python3 scripts/demo-seed.py
# expect "Demo ready" + the 4 logins printed
```

Creates: 4 accounts · DEMO-01 bus · Demo Route + 3 stops · 2 students linked to
the parent · today's pickup + dropoff trips · fresh GPS position.
**Re-run every demo morning** to refresh trips + live position.

### Step 5 — Admin dashboard (keep this terminal running)

```bash
cd admin
npm install   # first time only
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 npm run dev
# open: http://localhost:3000/login
```

### Step 6 — Phone app (keep this terminal running, phone on SAME Wi-Fi)

```bash
cd busly-app
npm install   # first time only
EXPO_PUBLIC_API_URL=http://<laptop-LAN-IP>:8000/api/v1 npx expo start
# scan the QR with Expo Go
```

<details>
<summary><b>🔎 How to find your laptop's LAN IP</b></summary>

| OS | Command | Look for |
|---|---|---|
| 🐧 Linux | `hostname -I` | first address, e.g. `192.168.1.5` |
| 🍎 macOS | `ipconfig getifaddr en0` | e.g. `192.168.1.5` |
| 🪟 Windows | `ipconfig` | `IPv4 Address` under Wi-Fi |

Use the `192.168.x.x` (or `10.x.x.x`) address — **never `127.0.0.1`**, that's the
laptop talking to itself and unreachable from the phone. Example:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.5:8000/api/v1 npx expo start
```

QR scan hangs? Firewall is blocking Metro: `sudo ufw allow 8081`.
Phone on mobile data instead? Use `npx expo start --tunnel` + the public URL below.

</details>

### Step 7 — Verify the loop ✅

1. Admin: `admin@busly.com / admin123` at `http://localhost:3000` → real data shows
2. Phone: `driver@busly.com / driver123` → Home → **Start Trip** → Live badge 🟢
3. Phone: `parent@busly.com / parent123` → Tracking → bus on the map 🗺️

---

## 🌐 Free public URL (no account, no card — only when you need remote access)

Same-WiFi demos don't need this. For phones on mobile data, remote viewers, or a Vercel-hosted admin:

```bash
docker compose --profile tunnel up -d                 # backend + API tunnel
docker compose logs cloudflared | grep trycloudflare  # your https://… URL
curl https://<url>/health                             # prove it's public
```

Point clients at `https://<url>/api/v1` instead of localhost.
Need the **dashboard UI** public too? A second tunnel is pre-configured:

```bash
docker compose --profile tunnel up -d cloudflared-admin
docker compose logs cloudflared-admin | grep trycloudflare
```

> ⚠️ Tunnel URLs are random and **rotate on every recreate** — re-check the logs
> after each `up`, then restart clients with the new URL (it's baked in at start).
> Your laptop must stay on while anyone uses a tunnel URL.

---

## 🔑 Demo accounts

| Login | Password | Role |
|---|---|---|
| `admin@busly.com` | `admin123` | 🛠️ Admin |
| `driver@busly.com` | `driver123` | 🚍 Driver |
| `teacher@busly.com` | `teacher123` | 👩‍🏫 Teacher |
| `parent@busly.com` | `parent123` | 👪 Parent |

---

## 🏗️ How it fits together

```
📱 Expo app ─┐
💻 Admin ────┼──→ gateway :8000 ─→ auth · fleet · routing · students
             │                      geo · tenant · notifications · worker
             └───────────────────── postgres+postgis · redis · rabbitmq
```

- 🔒 **Roles enforced at the gateway** — wrong role → `403`. Only `:8000` is public.
- 🏫 **Multi-tenant** — one database per school; your tenant comes from the login token.
- 🌱 **Fresh database?** The first registered account automatically becomes admin.

```
Busly/
├── backend/      # 8 FastAPI services + gateway + Celery workers
├── admin/        # Next.js 14 dashboard
├── busly-app/    # Expo SDK 57 unified mobile app (Leaflet live map, no API key)
├── scripts/      # gen-keys.sh · demo-seed.py
├── docs/         # logo · user manual (PDF)  [demo video = v1.0-demo Release]
├── BUSLY_PROJECT_DETAILS.txt   # 389-line deep dive: stack, flows, API, setup
└── docker-compose.yml          # 12 services + API/admin tunnel profiles
```

---

## 🩺 Troubleshooting

| Symptom | Fix |
|---|---|
| `health` check fails | `docker compose up -d` (containers auto-restart; after reboot re-run `up`) |
| `Cannot reach the server` at login | App points at the wrong API URL — check the env var |
| `Too many login attempts` | Rate limiter (10/min) — wait 60s |
| Admin lists empty | Hard refresh the browser page |
| Phone can't load the app | Same Wi-Fi + `ufw allow 8081`, or `expo start --tunnel` |
| Tunnel URL dead | It rotated — re-read `cloudflared` logs, update clients |
| Map tiles not loading | Phone needs internet (Leaflet/Open tiles load live, no key needed) |
| Changed backend code | `docker compose up -d --build <service>` |

---

## ✅ Demo-day checklist

1. `docker compose up -d` → `curl localhost:8000/health` ✅
2. `python3 scripts/demo-seed.py` → "Demo ready" ✅
3. Admin login on laptop ✅, phone login ✅
4. Laptop on charger + Wi-Fi; Expo QR scanned **before** the audience arrives
5. Backup: play `busly_demo.mp4` from the [v1.0-demo release](https://github.com/abhishek-mule/Busly/releases/tag/v1.0-demo)

---

## 📄 License

© 2026 Abhishek Mule — **All rights reserved** (see [LICENSE](LICENSE)).
Shared with invited collaborators for academic evaluation only.
