"""Canonical lab tests: aliases (as printed on Indian lab reports), canonical unit,
unit conversions, and a fallback "typical adult range" used ONLY when the report has none.
Fallback ranges are general adult references (clearly labelled "typical range" in the UI);
the report's own range always wins.
"""
from __future__ import annotations

# key: (display name, canonical unit, [aliases], typical_range (lo, hi) or None, group, checkup it satisfies)
TESTS: dict[str, tuple[str, str, list[str], tuple[float | None, float | None] | None, str, str | None]] = {
    "hemoglobin": ("Haemoglobin", "g/dL", ["haemoglobin", "hemoglobin", "hb", "hgb"], (12.0, 17.0), "Blood count", None),
    "wbc": ("White blood cells", "10^3/µL", ["total leucocyte count", "total leukocyte count", "tlc", "wbc count", "wbc", "white blood cell count"], (4.0, 11.0), "Blood count", None),
    "platelets": ("Platelets", "10^3/µL", ["platelet count", "platelets", "plt"], (150.0, 410.0), "Blood count", None),
    "rbc": ("Red blood cells", "10^6/µL", ["rbc count", "red blood cell count", "total rbc", "rbc"], (4.0, 6.0), "Blood count", None),
    "esr": ("ESR", "mm/hr", ["esr", "erythrocyte sedimentation rate"], (0.0, 20.0), "Inflammation", None),
    "crp": ("CRP", "mg/L", ["c-reactive protein", "crp", "hs-crp", "hscrp"], (0.0, 5.0), "Inflammation", None),
    "glucose_fasting": ("Fasting glucose", "mg/dL", ["fasting blood sugar", "fasting blood glucose", "glucose fasting", "glucose, fasting", "fasting plasma glucose", "fbs", "fbg"], (70.0, 100.0), "Diabetes", "Blood sugar (diabetes)"),
    "glucose_pp": ("Post-meal glucose", "mg/dL", ["post prandial blood sugar", "postprandial blood sugar", "glucose pp", "glucose, post prandial", "ppbs"], (70.0, 140.0), "Diabetes", "Blood sugar (diabetes)"),
    "hba1c": ("HbA1c", "%", ["hba1c", "glycated haemoglobin", "glycated hemoglobin", "glycosylated haemoglobin", "a1c"], (4.0, 5.7), "Diabetes", "Blood sugar (diabetes)"),
    "cholesterol_total": ("Total cholesterol", "mg/dL", ["total cholesterol", "cholesterol, total", "cholesterol total", "serum cholesterol"], (0.0, 200.0), "Heart (lipids)", "Cholesterol (lipid profile)"),
    "ldl": ("LDL cholesterol", "mg/dL", ["ldl cholesterol", "ldl-c", "ldl", "low density lipoprotein"], (0.0, 100.0), "Heart (lipids)", "Cholesterol (lipid profile)"),
    "hdl": ("HDL cholesterol", "mg/dL", ["hdl cholesterol", "hdl-c", "hdl", "high density lipoprotein"], (40.0, None), "Heart (lipids)", "Cholesterol (lipid profile)"),
    "triglycerides": ("Triglycerides", "mg/dL", ["triglycerides", "triglyceride", "tg"], (0.0, 150.0), "Heart (lipids)", "Cholesterol (lipid profile)"),
    "tsh": ("TSH", "µIU/mL", ["tsh", "thyroid stimulating hormone", "tsh ultrasensitive", "tsh (ultrasensitive)"], (0.4, 4.5), "Thyroid", None),
    "t3": ("T3", "ng/dL", ["total t3", "t3, total", "t3"], (80.0, 200.0), "Thyroid", None),
    "t4": ("T4", "µg/dL", ["total t4", "t4, total", "t4"], (5.0, 12.0), "Thyroid", None),
    "creatinine": ("Creatinine", "mg/dL", ["serum creatinine", "creatinine"], (0.6, 1.3), "Kidney", None),
    "urea": ("Urea", "mg/dL", ["blood urea", "urea", "serum urea"], (15.0, 45.0), "Kidney", None),
    "uric_acid": ("Uric acid", "mg/dL", ["uric acid", "serum uric acid"], (3.5, 7.2), "Kidney", None),
    "alt": ("ALT (SGPT)", "U/L", ["sgpt", "alt", "alanine aminotransferase", "alt (sgpt)"], (0.0, 45.0), "Liver", None),
    "ast": ("AST (SGOT)", "U/L", ["sgot", "ast", "aspartate aminotransferase", "ast (sgot)"], (0.0, 40.0), "Liver", None),
    "vitamin_d": ("Vitamin D", "ng/mL", ["25-oh vitamin d", "25 oh vitamin d", "vitamin d, 25-hydroxy", "vitamin d total", "vitamin d", "25(oh) vitamin d"], (30.0, 100.0), "Vitamins", None),
    "vitamin_b12": ("Vitamin B12", "pg/mL", ["vitamin b12", "vitamin b-12", "cyanocobalamin", "b12"], (200.0, 900.0), "Vitamins", None),
    "ferritin": ("Ferritin", "ng/mL", ["serum ferritin", "ferritin"], (20.0, 300.0), "Vitamins", None),
    "sodium": ("Sodium", "mmol/L", ["sodium", "na+", "serum sodium"], (135.0, 145.0), "Electrolytes", None),
    "potassium": ("Potassium", "mmol/L", ["potassium", "k+", "serum potassium"], (3.5, 5.1), "Electrolytes", None),
}

# unit normalisation → canonical unit (multiply factor)
CONVERT: dict[tuple[str, str], float] = {
    ("glucose_fasting", "mmol/l"): 18.0, ("glucose_pp", "mmol/l"): 18.0,
    ("cholesterol_total", "mmol/l"): 38.67, ("ldl", "mmol/l"): 38.67, ("hdl", "mmol/l"): 38.67,
    ("triglycerides", "mmol/l"): 88.57,
    ("creatinine", "µmol/l"): 1 / 88.4, ("creatinine", "umol/l"): 1 / 88.4,
    ("hemoglobin", "g/l"): 0.1,
    ("vitamin_d", "nmol/l"): 1 / 2.496,
}


def lookup(name: str) -> str | None:
    """Return the canonical key for a printed test name (longest alias wins)."""
    n = " ".join(name.lower().replace(":", " ").split())
    best, best_len = None, 0
    for key, (_, _, aliases, _, _, _) in TESTS.items():
        for a in aliases:
            if (n == a or n.startswith(a + " ") or n.startswith(a + "(")) and len(a) > best_len:
                best, best_len = key, len(a)
    return best


def normalise(key: str, value: float, unit: str | None, lo: float | None, hi: float | None):
    """Convert value and range into the canonical unit. HbA1c in mmol/mol (IFCC) → %."""
    u = (unit or "").lower().replace(" ", "")
    if key == "hba1c" and "mmol/mol" in u:
        f = lambda v: None if v is None else round(0.0915 * v + 2.15, 2)  # noqa: E731
        return f(value), "%", f(lo), f(hi)
    factor = CONVERT.get((key, u))
    if factor:
        g = lambda v: None if v is None else round(v * factor, 2)  # noqa: E731
        return g(value), TESTS[key][1], g(lo), g(hi)
    return value, (unit or TESTS[key][1]), lo, hi
