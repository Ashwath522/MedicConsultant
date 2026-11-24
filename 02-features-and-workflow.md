# 2. Features and Complete Workflow

**The flow in one line:**
Profile → Episode → Record → Summary → Confirm reminders → Scan prescription → Verify → Care plan → Daily loop → Reports → Help → Recovery → History

---

## Step 0: First-time setup (once)

1. **Sign up:** name, age, preferred language.
2. **Health profile:** allergies, chronic conditions (BP, diabetes), regular medicines. These feed the safety checks.
3. **Daily routine:** wake-up, breakfast, lunch, dinner and bed times. Reminders are fitted around these, and bed and wake times become the sleep goal.
4. **Support contacts:**
   - Family: name, phone, relation
   - Doctor: name, phone, clinic
5. **Permissions:** microphone, camera, notifications.

## Step 1: Create an episode

1. The user taps **New Issue** and describes it by voice or text: *"Fever and body pain since yesterday."*
2. The AI suggests a **category** (Fever, Infection, Injury, Surgery, and so on) and a **title**: *"Fever – 24 Nov 2026"*.
3. The user confirms or edits it, and the episode is created with a **date, issue, category and status (Active)**.

## Step 2: Record the consultation

1. A consent screen appears: *"Please ask your doctor's permission to record."*
2. When recording starts, the app prompts the user to capture the doctor's spoken consent first.
3. The screen stays on during recording (Wake Lock).
4. The audio is uploaded and turned into text with timestamps.
5. The AI writes:
   - **Summary:** diagnosis, what the doctor said, do's and don'ts, warning signs
   - **Medicines mentioned:** name, dose, timing, duration
   - **Time-based instructions:** follow-up, tests, checks
6. The summary is shown in simple language, with **voice playback** in the user's language.
7. Every item has a **source link**: tap it to hear that part of the recording (for example 02:14–02:21).
8. By default, **the audio is deleted** after transcription.

## Step 3: Confirm reminders from the consultation

The AI pulls out anything time-based the doctor said:

| Doctor said | Becomes |
|---|---|
| "Come back after 5 days" | Follow-up visit, 29 Nov |
| "Do a blood test next week" | Test reminder, 1 Dec |
| "Take this for 3 days then stop" | Medicine end date |
| "Check BP every morning" | Daily 8 AM check |
| "If fever doesn't go down in 2 days, come back" | Conditional check on 26 Nov. If not better, offer a doctor call. |

A confirmation screen lists them. The user can **tick, edit or remove** each one, then taps **Confirm**. Only confirmed items become reminders.

## Step 4: Scan the prescription

1. The user takes a photo, or uploads one from the gallery.
2. OCR extracts the text and the image regions.
3. Each medicine name is fuzzy-matched against the Indian medicine database (brand → generic).
4. Confidence levels:

| Confidence | What happens |
|---|---|
| High | Suggested name shown. The user confirms. |
| Medium | The user picks from the top 3 matches. |
| Low or none | The user types the name. **The reminder stays off until confirmed.** |

5. A match gets a confidence boost if the same medicine was mentioned in the consultation.
6. Each medicine shows a crop of the prescription image as its source.

## Step 5: Verify (the core feature)

A fixed **rules engine** (not the LLM) compares the sources:

| Check | Example | Severity |
|---|---|---|
| Allergy conflict | "You're allergic to penicillin. Amoxicillin is a penicillin." | 🔴 High |
| Drug interaction (verified list only) | "Possible interaction with your BP medicine" | 🔴 High |
| Over the maximum daily dose (verified list only) | "Exceeds the label's maximum daily dose" | 🔴 High |
| Consultation ≠ prescription | "Doctor said 5 days, prescription says 10" | 🟠 Needs confirmation |
| Same drug from two doctors | "Paracetamol appears in two active episodes" | 🟠 Needs confirmation |
| Medicine not in the verified list | "Interactions not checked" | ⚪ Information |
| Follow-up extracted | "Follow-up on 29 Nov" | ⚪ Information |

The app **always** says "Please confirm with your doctor", with a one-tap doctor call. It **never** says "don't take it".

## Step 6: Build the care plan

The routine, the confirmed medicines and the confirmed reminders are combined into a schedule:

- 8:30 AM: Dolo 650, after breakfast
- 1:30 PM: antibiotic, after lunch
- Every 2 hours: drink water
- 9:30 PM: wind-down reminder (night medicine, get ready to sleep)
- 10:00 PM: "How are you feeling?" check-in

The user approves the plan and the reminders go live.

## Step 7: Daily loop

1. **Medicine notification:** Taken / Snooze / Skip.
2. **Caregiver alert (opt-in):** off by default. The patient picks which medicines it covers and the delay (for example 2 hours), and chooses instant alerts or a daily summary.
3. **Morning check-in:** symptoms (better / same / worse) and sleep (good / okay / poor, plus hours).
4. **Conditional reminders:** "Is the fever down?" If not, a one-tap doctor call.
5. **Sleep note:** 3 or more poor nights in a row adds a note to the next follow-up: *"Mention your poor sleep to the doctor."*
6. **Activity:** only the doctor's instructions, such as "walk 10 minutes after lunch."

## Step 8: Reports (stretch goal)

1. The user scans a blood test or other report into the episode.
2. The app extracts the values and shows them **next to the report's own reference range**.
3. It explains the terms simply: *"Haemoglobin is below the range on your report. Discuss this with your doctor."*
4. It never says "healthy" or "unhealthy".

## Step 9: Help button (on every screen)

- 👨‍👩‍👧 **Family:** single tap calls them directly (`tel:`).
- 🩺 **Doctor:** single tap calls them directly.
- Optionally shares the episode summary over WhatsApp (a click-to-send link).

## Step 10: Recovery timeline

The main screen of an episode shows the illness day by day:

- Day 1: consultation and prescription
- Day 2: doses taken, symptoms, sleep
- Day 3: follow-up test
- Day 5: recovery status, follow-up visit

Plus: adherence % ("92% of doses taken"), symptom trend, sleep hours, and upcoming follow-ups.

## Step 11: Close the episode

When the medicine course and follow-up are done, the app asks: *"Feeling recovered? Close this episode?"* The episode then moves to **Health History**: a timeline of past illnesses, with summaries, prescriptions and reports.

---

## Feature priority

| Priority | Features |
|---|---|
| **First version (must work)** | Profile and routine, episodes, recording and summary, reminders from the consultation, prescription OCR and matching, verification, care plan and reminders, symptom and sleep check-in, one-tap help, recovery timeline |
| **Stretch** | Report explanation, opt-in caregiver alerts, Apple Shortcuts health bridge |
| **Future** | Native HealthKit, doctor portal, ABHA, Android, sleep and recovery insights |

## App screens (bottom tab bar)

**Home · Episodes · ➕ Add · Timeline · Profile**, plus a floating **Help** button on every screen.
