# Running ConsultKeeper (Weeks 1–2 build)

## What works now
- Sign up / log in (JWT)
- Profile: allergies, conditions, regular medicines, daily routine times
- Family & doctor contacts (opt-in caregiver alerts flag)
- New episode: describe issue → AI/rules suggest category + title → user confirms
- Episode list (Active / History), detail, close, delete
- Floating Help button on every screen → one-tap call to family or doctor
- iOS look everywhere (Ionic `mode: 'ios'`)
- Audit log of create/view/update/delete
- 6 backend tests (auth, isolation between users, routine validation, contacts)

## 1. Backend (Terminal 1)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # set JWT_SECRET; GEMINI_API_KEY is optional
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs  ·  Tests: `pytest -q`

Without a Gemini key, category suggestion uses offline keyword rules.
With a key (free at https://aistudio.google.com) it uses Gemini. Use mock data only.

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

(Microphone recording in week 3 needs HTTPS on the phone, so use a free Cloudflare Tunnel then.)

## Code map
```
backend/app/
  main.py            app + routers
  models.py          users, contacts, episodes, audit_logs
  schemas.py         request/response validation
  core/              config, db, security (JWT, bcrypt, audit)
  extract/llm.py     ALL LLM calls go through here (swap Gemini ↔ Ollama)
  routers/           auth, profile, contacts, episodes
frontend/src/
  App.tsx            tabs + routes
  services/api.ts    API client + types
  components/HelpButton.tsx
  pages/             Login, Home, Episodes, NewEpisode, EpisodeDetail,
                     Timeline, Profile, Contacts
```

## Next: Week 3 — recording + transcription
