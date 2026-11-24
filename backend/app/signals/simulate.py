"""Synthetic nightly-vitals generator for validating the early-warning engine.
Parameters follow docs/09-health-signals-spec.md §6 (ranges from published wearable studies).
Deterministic for a given seed.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from datetime import date, timedelta

from app.signals.engine import Night


@dataclass
class Illness:
    onset: date          # symptom onset (label)
    severity: str        # "moderate" | "mild"


@dataclass
class Person:
    nights: list[Night]
    illnesses: list[Illness] = field(default_factory=list)
    benign_days: list[date] = field(default_factory=list)


def make_person(rng: random.Random, days: int = 180, start: date = date(2026, 1, 1), sex: str | None = None,
                illness_rate: float = 1 / 90, mild_share: float = 0.3, tag_prob: float = 0.5) -> Person:
    sex = sex or rng.choice(["male", "female"])
    base_rhr = rng.gauss(62, 7)
    noise = rng.uniform(1.5, 3.0)
    has_temp = rng.random() < 0.5
    has_hrv = rng.random() < 0.7
    hrv_type = rng.choice(["sdnn", "rmssd"])
    base_hrv = max(15, rng.gauss(45 if hrv_type == "rmssd" else 50, 12))
    base_resp = rng.gauss(14.5, 1.2)
    base_steps = max(2000, rng.gauss(7500, 2500))
    cycle_start = rng.randint(0, 27)
    # slow drift (training change / deconditioning) in ~25% of people: +3..6 bpm over 2-4 weeks, then stays
    drift_start = rng.randint(30, days - 40) if rng.random() < 0.25 else None
    drift_amt, drift_len = rng.uniform(3, 6), rng.randint(14, 28)

    # ---- schedule illnesses (after 30-day warm-up, ≥ 30 days apart)
    illnesses: list[Illness] = []
    d = 30
    while d < days - 10:
        if rng.random() < illness_rate:
            illnesses.append(Illness(start + timedelta(days=d), "mild" if rng.random() < mild_share else "moderate"))
            d += 30
        d += 1

    # per-day illness effect
    effect = {i: {"rhr": 0.0, "hrv": 0.0, "temp": 0.0, "resp": 0.0, "steps": 0.0} for i in range(days)}
    for ill in illnesses:
        o = (ill.onset - start).days
        if ill.severity == "moderate":
            peak = rng.uniform(5, 12); lead = rng.randint(1, 3); dur = rng.randint(4, 8)
            hrv_drop = rng.uniform(0.15, 0.35); temp = rng.uniform(0.4, 1.2); resp = rng.uniform(1.0, 2.5); steps = rng.uniform(0.3, 0.6)
        else:
            peak = rng.uniform(2, 4); lead = rng.randint(0, 2); dur = rng.randint(2, 4)
            hrv_drop = rng.uniform(0.05, 0.15); temp = rng.uniform(0.1, 0.4); resp = rng.uniform(0.3, 1.0); steps = rng.uniform(0.1, 0.3)
        for k in range(-lead, dur + 3):
            i = o + k
            if not 0 <= i < days:
                continue
            if k < 0:
                f = (k + lead + 1) / (lead + 1) * 0.7          # pre-symptomatic ramp
            elif k <= dur // 2:
                f = 1.0
            else:
                f = max(0.0, 1 - (k - dur // 2) / (dur // 2 + 3))  # recovery
            e = effect[i]
            e["rhr"] = max(e["rhr"], peak * f)
            e["hrv"] = max(e["hrv"], hrv_drop * f)
            e["temp"] = max(e["temp"], temp * f if k >= -1 else 0)
            e["resp"] = max(e["resp"], resp * f)
            e["steps"] = max(e["steps"], steps * f if k >= 0 else 0)

    nights: list[Night] = []
    benign: list[date] = []
    travel_left = 0
    for i in range(days):
        day = start + timedelta(days=i)
        if rng.random() < 0.10:  # missing night
            continue
        tags: list[str] = []
        bump = 0.0
        weekday = day.weekday()
        bump += 0.8 if weekday in (4, 5) else 0.0  # weekend nights slightly higher

        r = rng.random()
        if travel_left > 0:
            bump += rng.uniform(3, 6); travel_left -= 1; tags.append("travel")
        elif r < 0.04:
            bump += rng.uniform(3, 8); tags.append("alcohol")
        elif r < 0.08:
            bump += rng.uniform(2, 5); tags.append("hard_workout")
        elif r < 0.09:
            travel_left = rng.randint(0, 2); bump += rng.uniform(3, 6); tags.append("travel")
        if sex == "female":
            cyc = (i + cycle_start) % 28
            if 16 <= cyc <= 26:
                bump += rng.uniform(1, 3)
        if tags:
            benign.append(day)
            if rng.random() > tag_prob:  # users often forget to tag
                tags = []

        e = effect[i]
        drift = 0.0 if drift_start is None or i < drift_start else drift_amt * min(1.0, (i - drift_start) / drift_len)
        rhr = base_rhr + bump + drift + e["rhr"] + rng.gauss(0, noise)
        hrv = base_hrv * math.exp(rng.gauss(0, 0.12)) * (1 - e["hrv"]) * (1 - min(bump, 8) * 0.02) if has_hrv else None
        temp = (rng.gauss(0, 0.15) + e["temp"] + (0.25 if "alcohol" in tags else 0)) if has_temp else None
        resp = base_resp + rng.gauss(0, 0.4) + e["resp"]
        steps = int(max(0, base_steps * (1 - e["steps"]) * math.exp(rng.gauss(0, 0.25))))
        nights.append(Night(day=day, rhr=round(rhr, 1), hrv=round(hrv, 1) if hrv else None, hrv_type=hrv_type if has_hrv else None,
                            temp_dev=round(temp, 2) if temp is not None else None, resp=round(resp, 1), steps=steps,
                            sleep_h=round(rng.gauss(7, 0.7) + (1.0 if e["rhr"] > 3 else 0), 1), tags=tags))
    return Person(nights, illnesses, benign)


def cohort(n: int, seed: int, days: int = 180) -> list[Person]:
    rng = random.Random(seed)
    return [make_person(rng, days=days) for _ in range(n)]


def demo_nights(start: date, days: int = 60, seed: int = 7) -> list[Night]:
    """In-app demo: a healthy person whose last 4 nights show an illness pattern starting (onset = yesterday)."""
    p = make_person(random.Random(seed), days=days, start=start, illness_rate=0.0)
    onset = start + timedelta(days=days - 2)
    for n in p.nights:
        k = (n.day - onset).days
        if k >= -2:
            f = {-2: 0.35, -1: 0.7}.get(k, 1.0)
            n.rhr = round(n.rhr + 9 * f, 1)
            if n.hrv:
                n.hrv = round(n.hrv * (1 - 0.25 * f), 1)
            if n.temp_dev is not None and k >= -1:
                n.temp_dev = round(n.temp_dev + 0.8 * f, 2)
            n.resp = round(n.resp + 1.8 * f, 1)
            n.tags = []
    # make sure the last 3 nights exist (no missing data at the end of the demo)
    have = {n.day for n in p.nights}
    for d in range(days - 3, days):
        day = start + timedelta(days=d)
        if day not in have:
            prev = max((n for n in p.nights if n.day < day), key=lambda n: n.day)
            p.nights.append(Night(day=day, rhr=prev.rhr + 1, hrv=prev.hrv, hrv_type=prev.hrv_type, temp_dev=prev.temp_dev,
                                  resp=prev.resp, steps=prev.steps, sleep_h=prev.sleep_h))
    return sorted(p.nights, key=lambda n: n.day)
