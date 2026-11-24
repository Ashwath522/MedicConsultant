# 6. Build Plan: Step by Step (12 Weeks)

Order: **web app first** (tested in Safari at iPhone size) → **iOS app** (Capacitor) → **installable web app** for sharing.

---

## Week 1: Setup and data collection

- [ ] Install the tools (see `07-ios-and-free-setup.md`)
- [ ] Create a GitHub repo with the `frontend/`, `backend/`, `data/` and `docs/` folders
- [ ] Create the Ionic React app (`ionic start frontend tabs --type=react`) and set `mode: 'ios'`
- [ ] Create the FastAPI skeleton with a `/health` endpoint
- [ ] Set up Supabase (or local PostgreSQL) and create the tables from `05-database-schema.md`
- [ ] Get a Gemini API key (free) and/or install Ollama and pull a model
- [ ] Install faster-whisper and test it on one audio file
- [ ] Download the Kaggle Indian medicine dataset and DDInter
- [ ] **Start data collection:** the first 10 role-played consultations (see `08-testing-and-evaluation.md`)

**Done when:** the frontend and backend both run, the database is ready, and Whisper transcribes a test file.

## Week 2: Profile, contacts, episodes

- [ ] Login and sign-up (Supabase Auth)
- [ ] Profile screen: allergies, conditions, regular medicines
- [ ] Routine screen: meal, wake and bed times
- [ ] Contacts screen: family and doctor
- [ ] Bottom tabs: Home · Episodes · ➕ · Timeline · Profile
- [ ] Floating Help button with `tel:` calls
- [ ] New Episode: description → LLM suggests category and title → user confirms
- [ ] Episode list and detail page

**Done when:** a user can sign up, set their routine, add contacts, create episodes and make a one-tap call.

## Week 3: Recording and transcription

- [ ] Consent screen + capture of the doctor's spoken consent
- [ ] Recorder using the browser's MediaRecorder API, with Wake Lock to keep the screen on
- [ ] Upload the audio to `/episodes/{id}/consultation`
- [ ] faster-whisper → transcript **with timestamps**
- [ ] Delete the audio after transcription (default)
- [ ] Test with Kannada/Hindi/English mixed recordings; compare Whisper with IndicWhisper

**Done when:** recording produces a transcript with timestamps saved to the episode.

## Week 4: AI summary and reminder extraction

- [ ] Design the JSON schema: diagnosis, medicines, instructions, reminders, warning signs, each with `source_ref`
- [ ] Write and refine the extraction prompt (structured JSON output)
- [ ] Turn relative dates into actual dates ("after 5 days" → a date)
- [ ] Summary screen in simple language + voice playback (browser text-to-speech)
- [ ] Evidence links: tap an item to see or hear its transcript segment
- [ ] Confirm Reminders screen: tick, edit, remove, Confirm

**Done when:** consultation → summary + confirmed reminders, each linked to its source.

## Week 5: Prescription OCR

- [ ] Upload or capture a prescription image
- [ ] OCR wrapper with two interchangeable options: Gemini Vision and PaddleOCR
- [ ] Extract the medicine lines: name, strength, dosage pattern (for example `1-0-1`), duration
- [ ] Store the bounding boxes for the image-crop evidence
- [ ] Load the medicine dataset into `medicines_reference`

**Done when:** a prescription photo produces a list of raw medicine lines with image crops.

## Week 6: Medicine matching with confidence levels

- [ ] RapidFuzz matching of each name against brand and generic names
- [ ] Set the thresholds for high / medium / low confidence (tune them on your test images)
- [ ] Boost the score when the medicine also appears in the consultation transcript
- [ ] Confirm Medicines screen:
  - High → confirm
  - Medium → pick from the top 3
  - Low → type it manually; the reminder stays off
- [ ] Build the **verified top-100 generics list**, with maximum daily doses, reviewed by a doctor or pharmacist if possible

**Done when:** a confirmed medicine list is saved, each item with its confidence level and source.

## Week 7: Rules engine (verification)

- [ ] Allergy rule (profile allergies vs generic and drug class)
- [ ] Interaction rule (DDInter subset, verified list only)
- [ ] Maximum daily dose rule (verified list only)
- [ ] Mismatch rule (consultation vs prescription: dose, timing, duration)
- [ ] Duplicate rule (same generic across active episodes)
- [ ] "Not checked" info for unverified medicines
- [ ] Verify screen with severity cards (🔴 / 🟠 / ⚪), a "Confirm with doctor" message, and a doctor call button
- [ ] **Unit tests for every rule**

**Done when:** the planted mismatch cases are caught and every rule has tests.

## Week 8: Care plan and reminders (web)

- [ ] Care-plan generator: confirmed medicines + routine + confirmed reminders → schedule
- [ ] Care Plan screen: review and approve
- [ ] Reminder states: taken / snooze / skip
- [ ] Web Push setup with a service worker (used by the installable web app)
- [ ] Conditional reminders: "Is the fever down?" If not, offer a doctor call.

**Done when:** an approved plan creates reminders that can be marked taken, snoozed or skipped.

## Week 9: Daily loop, timeline, history

- [ ] Morning check-in: symptoms + sleep (quality and hours)
- [ ] Wind-down reminder before bed
- [ ] 3 or more poor nights in a row → note added to the follow-up
- [ ] Opt-in caregiver alerts (WhatsApp link / push)
- [ ] Recovery timeline (day by day), adherence %, symptom trend, sleep chart
- [ ] Close the episode → Health History

**Done when:** the whole flow works in the browser from start to finish.

## Week 10: iOS app + installable web app

- [ ] `npm i @capacitor/core @capacitor/ios` → `npx cap add ios`
- [ ] Add the `Info.plist` usage descriptions (microphone, camera, notifications)
- [ ] Swap web reminders for **Capacitor Local Notifications** in the native build
- [ ] Handle iOS's **64-notification limit**: schedule the next few days and top up whenever the app opens
- [ ] Run it on the iOS Simulator and on your own iPhone (free Apple ID)
- [ ] Installable web app: manifest, icons, HTTPS hosting; test Add to Home Screen + Web Push on iPhone
- [ ] (Stretch) Apple Shortcuts bridge for steps and sleep

**Done when:** the app runs natively on your iPhone and installs from Safari for others.

## Week 11: Testing and evaluation

- [ ] Run every evaluation from `08-testing-and-evaluation.md`
- [ ] Compare local and cloud options (PaddleOCR vs Gemini Vision, Whisper vs IndicWhisper)
- [ ] Security checks: authentication on every endpoint, a user can't read another user's data, HTTPS
- [ ] A small user trial (5–10 people) for task completion and feedback

**Done when:** you have the results tables for the report.

## Week 12: Stretch, polish, report, demo

- [ ] (Stretch) Report explanation: values next to the report's reference range
- [ ] UI polish, empty states, loading states, error messages
- [ ] Write the final report (use docs 01–08 as its base)
- [ ] **Reinstall a fresh iOS build** (the free Apple ID build expires after 7 days)
- [ ] Rehearse the demo (see below)

---

## Team split (for 4 people)

| Person | Owns |
|---|---|
| 1 | Frontend: all Ionic screens, Capacitor, notifications |
| 2 | Backend: FastAPI, database, auth, rules engine, care-plan generator |
| 3 | AI: Whisper, LLM extraction prompts, summaries, reminder extraction |
| 4 | OCR, medicine database, matching, the verified list, data collection and evaluation |

## Viva demo script (about 5 minutes)

1. Create the episode "Fever" → the AI picks the category.
2. Play a 1-minute mock consultation → summary + extracted reminders → confirm.
3. Scan the prescription → medicines matched with confidence levels.
4. **Verification catches the planted mismatch** ("Doctor said 5 days, prescription says 10").
5. Generate the care plan → a reminder notification arrives on the iPhone.
6. Morning check-in → the recovery timeline updates.
7. Tap Help → it calls family.
8. Show the results table (accuracy numbers).
