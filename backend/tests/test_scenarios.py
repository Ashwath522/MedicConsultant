"""Runs every named scenario for the fully-measured test profile through the real API."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

import pytest
from fastapi.testclient import TestClient

from app.core.db import Base, engine
from app.main import app
from app.signals.scenarios import NAMES, PROFILE, scenario

client = TestClient(app)


def run(name: str) -> dict:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    tok = client.post("/auth/signup", json={"email": "arjun@test.com", "password": "secret1", "name": PROFILE["name"]}).json()["token"]
    h = {"Authorization": f"Bearer {tok}"}
    client.put("/profile", headers=h, json={k: v for k, v in PROFILE.items() if k != "name"})
    nights, tags, expected, _ = scenario(name)
    assert client.post("/vitals", headers=h, json={"nights": nights}).status_code == 200
    for day, t in tags.items():
        client.post("/vitals/tags", headers=h, json={"day": day, "tags": t})
    return {"expected": expected, **client.get("/signals/today", headers=h).json()}


@pytest.mark.parametrize("name", NAMES)
def test_scenario(name):
    r = run(name)
    assert r["level"] == r["expected"], f"{name}: got {r['level']} — {r['message']}"


def test_messages_never_diagnose():
    for name in NAMES:
        msg = run(name)["message"].lower()
        assert "you have" not in msg and "diagnos" not in msg
