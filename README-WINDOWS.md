<div align="center">

# 🪟 Busly on Windows — Full Setup Guide

**From zero to demo on a Windows 10/11 PC. No credit card, no paid software.**

> This is the Windows companion to the main [README.md](README.md).
> Demo script, accounts table, architecture and troubleshooting live there —
> here you only get the Windows-specific installation path.

</div>

---

## The one big decision: use WSL2 Ubuntu ✅

Docker, shell scripts (`gen-keys.sh`, `demo-seed.py`) and the `/etc/keys` key
mount are built for Linux. On Windows the reliable way is **WSL2 + Ubuntu**:
everything inside Ubuntu works exactly like the main guide, and Windows just
opens the browser. Do **not** try to run the backend in PowerShell directly.

---

## Step 0 — Install everything (do once)

### 0a. Enable WSL2 + install Ubuntu

In **PowerShell as Administrator**:

```powershell
wsl --install -d Ubuntu
```

- Reboot if asked, then open **Ubuntu** from the Start menu and create your
  Linux username/password.
- Check version (must say `2` under VERSION):
```powershell
wsl -l -v
```
- If it shows `1`, convert it: `wsl --set-version Ubuntu 2`

> Needs virtualization (VT-x/AMD-V) enabled in BIOS. The Microsoft Store
> "Windows Subsystem for Linux" update should install automatically.

### 0b. Install Docker Desktop (Windows side)

1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) and install.
2. Open Docker Desktop → **Settings → General** → tick
   **"Use the WSL 2 based engine"**.
3. **Settings → Resources → WSL integration** → tick **"Enable integration
   with my default WSL distro"** + tick **Ubuntu**.
4. Click **Apply & restart**. Wait for the green "running" whale icon.

Verify **inside the Ubuntu terminal**:
```bash
docker --version && docker compose version
```

### 0c. Install Node.js 22 + tools (inside Ubuntu)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git python3
node --version   # expect v22.x
python3 --version
git --version
```

### 0d. Phone

Install **Expo Go** (Play Store / App Store). For the most reliable
connection on Windows you will use tunnel mode (Step 6), so the phone can be
on **any** network, not just your Wi-Fi.

---

## Step 1 — Get the code (inside Ubuntu)

> Clone into your Ubuntu home (`~`), **not** `/mnt/c/...` — Docker file
> sharing is far faster there.

```bash
cd ~
git clone https://github.com/abhishek-mule/Busly.git
cd Busly
```

## Step 2 — Backend keys (one time, inside Ubuntu)

```bash
sudo ./scripts/gen-keys.sh
# creates /etc/keys/private.pem + public.pem — back them up somewhere safe
```

## Step 3 — Start the backend (inside Ubuntu)

```bash
docker compose --profile tunnel up -d
curl localhost:8000/health
# expect: {"status":"ok","service":"gateway",...}

# Your free public API URL (no account, no card):
docker compose logs cloudflared | grep trycloudflare
# example: https://xxxx-xxxx-xxxx.trycloudflare.com
```

> ⚠️ That URL is random and **rotates whenever the tunnel container restarts**.
> After any `up`, re-check the logs and update the client URLs in Steps 5–6.

## Step 4 — Seed demo data (inside Ubuntu)

```bash
python3 scripts/demo-seed.py
# expect "Demo ready" + the 4 logins printed
```

Re-run every demo morning — it refreshes today's trips + the live GPS position.

## Step 5 — Admin dashboard

```bash
cd ~/Busly/admin
npm install   # first time only
NEXT_PUBLIC_API_URL=https://<your-tunnel-url>/api/v1 npm run dev
```

Open in **Windows** Edge/Chrome (WSL2 forwards localhost automatically):
**http://localhost:3000/login** → `admin@busly.com` / `admin123`

> `NEXT_PUBLIC_*` values bake in at startup — if the tunnel URL rotated,
> stop (`Ctrl+C`) and restart with the new URL.

## Step 6 — Phone app (tunnel mode = zero Wi-Fi headaches)

WSL2's virtual network makes LAN-IP mode flaky, so on Windows always use
tunnel mode — phone works from **anywhere**:

```bash
cd ~/Busly/busly-app
npm install   # first time only
EXPO_PUBLIC_API_URL=https://<your-tunnel-url>/api/v1 npx expo start --tunnel
```

Scan the QR with Expo Go → `driver@busly.com` / `driver123`.
(Bundle loads via Expo's tunnel, API calls go via your Cloudflare tunnel.)

## Step 7 — Verify ✅

1. `curl localhost:8000/health` (Ubuntu) → `{"status":"ok",...}`
2. Admin login in Windows browser → real data shows
3. Phone: driver → Home → **Start Trip** → Live badge 🟢
4. Phone: parent (`parent@busly.com` / `parent123`) → Tracking → bus on map 🗺️

---

## 🩺 Windows-specific troubleshooting

| Symptom | Fix |
|---|---|
| Docker Desktop won't start | Enable virtualization in BIOS; ensure WSL2 engine + Ubuntu integration ticked; reboot |
| `docker: command not found` in Ubuntu | Docker Desktop closed, or WSL integration for Ubuntu not ticked (Step 0b) |
| `permission denied` on docker | `sudo usermod -aG docker $USER`, then **close + reopen** the Ubuntu terminal |
| `sudo ./scripts/gen-keys.sh` fails | Run it **inside Ubuntu**, not PowerShell/CMD |
| `localhost:3000` won't open in Windows | WSL2 forwards localhost automatically — check the dev server is actually running in Ubuntu |
| Phone can't load the Expo app | You skipped `--tunnel` (Step 6) — WSL2 LAN-IP mode is unreliable, always use tunnel mode on Windows |
| Tunnel URL dead | It rotated — re-read `cloudflared` logs, restart admin/phone with the new URL |
| Files edited in Notepad break scripts | Use **VS Code** (with the WSL extension) and keep **LF** line endings, never CRLF for `.sh` files |
| Firewall popups | Allow Docker/Node through Windows Defender Firewall when prompted, else Expo/ports get blocked |

---

## After a reboot

```bash
cd ~/Busly
docker compose --profile tunnel up -d   # containers come back
docker compose logs cloudflared | grep trycloudflare   # URL may have rotated
python3 scripts/demo-seed.py            # only on demo mornings
```

Then restart Steps 5–6 with the (possibly new) tunnel URL.

---

## 📄 License

© 2026 Abhishek Mule — **All rights reserved** (see [LICENSE](LICENSE)).
