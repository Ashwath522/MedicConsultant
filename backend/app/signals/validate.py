"""Validation loop for the early-warning engine (spec §6).

Run:  python -m app.signals.validate            (tune on train cohort, report on held-out test)
      python -m app.signals.validate --quick    (fewer people, for CI)
"""
from __future__ import annotations

import argparse
import itertools
from dataclasses import asdict, replace
from datetime import timedelta
from statistics import median

from app.signals.engine import Params, evaluate
from app.signals.simulate import Person, cohort

TARGET_SENS = 0.75
TARGET_FA = 0.5  # false alert episodes per person-month
TRAIN_FA_BUDGET = 0.4  # stricter during tuning, leaves headroom on unseen data


def score(people: list[Person], p: Params) -> dict:
    detected = {"moderate": 0, "mild": 0}
    total = {"moderate": 0, "mild": 0}
    leads: list[int] = []
    false_episodes = 0
    months = 0.0
    for person in people:
        res = evaluate(person.nights, p)
        check_days = [r.day for r in res if r.level == "check"]
        months += len(person.nights) / 30.0
        ill_windows = []
        for ill in person.illnesses:
            total[ill.severity] += 1
            lo, hi = ill.onset - timedelta(days=3), ill.onset + timedelta(days=2)
            hits = [d for d in check_days if lo <= d <= hi]
            if hits:
                detected[ill.severity] += 1
                leads.append((ill.onset - min(hits)).days)
            ill_windows.append((ill.onset - timedelta(days=4), ill.onset + timedelta(days=12)))
        # false alert episodes = runs of check days outside any illness window
        outside = sorted(d for d in check_days if not any(a <= d <= b for a, b in ill_windows))
        prev = None
        for d in outside:
            if prev is None or (d - prev).days > 2:
                false_episodes += 1
            prev = d
    sens_mod = detected["moderate"] / total["moderate"] if total["moderate"] else 0
    sens_mild = detected["mild"] / total["mild"] if total["mild"] else 0
    return {
        "sens_moderate": round(sens_mod, 3),
        "sens_mild": round(sens_mild, 3),
        "episodes": total,
        "median_lead_days": median(leads) if leads else None,
        "false_alerts_per_person_month": round(false_episodes / months, 3) if months else None,
    }


GRID = {
    "z_rhr": [1.5, 2.0, 2.5],
    "min_delta": [2.0, 3.0, 4.0],
    "consec": [1, 2],
    "temp_up": [0.4, 0.5, 0.6],
}


def tune(train: list[Person]) -> tuple[Params, dict]:
    best, best_m, best_key = None, None, None
    for values in itertools.product(*GRID.values()):
        p = replace(Params(), **dict(zip(GRID.keys(), values)))
        m = score(train, p)
        fa = m["false_alerts_per_person_month"]
        ok = fa <= TRAIN_FA_BUDGET
        # maximise moderate sensitivity subject to the false-alert budget; tie-break on fewer false alerts
        key = (ok, m["sens_moderate"] if ok else -fa, -fa)
        if best_key is None or key > best_key:
            best, best_m, best_key = p, m, key
    return best, best_m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true")
    a = ap.parse_args()
    n_train, n_test = (60, 60) if a.quick else (200, 200)

    train = cohort(n_train, seed=101)
    test = cohort(n_test, seed=202)

    default = Params()
    print("Default params (spec):", score(test, default))
    best, train_m = tune(train)
    print("Tuned params:", {k: getattr(best, k) for k in GRID})
    print("  train:", train_m)
    test_m = score(test, best)
    print("  held-out test:", test_m)
    with_t = [x for x in test if any(n.temp_dev is not None for n in x.nights)]
    no_t = [x for x in test if all(n.temp_dev is None for n in x.nights)]
    print("  test, devices WITH temperature:", score(with_t, best))
    print("  test, devices WITHOUT temperature:", score(no_t, best))
    passed = test_m["sens_moderate"] >= TARGET_SENS and test_m["false_alerts_per_person_month"] <= TARGET_FA
    print("TARGETS MET" if passed else "TARGETS NOT MET")
    return best, test_m


if __name__ == "__main__":
    main()
