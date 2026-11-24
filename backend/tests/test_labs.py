import os
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

from fastapi.testclient import TestClient

from app.core.db import Base, engine
from app.labs.extract import parse_line, parse_text
from app.main import app
from app.signals.scenarios import PROFILE, scenario

client = TestClient(app)
PDF = Path(__file__).parent / "fixtures" / "sample_report.pdf"


def auth(email="l@test.com"):
    r = client.post("/auth/signup", json={"email": email, "password": "secret1", "name": "L"})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def fresh():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


# ---------- parser ----------
def test_names_with_digits_and_units():
    assert parse_line("HbA1c 5.9 % 4.0 - 5.6")["flag"] == "high"
    assert parse_line("Vitamin B12 180 pg/mL 211 - 911")["key"] == "vitamin_b12"
    assert parse_line("Total T3 110 ng/dL 80 - 200")["key"] == "t3"
    r = parse_line("Cholesterol, Total 5.9 mmol/L < 5.2")
    assert r["unit"] == "mg/dL" and round(r["value"]) == 228 and r["flag"] == "high"
    r = parse_line("HbA1c (IFCC) 42 mmol/mol 20 - 38")
    assert r["unit"] == "%" and abs(r["value"] - 5.99) < 0.01


def test_missing_range_uses_typical_and_says_so():
    r = parse_line("Vitamin D 18")
    assert r["range_source"] == "typical" and r["flag"] == "low"


def test_noise_lines_ignored_and_date_parsed():
    out = parse_text("Method: Photometry\nPage 1 of 2\nSample Collected On : 12/03/2026\nTSH 2.1 uIU/mL 0.4 - 4.2")
    assert out["taken_on"] == "2026-03-12" and [r["key"] for r in out["results"]] == ["tsh"]


# ---------- API ----------
def test_pdf_extract_confirm_save_trend():
    fresh()
    h = auth()
    out = client.post("/labs/extract", headers=h, files={"file": ("r.pdf", PDF.read_bytes(), "application/pdf")}).json()
    keys = {r["key"] for r in out["results"]}
    assert out["method"] == "pdf" and out["taken_on"] == "2026-03-12"
    assert {"hemoglobin", "hba1c", "ldl", "hdl", "glucose_fasting", "tsh", "vitamin_d", "creatinine", "platelets"} <= keys
    # user confirms (and could edit) → save
    body = {"taken_on": out["taken_on"], "lab_name": "Sample Diagnostics", "method": "pdf", "results": out["results"]}
    assert client.post("/labs", headers=h, json=body).status_code == 201
    # a later report → trend
    client.post("/labs", headers=h, json={"taken_on": "2026-09-12", "results": [{"key": "hba1c", "value": 6.2, "unit": "%", "ref_low": 4, "ref_high": 5.6}]})
    hb = [t for t in client.get("/labs/trends", headers=h).json() if t["key"] == "hba1c"][0]
    assert len(hb["points"]) == 2 and hb["change"] == 0.3 and hb["flag"] == "high"
    reps = client.get("/labs", headers=h).json()
    assert reps[0]["taken_on"] == "2026-09-12" and reps[1]["flagged"] >= 5


def test_blueprint_checkups_marked_from_reports():
    fresh()
    h = auth()
    client.put("/profile", headers=h, json={"sex": "male", "age": 40, "height_cm": 175, "weight_kg": 72, "activity": "light", "onboarded": True})
    client.post("/labs", headers=h, json={"taken_on": "2026-01-10", "results": [{"key": "ldl", "value": 110, "unit": "mg/dL", "ref_high": 100}]})
    cks = {c["name"]: c for c in client.get("/wellness/blueprint", headers=h).json()["checkups"]}
    assert cks["Cholesterol (lipid profile)"]["status"] == "done" and cks["Cholesterol (lipid profile)"]["next_due"] == "2029-01-10"
    assert cks["Blood sugar (diabetes)"]["status"] == "not_recorded"


def test_low_haemoglobin_adds_context_to_heart_alert():
    fresh()
    h = auth()
    client.put("/profile", headers=h, json={k: v for k, v in PROFILE.items() if k != "name"})
    nights, _, _, _ = scenario("infection")
    client.post("/vitals", headers=h, json={"nights": nights})
    from datetime import date
    client.post("/labs", headers=h, json={"taken_on": date.today().isoformat(), "results": [{"key": "hemoglobin", "value": 10.9, "unit": "g/dL", "ref_low": 13, "ref_high": 17}]})
    s = client.get("/signals/today", headers=h).json()
    assert s["level"] == "check" and "haemoglobin" in s["message"] and s["lab_context"]


def test_isolation_and_validation():
    fresh()
    h1, h2 = auth("a@x.com"), auth("b@x.com")
    rid = client.post("/labs", headers=h1, json={"taken_on": "2026-01-01", "results": [{"key": "tsh", "value": 2}]}).json()["id"]
    assert client.get("/labs", headers=h2).json() == []
    assert client.delete(f"/labs/{rid}", headers=h2).status_code == 404
    assert client.post("/labs", headers=h1, json={"taken_on": "2026-01-01", "results": [{"key": "magic", "value": 1}]}).status_code == 422
    assert client.post("/labs/extract", headers=h1, data={"text": "hello world"}).status_code == 422
