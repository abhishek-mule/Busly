<div align="center">

<img src="docs/busly-logo.png" width="120" alt="Busly logo" />

# 🚌 Busly

**Live GPS school-bus tracking, trip attendance & fleet management — at zero cost.**

[![Stack](https://img.shields.io/badge/stack-Docker_%E2%80%A2_FastAPI_%E2%80%A2_Next.js_14_%E2%80%A2_Expo_57-4F46E5)](https://github.com/abhishek-mule/Busly)
[![Database](https://img.shields.io/badge/db-PostGIS_%E2%80%A2_Redis_%E2%80%A2_RabbitMQ-0E7490)](https://github.com/abhishek-mule/Busly)
[![Cost](https://img.shields.io/badge/cost-%240_forver-success)](https://github.com/abhishek-mule/Busly)
[![License](https://img.shields.io/badge/license-All_rights_reserved-lightgrey)](LICENSE)

[📖 User Manual (PDF)](docs/busly_manual.pdf) · [🎬 Demo Video](#-demo-video) · [🚀 Quick Start](#-quick-start) · [🎭 Demo Script](#-the-5-minute-demo)

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
| 🛠️ **Admin** | 💻 browser | Dashboard, vehicles, routes, students, live map, alerts, reports |

One login per role — the app reshapes itself around who you are.

---

## 🎭 The 5-minute demo

Tell **one story** across four logins:

1. **Driver** starts the morning pickup → the bus goes **Live** 🟢
2. **Parent** opens Tracking → watches the bus move along the route line 🗺️
3. **Teacher** takes roll-call from the Roster ✅
4. **Admin** opens the dashboard → everything that just happened is already there 📊

---

## 🚀 Quick Start

**Prerequisites:** Docker + Compose · Node.js 22 · Python 3 · Expo Go (on your phone)

### 1️⃣ Backend — 12 services, one command

```bash
git clone https://github.com/abhishek-mule/Busly.git && cd Busly

sudo ./scripts/gen-keys.sh          # JWT keypair → /etc/keys (one time only)
docker compose --profile tunnel up -d
curl localhost:8000/health          # → {"status":"ok",...}

python3 scripts/demo-seed.py        # accounts + bus + route + today's trips + live GPS
```

`demo-seed.py` is idempotent — re-run it every demo morning to refresh the data.

### 2️⃣ Admin dashboard

```bash
cd admin && npm install
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 npm run dev
# → http://localhost:3000/login
```

### 3️⃣ Phone app

```bash
cd busly-app && npm install
EXPO_PUBLIC_API_URL=http://<laptop-LAN-IP>:8000/api/v1 npx expo start
# scan the QR with Expo Go (same Wi-Fi). Different network? use --tunnel
```

<details>
<summary><b>🔎 How to find your laptop's LAN IP</b></summary>

<br/>

| Your laptop OS | Run this | Look for |
|---|---|---|
| 🐧 Linux | `hostname -I` | first address, e.g. `192.168.1.5` |
| 🍎 macOS | `ipconfig getifaddr en0` | e.g. `192.168.1.5` |
| 🪟 Windows | `ipconfig` | `IPv4 Address` under Wi-Fi, e.g. `192.168.1.5` |

Use the `192.168.x.x` (or `10.x.x.x`) address — never `127.0.0.1`, that's the
laptop talking to itself and unreachable from the phone. Example:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.5:8000/api/v1 npx expo start
```

</details>

### 🌐 Free public URL (no account, no card)

```bash
docker compose logs cloudflared | grep trycloudflare   # your https://… URL
```

Point any client at `https://<url>/api/v1`. The URL changes when the tunnel
container restarts — check the logs after every `up`.

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
├── busly-app/    # Expo SDK 57 unified mobile app
├── scripts/      # gen-keys.sh · demo-seed.py
├── docs/         # logo · user manual (PDF) · demo video
└── docker-compose.yml
```

---

## 🩺 Troubleshooting

| Symptom | Fix |
|---|---|
| `health` check fails | `docker compose up -d` (containers auto-restart after reboot) |
| `Cannot reach the server` at login | App points at the wrong API URL — check the env var |
| `Too many login attempts` | Rate limiter (10/min) — wait 60s |
| Phone can't load the app | Same Wi-Fi, or `expo start --tunnel`; allow port `8081` |
| Tunnel URL dead | It rotated — read the new one from `cloudflared` logs |
| Map tiles not loading | Phone needs internet for OpenStreetMap tiles (they're fetched live, no key needed) |

---

## 📄 License

© 2026 Abhishek Mule — **All rights reserved** (see [LICENSE](LICENSE)).
Shared with invited collaborators for academic evaluation only.
