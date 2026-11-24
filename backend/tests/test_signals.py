from datetime import date, timedelta

from app.signals.engine import Night, Params, evaluate
from app.signals.simulate import cohort, demo_nights
from app.signals.validate import score

D0 = date(2026, 1, 1)


def steady(n=30, rhr=60.0, **kw):
    return [Night(day=D0 + timedelta(days=i), rhr=rhr + (0.8 if i % 2 else -0.8), resp=14.0, steps=7000, **kw) for i in range(n)]


def add(nights, rhr, temp_dev=None, tags=None, temp_abs=None):
    d = nights[-1].day + timedelta(days=1)
    nights.append(Night(day=d, rhr=rhr, resp=14.0, steps=7000, temp_dev=temp_dev, tags=tags or [], temp_abs=temp_abs))
    return nights


def test_learning_until_14_nights():
    res = evaluate(steady(10))
    assert res[-1].level == "learning" and "9/14" in res[-1].message


def test_single_elevated_night_is_watch_two_is_check():
    n = add(steady(), 67)
    assert evaluate(n)[-1].level == "watch"
    n = add(n, 68)
    r = evaluate(n)[-1]
    assert r.level == "check" and "for 2 nights" in r.message and "doctor" in r.message
    assert "fever" not in r.message.lower() or "infection" in r.message  # never a diagnosis


def test_elevated_plus_temperature_same_night_is_check():
    assert evaluate(add(steady(), 67, temp_dev=0.6))[-1].level == "check"


def test_tags_downgrade_and_explain():
    n = add(add(steady(), 67, tags=["alcohol"]), 68)
    r = evaluate(n)[-1]
    assert r.level == "watch" and "alcohol" in r.message


def test_safety_net_works_without_baseline():
    n = [Night(day=D0, rhr=104)]
    assert evaluate(n)[0].level == "check"
    assert evaluate([Night(day=D0, rhr=38)])[0].level == "check"
    assert evaluate([Night(day=D0, rhr=38)], very_active=True)[0].level != "check"
    assert evaluate([Night(day=D0, temp_abs=38.4)])[0].level == "check"


def test_medicines_noted():
    n = add(add(steady(), 67), 68)
    r = evaluate(n, medicines=["Metoprolol 25mg"])[-1]
    assert "Metoprolol" in r.message and "hide" in r.message


def test_baseline_not_contaminated_by_illness():
    n = steady()
    for v in (67, 68, 69, 70, 70, 69):
        add(n, v)
    assert evaluate(n)[-1].baseline["rhr"] < 61.5  # elevated nights excluded from baseline


def test_hrv_types_never_mixed():
    n = [Night(day=D0 + timedelta(days=i), rhr=60, hrv=50 if i < 20 else 30, hrv_type="sdnn" if i < 20 else "rmssd") for i in range(30)]
    assert not evaluate(n)[-1].flags["hrv_low"]  # rmssd has no baseline yet, so no comparison with sdnn


def test_demo_ends_in_check():
    assert evaluate(demo_nights(D0))[-1].level == "check"


def test_validation_regression():
    """Guards the tuned parameters on a fresh cohort (spec §7 targets)."""
    m = score(cohort(50, seed=303), Params())
    assert m["sens_moderate"] >= 0.75 and m["false_alerts_per_person_month"] <= 0.5


# ---------- API ----------
import os  # noqa: E402

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
from fastapi.testclient import TestClient  # noqa: E402

from app.core.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)


def _auth():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    r = client.post("/auth/signup", json={"email": "s@test.com", "password": "secret1", "name": "S"})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_api_no_data_then_learning_then_demo_check():
    h = _auth()
    assert client.get("/signals/today", headers=h).json()["level"] == "no_data"
    client.post("/vitals", headers=h, json={"nights": [{"rhr": 61, "source": "manual"}]})
    assert client.get("/signals/today", headers=h).json()["level"] == "learning"
    assert client.post("/vitals/demo", headers=h).json()["loaded"] == 60
    s = client.get("/signals/today", headers=h).json()
    assert s["level"] == "check" and len(s["series"]) == 30 and s["baseline"]["rhr"]


def test_api_partial_update_and_tags():
    h = _auth()
    today = date.today().isoformat()
    client.post("/vitals", headers=h, json={"nights": [{"day": today, "rhr": 60, "hrv": 45, "hrv_type": "rmssd"}]})
    client.post("/vitals", headers=h, json={"nights": [{"day": today, "steps": 5000}]})
    row = client.get("/vitals", headers=h).json()[-1]
    assert row["rhr"] == 60 and row["steps"] == 5000
    assert client.post("/vitals/tags", headers=h, json={"day": today, "tags": ["alcohol"]}).json()["tags"] == ["alcohol"]
    assert client.post("/vitals/tags", headers=h, json={"day": today, "tags": ["pizza"]}).status_code == 422
    assert client.post("/vitals", headers=h, json={"nights": [{"rhr": 400}]}).status_code == 422
