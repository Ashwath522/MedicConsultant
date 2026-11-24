"""Create the fully-measured test profile "Arjun" on your RUNNING backend and load a scenario.

Usage (backend running on :8000, venv active, from the backend folder):
    python scripts/seed_test_profile.py --list
    python scripts/seed_test_profile.py --scenario infection
Then log in to the app as  arjun@test.com / secret1  and open the Signals tab.
"""
import argparse
import os
import sys

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.signals.scenarios import NAMES, PROFILE, scenario  # noqa: E402

API = os.environ.get("API_URL", "http://localhost:8000")
EMAIL, PASSWORD = "arjun@test.com", "secret1"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenario", default="infection", choices=NAMES)
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    if a.list:
        for n in NAMES:
            _, _, exp, desc = scenario(n)
            print(f"{n:17} expect {exp:7} {desc}")
        return

    c = httpx.Client(base_url=API, timeout=20)
    r = c.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r.status_code != 200:
        r = c.post("/auth/signup", json={"email": EMAIL, "password": PASSWORD, "name": PROFILE["name"]})
    r.raise_for_status()
    c.headers["Authorization"] = f"Bearer {r.json()['token']}"
    c.put("/profile", json={k: v for k, v in PROFILE.items() if k != "name"}).raise_for_status()
    c.delete("/vitals").raise_for_status()

    nights, tags, expected, desc = scenario(a.scenario)
    c.post("/vitals", json={"nights": nights}).raise_for_status()
    for day, t in tags.items():
        c.post("/vitals/tags", json={"day": day, "tags": t}).raise_for_status()

    s = c.get("/signals/today").json()
    ok = "✅" if s["level"] == expected else "❌"
    print(f"Scenario: {a.scenario} — {desc}")
    print(f"{ok} expected {expected}, engine says {s['level']}")
    print(f"Message: {s['message']}")
    print(f"\nLog in as {EMAIL} / {PASSWORD} and open the Signals tab.")


if __name__ == "__main__":
    main()
