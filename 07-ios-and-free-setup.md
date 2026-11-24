# 7. iOS-First Plan at ₹0

## 7.1 Free vs paid Apple account

| What | Free Apple ID | Apple Developer Program ($99/yr) |
|---|---|---|
| Run on your own iPhone via Xcode | ✅ | ✅ |
| Local notifications | ✅ | ✅ |
| Microphone, camera, `tel:` calls | ✅ | ✅ |
| How long a build lasts | ⚠️ 7 days | 1 year |
| Server push notifications (APNs) | ❌ | ✅ |
| HealthKit | ❌ | ✅ |
| TestFlight / App Store | ❌ | ✅ |

## 7.2 Free ways to use it

| Use | Option |
|---|---|
| Daily development | Browser at iPhone size + **iOS Simulator** (free, never expires; use the photo library instead of the camera) |
| Your own iPhone | **Xcode + free Apple ID** (reinstall every 7 days), or **AltStore / SideStore** (auto-refresh) |
| Sharing with testers and the panel | **Installable web app**: open in Safari → Share → Add to Home Screen. Web Push works on iOS 16.4+ for free. |
| Viva | Simulator on the projector + your iPhone as backup |
| Paid account for free | Ask whether your college is in the **Apple University Program**, or has a faculty/lab developer account |

## 7.3 HealthKit: issues and workarounds

**Issues:**
- Needs the paid program (a free Apple ID can't enable the capability).
- Native only. Web apps can't access it.
- No official Capacitor plugin; community plugins may be outdated.
- The data lives only on the phone; the app must read it and send it to the backend.
- Sleep data usually needs an Apple Watch.
- If read access is denied, iOS just returns empty data, so the app can't tell why.
- The Simulator has no real data (add samples by hand).
- Strict App Review and privacy rules.
- Android needs a separate integration (Health Connect).

**Workarounds:**
1. **Morning check-in** (first version): sleep quality + hours.
2. **Apple Shortcuts bridge** (stretch, free, real HealthKit data):
   - Personal automation → daily at 9 AM
   - Action: **Find Health Samples** (steps, sleep, yesterday)
   - Action: **Get Contents of URL** → POST to `/checkins/health` with the user's token
   - Share a ready-made shortcut link so it's a single tap for users to add
3. **Native HealthKit** in future scope.

## 7.4 iOS-specific notes

- Ionic `mode: 'ios'` gives native iOS navigation bars, tab bars and swipe-back.
- `Info.plist` must include:
  - `NSMicrophoneUsageDescription`: "ConsultKeeper records your consultation to summarise the doctor's instructions."
  - `NSCameraUsageDescription`: "ConsultKeeper scans your prescription to read your medicines."
  - `NSPhotoLibraryUsageDescription`: "Choose a prescription or report photo."
- **64 pending local notifications maximum**: schedule a few days ahead and top up whenever the app opens.
- Recording in the web view stops if the app goes to the background, so keep the screen on.
- The backend must use HTTPS for iOS (use a free tunnel like Cloudflare Tunnel or ngrok during development).

## 7.5 Mac setup checklist

- [ ] **Xcode** (Mac App Store, about 10 GB or more); open it once to install its components
- [ ] **Homebrew**: https://brew.sh
- [ ] **Node.js 18+**: `brew install node`
- [ ] **Python 3.10+**: `brew install python@3.11`
- [ ] **CocoaPods**: `brew install cocoapods`
- [ ] **Ionic CLI**: `npm i -g @ionic/cli`
- [ ] **ffmpeg** (needed by Whisper): `brew install ffmpeg`
- [ ] **faster-whisper**: `pip install faster-whisper`
- [ ] **Ollama** (optional, local LLM): https://ollama.com → `ollama pull llama3.1:8b`
- [ ] **Git + GitHub account** (apply for the Student Developer Pack)
- [ ] Sign in to Xcode with your Apple ID (Settings → Accounts)
- [ ] iPhone + cable; turn on **Developer Mode** on the iPhone (Settings → Privacy & Security)

## 7.6 Cautions on free tiers

- Free AI tiers may use what you send to improve their models. **Send only mock or de-identified data.**
- Free-tier limits change. Check them when you start, and keep providers swappable.
