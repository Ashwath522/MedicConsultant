# ConsultKeeper

**An AI health companion that takes a patient from the doctor's consultation through to recovery.**

ConsultKeeper records a doctor's consultation and summarises it. It reads the handwritten prescription, checks it against what the doctor said, and turns the result into a patient-confirmed recovery plan. That plan covers reminders, check-ins and one-tap help.

## Documents in this folder

| # | File | What it covers |
|---|---|---|
| 1 | [01-project-overview.md](01-project-overview.md) | What we're building, why, the gap, objectives, viva pitch |
| 2 | [02-features-and-workflow.md](02-features-and-workflow.md) | Every feature and the complete user flow |
| 3 | [03-safety-and-design-decisions.md](03-safety-and-design-decisions.md) | Known risks and how each one is solved |
| 4 | [04-architecture-and-tech-stack.md](04-architecture-and-tech-stack.md) | System design, free tech stack, folder structure |
| 5 | [05-database-schema.md](05-database-schema.md) | Tables and fields |
| 6 | [06-build-plan-step-by-step.md](06-build-plan-step-by-step.md) | The 12-week build, step by step, with checklists |
| 7 | [07-ios-and-free-setup.md](07-ios-and-free-setup.md) | iOS-first plan at ₹0, HealthKit workarounds, Mac setup |
| 8 | [08-testing-and-evaluation.md](08-testing-and-evaluation.md) | Dataset, metrics, how to prove it works |
| 9 | [09-health-signals-spec.md](09-health-signals-spec.md) | Early-warning layer: data, formulas, sources, validation results |

## Key decisions at a glance

- **Platform:** web app first (React + Ionic), installable on iPhone via Safari, then wrapped as a native iOS app with Capacitor.
- **Backend:** FastAPI (Python) + PostgreSQL/Supabase.
- **AI:** faster-whisper (speech), Gemini free tier or Ollama (extraction), Gemini Vision or PaddleOCR (prescriptions).
- **Cost:** ₹0, using only free and open-source tools.
- **Safety rule:** the AI only extracts information. Fixed rules raise the warnings. The user confirms everything. The app never diagnoses.
# MedicConsultant
