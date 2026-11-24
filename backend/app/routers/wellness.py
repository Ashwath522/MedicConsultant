from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import current_user
from app.labs.catalog import TESTS
from app.models import DailyLog, LabResult, User
from app.schemas import DayLog, DayLogUpdate
from app.wellness.targets import Body, blueprint

router = APIRouter(prefix="/wellness", tags=["wellness"])


@router.get("/blueprint")
def get_blueprint(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Personal targets from sex, age, height, weight and activity. Check-ups show when they were
    last done (from your lab reports) and when the next one is due."""
    if not (user.sex and user.age and user.height_cm and user.weight_kg):
        raise HTTPException(409, "Complete your body profile first")
    bp = blueprint(Body(user.sex, user.age, user.height_cm, user.weight_kg, user.activity))
    last: dict[str, date] = {}
    for r in db.scalars(select(LabResult).where(LabResult.user_id == user.id)):
        chk = TESTS.get(r.key, (None,) * 6)[5]
        if chk and (chk not in last or r.taken_on > last[chk]):
            last[chk] = r.taken_on
    for c in bp["checkups"]:
        done = last.get(c["name"])
        c["last_done"] = done.isoformat() if done else None
        years = {"Every year": 1, "Every 1–3 years": 1, "Every 3–5 years": 3, "Every 2 years": 2}.get(c["how_often"])
        due = date(done.year + years, done.month, min(done.day, 28)) if done and years else None
        c["next_due"] = due.isoformat() if due else None
        c["status"] = "not_recorded" if not done else ("due" if due and due <= date.today() else "done")
    return bp


def _log(db: Session, user: User, day: date) -> DailyLog:
    log = db.scalar(select(DailyLog).where(DailyLog.user_id == user.id, DailyLog.day == day))
    if not log:
        log = DailyLog(user_id=user.id, day=day, water_ml=0, steps=0, sleep_hours=0.0, mood="")
        db.add(log)
        db.flush()
    return log


@router.get("/today", response_model=DayLog)
def get_today(user: User = Depends(current_user), db: Session = Depends(get_db)):
    log = db.scalar(select(DailyLog).where(DailyLog.user_id == user.id, DailyLog.day == date.today()))
    return log or DayLog(day=date.today())


@router.put("/today", response_model=DayLog)
def update_today(data: DayLogUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    log = _log(db, user, date.today())
    upd = data.model_dump(exclude_unset=True)
    if "add_water_ml" in upd:
        log.water_ml = max(0, log.water_ml + upd.pop("add_water_ml"))
    for k, v in upd.items():
        setattr(log, k, v)
    db.commit()
    db.refresh(log)
    return log


@router.get("/week", response_model=list[DayLog])
def get_week(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Last 7 days, oldest first, with empty days filled in (for charts)."""
    start = date.today() - timedelta(days=6)
    rows = {r.day: r for r in db.scalars(select(DailyLog).where(DailyLog.user_id == user.id, DailyLog.day >= start))}
    return [rows.get(start + timedelta(days=i)) or DayLog(day=start + timedelta(days=i)) for i in range(7)]
