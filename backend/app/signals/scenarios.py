"""Named test scenarios for a fully-measured test profile ("Arjun").

Each scenario = 35 healthy nights (all signals present) + a few "event" nights ending today.
Used by tests/test_scenarios.py and scripts/seed_test_profile.py.
"""
from __future__ import annotations

import random
from datetime import date, timedelta

PROFILE = {
    "name": "Arjun Test", "sex": "male", "age": 32, "height_cm": 175, "weight_kg": 72,
    "activity": "moderate", "goals": ["Get fitter"], "onboarded": True,
}

# Arjun's normal: what a healthy 32-year-old with a watch + ring might show
BASE = {"rhr": 58.0, "hrv": 52.0, "temp_dev": 0.0, "resp": 14.2, "steps": 9000, "sleep_h": 7.3}


def baseline_nights(n: int, end: date, seed: int = 11) -> list[dict]:
    rng = random.Random(seed)
    out = []
    for i in range(n):
        d = end - timedelta(days=n - 1 - i)
        out.append({
            "day": d.isoformat(),
            "rhr": round(BASE["rhr"] + rng.gauss(0, 1.6) + (0.8 if d.weekday() in (4, 5) else 0), 1),
            "hrv": round(BASE["hrv"] * (1 + rng.gauss(0, 0.08)), 1), "hrv_type": "rmssd",
            "temp_dev": round(rng.gauss(0, 0.12), 2),
            "resp": round(BASE["resp"] + rng.gauss(0, 0.35), 1),
            "steps": int(BASE["steps"] * (1 + rng.gauss(0, 0.2))),
            "sleep_h": round(BASE["sleep_h"] + rng.gauss(0, 0.5), 1),
            "source": "demo",
        })
    return out


def _ev(day: date, rhr_d=0.0, hrv_f=1.0, temp=0.0, resp_d=0.0, steps_f=1.0, sleep_d=0.0, **extra) -> dict:
    n = {"day": day.isoformat(), "rhr": round(BASE["rhr"] + rhr_d, 1), "hrv": round(BASE["hrv"] * hrv_f, 1), "hrv_type": "rmssd",
         "temp_dev": round(temp, 2), "resp": round(BASE["resp"] + resp_d, 1), "steps": int(BASE["steps"] * steps_f),
         "sleep_h": round(BASE["sleep_h"] + sleep_d, 1), "source": "demo"}
    n.update(extra)
    return n


def scenario(name: str, today: date | None = None) -> tuple[list[dict], dict[str, list[str]], str, str]:
    """Returns (nights, tags_by_day, expected_level_today, description)."""
    t = today or date.today()
    d = lambda k: t - timedelta(days=k)  # noqa: E731
    tags: dict[str, list[str]] = {}

    if name == "normal":
        events, exp, desc = [], "normal", "Ordinary healthy nights. Nothing should fire."
    elif name == "one_spike":
        events, exp, desc = [_ev(d(0), rhr_d=7)], "watch", "One night with resting HR +7 bpm, nothing else."
    elif name == "infection":
        events = [_ev(d(2), rhr_d=3, hrv_f=0.9, resp_d=0.5),
                  _ev(d(1), rhr_d=8, hrv_f=0.78, temp=0.3, resp_d=1.2, steps_f=0.7, sleep_d=0.8),
                  _ev(d(0), rhr_d=11, hrv_f=0.7, temp=0.7, resp_d=1.8, steps_f=0.45, sleep_d=1.2)]
        exp, desc = "check", "Infection-like build-up: RHR +3 → +8 → +11, HRV ↓, temperature ↑, breathing ↑, steps ↓."
    elif name == "fever_one_night":
        events, exp, desc = [_ev(d(0), rhr_d=6, temp=0.9)], "check", "Sudden: RHR +6 and wrist temperature +0.9 °C on the same night."
    elif name == "alcohol":
        events = [_ev(d(1), rhr_d=7, hrv_f=0.8), _ev(d(0), rhr_d=8, hrv_f=0.8)]
        tags = {d(1).isoformat(): ["alcohol"], d(0).isoformat(): ["late_night"]}
        exp, desc = "watch", "Two raised nights, but the user tagged alcohol / late night. Should downgrade to Watch."
    elif name == "alcohol_untagged":
        events = [_ev(d(1), rhr_d=7, hrv_f=0.8), _ev(d(0), rhr_d=8, hrv_f=0.8)]
        exp, desc = "check", "Same two raised nights with no explanation tagged: we can't know why, so Check."
    elif name == "tachycardia":
        events, exp, desc = [_ev(d(0), rhr_d=50)], "check", "Resting HR 108 bpm (safety net, ≥ 100)."
    elif name == "bradycardia":
        events, exp, desc = [_ev(d(0), rhr_d=-20)], "check", "Resting HR 38 bpm (safety net, ≤ 40; profile is not 'very active')."
    elif name == "silent_hrv":
        events, exp, desc = [_ev(d(0), hrv_f=0.55, resp_d=2.2)], "watch", "HRV −45 % and breathing +2.2/min, but resting HR normal."
    elif name == "thermometer":
        events, exp, desc = [_ev(d(0), rhr_d=2, temp_abs=38.6)], "check", "Manual thermometer reading 38.6 °C."
    elif name == "slow_drift":
        events = [_ev(d(k), rhr_d=round((20 - k) * 0.25, 2)) for k in range(20, -1, -1)]
        exp, desc = "normal", "Gradual +5 bpm over 3 weeks (e.g. less training). A slow change, not an acute one."
    else:
        raise KeyError(name)

    nb = 35 if name != "slow_drift" else 20
    base_end = t - timedelta(days=len(events) if name != "slow_drift" else 21)
    return baseline_nights(nb, base_end) + events, tags, exp, desc


NAMES = ["normal", "one_spike", "infection", "fever_one_night", "alcohol", "alcohol_untagged",
         "tachycardia", "bradycardia", "silent_hrv", "thermometer", "slow_drift"]
