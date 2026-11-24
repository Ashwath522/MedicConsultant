from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import audit, current_user
from app.labs.catalog import TESTS
from app.labs.extract import _flag, extract
from app.models import LabReport, LabResult, User

router = APIRouter(prefix="/labs", tags=["labs"])
MAX_MB = 15


class ResultIn(BaseModel):
    key: str
    value: float
    unit: str = ""
    ref_low: float | None = None
    ref_high: float | None = None
    range_source: Literal["report", "typical"] = "report"


class ReportIn(BaseModel):
    taken_on: date
    lab_name: str = ""
    method: Literal["pdf", "text", "vision", "manual"] = "manual"
    results: list[ResultIn] = Field(min_length=1, max_length=200)


@router.post("/extract")
def extract_report(file: UploadFile | None = File(None), text: str | None = Form(None), user: User = Depends(current_user)):
    """Step 1: read a PDF / photo / pasted text. Returns results for the user to confirm. Nothing is saved."""
    data = None
    if file:
        data = file.file.read(MAX_MB * 1_048_576 + 1)
        if len(data) > MAX_MB * 1_048_576:
            raise HTTPException(413, f"File too large (max {MAX_MB} MB)")
    try:
        out = extract(data, file.filename if file else None, file.content_type if file else None, text)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(422, str(e))
    if not out["results"]:
        raise HTTPException(422, "No known tests found. Check the file, or paste the report text.")
    return out


@router.post("", status_code=201)
def save_report(data: ReportIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Step 2: save what the user confirmed (they may have edited values)."""
    unknown = [r.key for r in data.results if r.key not in TESTS]
    if unknown:
        raise HTTPException(422, f"Unknown tests: {unknown}")
    rep = LabReport(user_id=user.id, taken_on=data.taken_on, lab_name=data.lab_name, method=data.method)
    db.add(rep)
    db.flush()
    for r in data.results:
        db.add(LabResult(report_id=rep.id, user_id=user.id, taken_on=data.taken_on, key=r.key, name=TESTS[r.key][0],
                         value=r.value, unit=r.unit or TESTS[r.key][1], ref_low=r.ref_low, ref_high=r.ref_high,
                         range_source=r.range_source, flag=_flag(r.value, r.ref_low, r.ref_high)))
    audit(db, user.id, "create", f"lab_report:{rep.id}")
    db.commit()
    return {"id": rep.id, "count": len(data.results)}


def _res(r: LabResult) -> dict:
    return {"key": r.key, "name": r.name, "value": r.value, "unit": r.unit, "ref_low": r.ref_low, "ref_high": r.ref_high,
            "range_source": r.range_source, "flag": r.flag, "group": TESTS.get(r.key, ("", "", [], None, "Other"))[4]}


@router.get("")
def list_reports(user: User = Depends(current_user), db: Session = Depends(get_db)):
    reps = db.scalars(select(LabReport).where(LabReport.user_id == user.id).order_by(LabReport.taken_on.desc()))
    return [{"id": r.id, "taken_on": r.taken_on, "lab_name": r.lab_name, "method": r.method,
             "count": len(r.results), "flagged": sum(x.flag != "normal" for x in r.results),
             "results": [_res(x) for x in r.results]} for r in reps]


@router.delete("/{rid}", status_code=204)
def delete_report(rid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = db.get(LabReport, rid)
    if not r or r.user_id != user.id:
        raise HTTPException(404, "Report not found")
    audit(db, user.id, "delete", f"lab_report:{rid}")
    db.delete(r)
    db.commit()


@router.get("/trends")
def lab_trends(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Every test across all reports, oldest first, with direction of change."""
    rows = db.scalars(select(LabResult).where(LabResult.user_id == user.id).order_by(LabResult.taken_on))
    by: dict[str, list[LabResult]] = {}
    for r in rows:
        by.setdefault(r.key, []).append(r)
    out = []
    for key, rs in by.items():
        last = rs[-1]
        change = round(last.value - rs[-2].value, 2) if len(rs) > 1 else None
        out.append({**_res(last), "points": [{"day": r.taken_on, "value": r.value, "flag": r.flag} for r in rs], "change": change})
    order = list(TESTS)
    return sorted(out, key=lambda x: (x["flag"] == "normal", order.index(x["key"]) if x["key"] in order else 99))


def latest_by_key(db: Session, user_id: str, within_days: int = 400) -> dict[str, LabResult]:
    since = date.today() - timedelta(days=within_days)
    out: dict[str, LabResult] = {}
    for r in db.scalars(select(LabResult).where(LabResult.user_id == user_id, LabResult.taken_on >= since).order_by(LabResult.taken_on)):
        out[r.key] = r
    return out
