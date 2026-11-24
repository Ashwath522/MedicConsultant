"""Lab report → structured results. The user ALWAYS confirms before anything is saved.

Pipeline:
  PDF (digital, most Indian lab reports)  → pdfplumber text → rule parser
  Pasted text                              → rule parser
  Photo / scanned PDF                      → Gemini Vision (if GEMINI_API_KEY) → JSON, else ask for PDF/text
The rule parser is deterministic and unit-tested; the LLM path only extracts, never interprets.
"""
from __future__ import annotations

import base64
import io
import json
import re
from datetime import date, datetime

import httpx

from app.core.config import settings
from app.labs.catalog import TESTS, lookup, normalise

NUM = r"(\d+(?:\.\d+)?)"
RANGE = re.compile(rf"{NUM}\s*(?:-|–|to)\s*{NUM}")
LT = re.compile(rf"(?:<|less than|upto|up to)\s*=?\s*{NUM}", re.I)
GT = re.compile(rf"(?:>|more than|greater than)\s*=?\s*{NUM}", re.I)
UNIT = re.compile(r"^\s*(%|[a-zA-Zµμ/\^\d\.\*]+(?:/[a-zA-Zµμ\^\d\.]+)?)")
DATE = re.compile(r"(?:collected|collection|sample|reported|report|date)[^\n\d]{0,25}(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})", re.I)


def _flag(v: float, lo: float | None, hi: float | None) -> str:
    if lo is not None and v < lo:
        return "low"
    if hi is not None and v > hi:
        return "high"
    return "normal"


def parse_line(line: str) -> dict | None:
    clean = " ".join(line.replace("\t", " ").split())
    # the value is the first standalone number whose preceding text is a known test name
    # (so digits inside names like HbA1c, T3, Vitamin B12, 25-OH Vitamin D are not mistaken for values)
    key = start = None
    for m in re.finditer(r"(?<=\s)\d", clean):
        name = clean[:m.start()].strip(" :-|")
        if (k := lookup(name)):
            key, start = k, m.start()
            break
    if not key:
        return None
    rest = clean[start:]
    vm = re.match(NUM, rest)
    value = float(vm.group(1))
    after = rest[vm.end():]
    um = UNIT.match(after)
    unit = um.group(1).replace("μ", "µ") if um and not re.fullmatch(r"[\d\.]+", um.group(1)) else None
    lo = hi = None
    rm = RANGE.search(after)
    if rm:
        lo, hi = float(rm.group(1)), float(rm.group(2))
    elif (lm := LT.search(after)):
        lo, hi = None, float(lm.group(1))
    elif (gm := GT.search(after)):
        lo, hi = float(gm.group(1)), None
    has_range = lo is not None or hi is not None
    v, unit, lo, hi = normalise(key, value, unit, lo, hi)
    if not has_range and TESTS[key][3]:
        lo, hi = TESTS[key][3]
    return {
        "key": key, "name": TESTS[key][0], "printed_name": name, "value": v, "unit": unit,
        "ref_low": lo, "ref_high": hi, "range_source": "report" if has_range else "typical",
        "flag": _flag(v, lo, hi), "group": TESTS[key][4],
    }


def parse_text(text: str) -> dict:
    results, seen = [], set()
    for line in text.splitlines():
        r = parse_line(line)
        if r and r["key"] not in seen:
            seen.add(r["key"])
            results.append(r)
    taken = None
    if (dm := DATE.search(text)):
        d, mo, y = (int(x) for x in dm.groups())
        y = y + 2000 if y < 100 else y
        try:
            taken = date(y, mo, d).isoformat()  # Indian reports: dd/mm/yyyy
        except ValueError:
            taken = None
    return {"taken_on": taken, "results": results}


def pdf_text(data: bytes) -> str:
    import pdfplumber

    with pdfplumber.open(io.BytesIO(data)) as pdf:
        return "\n".join((p.extract_text() or "") for p in pdf.pages[:20])


def vision_extract(data: bytes, mime: str) -> dict:
    """Photos / scanned PDFs via Gemini (free tier). Use mock or de-identified reports only."""
    if not settings.gemini_api_key:
        raise RuntimeError("Reading photos needs a GEMINI_API_KEY in backend/.env. Upload the PDF or paste the text instead.")
    prompt = (
        "Extract every lab test from this report. Do not interpret. Return JSON: "
        '{"taken_on":"YYYY-MM-DD or null","lines":["<test name> <value> <unit> <ref low>-<ref high>", ...]} '
        "one line per test, exactly as printed."
    )
    body = {"contents": [{"parts": [{"text": prompt}, {"inline_data": {"mime_type": mime, "data": base64.b64encode(data).decode()}}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    r = httpx.post(url, json=body, timeout=60)
    r.raise_for_status()
    out = json.loads(r.json()["candidates"][0]["content"]["parts"][0]["text"])
    parsed = parse_text("\n".join(out.get("lines", [])))
    parsed["taken_on"] = parsed["taken_on"] or out.get("taken_on")
    return parsed


def extract(data: bytes | None, filename: str | None, mime: str | None, text: str | None) -> dict:
    if text:
        out, method = parse_text(text), "text"
    elif data and (mime == "application/pdf" or (filename or "").lower().endswith(".pdf")):
        t = pdf_text(data)
        if len(t.strip()) > 40:
            out, method = parse_text(t), "pdf"
        else:
            out, method = vision_extract(data, "application/pdf"), "vision"
    elif data:
        out, method = vision_extract(data, mime or "image/jpeg"), "vision"
    else:
        raise ValueError("Send a file or text")
    out["method"] = method
    out["taken_on"] = out["taken_on"] or datetime.now().date().isoformat()
    return out
