# Running ConsultKeeper (Weeks 1–3 build)

## What works now
- Sign up / log in (JWT)
- Profile: allergies, conditions, regular medicines, daily routine times
- Family & doctor contacts (opt-in caregiver alerts flag)
- New episode: describe issue → AI/rules suggest category + title → user confirms
- Episode list (Active / History), detail, close, delete
- Floating Help button on every screen → one-tap call to family or doctor
- iOS look everywhere (Ionic `mode: 'ios'`)
- Audit log of create/view/update/delete
- **Week 3:** record a consultation (consent → record/pause/stop, screen kept on) or upload an audio file
  → local Whisper transcript with timestamps → audio deleted by default
- 11 backend tests (auth, user isolation, routine validation, contacts, consultations)

## 1. Backend (Terminal 1)
```bash
cd backend
~/.pyenv/versions/3.11.15/bin/python -m venv .venv   # Python 3.10–3.13 (3.14 not supported yet)
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # set JWT_SECRET; GEMINI_API_KEY is optional
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs  ·  Tests: `pytest -q`

Without a Gemini key, category suggestion uses offline keyword rules.
With a key (free at https://aistudio.google.com) it uses Gemini. Use mock data only.

**First recording:** Whisper downloads its model once (~250 MB for `small`), so the first
transcription takes a few minutes. Set `WHISPER_MODEL=tiny` in `.env` for quick testing,
`medium` for better Kannada/Hindi accuracy.

## 2. Frontend (Terminal 2)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Open http://localhost:5173. In Safari/Chrome dev tools choose an iPhone size.

## 3. On your iPhone (same Wi-Fi)
1. Find your Mac's IP: `ipconfig getifaddr en0` (e.g. 192.168.1.5)
2. In `frontend/.env`: `VITE_API_URL=http://192.168.1.5:8000`
3. In `backend/.env`: add `http://192.168.1.5:5173` to `CORS_ORIGINS`
4. Run backend with `--host 0.0.0.0`
5. Open `http://192.168.1.5:5173` in Safari on the iPhone

**Microphone on iPhone needs HTTPS.** Over plain `http://192.168…` Safari blocks the mic, so use
**Upload audio file** there, or a free HTTPS tunnel:
```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:5173   # gives an https://….trycloudflare.com link
```
(Run a second tunnel for port 8000 and put that https URL in `frontend/.env` as `VITE_API_URL`,
and add the frontend tunnel URL to `CORS_ORIGINS`.)

## Code map
```
backend/app/
  main.py            app + routers
  models.py          users, contacts, episodes, audit_logs
  schemas.py         request/response validation
  core/              config, db, security (JWT, bcrypt, audit)
  extract/llm.py     ALL LLM calls go through here (swap Gemini ↔ Ollama)
  speech/transcribe.py  faster-whisper (local speech-to-text, timestamps)
  routers/           auth, profile, contacts, episodes, consultations
frontend/src/
  App.tsx            tabs + routes
  services/api.ts    API client + types
  components/HelpButton.tsx
  services/recorder.ts  MediaRecorder + Wake Lock
  pages/             Login, Home, Episodes, NewEpisode, EpisodeDetail,
                     RecordConsultation, ConsultationView,
                     Timeline, Profile, Contacts
```

## Next: Week 4 — AI summary + reminders from the doctor's words
