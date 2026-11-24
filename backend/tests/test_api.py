import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["GEMINI_API_KEY"] = ""  # force offline rules in tests

import pytest
from fastapi.testclient import TestClient

from app.core.db import Base, engine
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def signup(email="a@test.com"):
    r = client.post("/auth/signup", json={"email": email, "password": "secret1", "name": "Asha"})
    assert r.status_code == 201
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_auth_required():
    assert client.get("/episodes").status_code == 401


def test_login_and_profile_routine():
    signup()
    r = client.post("/auth/login", json={"email": "a@test.com", "password": "secret1"})
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    r = client.put("/profile", headers=h, json={"allergies": ["penicillin"], "bed_time": "23:00"})
    assert r.status_code == 200
    assert r.json()["allergies"] == ["penicillin"] and r.json()["bed_time"] == "23:00"
    assert client.put("/profile", headers=h, json={"bed_time": "25:00"}).status_code == 422


def test_suggest_category_rules():
    h = signup()
    r = client.post("/episodes/suggest", headers=h, json={"description": "High fever and body pain"})
    assert r.json()["category"] == "Fever" and r.json()["source"] == "rules"


def test_episode_flow_and_isolation():
    h1, h2 = signup("a@test.com"), signup("b@test.com")
    e = client.post("/episodes", headers=h1, json={"title": "Fever – 24 Nov 2026", "category": "Fever"}).json()
    assert client.get("/episodes", headers=h1).json()[0]["id"] == e["id"]
    # another user cannot see it
    assert client.get(f"/episodes/{e['id']}", headers=h2).status_code == 404
    assert client.get("/episodes", headers=h2).json() == []
    assert client.patch(f"/episodes/{e['id']}/close", headers=h1).json()["status"] == "closed"


def test_contacts():
    h = signup()
    c = client.post("/contacts", headers=h, json={"type": "doctor", "name": "Dr. Rao", "phone": "+919800000000"}).json()
    assert c["caregiver_alerts"] is False
    assert len(client.get("/contacts", headers=h).json()) == 1
    assert client.delete(f"/contacts/{c['id']}", headers=h).status_code == 204
