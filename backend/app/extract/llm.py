"""Single entry point for all LLM calls, so the provider can be swapped
(Gemini free tier now; Ollama later) without touching the rest of the app.

Rule: the LLM only *extracts*. It never decides what is medically safe.
"""
import json
from datetime import date

import httpx

from app.core.config import settings

CATEGORIES = [
    "Fever", "Cold & Cough", "Infection", "Stomach", "Injury", "Surgery",
    "Skin", "Dental", "Eye", "Heart & BP", "Diabetes", "Women's Health",
    "Mental Health", "Checkup", "Other",
]

# Offline fallback so the app works with no API key.
_KEYWORDS = {
    "Fever": ["fever", "temperature", "bukhar", "jwara", "malaria", "dengue", "typhoid"],
    "Cold & Cough": ["cough", "cold", "sore throat", "sneez", "runny nose"],
    "Stomach": ["stomach", "vomit", "diarrh", "loose motion", "acidity", "gas", "nausea"],
    "Injury": ["fell", "fall", "accident", "fracture", "sprain", "cut", "wound", "injur"],
    "Surgery": ["surgery", "operation", "post-op", "stitches"],
    "Skin": ["rash", "itch", "skin", "acne", "allergy on skin"],
    "Dental": ["tooth", "teeth", "gum", "dental"],
    "Eye": ["eye", "vision", "conjunctivitis"],
    "Heart & BP": ["bp", "blood pressure", "chest pain", "heart", "palpitation"],
    "Diabetes": ["sugar", "diabet", "glucose"],
    "Infection": ["infection", "uti", "urine burning", "pus"],
    "Mental Health": ["anxiety", "stress", "depress", "sleep problem", "insomnia"],
    "Checkup": ["checkup", "check-up", "routine", "annual"],
}


def _rules_category(text: str) -> str:
    t = text.lower()
    for cat, words in _KEYWORDS.items():
        if any(w in t for w in words):
            return cat
    return "Other"


def _title(category: str, d: date) -> str:
    return f"{category} – {d.strftime('%d %b %Y')}"


async def _gemini_json(prompt: str) -> dict:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0},
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(url, json=body)
        r.raise_for_status()
        text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


async def suggest_category(description: str, today: date | None = None) -> dict:
    today = today or date.today()
    if settings.gemini_api_key:
        prompt = (
            "Classify this patient's health issue into exactly one category from this list: "
            f"{CATEGORIES}. Do not diagnose. Reply as JSON: {{\"category\": \"...\"}}.\n"
            f"Issue: {description}"
        )
        try:
            cat = (await _gemini_json(prompt)).get("category", "")
            if cat in CATEGORIES:
                return {"category": cat, "title": _title(cat, today), "source": "llm"}
        except Exception:
            pass  # fall back to rules
    cat = _rules_category(description)
    return {"category": cat, "title": _title(cat, today), "source": "rules"}
