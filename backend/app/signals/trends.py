"""Trends, daily scores and patterns (spec 09 §9). Pure functions, transparent formulas.

Recovery score (0–100): from published HRV-guided-training practice (Plews 2013, Buchheit 2014):
recovery is judged by today's HRV and resting HR against YOUR OWN 28-day normal, plus sleep.
    s = 0.5·z(lnHRV) − 0.3·z(RHR) + 0.2·S        S = clamp((sleep_h − sleep_target)/1h, −2, +1)
    recovery = 100 / (1 + e^−(1.2·s + 0.4))       (0 → 60, a typical "ok" day)
Weights are renormalised when a signal is missing. Needs ≥ 14 nights of baseline.

Sleep score (0–100): 70 % duration vs your age-based target + 30 % regularity
(1 − SD of the last 7 nights' duration / 1.5 h, clamped 0..1).

Cardio fitness (estimated VO2max, ml/kg/min): Uth et al., Eur J Appl Physiol 2004:
    VO2max ≈ 15.3 × HRmax / RHR,  HRmax = 208 − 0.7 × age  (Tanaka et al., JACC 2001). An estimate, ±10–15 %.

Activity score (0–100): steps / your step goal (capped at 100). (Bevel-style "strain" needs
workout heart rate, which we don't collect yet.)
"""
from __future__ import annotations

import math
from datetime import date, timedelta
from statistics import mean, median, pstdev

METRICS = {
    # key: (label, unit, higher_is_better, decimals, chart)
    "recovery": ("Recovery", "%", True, 0, "bar"),
    "sleep_score": ("Sleep score", "%", True, 0, "bar"),
    "activity": ("Activity", "%", True, 0, "bar"),
    "rhr": ("Resting heart rate", "bpm", False, 0, "line"),
    "vo2max": ("Cardio fitness (est. VO₂max)", "ml/kg/min", True, 1, "line"),
    "hrv": ("Heart rate variability", "ms", True, 0, "line"),
    "sleep_h": ("Sleep", "h", True, 1, "bar"),
    "steps": ("Steps", "", True, 0, "bar"),
    "resp": ("Breathing rate", "/min", None, 1, "line"),
    "temp_dev": ("Temperature", "°C", None, 2, "line"),
    "spo2": ("Blood oxygen", "%", True, 0, "line"),
    "water_ml": ("Water", "ml", True, 0, "bar"),
    "mood": ("Mood", "", True, 0, "bar"),
}
MOOD = {"low": 1, "okay": 2, "good": 3, "great": 4}


def _robust(vals: list[float], floor: float) -> tuple[float, float] | None:
    if len(vals) < 14:
        return None
    m = median(vals)
    return m, max(median([abs(v - m) for v in vals]) * 1.4826, floor)


def recovery_score(hrv, rhr, sleep_h, hrv_base, rhr_base, sleep_target) -> int | None:
    parts, weights = 0.0, 0.0
    if hrv and hrv_base:
        parts += 0.5 * (math.log(hrv) - hrv_base[0]) / hrv_base[1]; weights += 0.5
    if rhr is not None and rhr_base:
        parts += -0.3 * (rhr - rhr_base[0]) / rhr_base[1]; weights += 0.3
    if sleep_h is not None and sleep_target:
        parts += 0.2 * max(-2.0, min(1.0, sleep_h - sleep_target)); weights += 0.2
    if weights < 0.3:  # need HRV or RHR, not sleep alone
        return None
    s = parts / weights
    return round(100 / (1 + math.exp(-(1.2 * s + 0.4))))


def sleep_score(last7: list[float], sleep_target: float) -> int | None:
    if not last7:
        return None
    dur = min(1.0, last7[-1] / sleep_target) if sleep_target else 0
    reg = 1 - min(1.0, pstdev(last7) / 1.5) if len(last7) >= 3 else 0.7
    return round(100 * (0.7 * dur + 0.3 * reg))


def build(days: int, today: date, vitals: dict[date, dict], logs: dict[date, dict], sleep_target: float, step_goal: int, age: int = 30) -> dict:
    """vitals/logs: per-day dicts. Returns per-day series + per-metric summaries + patterns."""
    start = today - timedelta(days=days - 1)
    look = today - timedelta(days=max(days, 90) + 28)  # extra history for baselines + 90-day calendar
    all_days = [look + timedelta(days=i) for i in range((today - look).days + 1)]

    rows = []
    for d in all_days:
        v, lg = vitals.get(d, {}), logs.get(d, {})
        rows.append({
            "day": d,
            "rhr": v.get("rhr"), "hrv": v.get("hrv"), "hrv_type": v.get("hrv_type"),
            "temp_dev": v.get("temp_dev"), "resp": v.get("resp"), "spo2": v.get("spo2"),
            "sleep_h": v.get("sleep_h") if v.get("sleep_h") is not None else (lg.get("sleep_hours") or None),
            "steps": v.get("steps") if v.get("steps") is not None else (lg.get("steps") or None),
            "water_ml": lg.get("water_ml") or None,
            "mood": MOOD.get(lg.get("mood") or ""),
        })

    # daily scores (online: baselines from the 28 days before each day)
    for i, r in enumerate(rows):
        window = rows[max(0, i - 28):i]
        hrv_b = _robust([math.log(x["hrv"]) for x in window if x["hrv"] and x["hrv_type"] == r["hrv_type"]], 0.05)
        rhr_b = _robust([x["rhr"] for x in window if x["rhr"] is not None], 1.5)
        r["recovery"] = recovery_score(r["hrv"], r["rhr"], r["sleep_h"], hrv_b, rhr_b, sleep_target)
        last7 = [x["sleep_h"] for x in rows[max(0, i - 6):i + 1] if x["sleep_h"] is not None]
        r["sleep_score"] = sleep_score(last7, sleep_target) if r["sleep_h"] is not None else None
        r["activity"] = min(100, round(100 * r["steps"] / step_goal)) if r["steps"] is not None and step_goal else None
        r["vo2max"] = round(15.3 * (208 - 0.7 * age) / r["rhr"], 1) if r["rhr"] else None

    shown = [r for r in rows if r["day"] >= start]
    prev = [r for r in rows if start - timedelta(days=days) <= r["day"] < start]

    summary = {}
    for k, (label, unit, better, dec, chart) in METRICS.items():
        cur = [r[k] for r in shown if r[k] is not None]
        if not cur:
            continue
        pv = [r[k] for r in prev if r[k] is not None]
        base_vals = [r[k] for r in rows if r[k] is not None and r["day"] < today][-28:]
        band = None
        if len(base_vals) >= 14 and chart == "line":
            m = median(base_vals)
            sp = max(median([abs(x - m) for x in base_vals]) * 1.4826, 0.01)
            band = [round(m - 2 * sp, 2), round(m + 2 * sp, 2)]
        avg = mean(cur)
        change = (avg - mean(pv)) if pv else None
        summary[k] = {
            "label": label, "unit": unit, "higher_is_better": better, "decimals": dec, "chart": chart,
            "latest": cur[-1], "avg": round(avg, 2), "min": min(cur), "max": max(cur),
            "change": round(change, 2) if change is not None else None,
            "change_pct": round(100 * change / mean(pv), 1) if change is not None and mean(pv) else None,
            "band": band, "count": len(cur),
        }

    series = [{**{k: r[k] for k in METRICS}, "day": r["day"].isoformat()} for r in shown]

    # weekday averages (Mon..Sun) over the shown period
    weekdays = {}
    for k in ("rhr", "recovery", "sleep_h", "steps"):
        vals = []
        for wd in range(7):
            xs = [r[k] for r in shown if r[k] is not None and r["day"].weekday() == wd]
            vals.append(round(mean(xs), 1) if xs else None)
        if any(v is not None for v in vals):
            weekdays[k] = vals

    # HRV vs resting HR (same nights), with Pearson r
    pairs = [(r["rhr"], r["hrv"]) for r in shown if r["rhr"] is not None and r["hrv"]]
    corr = None
    if len(pairs) >= 7:
        xs, ys = [p[0] for p in pairs], [p[1] for p in pairs]
        mx, my = mean(xs), mean(ys)
        num = sum((a - mx) * (b - my) for a, b in pairs)
        den = math.sqrt(sum((a - mx) ** 2 for a in xs) * sum((b - my) ** 2 for b in ys))
        corr = round(num / den, 2) if den else None

    # 90-day calendar of recovery + body-signal level (engine)
    from app.signals.engine import Night, evaluate
    night_list = [Night(day=d, rhr=v.get("rhr"), hrv=v.get("hrv"), hrv_type=v.get("hrv_type"), temp_dev=v.get("temp_dev"),
                        temp_abs=v.get("temp_abs"), resp=v.get("resp"), steps=v.get("steps"), sleep_h=v.get("sleep_h"))
                  for d, v in sorted(vitals.items()) if v.get("rhr") is not None or v.get("temp_abs") is not None]
    levels = {r.day: r.level for r in evaluate(night_list)} if night_list else {}
    by_day = {r["day"]: r for r in rows}
    cal = []
    for i in range(90):
        d = today - timedelta(days=89 - i)
        r = by_day.get(d)
        cal.append({"day": d.isoformat(), "recovery": r["recovery"] if r else None, "level": levels.get(d)})

    return {
        "days": days, "series": series, "summary": summary, "patterns": patterns(rows[-90:], sleep_target),
        "weekdays": weekdays, "scatter": {"points": [{"rhr": a, "hrv": b} for a, b in pairs], "r": corr},
        "calendar": cal, "goals": {"sleep_h": sleep_target, "steps": step_goal},
    }


def _avg(xs):
    xs = [x for x in xs if x is not None]
    return mean(xs) if xs else None


def patterns(rows: list[dict], sleep_target: float) -> list[dict]:
    """Simple, honest 'observed together' insights. Each needs ≥ 5 days in both groups."""
    out = []

    def compare(metric, label, unit, cond, a_txt, b_txt, min_diff, better_high=True):
        a = [r[metric] for r in rows if r[metric] is not None and cond(r) is True]
        b = [r[metric] for r in rows if r[metric] is not None and cond(r) is False]
        if len(a) < 5 or len(b) < 5:
            return
        ma, mb = mean(a), mean(b)
        if abs(ma - mb) < min_diff:
            return
        hi = a_txt if ma > mb else b_txt  # always name the group that is higher
        out.append({
            "title": f"{label} is higher {hi}",
            "detail": f"{max(ma, mb):.0f}{unit} vs {min(ma, mb):.0f}{unit} on average ({len(a)} vs {len(b)} days). Observed together, not proof of cause.",
            "good": (ma > mb) == better_high,
        })

    # previous night's sleep vs today's HRV / recovery
    by_day = {r["day"]: r for r in rows}
    for r in rows:
        p = by_day.get(r["day"] - timedelta(days=1))
        r["_prev_sleep_ok"] = None if not p or p["sleep_h"] is None else p["sleep_h"] >= sleep_target
        r["_weekend"] = r["day"].weekday() >= 5
        r["_active"] = None if r["steps"] is None else r["steps"] >= 8000

    compare("recovery", "Recovery", "%", lambda r: None if r["sleep_h"] is None else r["sleep_h"] >= sleep_target,
            f"after nights with {sleep_target:g}h+ sleep", "after shorter nights", 5)
    compare("hrv", "HRV", " ms", lambda r: r["_prev_sleep_ok"], "when the night before was a full night's sleep", "after a short night", 3)
    compare("rhr", "Resting heart rate", " bpm", lambda r: r["_weekend"], "on weekends", "on weekdays", 1.5, better_high=False)
    compare("sleep_h", "Sleep", "h", lambda r: r["_active"], "on days with 8,000+ steps", "on less active days", 0.3)
    compare("mood", "Mood", "", lambda r: r["_prev_sleep_ok"], "after a full night's sleep", "after a short night", 0.4)
    return out
