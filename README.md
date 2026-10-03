# Busly — School Transport Management System

Live GPS school-bus tracking, trip attendance, and fleet management.
One backend, one admin dashboard, one role-based mobile app. **Zero-cost stack.**

## What it does

| Who | What |
|---|---|
| **Driver** (mobile) | Today's trips, start/end trip, live GPS sharing, mark attendance, assigned vehicle |
| **Parent** (mobile) | Live bus map, linked children, per-day attendance history |
| **Teacher** (mobile) | Class roster with search, daily roll-call attendance |
| **Admin** (web dashboard) | Vehicles, drivers, routes, stops, students, attendance, live map, trip reports, alerts feed |

Auth is role-based (JWT): the same login shows different screens per role.

## 5-minute demo

```bash
docker compose up -d
python3 scripts/demo-seed.py
```

| Login | Password | Sees |
|---|---|---|
| `admin@busly.com` | `admin123` | Web dashboard: http://localhost:3001 |
| `driver@busly.com` | `driver123` | Driver tabs (mobile) |
| `teacher@busly.com` | `teacher123` | Roster + attendance (mobile) |
| `parent@busly.com` | `parent123` | Live map + children (mobile) |

Walkthrough: driver starts the 07:30 trip and marks attendance → parent opens
Tracking and watches the bus go Live → teacher sees the roster → admin bell shows
the geofence alert and the dashboard updates. Re-run `demo-seed.py` any day to
refresh today's trips and the live position (it only creates what's missing).

## Quick start (student laptop)

Prerequisites: Docker + Docker Compose, Node.js 22, Python 3.

```bash
git clone https://github.com/abhishek-mule/Busly.git && cd Busly

# 1. Backend (12 services: gateway :8000, Postgres, Redis, RabbitMQ, workers…)
sudo ./scripts/gen-keys.sh     # JWT keypair -> /etc/keys (back it up)
docker compose up -d
curl localhost:8000/health

# 2. Demo data + accounts
python3 scripts/demo-seed.py

# 3. Admin dashboard
cd admin && npm install && npm run build && npx next start -p 3001
# -> http://localhost:3001 (login: admin@busly.com / admin123)

# 4. Mobile app (Expo Go on your phone, same Wi-Fi as the laptop)
cd busly-app && npm install && npx expo start
# scan the QR code with Expo Go
```

> Host Postgres/Redis running? The compose file maps **5433:5432** and **6380:6379**
> to avoid clashing with system services. Internal traffic is unaffected.

## Architecture

```
Phone (Expo app) ─┐
Vercel admin ─────┼──→ gateway :8000 ─→ auth :8001 · fleet :8002 · routing :8003
                  │                     students :8004 · geo :8005 · tenant :8006
                  │                     notifications :8008 · celery worker
                  └──────────────────── postgres+postgis · redis · rabbitmq
```

- **Multi-tenant**: one database per school (`tenant_default`); your `tenant_id`
  comes from the login token — clients can't read other tenants.
- **Roles enforced at the gateway**: wrong role → `403`. Internal ports (8001+)
  are not published; only `:8000` is reachable.
- **Fresh database?** The first registered account automatically becomes admin.

## Deployment (all free)

- **Backend**: any Ubuntu VPS (Oracle Always Free works) → `docker compose up -d`,
  expose via Cloudflare Tunnel for free HTTPS. See `.env.example`.
- **Admin**: Vercel → import repo, root directory `admin`,
  `NEXT_PUBLIC_API_URL=https://<your-backend>/api/v1`.
- **APK**: `cd busly-app && eas login && eas init && eas build -p android --profile preview`
  with `EXPO_PUBLIC_API_URL` set to the public backend URL (baked in at build time).
  Note: release map tiles need a Google Maps key (free tier), otherwise the map is blank.

## Project structure

```
Busly/
├── backend/services/   # gateway, auth, fleet, routing, students, geo,
│                       # tenant, notifications (+ libs/shared, workers/)
├── backend/workers/    # Celery: route optimizer (TSP), report CSVs
├── admin/              # Next.js 14 dashboard
├── busly-app/          # Expo SDK 57 unified mobile app
├── parent-app/         # legacy (superseded by busly-app)
├── scripts/            # gen-keys.sh, demo-seed.py
└── docker-compose.yml  # 12 services, restart policies, report volume
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `curl localhost:8000/health` fails | `docker compose up -d`; after reboot containers restart automatically |
| Login 401 everywhere | `docker compose up -d --build gateway auth-service` (key mismatch) |
| Admin lists empty | Hard refresh; API returns `{items:[...]}` unwrapped by `useFetch` |
| Phone can't reach Metro/API | Same Wi-Fi; use `--tunnel`; check laptop firewall |
| `429` on login | Rate limiter (10/min/IP) — wait 60s |

## Deliberately out of scope (0-cost MVP)

No AI/LLM features, no push/SMS delivery (in-app alerts only), no online fees module,
no driver background tracking (foreground GPS only). See open issues for the roadmap.
