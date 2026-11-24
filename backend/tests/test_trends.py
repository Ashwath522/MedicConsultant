import math
import os
from datetime import date, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

from fastapi.testclient import TestClient

from app.core.db import Base, engine
from app.main import app
from app.signals.scenarios import PROFILE, scenario
from app.signals.trends import build, recovery_score, sleep_score

client = TestClient(app)


def test_recovery_formula():
    base_hrv, base_rhr = (math.log(50), 0.1), (60, 2)
    assert recovery_score(50, 60, 7, base_hrv, base_rhr, 7) == 60          # all at normal → 60
    good = recovery_score(60, 56, 8, base_hrv, base_rhr, 7)
    bad = recovery_score(38, 67, 5, base_hrv, base_rhr, 7)
    assert good > 80 and bad < 25
    assert recovery_score(None, None, 8, None, None, 7) is None              # sleep alone isn't enough
    assert recovery_score(None, 60, 7, None, base_rhr, 7) is not None         # works without HRV


def test_sleep_score():
    assert sleep_score([7, 7, 7, 7, 7, 7, 7], 7) == 100
    assert sleep_score([5, 9, 5, 9, 5, 9, 5], 7) < 70


def test_build_summaries_and_bands():
    today = date(2026, 3, 1)
    vit = {today - timedelta(days=i): {"rhr": 60 + (i % 3), "hrv": 50, "hrv_type": "rmssd", "sleep_h": 7.2, "steps": 9000} for i in range(60)}
    out = build(30, today, vit, {}, 7, 8000)
    s = out["summary"]
    assert len(out["series"]) == 30 and s["rhr"]["band"] and s["activity"]["latest"] == 100
    assert s["recovery"]["count"] > 0 and "water_ml" not in s


def test_trends_api_with_full_profile():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    tok = client.post("/auth/signup", json={"email": "t@test.com", "password": "secret1", "name": "T"}).json()["token"]
    h = {"Authorization": f"Bearer {tok}"}
    client.put("/profile", headers=h, json={k: v for k, v in PROFILE.items() if k != "name"})
    nights, _, _, _ = scenario("infection")
    client.post("/vitals", headers=h, json={"nights": nights})
    client.put("/wellness/today", headers=h, json={"add_water_ml": 500, "mood": "good"})
    r = client.get("/trends?days=30", headers=h).json()
    assert {"rhr", "hrv", "temp_dev", "resp", "steps", "sleep_h", "recovery", "sleep_score", "water_ml", "mood"} <= r["summary"].keys()
    assert r["series"][-1]["recovery"] < r["summary"]["recovery"]["avg"]  # illness night → low recovery
    assert client.get("/trends?days=12", headers=h).status_code == 422


def test_pattern_names_the_higher_group():
    today = date(2026, 3, 1)
    vit = {}
    for i in range(40):
        active = i % 2 == 0
        vit[today - timedelta(days=i)] = {"rhr": 60, "steps": 10000 if active else 3000, "sleep_h": 7.0 if active else 8.0}
    pats = build(30, today, vit, {}, 7, 8000)["patterns"]
    sleep = [p for p in pats if p["title"].startswith("Sleep")][0]
    assert sleep["title"] == "Sleep is higher on less active days" and sleep["detail"].startswith("8")
