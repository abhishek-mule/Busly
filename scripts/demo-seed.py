#!/usr/bin/env python3
"""One-command demo seeding for Busly. Safe to re-run: creates only what's missing.

Works on a FRESH database (creates vehicle, route, stops, students, trips)
and on an EXISTING one (reuses what's there, tops up today's trips + live GPS).

Usage:
    python3 scripts/demo-seed.py                      # backend on localhost:8000
    API=http://myserver:8000/api/v1 python3 scripts/demo-seed.py

Requires: python3 (stdlib only). Backend must be up (`docker compose up -d`).
"""
import datetime
import json
import os
import sys
import urllib.request
import urllib.error

API = os.environ.get("API", "http://localhost:8000/api/v1")
PARENT_PHONE = "+91 98765 11111"

ACCOUNTS = [
    ("admin@busly.com", "admin123", "School Admin", ["admin"], ""),
    ("driver@busly.com", "driver123", "Rajesh Kumar", ["driver"], "+91 98765 43210"),
    ("teacher@busly.com", "teacher123", "Meera Joshi", ["teacher"], "+91 98765 22222"),
    ("parent@busly.com", "parent123", "Sunita Sharma", ["parent"], PARENT_PHONE),
]

STOPS = [
    ("Depot Gate", "School depot entrance", 19.0650, 72.8650, 1),
    ("Market Sq", "Near vegetable market", 19.0700, 72.8700, 2),
    ("School", "Main school gate", 19.0750, 72.8780, 3),
]

STUDENTS = [
    ("Aarav", "Patil", "DEMO-001", "5A", "B"),
    ("Diya", "Sharma", "DEMO-002", "6A", "A"),
]


def req(method, path, token=None, body=None):
    r = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}


def get_items(path, token, label):
    s, d = req("GET", path, token=token)
    if s != 200:
        print(f"FATAL: GET {path} -> {s} {d}")
        sys.exit(1)
    return d.get("items") or []


def login(email, password):
    s, d = req("POST", "/auth/login", body={"email": email, "password": password, "tenant_id": "default"})
    return d.get("access_token") if s == 200 else None


def ensure_accounts():
    print("== accounts ==")
    for email, pw, name, roles, phone in ACCOUNTS:
        if login(email, pw):
            print(f"  exists: {email} ({roles[0]})")
            continue
        s, d = req("POST", "/auth/register", body={
            "email": email, "password": pw, "full_name": name,
            "phone": phone, "roles": roles, "tenant_id": "default",
        })
        if s == 200 and d.get("access_token"):
            print(f"  created: {email} ({roles[0]})")
        else:
            print(f"  FAILED: {email} -> {s} {d}")
            sys.exit(1)


def main():
    ensure_accounts()
    admin = login("admin@busly.com", "admin123")
    if not admin:
        print("FATAL: admin login failed")
        sys.exit(1)

    # --- vehicle (create endpoints return {"id","status"} summaries) ---
    vehicles = get_items("/vehicles?limit=50", admin, "vehicles")
    active = [v for v in vehicles if v.get("status") != "inactive"]
    if active:
        vehicle_id, plate = active[0]["id"], active[0].get("plate_number", "?")
        print(f"== vehicle: reuse {plate} ==")
    else:
        s, d = req("POST", "/vehicles", token=admin, body={
            "plate_number": "DEMO-01", "vehicle_type": "bus",
            "make": "Demo", "model": "City Bus", "seating_capacity": 40,
        })
        if s != 200 or "id" not in d:
            print(f"FATAL: create vehicle -> {s} {d}"); sys.exit(1)
        vehicle_id, plate = d["id"], "DEMO-01"
        print(f"== vehicle: created {plate} ==")

    # --- route with the most stops (or create demo route) ---
    routes = get_items("/routes?limit=50", admin, "routes")
    all_stops = get_items("/stops?limit=300", admin, "stops")
    counts = {}
    for st in all_stops:
        counts[st.get("route_id")] = counts.get(st.get("route_id"), 0) + 1
    if routes:
        route = max(routes, key=lambda r: counts.get(r["id"], 0))
        route_id = route["id"]
        print(f"== route: reuse {route.get('name')} ({counts.get(route_id, 0)} stops) ==")
    else:
        s, d = req("POST", "/routes", token=admin, body={
            "name": "Demo Route", "route_code": "DEMO-R1",
            "start_point": "Depot Gate", "end_point": "School",
        })
        if s != 200 or "id" not in d:
            print(f"FATAL: create route -> {s} {d}"); sys.exit(1)
        route_id = d["id"]
        print("== route: created Demo Route ==")

    # --- ensure >= 2 stops on the route ---
    route_stops = sorted(
        [st for st in all_stops if st.get("route_id") == route_id],
        key=lambda x: x.get("stop_order", 0),
    )
    if len(route_stops) < 2:
        print("== stops: creating demo stops ==")
        for name, landmark, lat, lng, order in STOPS:
            s, d = req("POST", "/stops", token=admin, body={
                "route_id": route_id, "name": name, "landmark": landmark,
                "latitude": lat, "longitude": lng, "stop_order": order,
            })
            if s != 200 or "id" not in d:
                print(f"FATAL: create stop {name} -> {s} {d}"); sys.exit(1)
        route_stops = get_items(f"/routes/{route_id}/stops", admin, "route stops")
    else:
        print(f"== stops: reuse {len(route_stops)} stops ==")
    first_stop = route_stops[0]

    # --- students linked to the parent ---
    students = get_items("/students?limit=300", admin, "students")
    norm = lambda p: "".join(c for c in (p or "") if c.isdigit())
    want = norm(PARENT_PHONE)
    linked = [x for x in students
              if norm(x.get("father_phone")) == want or norm(x.get("mother_phone")) == want]
    if len(linked) < 2:
        print("== students: creating/linking demo students ==")
        for fn, ln, sid, cls, sec in STUDENTS:
            match = next((x for x in students if x.get("student_id") == sid), None)
            if match is None:
                s, d = req("POST", "/students", token=admin, body={
                    "first_name": fn, "last_name": ln, "student_id": sid,
                    "class_name": cls, "section": sec,
                })
                if s != 200 or "id" not in d:
                    print(f"FATAL: create student {sid} -> {s} {d}"); sys.exit(1)
                match = {"id": d["id"]}
                students.append({**match, "student_id": sid})
            s, d = req("PUT", f"/students/{match['id']}", token=admin, body={
                "father_phone": PARENT_PHONE, "route_id": route_id,
                "pickup_stop_id": first_stop["id"],
            })
            if s != 200:
                print(f"FATAL: link student {sid} -> {s} {d}"); sys.exit(1)
        print("  linked 2 students to parent@busly.com")
    else:
        print(f"== students: reuse {len(linked)} linked children ==")

    # --- today's trips (idempotent: skip if live ones exist) ---
    today = datetime.date.today().isoformat()
    todays = get_items(f"/trips?date={today}&limit=20", admin, "trips")
    live = [t for t in todays if t.get("status") in ("scheduled", "in_progress")]
    if live:
        print(f"== trips: {len(live)} already scheduled for {today}, skipping ==")
    else:
        print(f"== trips: creating 2 trips for {today} ==")
        for ttype, sh, eh in (("pickup", "07:30", "08:15"), ("dropoff", "15:30", "16:15")):
            s, d = req("POST", "/trips", token=admin, body={
                "route_id": route_id, "vehicle_id": vehicle_id, "trip_type": ttype,
                "scheduled_start_time": f"{today}T{sh}:00+05:30",
                "scheduled_end_time": f"{today}T{eh}:00+05:30",
                "notes": "Demo trip",
            })
            if s != 200 or "id" not in d:
                print(f"FATAL: create trip -> {s} {d}"); sys.exit(1)

    # --- fresh GPS so tracking shows Live ---
    lat = (first_stop.get("latitude") or 19.07) + 0.0005
    lng = (first_stop.get("longitude") or 72.87) + 0.0005
    req("POST", "/gps/location", token=admin, body={
        "vehicle_id": vehicle_id, "latitude": lat, "longitude": lng,
        "speed": 7.5, "heading": 120, "accuracy": 6,
    })
    print(f"== gps: live position pushed for {plate} ==")

    print("\nDemo ready. Logins (password = role + 123, admin = admin123):")
    for email, _, _, roles, _ in ACCOUNTS:
        print(f"  {email:22s} -> {roles[0]}")


if __name__ == "__main__":
    main()
