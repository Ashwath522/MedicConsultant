import os
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.security import audit, current_user
from app.models import Consultation, Episode, User
from app.schemas import ConsultationOut
from app.speech import transcribe as stt

router = APIRouter(tags=["consultations"])

AUDIO_DIR = Path("storage/audio")


def _own_episode(db: Session, user: User, episode_id: str) -> Episode:
    e = db.get(Episode, episode_id)
    if not e or e.user_id != user.id:
        raise HTTPException(404, "Episode not found")
    return e


def _own_consultation(db: Session, user: User, cid: str) -> Consultation:
    c = db.get(Consultation, cid)
    if not c:
        raise HTTPException(404, "Consultation not found")
    _own_episode(db, user, c.episode_id)
    return c


@router.post("/episodes/{episode_id}/consultations", response_model=ConsultationOut, status_code=201)
def upload_consultation(
    episode_id: str,
    audio: UploadFile = File(...),
    consent: bool = Form(...),
    language: str | None = Form(None),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Upload a recording → transcript with timestamps. Audio is deleted afterwards by default.

    Sync endpoint on purpose: FastAPI runs it in a worker thread, so slow
    transcription doesn't block other requests.
    """
    ep = _own_episode(db, user, episode_id)
    if not consent:
        raise HTTPException(400, "Doctor's consent is required before recording")

    suffix = Path(audio.filename or "rec.webm").suffix or ".webm"
    fd, tmp = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as f:
            shutil.copyfileobj(audio.file, f)
        size_mb = os.path.getsize(tmp) / 1_048_576
        if size_mb > settings.max_audio_mb:
            raise HTTPException(413, f"Audio too large (max {settings.max_audio_mb} MB)")
        if size_mb == 0:
            raise HTTPException(400, "Empty recording")

        try:
            result = stt.transcribe(tmp, language=language or None)
        except Exception as e:  # unreadable/corrupt audio
            raise HTTPException(422, f"Could not transcribe audio: {e}")

        c = Consultation(
            episode_id=ep.id,
            consent_given=True,
            language=result["language"],
            duration_sec=result["duration"],
            transcript=result["segments"],
            audio_deleted=not settings.keep_audio,
        )
        db.add(c)
        db.flush()
        if settings.keep_audio:
            AUDIO_DIR.mkdir(parents=True, exist_ok=True)
            shutil.move(tmp, AUDIO_DIR / f"{c.id}{suffix}")
        audit(db, user.id, "create", f"consultation:{c.id}")
        db.commit()
        db.refresh(c)
        return c
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


@router.get("/episodes/{episode_id}/consultations", response_model=list[ConsultationOut])
def list_consultations(episode_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _own_episode(db, user, episode_id)
    q = select(Consultation).where(Consultation.episode_id == episode_id).order_by(Consultation.recorded_at.desc())
    return db.scalars(q).all()


@router.get("/consultations/{cid}", response_model=ConsultationOut)
def get_consultation(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _own_consultation(db, user, cid)
    audit(db, user.id, "view", f"consultation:{c.id}")
    db.commit()
    return c


@router.delete("/consultations/{cid}", status_code=204)
def delete_consultation(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _own_consultation(db, user, cid)
    for f in AUDIO_DIR.glob(f"{c.id}.*"):
        f.unlink(missing_ok=True)
    audit(db, user.id, "delete", f"consultation:{c.id}")
    db.delete(c)
    db.commit()
