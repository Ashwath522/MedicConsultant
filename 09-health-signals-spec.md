# 9. Health Signals & Early-Warning Layer: Spec

**Status:** v1 spec + implementation. The validation results in §7 are produced by `backend/app/signals/validate.py`.

**Goal:** spot when the body shows a pattern often seen at the start of an illness (for example, a fever or infection), and **prompt the user to check**. This is never a diagnosis.

> Wording rule: the app says *"a pattern worth checking"*, never *"you have a fever"*.
> It is a wellness and precaution feature, not a medical device.

---

## 1. Evidence base

| Finding | Source |
|---|---|
| Acute infections raise **resting heart rate (RHR)** and change sleep and activity. Fitbit RHR + sleep data tracked influenza-like illness. | Radin J.M. et al., *Lancet Digital Health* 2020;2(2):e85–93 |
| A real-time smartwatch alert system on **overnight RHR** (the "NightSignal" algorithm) flagged ~80% of confirmed COVID-19 cases before or at symptom onset. Alerts are raised when **successive nights** deviate from the person's own baseline. Non-infected participants averaged far fewer alert days (1.15 vs 3.42). | Alavi A. et al. (Snyder lab, Stanford), *Nature Medicine* 2022;28:175–184 |
| Algorithm misses were linked to **medications that change heart rate**; false alerts came from **travel, high altitude, menstrual cycle, alcohol, hard exercise**. | Stanford Medicine news (2020, 2021) on the same work |
| Fever can be detected from **skin temperature + heart rate + sleep** around the fever night. | Kasl P. et al., *Sensors* 2024;24(6):1818 |
| Illness changes are seen as **↑HR, ↑respiratory rate, ↑temperature, ↓HRV, ↓activity**. | Kasl 2024 (review section); npj Digital Medicine 2024;7:136 |
| HRV must be compared to the **person's own baseline**. Apple historically stores **SDNN**; most others (Oura, Garmin, Fitbit, Whoop) give **RMSSD**. The two must never be mixed. HealthKit added an RMSSD type in 2026. | Apple HealthKit docs; Terra API notes; Empirical Health blog |
| A change in HRV only counts if it exceeds the **smallest worthwhile change**, about 0.5 × the baseline SD of ln(HRV). | Plews D.J. et al., *Sports Med* 2013 (HRV-guided training) |

---

## 2. What data we can get

| Signal | Apple Health (HealthKit) | Android Health Connect | Manual entry | Used for |
|---|---|---|---|---|
| Resting HR (bpm) | `restingHeartRate` | `RestingHeartRateRecord` | ✅ | **Primary signal** |
| HRV (ms) | `heartRateVariabilitySDNN`, `…RMSSD` (2026+) | `HeartRateVariabilityRmssdRecord` | – | Supporting |
| Wrist / skin temperature | `appleSleepingWristTemperature` (Series 8+, as deviation) | `SkinTemperatureRecord` (delta) | thermometer reading | Strong supporting |
| Respiratory rate | `respiratoryRate` (during sleep) | `RespiratoryRateRecord` | – | Supporting |
| Steps | `stepCount` | `StepsRecord` | ✅ | Supporting (activity drop) |
| Sleep duration | `sleepAnalysis` | `SleepSessionRecord` | ✅ | Context |
| SpO₂ | `oxygenSaturation` | `OxygenSaturationRecord` | – | Display only (v1) |

**Free path on iPhone:** an Apple Shortcuts automation reads the previous night's values and POSTs them to `/vitals` every morning, with no paid developer account needed. **Fallback:** manual entry. **Demo/testing:** the simulator (§6).

Each night is stored as **one row per user per night** (`nightly_vitals`), along with which HRV type it is and where the data came from.

---

## 3. Algorithm (rules engine, deterministic)

Run each morning for the night that just ended (an *online* algorithm: it only uses past data).

### 3.1 Personal baseline (per signal)
- Window: the previous **28 nights**, **excluding nights already flagged as elevated** (so an illness doesn't contaminate the baseline).
- Needs **≥ 14 nights** of data. Before that, only the absolute safety net (§3.4) is active, and the user sees "Learning your normal: X/14 nights".
- Centre = **median**; spread = **1.4826 × MAD** (robust to outliers), with a floor:
  - RHR spread floor **1.5 bpm**
  - ln(HRV) spread floor **0.05**
  - respiratory rate spread floor **0.5 br/min**
- HRV is log-transformed (ln) before the statistics; baselines are kept **separately per HRV type** (SDNN vs RMSSD).

### 3.2 Per-night signals
| Flag | Rule |
|---|---|
| `rhr_elevated` | z_RHR = (RHR − median) / spread **≥ Z_RHR** and RHR − median **≥ MIN_DELTA** bpm, **and** the change is *sudden*: RHR − median(nights t−7…t−3) **≥ ACUTE_DELTA** (2 bpm), unless the previous night was already elevated (so an ongoing illness keeps its alert) |
| `rhr_drift` | above normal but **not** sudden → slow drift (training change, deconditioning). Shown, never alerts. |
| `hrv_low` | z_lnHRV **≤ −Z_HRV** |
| `temp_up` | temperature deviation **≥ TEMP_UP** °C (devices report deviation from the person's own baseline) |
| `resp_up` | z_resp **≥ 2.0** |
| `steps_drop` | steps **< 60 %** of baseline median |

### 3.3 Daily level
- **Check** (prompt the user to take their temperature / consider an episode) if any of these:
  - `rhr_elevated` on **CONSEC consecutive nights** (the NightSignal principle), or
  - `rhr_elevated` **and** `temp_up` on the same night, or
  - `rhr_elevated` **and** at least 2 of {`hrv_low`, `resp_up`, `steps_drop`}.
- **Watch** if any single signal fires (`rhr_elevated`, `temp_up`, or `hrv_low`+`resp_up`).
- **Normal** otherwise.

### 3.4 Absolute safety net (works from day 1, no baseline needed)
- RHR **≥ 100 bpm** → Check: "resting heart rate is high; talk to a doctor if it persists".
- RHR **≤ 40 bpm** → Check, unless the profile activity is "Very active" (athletes can have low RHR).
- Temperature reading (manual) **≥ 38.0 °C** → Check (fever threshold).

### 3.5 Confounders: the "precaution with context" layer
- **User tags** for a night: `alcohol`, `late_night`, `hard_workout`, `travel`, `stress`, `period`.
  If any tagged night is part of the trigger, the level drops **one step** (Check → Watch) and the message names the tag.
- **Medicines that affect heart rate** (from the user's regular medicines and active episodes): beta-blockers (lower HR, can hide a rise) and salbutamol, thyroxine, decongestants, caffeine-based medicines (raise HR). The message notes it: *"You're taking X, which can change heart rate."*
- **Previous lab reports** (phase 2): e.g. a recent low haemoglobin is shown as possible context for a higher RHR.

### 3.6 Message templates
- **Check:** *"Your resting heart rate has been {Δ} bpm above your normal for {n} nights{, and your temperature is up / HRV is lower}. This pattern is often seen when the body is fighting an infection, but poor sleep, alcohol, stress or hard exercise can also cause it. Check your temperature. If you feel unwell, start an episode or call your doctor."*
- **Watch:** *"One signal is outside your normal range ({signal}). Nothing to do yet; we'll keep an eye on it."*
- During an **active episode**, the same baseline shows recovery: *"Resting HR is back within 2 bpm of your normal."*

### 3.7 Parameters (tuned by the validation loop, §6)
`Z_RHR`, `MIN_DELTA`, `CONSEC`, `Z_HRV`, `TEMP_UP`. The tuned values and results are in §7.

---

## 4. API
| Method | Path | Purpose |
|---|---|---|
| POST | `/vitals` | Upsert one or more nights (Shortcuts, manual, simulator) |
| GET | `/vitals?days=60` | History for charts |
| POST | `/vitals/tags` | Add context tags to a night |
| GET | `/signals/today` | Level + reasons + message + baseline info for today |
| GET | `/signals/history?days=60` | Daily levels (for the chart) |
| POST | `/vitals/demo` | Load 60 simulated nights with one illness (development only) |

---

## 5. Safety & privacy
- Never diagnostic language; always lists other possible causes; always points to a doctor.
- The user can switch alerts off. Tags let them explain known causes.
- No alert is sent to family automatically (that stays opt-in).
- Health data is stored per user with the same access checks and audit log as everything else.

---

## 6. Validation loop (how we make the numbers trustworthy)
1. **Simulator** (`signals/simulate.py`) creates realistic people:
   - baseline RHR ~ N(62, 7) bpm, nightly noise SD 1.5–3 bpm
   - weekly rhythm; ~10% missing nights
   - only 50% have a temperature sensor and 70% have HRV
   - **benign disturbances** that cause false alarms in real life: alcohol (+3–8 bpm, 1 night), hard workout (+2–5), travel (+3–6, 1–3 nights), a menstrual-cycle luteal rise (+1–3 bpm for ~10 days)
   - **illness episodes**: RHR rises over 1–3 days **before** symptom onset, peaks +5–12 bpm, lasts 4–8 days; HRV −15–35%; temperature +0.4–1.2 °C; respiratory rate +1–2.5; steps −30–60%
   - some **mild illnesses** (+2–4 bpm only) that should be hard to catch, to keep the test honest
2. **Metrics**:
   - **Sensitivity**: % of illness episodes with a *Check* on any day from onset −3 to onset +2.
   - **Lead time**: days between the first Check and symptom onset.
   - **False alerts**: separate Check *episodes* outside illness windows, per person-month.
3. **Tuning**: a grid search over the parameters on a **training cohort**, then **evaluate once on a separate held-out cohort** (a different random seed) to avoid overfitting.
4. **Targets** (from the Stanford results): sensitivity ≥ 75% on moderate illnesses, false alerts ≤ 0.5 per person-month.
5. **Next validation step (beyond the prototype)**: re-run on real public wearable datasets from the Stanford COVID-19 wearables studies, and on consented real data.

## 7. Results (validation loop, `python -m app.signals.validate`)

**Loop iteration 1** (60 + 60 people): targets met, but training vs test sensitivity differed widely (80% vs 98%) and the tuned false-alert rate sat right at the limit (0.48), so the cohort was too small to trust.
**Fix:** cohorts grown to 200 + 200 people × 180 days, and the training false-alert budget tightened to 0.4 (vs the 0.5 target) to leave headroom on unseen data.

**Loop iteration 2** (final): 200 training people, 200 held-out people, 6 months each, ~240 illness episodes in each cohort.

| Metric (held-out test cohort) | Result | Target |
|---|---|---|
| Moderate illnesses caught (Check from onset −3 to +2 days) | **91.8 %** (157/171) | ≥ 75 % |
| Mild illnesses caught | 24.3 % | not a target (deliberately hard) |
| False alert episodes | **0.155 per person-month** (≈ 1 every 6½ months) | ≤ 0.5 |
| Median timing | at symptom onset (day 0) | – |
| Devices **with** a temperature sensor | 93.7 % caught, 0.17 false/month | – |
| Devices **without** a temperature sensor | 90.2 % caught, 0.14 false/month | – |
| Training cohort (for comparison) | 89.6 %, 0.16 false/month | train ≈ test means no overfitting |

**Tuned parameters** (now the defaults in `engine.Params`): `Z_RHR = 2.0`, `MIN_DELTA = 2.0 bpm`, `CONSEC = 2 nights`, `TEMP_UP = 0.4 °C`, `Z_HRV = 1.5`.

**Guard rails in CI:** `tests/test_signals.py::test_validation_regression` re-scores a fresh cohort (seed 303) on every test run and fails if sensitivity drops below 75 % or false alerts rise above 0.5/person-month. Other unit tests cover: learning period, 1 vs 2 nights, temperature + RHR, tag downgrade, safety net, medicine notes, baseline not contaminated by illness, SDNN/RMSSD never mixed.

### 7.1 Scenario tests: fully-measured test profile "Arjun"
35 healthy nights with every signal (RHR, HRV-RMSSD, wrist temp, breathing, steps, sleep), then an event. Run through the real API (`tests/test_scenarios.py`); try any of them in the app with `python scripts/seed_test_profile.py --scenario <name>`.

| Scenario | What happens | Expected | Result |
|---|---|---|---|
| normal | ordinary nights | Normal | ✅ Normal |
| one_spike | 1 night RHR +7 | Watch | ✅ Watch |
| infection | RHR +3 → +8 → +11, HRV ↓, temp ↑, breathing ↑, steps ↓ | Check | ✅ Check (by night 2) |
| fever_one_night | RHR +6 and temp +0.9 °C same night | Check | ✅ Check |
| alcohol | 2 raised nights, tagged alcohol / late night | Watch | ✅ Watch, explains the tags |
| alcohol_untagged | same, no tags | Check | ✅ Check |
| tachycardia | RHR 108 | Check (safety) | ✅ Check |
| bradycardia | RHR 38 | Check (safety) | ✅ Check |
| silent_hrv | HRV −45 %, breathing +2.2, RHR normal | Watch | ✅ Watch |
| thermometer | manual 38.6 °C | Check | ✅ Check |
| slow_drift | +5 bpm over 3 weeks | Normal | ❌ **first run gave Check** → fixed → ✅ Normal |

**Loop iteration 3 (what the scenario test found).** The slow-drift false alarm happened because excluding flagged nights from the baseline let the baseline fall behind a gradual rise. **Fix:** the acute-change rule above. Slow drift (25 % of simulated people) was also added to the simulator. Same held-out cohort, before vs after:

| | Moderate caught | False alerts / person-month |
|---|---|---|
| Without acute test | 90.5 % | 0.179 |
| **With acute test (default)** | **89.9 %** | **0.146** (−18 %) |
| "Sensitive" operating point found by re-tuning (z 1.5, Δ 3, temp 0.5) | 97.0 % | 0.331 |

**Decision:** keep the **balanced** defaults. Frequent false alarms teach people to ignore alerts. The sensitive point is documented as a possible user setting.

**Not covered: irregular rhythm (e.g. atrial fibrillation).** This engine works on *nightly averages*; detecting AF needs beat-to-beat data. Apple Watch already does this and writes an `irregularHeartRhythmEvent` to Apple Health. Next step: accept that event via `/vitals` and treat it as a safety-net "talk to a doctor".

**How to read this honestly:** these numbers show the logic behaves as designed on *realistic simulated* patterns (based on the published studies in §1). The Stanford system reported ~80 % on real COVID-19 cases, so our simulated 92 % should be expected to drop on real data. Real-data validation is the next step (§6.5).

## 8. Limitations
- Synthetic validation shows the logic works on realistic patterns. It is **not clinical validation**.
- It can't tell *which* infection it is (the Stanford team noted the same), and can't distinguish illness from other stressors without context tags.
- Device differences (SDNN vs RMSSD, different RHR definitions) are handled by per-type, per-person baselines, but switching devices restarts learning.
