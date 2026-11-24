"""Early-warning engine: deterministic, online (past data only), per-person baselines.
Implements docs/09-health-signals-spec.md §3. Pure functions, no I/O.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date
from statistics import median

BENIGN_TAGS = {"alcohol", "late_night", "hard_workout", "travel", "stress", "period"}

# Medicines that commonly change heart rate (generic name fragments, lower-case)
HR_LOWERING = ["metoprolol", "atenolol", "propranolol", "bisoprolol", "carvedilol", "nebivolol", "ivabradine", "diltiazem", "verapamil", "digoxin"]
HR_RAISING = ["salbutamol", "albuterol", "levosalbutamol", "terbutaline", "thyroxine", "levothyroxine", "pseudoephedrine", "phenylephrine", "theophylline", "caffeine", "methylphenidate"]


@dataclass
class Night:
    day: date
    rhr: float | None = None
    hrv: float | None = None
    hrv_type: str | None = None  # "sdnn" | "rmssd"
    temp_dev: float | None = None  # °C deviation from personal baseline (as devices report)
    temp_abs: float | None = None  # °C absolute (manual thermometer)
    resp: float | None = None
    steps: int | None = None
    sleep_h: float | None = None
    tags: list[str] = field(default_factory=list)


@dataclass
class Params:
    baseline_days: int = 28
    min_baseline: int = 14
    # Tuned by app/signals/validate.py (spec §7): held-out sensitivity 91.8 %, 0.16 false alerts/person-month
    z_rhr: float = 2.0
    min_delta: float = 2.0
    consec: int = 2
    z_hrv: float = 1.5
    temp_up: float = 0.4
    z_resp: float = 2.0
    steps_drop: float = 0.6
    floor_rhr: float = 1.5
    floor_lnhrv: float = 0.05
    floor_resp: float = 0.5


@dataclass
class DayResult:
    day: date
    level: str  # "learning" | "normal" | "watch" | "check"
    flags: dict
    reasons: list[str]
    message: str
    baseline: dict
    elevated: bool = False


def _robust(values: list[float], floor: float) -> tuple[float, float] | None:
    if not values:
        return None
    m = median(values)
    mad = median([abs(v - m) for v in values]) * 1.4826
    return m, max(mad, floor)


def _z(x: float | None, stats: tuple[float, float] | None) -> float | None:
    if x is None or stats is None:
        return None
    return (x - stats[0]) / stats[1]


def hr_meds(medicines: list[str]) -> tuple[list[str], list[str]]:
    low = [m for m in medicines if any(k in m.lower() for k in HR_LOWERING)]
    high = [m for m in medicines if any(k in m.lower() for k in HR_RAISING)]
    return low, high


def evaluate(nights: list[Night], p: Params = Params(), medicines: list[str] | None = None, very_active: bool = False) -> list[DayResult]:
    """Evaluate every night in order, online. Returns one DayResult per night."""
    nights = sorted(nights, key=lambda n: n.day)
    results: list[DayResult] = []
    elevated_days: set[date] = set()
    med_low, med_high = hr_meds(medicines or [])

    for i, n in enumerate(nights):
        window = [x for x in nights[max(0, i - p.baseline_days):i] if x.day not in elevated_days]
        rhr_vals = [x.rhr for x in window if x.rhr is not None]
        hrv_vals = [math.log(x.hrv) for x in window if x.hrv and x.hrv_type == n.hrv_type]
        resp_vals = [x.resp for x in window if x.resp is not None]
        step_vals = [x.steps for x in window if x.steps is not None]

        rhr_s = _robust(rhr_vals, p.floor_rhr) if len(rhr_vals) >= p.min_baseline else None
        hrv_s = _robust(hrv_vals, p.floor_lnhrv) if len(hrv_vals) >= p.min_baseline else None
        resp_s = _robust(resp_vals, p.floor_resp) if len(resp_vals) >= p.min_baseline else None
        steps_med = median(step_vals) if len(step_vals) >= p.min_baseline else None

        z_rhr = _z(n.rhr, rhr_s)
        delta = (n.rhr - rhr_s[0]) if (n.rhr is not None and rhr_s) else None
        z_hrv = _z(math.log(n.hrv), hrv_s) if (n.hrv and hrv_s) else None
        z_resp = _z(n.resp, resp_s)

        flags = {
            "rhr_elevated": bool(z_rhr is not None and z_rhr >= p.z_rhr and delta is not None and delta >= p.min_delta),
            "hrv_low": bool(z_hrv is not None and z_hrv <= -p.z_hrv),
            "temp_up": bool(n.temp_dev is not None and n.temp_dev >= p.temp_up),
            "resp_up": bool(z_resp is not None and z_resp >= p.z_resp),
            "steps_drop": bool(steps_med and n.steps is not None and n.steps < p.steps_drop * steps_med),
            "fever_reading": bool(n.temp_abs is not None and n.temp_abs >= 38.0),
        }
        if flags["rhr_elevated"]:
            elevated_days.add(n.day)

        # consecutive elevated nights (calendar-consecutive)
        run = 0
        for back in range(p.consec):
            j = i - back
            if j < 0:
                break
            if nights[j].day in elevated_days and (back == 0 or (nights[j + 1].day - nights[j].day).days == 1):
                run += 1
            else:
                break

        support = sum(flags[k] for k in ("hrv_low", "resp_up", "steps_drop"))
        reasons: list[str] = []
        level = "normal"

        if flags["rhr_elevated"] and (run >= p.consec or flags["temp_up"] or support >= 2):
            level = "check"
        elif flags["rhr_elevated"] or flags["temp_up"] or (flags["hrv_low"] and flags["resp_up"]):
            level = "watch"

        # Absolute safety net (no baseline needed)
        safety = None
        if n.rhr is not None and n.rhr >= 100:
            safety = "Resting heart rate is 100 bpm or more."
        elif n.rhr is not None and n.rhr <= 40 and not very_active:
            safety = "Resting heart rate is 40 bpm or less."
        if flags["fever_reading"]:
            safety = f"Temperature reading is {n.temp_abs:.1f} °C (fever range)."
        if safety:
            level = "check"
            reasons.append(safety)

        if rhr_s is None and level != "check":
            level = "learning"

        # Confounders: tags on the trigger nights downgrade one step
        trigger_nights = nights[max(0, i - p.consec + 1):i + 1] if level == "check" else [n]
        tags = sorted({t for x in trigger_nights for t in x.tags if t in BENIGN_TAGS})
        if tags and level in ("check", "watch") and not safety:
            level = "watch" if level == "check" else "normal"

        if delta is not None and flags["rhr_elevated"]:
            reasons.append(f"Resting heart rate {delta:+.0f} bpm vs your normal ({rhr_s[0]:.0f})" + (f" for {run} nights" if run > 1 else ""))
        if flags["temp_up"]:
            reasons.append(f"Temperature {n.temp_dev:+.1f} °C vs your normal")
        if flags["hrv_low"]:
            reasons.append("HRV lower than usual")
        if flags["resp_up"]:
            reasons.append("Breathing rate higher than usual")
        if flags["steps_drop"]:
            reasons.append("Much less movement than usual")

        results.append(DayResult(
            day=n.day, level=level, flags=flags, reasons=reasons,
            message=_message(level, reasons, tags, med_low, med_high, len(rhr_vals), p.min_baseline, bool(safety)),
            baseline={
                "rhr": round(rhr_s[0], 1) if rhr_s else None,
                "rhr_spread": round(rhr_s[1], 2) if rhr_s else None,
                "nights": len(rhr_vals),
                "needed": p.min_baseline,
            },
            elevated=flags["rhr_elevated"],
        ))
    return results


def _message(level, reasons, tags, med_low, med_high, have, need, safety) -> str:
    ctx = ""
    if tags:
        ctx += f" You noted {', '.join(t.replace('_', ' ') for t in tags)}, which can also explain this."
    if med_low:
        ctx += f" {', '.join(med_low)} can lower heart rate and may hide a rise."
    if med_high:
        ctx += f" {', '.join(med_high)} can raise heart rate."
    if level == "learning":
        return f"Learning your normal: {have}/{need} nights."
    if level == "normal":
        return "Your body signals are within your normal range." + ctx
    if level == "watch":
        what = reasons[0].lower() if reasons else "one signal"
        return f"One signal is outside your normal range ({what}). Nothing to do yet; we'll keep an eye on it." + ctx
    if safety:
        return reasons[0] + " If this continues or you feel unwell, please talk to a doctor." + ctx
    return (
        f"{'; '.join(reasons)}. This pattern is often seen when the body is fighting an infection, "
        "but poor sleep, alcohol, stress or hard exercise can also cause it. Check your temperature. "
        "If you feel unwell, start an episode or call your doctor." + ctx
    )
