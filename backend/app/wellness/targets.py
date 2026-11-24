"""Age- and sex-specific health targets ("health blueprint").

Pure functions, no I/O, fully unit-tested. These are general wellness guides from
published guidelines, NOT medical advice; the app always says "discuss with your doctor".

Sources:
- BMI cut-offs for Asian Indians: Misra A. et al., Consensus Statement for Diagnosis of
  Obesity... in Asian Indians, JAPI 2009 (healthy 18.5–22.9, overweight 23–24.9, obese ≥25).
- BMR: Mifflin–St Jeor equation (Am J Clin Nutr, 1990).
- Sleep: US National Sleep Foundation recommended durations (Hirshkowitz et al., Sleep Health 2015).
- Steps: Paluch A.E. et al., Lancet Public Health 2022 — mortality benefit levels off around
  6,000–8,000 steps/day for adults 60+, 8,000–10,000 for younger adults.
- Activity: WHO Guidelines on physical activity (2020) — 150–300 min/week moderate for adults.
- Check-ups: India NPCDCS population screening for 30+ (BP, diabetes, common cancers) and
  widely used age-based screening recommendations.
"""
from dataclasses import dataclass

ACTIVITY_FACTOR = {"sedentary": 1.2, "light": 1.375, "moderate": 1.55, "active": 1.725}


@dataclass
class Body:
    sex: str  # male | female | other
    age: int
    height_cm: float
    weight_kg: float
    activity: str = "light"


def bmi(b: Body) -> dict:
    v = b.weight_kg / (b.height_cm / 100) ** 2
    if v < 18.5:
        cat = "Underweight"
    elif v < 23:
        cat = "Healthy"
    elif v < 25:
        cat = "Overweight"
    else:
        cat = "Obese"
    # healthy weight range for this height (18.5–22.9)
    h2 = (b.height_cm / 100) ** 2
    return {
        "value": round(v, 1),
        "category": cat,
        "healthy_range_kg": [round(18.5 * h2, 1), round(22.9 * h2, 1)],
        "scale": "Indian (Asian) cut-offs",
    }


def bmr(b: Body) -> int:
    base = 10 * b.weight_kg + 6.25 * b.height_cm - 5 * b.age
    offset = {"male": 5, "female": -161}.get(b.sex, -78)  # 'other' → midpoint
    return round(base + offset)


def calories(b: Body) -> int:
    return round(bmr(b) * ACTIVITY_FACTOR.get(b.activity, 1.375) / 10) * 10


def water_ml(b: Body) -> int:
    # ~35 ml per kg, more if very active; clamp to a sensible range; round to 250 ml glasses
    ml = b.weight_kg * 35 + (500 if b.activity == "active" else 0)
    ml = max(1500, min(4000, ml))
    return int(round(ml / 250) * 250)


def sleep_hours(age: int) -> list[float]:
    if age < 26:
        return [7, 9]
    if age < 65:
        return [7, 9]
    return [7, 8]


def steps(age: int, activity: str) -> int:
    base = 7000 if age >= 60 else 8000
    return base + (1000 if activity in ("moderate", "active") else 0)


def checkups(sex: str, age: int) -> list[dict]:
    """General, age/sex-based check-ups to discuss with a doctor."""
    items = [{"name": "Blood pressure", "how_often": "Every year", "why": "High BP often has no symptoms."}]
    if age >= 30:
        items.append({"name": "Blood sugar (diabetes)", "how_often": "Every 1–3 years", "why": "Screened from 30 in India's national programme."})
        items.append({"name": "Oral check", "how_often": "Every year", "why": "Early detection of oral disease."})
    if age >= 35:
        items.append({"name": "Cholesterol (lipid profile)", "how_often": "Every 3–5 years", "why": "Heart-disease risk rises with age."})
    if age >= 40:
        items.append({"name": "Eye check (incl. glaucoma)", "how_often": "Every 2 years", "why": "Vision and eye-pressure changes after 40."})
    if sex == "female":
        if age >= 25:
            items.append({"name": "Cervical screening", "how_often": "Every 3–5 years", "why": "Ask your doctor which test suits you."})
        if age >= 40:
            items.append({"name": "Breast screening", "how_often": "Discuss with doctor", "why": "Timing depends on your risk."})
        if age >= 60:
            items.append({"name": "Bone density", "how_often": "Discuss with doctor", "why": "Osteoporosis risk after menopause."})
    if sex == "male" and age >= 50:
        items.append({"name": "Prostate check", "how_often": "Discuss with doctor", "why": "Decide together based on your risk."})
    if age >= 50:
        items.append({"name": "Bowel (colon) screening", "how_often": "Discuss with doctor", "why": "Recommended from around 45–50."})
    if age >= 65:
        items.append({"name": "Hearing & fall-risk check", "how_often": "Every year", "why": "Keeps you safe and independent."})
    return items


def life_stage(age: int) -> str:
    if age < 30:
        return "Young adult"
    if age < 45:
        return "Adult"
    if age < 60:
        return "Midlife"
    return "Senior"


def blueprint(b: Body) -> dict:
    return {
        "life_stage": life_stage(b.age),
        "bmi": bmi(b),
        "bmr": bmr(b),
        "calories": calories(b),
        "water_ml": water_ml(b),
        "sleep_hours": sleep_hours(b.age),
        "steps": steps(b.age, b.activity),
        "active_minutes_week": 150,
        "checkups": checkups(b.sex, b.age),
        "disclaimer": "General guidance from published guidelines, not medical advice. Discuss with your doctor.",
    }
