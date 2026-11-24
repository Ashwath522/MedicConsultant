import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text

from app.core.db import Base, engine
from app.main import app
from app.wellness.targets import Body, blueprint, bmi, bmr, checkups, steps, water_ml

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def auth():
    r = client.post("/auth/signup", json={"email": "w@test.com", "password": "secret1", "name": "W"})
    return {"Authorization": f"Bearer {r.json()['token']}"}


# ---------- pure calculations ----------
def test_bmi_indian_cutoffs():
    assert bmi(Body("male", 30, 170, 60))["category"] == "Healthy"      # 20.8
    assert bmi(Body("male", 30, 170, 68))["category"] == "Overweight"   # 23.5 (healthy on WHO scale!)
    assert bmi(Body("male", 30, 170, 75))["category"] == "Obese"        # 26.0
    assert bmi(Body("female", 30, 160, 45))["category"] == "Underweight"


def test_bmr_differs_by_sex():
    m, f = bmr(Body("male", 30, 170, 70)), bmr(Body("female", 30, 170, 70))
    assert m - f == 166 and m == 1618


def test_age_changes_targets():
    assert steps(30, "light") == 8000 and steps(65, "light") == 7000
    young = {c["name"] for c in checkups("female", 25)}
    older = {c["name"] for c in checkups("female", 62)}
    assert "Cervical screening" in young and "Bone density" not in young
    assert {"Bone density", "Breast screening", "Cholesterol (lipid profile)"} <= older
    assert "Prostate check" in {c["name"] for c in checkups("male", 55)}
    assert "Prostate check" not in {c["name"] for c in checkups("female", 55)}


def test_water_rounded_and_clamped():
    assert water_ml(Body("male", 30, 170, 70)) % 250 == 0
    assert water_ml(Body("male", 30, 170, 30)) == 1500


def test_blueprint_shape():
    bp = blueprint(Body("other", 40, 165, 65, "moderate"))
    assert {"bmi", "calories", "water_ml", "sleep_hours", "steps", "checkups", "disclaimer"} <= bp.keys()


# ---------- API ----------
def test_onboarding_then_blueprint():
    h = auth()
    assert client.get("/wellness/blueprint", headers=h).status_code == 409
    r = client.put("/profile", headers=h, json={"sex": "female", "age": 34, "height_cm": 160, "weight_kg": 60,
                                                "activity": "moderate", "goals": ["fitness"], "onboarded": True})
    assert r.status_code == 200 and r.json()["onboarded"] is True
    bp = client.get("/wellness/blueprint", headers=h).json()
    assert bp["bmi"]["category"] == "Overweight" and bp["steps"] == 9000


def test_minors_rejected():
    h = auth()
    assert client.put("/profile", headers=h, json={"age": 15}).status_code == 422


def test_daily_log_water_and_week():
    h = auth()
    assert client.get("/wellness/today", headers=h).json()["water_ml"] == 0
    client.put("/wellness/today", headers=h, json={"add_water_ml": 250})
    r = client.put("/wellness/today", headers=h, json={"add_water_ml": 250, "steps": 4200, "sleep_hours": 7.5})
    assert r.json()["water_ml"] == 500 and r.json()["steps"] == 4200
    week = client.get("/wellness/week", headers=h).json()
    assert len(week) == 7 and week[-1]["water_ml"] == 500


def test_ensure_columns_upgrades_old_database(tmp_path):
    """An old DB without the new profile columns is upgraded in place, keeping rows."""
    from app.core import db as dbmod

    old = create_engine(f"sqlite:///{tmp_path}/old.db")
    with old.begin() as c:
        c.execute(text("CREATE TABLE users (id VARCHAR(36) PRIMARY KEY, email VARCHAR(255), password_hash VARCHAR(255), name VARCHAR(120))"))
        c.execute(text("INSERT INTO users (id, email, password_hash, name) VALUES ('1', 'a@b.c', 'x', 'Old')"))
    real = dbmod.engine
    dbmod.engine = old
    try:
        dbmod.ensure_columns()
    finally:
        dbmod.engine = real
    cols = {c["name"] for c in inspect(old).get_columns("users")}
    assert {"sex", "height_cm", "goals", "onboarded"} <= cols
    with old.connect() as c:
        row = c.execute(text("SELECT name, goals, onboarded FROM users")).one()
    assert row[0] == "Old" and row[1] == "[]" and row[2] == 0
