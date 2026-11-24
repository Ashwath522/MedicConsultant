from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.security import audit, current_user
from app.models import DailyLog, NightlyVitals, User
from app.routers.labs import latest_by_key
from app.signals import trends as trends_mod
from app.wellness.targets import sleep_hours as sleep_target_for, steps as steps_goal_for
from app.signals.engine import BENIGN_TAGS, Night, evaluate
from app.signals.simulate import demo_nights

router = APIRouter(tags=["signals"])


class NightIn(BaseModel):
    day: date = Field(default_factory=date.today)
    rhr: float | None = Field(default=None, ge=25, le=220)
    hrv: float | None = Field(default=None, ge=1, le=300)
    hrv_type: Literal["sdnn", "rmssd"] | None = None
    temp_dev: float | None = Field(default=None, ge=-3, le=3)
    temp_abs: float | None = Field(default=None, ge=34, le=43)
    resp: float | None = Field(default=None, ge=5, le=40)
    spo2: float | None = Field(default=None, ge=70, le=100)
    steps: int | None = Field(default=None, ge=0, le=100000)
    sleep_h: float | None = Field(default=None, ge=0, le=24)
    source: Literal["shortcuts", "manual", "health_connect", "demo"] = "manual"


class VitalsIn(BaseModel):
    nights: list[NightIn] = Field(min_length=1, max_length=400)


class TagsIn(BaseModel):
    day: date
    tags: list[str]


FIELDS = ("rhr", "hrv", "hrv_type", "temp_dev", "temp_abs", "resp", "spo2", "steps", "sleep_h", "source")


def _rows(db: Session, user: User, days: int) -> list[NightlyVitals]:
    start = date.today() - timedelta(days=days)
    return list(db.scalars(select(NightlyVitals).where(NightlyVitals.user_id == user.id, NightlyVitals.day >= start).order_by(NightlyVitals.day)))


def _night(r: NightlyVitals) -> Night:
    return Night(day=r.day, rhr=r.rhr, hrv=r.hrv, hrv_type=r.hrv_type, temp_dev=r.temp_dev, temp_abs=r.temp_abs,
                 resp=r.resp, steps=r.steps, sleep_h=r.sleep_h, tags=list(r.tags or []))


def _row_out(r: NightlyVitals) -> dict:
    return {"day": r.day, **{f: getattr(r, f) for f in FIELDS}, "tags": r.tags or []}


@router.post("/vitals")
def upsert_vitals(data: VitalsIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Add or update nights. Only fields you send are changed (so partial syncs are safe)."""
    for n in data.nights:
        row = db.scalar(select(NightlyVitals).where(NightlyVitals.user_id == user.id, NightlyVitals.day == n.day))
        if not row:
            row = NightlyVitals(user_id=user.id, day=n.day, tags=[])
            db.add(row)
        for f, v in n.model_dump(exclude_unset=True).items():
            if f != "day":
                setattr(row, f, v)
    audit(db, user.id, "create", f"vitals:{len(data.nights)}")
    db.commit()
    return {"saved": len(data.nights)}


@router.get("/vitals")
def list_vitals(days: int = 60, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [_row_out(r) for r in _rows(db, user, min(days, 400))]


@router.post("/vitals/tags")
def set_tags(data: TagsIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    bad = set(data.tags) - BENIGN_TAGS
    if bad:
        raise HTTPException(422, f"Unknown tags: {sorted(bad)}. Allowed: {sorted(BENIGN_TAGS)}")
    row = db.scalar(select(NightlyVitals).where(NightlyVitals.user_id == user.id, NightlyVitals.day == data.day))
    if not row:
        row = NightlyVitals(user_id=user.id, day=data.day, tags=[])
        db.add(row)
    row.tags = sorted(set(data.tags))
    db.commit()
    return {"day": data.day, "tags": row.tags}


@router.get("/signals/today")
def signals_today(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Level + reasons + message for the latest night, plus a 30-night series for charts."""
    rows = _rows(db, user, 90)
    if not rows:
        return {"level": "no_data", "message": "No body signals yet. Connect a wearable or add last night's resting heart rate.", "series": []}
    results = evaluate([_night(r) for r in rows], medicines=user.regular_medicines or [], very_active=user.activity == "active")
    last, last_row = results[-1], rows[-1]
    lab_context = []
    if last.level in ("watch", "check"):
        labs = latest_by_key(db, user.id)
        if (hb := labs.get("hemoglobin")) and hb.flag == "low":
            lab_context.append(f"Your report on {hb.taken_on:%d %b %Y} showed low haemoglobin ({hb.value:g} {hb.unit}), which can also raise resting heart rate.")
        if (t := labs.get("tsh")) and t.flag == "low":
            lab_context.append(f"Your report on {t.taken_on:%d %b %Y} showed low TSH ({t.value:g}), which can be linked to an overactive thyroid and a faster heart rate.")
        if (c := labs.get("crp")) and c.flag == "high":
            lab_context.append(f"Your last CRP ({c.value:g} {c.unit}, {c.taken_on:%d %b %Y}) was raised, a sign of inflammation.")
        if lab_context:
            last.message += " " + " ".join(lab_context) + " Mention this to your doctor."
    stale = (date.today() - last.day).days > 2
    series = [
        {"day": r.day, "rhr": row.rhr, "baseline": r.baseline["rhr"], "spread": r.baseline["rhr_spread"],
         "temp_dev": row.temp_dev, "hrv": row.hrv, "level": r.level}
        for r, row in list(zip(results, rows))[-30:]
    ]
    return {
        "day": last.day, "level": last.level, "reasons": last.reasons, "message": last.message,
        "flags": last.flags, "baseline": last.baseline, "lab_context": lab_context, "tags": last_row.tags or [],
        "latest": _row_out(last_row), "stale": stale, "series": series,
    }


@router.delete("/vitals", status_code=204)
def delete_vitals(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Delete all of your nightly vitals (privacy / start fresh)."""
    db.execute(delete(NightlyVitals).where(NightlyVitals.user_id == user.id))
    audit(db, user.id, "delete", "vitals:all")
    db.commit()


@router.post("/vitals/demo")
def load_demo(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Development only: replace your vitals with 60 simulated nights ending in an illness pattern."""
    if not settings.allow_demo:
        raise HTTPException(403, "Demo data is disabled")
    db.execute(delete(NightlyVitals).where(NightlyVitals.user_id == user.id))
    start = date.today() - timedelta(days=59)
    for n in demo_nights(start):
        db.add(NightlyVitals(user_id=user.id, day=n.day, rhr=n.rhr, hrv=n.hrv, hrv_type=n.hrv_type, temp_dev=n.temp_dev,
                             resp=n.resp, steps=n.steps, sleep_h=n.sleep_h, tags=[], source="demo"))
    db.commit()
    return {"loaded": 60}


@router.get("/trends")
def get_trends(days: int = 30, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Every metric over 7/30/90 days, with daily Recovery/Sleep/Activity scores and patterns."""
    if days not in (7, 30, 90):
        raise HTTPException(422, "days must be 7, 30 or 90")
    since = date.today() - timedelta(days=max(2 * days, 90) + 30)
    vit = {r.day: {f: getattr(r, f) for f in FIELDS} for r in db.scalars(
        select(NightlyVitals).where(NightlyVitals.user_id == user.id, NightlyVitals.day >= since))}
    logs = {r.day: {"water_ml": r.water_ml, "steps": r.steps, "sleep_hours": r.sleep_hours, "mood": r.mood} for r in db.scalars(
        select(DailyLog).where(DailyLog.user_id == user.id, DailyLog.day >= since))}
    age = user.age or 30
    return trends_mod.build(days, date.today(), vit, logs, sleep_target_for(age)[0], steps_goal_for(age, user.activity or "light"), age)
