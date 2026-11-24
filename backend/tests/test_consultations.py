"""Consultation upload tests. Whisper is replaced with a fake so tests run fast and offline."""
import io
import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient

from app.core.db import Base, engine
from app.main import app
from app.speech import transcribe as stt

client = TestClient(app)

FAKE = {
    "language": "en",
    "duration": 42.0,
    "segments": [
        {"start": 0.0, "end": 4.2, "text": "Is it okay if I record this? Yes, go ahead."},
        {"start": 4.2, "end": 9.8, "text": "Take Dolo 650 twice a day after food for 5 days."},
    ],
}


@pytest.fixture(autouse=True)
def setup(monkeypatch):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    monkeypatch.setattr(stt, "transcribe", lambda path, language=None: FAKE)
    yield


def auth(email="a@test.com"):
    r = client.post("/auth/signup", json={"email": email, "password": "secret1", "name": "A"})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def episode(h):
    return client.post("/episodes", headers=h, json={"title": "Fever", "category": "Fever"}).json()["id"]


def upload(h, eid, consent="true", data=b"fake-audio"):
    return client.post(
        f"/episodes/{eid}/consultations",
        headers=h,
        data={"consent": consent},
        files={"audio": ("rec.webm", io.BytesIO(data), "audio/webm")},
    )


def test_upload_transcribes_and_deletes_audio():
    h = auth()
    eid = episode(h)
    r = upload(h, eid)
    assert r.status_code == 201
    c = r.json()
    assert c["transcript"][1]["start"] == 4.2
    assert c["audio_deleted"] is True
    assert len(client.get(f"/episodes/{eid}/consultations", headers=h).json()) == 1


def test_consent_required():
    h = auth()
    assert upload(h, episode(h), consent="false").status_code == 400


def test_empty_audio_rejected():
    h = auth()
    assert upload(h, episode(h), data=b"").status_code == 400


def test_other_user_cannot_access():
    h1, h2 = auth("a@test.com"), auth("b@test.com")
    eid = episode(h1)
    cid = upload(h1, eid).json()["id"]
    assert upload(h2, eid).status_code == 404
    assert client.get(f"/consultations/{cid}", headers=h2).status_code == 404


def test_deleting_episode_deletes_consultations():
    h = auth()
    eid = episode(h)
    cid = upload(h, eid).json()["id"]
    client.delete(f"/episodes/{eid}", headers=h)
    assert client.get(f"/consultations/{cid}", headers=h).status_code == 404
