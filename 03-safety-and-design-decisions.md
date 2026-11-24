# 3. Safety and Design Decisions

## 3.1 Three golden rules

1. **The AI only extracts.** The LLM turns speech and text into structured JSON. It never decides what is safe.
2. **Rules decide.** Warnings and their severity come from a fixed rules engine using verified data.
3. **The user confirms.** No medicine, reminder or instruction goes live until the user approves it.

The app **never diagnoses, never changes treatment, and never says "don't take it".** It flags issues and points to the doctor.

## 3.2 Known risks and how each one is solved

| # | Risk | Severity | Solution |
|---|---|---|---|
| 1 | OCR misreads a medicine name and it gets matched to the wrong drug | High | 3 confidence levels. Low confidence means the user types the name and the reminder stays off. Cross-check against the consultation transcript. Show the image crop as evidence. |
| 2 | The drug interaction database is unreliable | Critical | Limit it to about 100 common generics. Map brand → generic salt, then check DDInter. Have a doctor or pharmacist review it. Anything outside the list shows "Not checked", never ✅. |
| 3 | Dose depends on age, weight and condition | Critical | Don't judge whether a dose is "correct". Only flag (a) consultation ≠ prescription and (b) over the label's maximum daily dose, for verified drugs only. |
| 4 | An LLM decides what's safe | Critical | Keep the pipeline separate: LLM → matcher → rules engine → user confirmation. |
| 5 | Sleep tracking is inaccurate | Medium | First version: morning check-in only. Shortcuts bridge as a stretch. HealthKit later. |
| 6 | Missed-dose alerts alarm the family | Medium | Off by default. The patient chooses which medicines, the delay, and instant vs daily summary. |
| 7 | Consent and privacy around recording | High | Consent screen, the doctor's spoken consent captured, audio deleted after transcription, encryption, delete options, audit logs. |
| 8 | Insights mistake correlation for causation | High | Removed from the first version. If added later, say "observed together", never "caused". |
| 9 | The "no app does this" claim | Medium | Describe the combined workflow instead. |
| 10 | AI output can't be explained | Medium | Every extracted item links to its source (transcript timestamp or image crop). |
| 11 | Health data on free AI tiers | High | Free tiers may use the data for training, so **only use mock or de-identified data** on them. Use the local models (Ollama, faster-whisper) for anything sensitive. |

## 3.3 Why false negatives matter more

Missing a real problem (a false negative) is worse than an unnecessary warning (a false positive). Tune the rules to be **cautious**: when unsure, flag it as "needs confirmation".

## 3.4 Privacy and data protection checklist

- [ ] Explicit consent before recording and processing
- [ ] The doctor's spoken consent captured at the start of the recording
- [ ] Audio deleted after transcription by default
- [ ] Encryption in transit (HTTPS) and at rest
- [ ] Role-based access (family sees only what the patient shares)
- [ ] Delete an episode, delete the account, withdraw consent
- [ ] Audit log of who accessed what
- [ ] Clear disclaimer: *"ConsultKeeper does not give medical advice. Always confirm with your doctor."*
- [ ] Note in the report: designed with the DPDP Act, 2023 in mind. (Mentioning the Act isn't the same as being compliant. Say it's designed following its principles.)
- [ ] Note in the report: a real product would need a review under India's medical-device software rules.

## 3.5 Evidence-backed extraction (example)

```
Extracted instruction: Take one tablet after breakfast.   ✅ User confirmed

Source 1 – Consultation 02:14–02:21
  "Take this tablet after your breakfast every morning."

Source 2 – Prescription page 1 (image crop)
  "Tab. XYZ 1-0-0 A/F"
```
