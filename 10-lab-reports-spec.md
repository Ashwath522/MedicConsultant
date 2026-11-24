# 10. Lab Reports: Spec

**Goal:** turn lab reports (PDF / photo / pasted text) into structured results the user confirms, then track every test over time, mark check-ups done, and give context to body-signal alerts.

## Pipeline
| Input | How it's read | Notes |
|---|---|---|
| Digital PDF (most Indian labs) | `pdfplumber` text → rule parser | free, offline, deterministic |
| Pasted text | rule parser | |
| Photo / scanned PDF | Gemini Vision (free tier, if `GEMINI_API_KEY`) → lines → same rule parser | mock / de-identified reports only on free tiers |

**Nothing is saved until the user confirms** (they can edit values or remove lines). Flags are recalculated after edits.

## Rule parser (`app/labs/extract.py`)
- **Test names:** 26 tests with the aliases printed on Indian reports (e.g. *Haemoglobin / Hb*, *TLC*, *FBS*, *SGPT*, *25-OH Vitamin D*). The longest alias wins.
- **Value** = the first *standalone* number after a known name, so digits inside names (HbA1c, T3, B12, 25-OH) are never mistaken for values.
- **Range:** `a - b`, `a to b`, `< b`, `> a`. If the report has no range, a **typical adult range** is used and labelled "typical, not on report".
- **Units normalised:** glucose / cholesterol / TG mmol/L → mg/dL, creatinine µmol/L → mg/dL, Hb g/L → g/dL, Vitamin D nmol/L → ng/mL, HbA1c mmol/mol (IFCC) → % (NGSP = 0.0915 × IFCC + 2.15).
- **Date:** "Collected / Sample / Report … dd/mm/yyyy" (Indian format).
- **Flag:** low / normal / high against the **report's own range**. Never a diagnosis.

## Links into the rest of the app
- **Check-ups:** lab tests map to blueprint check-ups (sugar/HbA1c → *Blood sugar*, lipids → *Cholesterol*). The blueprint shows ✓ Done, the last date, and the next due date.
- **Body-signal context:** when an alert is Watch/Check, recent results that can raise heart rate are added to the message: low haemoglobin, low TSH (overactive thyroid), high CRP (inflammation).

## Tests
`tests/test_labs.py`: names with digits, unit conversions, typical-range fallback, noise lines, date parsing, a real PDF (`tests/fixtures/sample_report.pdf`, a fictional lab) end to end, confirm/save, trends across reports, check-up status, alert context, user isolation, validation.

## Extra trend graphs (spec 09 §9)
Estimated cardio fitness, **VO₂max ≈ 15.3 × HRmax / RHR** with HRmax = 208 − 0.7 × age (Uth 2004; Tanaka 2001); weekday averages; HRV vs resting-HR scatter with Pearson r; a 90-day recovery calendar marking flagged nights; goal lines on the sleep and steps charts.
