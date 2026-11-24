import {
  IonBackButton, IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonIcon, IonPage, IonTitle,
  IonToolbar, useIonAlert, useIonRouter, useIonViewWillLeave,
} from '@ionic/react';
import { AnimatePresence, motion } from 'framer-motion';
import { cloudUploadOutline, mic, pause, play, shieldCheckmarkOutline, stop } from 'ionicons/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { Consultation, fmtTime, upload } from '../services/api';
import { extFor, Recorder } from '../services/recorder';
import { EASE, Item, Stagger } from '../ui/motion';
import Stepper from '../ui/Stepper';
import Waveform from '../ui/Waveform';
import { Ambient, Shimmer } from '../ui/ambient';

type Stage = 'consent' | 'ready' | 'recording' | 'paused' | 'uploading';
const LANGS = [['', 'Auto-detect'], ['en', 'English'], ['hi', 'Hindi'], ['kn', 'Kannada']] as const;

/** Step 2 of the workflow: consent → record (or upload a file) → transcript. */
export default function RecordConsultation({ match }: RouteComponentProps<{ id: string }>) {
  const episodeId = match.params.id;
  const [stage, setStage] = useState<Stage>('consent');
  const [agreed, setAgreed] = useState(false);
  const [language, setLanguage] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const recorder = useRef<Recorder | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [alert] = useIonAlert();
  const router = useIonRouter();
  const dark = stage === 'ready' || stage === 'recording' || stage === 'paused';

  useEffect(() => {
    if (stage !== 'recording') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  useIonViewWillLeave(() => {
    recorder.current?.cancel();
    setStage('consent'); setAgreed(false); setSeconds(0);
  });

  const getLevel = useCallback(() => recorder.current?.level() ?? 0, []);

  const send = async (blob: Blob, filename: string) => {
    setStage('uploading');
    setUploaded(false);
    const t = setTimeout(() => setUploaded(true), 900);
    const form = new FormData();
    form.append('audio', blob, filename);
    form.append('consent', 'true');
    if (language) form.append('language', language);
    try {
      const c = await upload<Consultation>(`/episodes/${episodeId}/consultations`, form);
      router.push(`/consultations/${c.id}`, 'forward', 'replace');
    } catch (e) {
      setStage('ready');
      alert({ header: 'Upload failed', message: (e as Error).message, buttons: ['OK'] });
    } finally {
      clearTimeout(t);
    }
  };

  const start = async () => {
    if (!Recorder.supported()) {
      alert({ header: 'Recording not available', message: 'Open the app over HTTPS (or localhost), or upload an audio file instead.', buttons: ['OK'] });
      return;
    }
    try {
      recorder.current = new Recorder();
      await recorder.current.start();
      setSeconds(0);
      setStage('recording');
    } catch {
      alert({ header: 'Microphone blocked', message: 'Allow microphone access in your browser or phone settings and try again.', buttons: ['OK'] });
    }
  };

  const finish = async () => {
    const r = recorder.current;
    if (!r) return;
    const blob = await r.stop();
    if (seconds < 3) {
      setStage('ready');
      alert({ header: 'Too short', message: 'The recording was under 3 seconds. Please try again.', buttons: ['OK'] });
      return;
    }
    send(blob, `consultation.${extFor(r.mimeType)}`);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) send(f, f.name);
    e.target.value = '';
  };

  return (
    <IonPage>
      <IonHeader translucent={!dark}>
        <IonToolbar style={dark ? { '--background': '#000', '--color': '#fafafa' } : undefined}>
          <IonButtons slot="start"><IonBackButton defaultHref={`/episodes/${episodeId}`} text="" style={dark ? { color: '#fafafa' } : undefined} /></IonButtons>
          <IonTitle>{stage === 'consent' ? 'Before you start' : 'Consultation'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className={dark ? 'stage-dark' : ''}>
        <AnimatePresence mode="wait">
          {/* ---------- Consent ---------- */}
          {stage === 'consent' && (
            <motion.div key="consent" exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }}>
              <Stagger className="page" k={1}>
                <Item>
                  <div className="empty-icon" style={{ width: 56, height: 56, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'var(--ck-surface)', margin: '24px 0 16px' }}>
                    <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: 28 }} />
                  </div>
                  <h1 className="h1">Ask your doctor first.</h1>
                  <p className="lead">Start the recording by capturing their spoken "yes". The audio is deleted right after it's turned into text.</p>
                </Item>
                <Item>
                  <div className="card flat" style={{ marginTop: 12 }}>
                    <IonCheckbox checked={agreed} onIonChange={(e) => setAgreed(e.detail.checked)} labelPlacement="end" justify="start" style={{ fontWeight: 600 }}>
                      My doctor has agreed to be recorded
                    </IonCheckbox>
                  </div>
                </Item>
                <Item>
                  <div className="eyebrow">Language</div>
                  <div className="chips">
                    {LANGS.map(([v, l]) => (
                      <motion.span key={v} whileTap={{ scale: 0.92 }} className={`chip ${language === v ? 'on' : ''}`} onClick={() => setLanguage(v)}>{l}</motion.span>
                    ))}
                  </div>
                </Item>
                <Item>
                  <IonButton expand="block" size="large" disabled={!agreed} onClick={() => setStage('ready')} style={{ marginTop: 32 }}>
                    Continue
                  </IonButton>
                </Item>
              </Stagger>
            </motion.div>
          )}

          {/* ---------- Recording stage (dark) ---------- */}
          {dark && (
            <motion.div
              key="stage"
              className="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ position: 'relative', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 24 }}
            >
              <Ambient tone="dark" dots={stage === 'recording'} />
              <div className="ion-text-center">
                <motion.div className="timer" key={stage === 'ready' ? 'r' : 'g'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {fmtTime(seconds)}
                </motion.div>
                <div style={{ color: '#a1a1aa', fontWeight: 500, height: 22 }}>
                  {stage === 'ready' && 'Tap to start recording'}
                  {stage === 'recording' && (
                    <span><motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>●</motion.span> Listening</span>
                  )}
                  {stage === 'paused' && 'Paused'}
                </div>
              </div>

              <Waveform getLevel={getLevel} active={stage === 'recording'} />

              {/* Mic orb with breathing rings */}
              <div style={{ position: 'relative', width: 168, height: 168, display: 'grid', placeItems: 'center' }}>
                {stage === 'recording' && [0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.6, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 2.4, delay: i * 0.8, repeat: Infinity, ease: 'easeOut' }}
                    style={{ position: 'absolute', inset: 24, borderRadius: '50%', border: '1.5px solid #fafafa' }}
                  />
                ))}
                <motion.button
                  aria-label={stage === 'ready' ? 'Start recording' : 'Stop and save'}
                  onClick={stage === 'ready' ? start : finish}
                  whileTap={{ scale: 0.9 }}
                  animate={{ scale: stage === 'recording' ? [1, 1.04, 1] : 1 }}
                  transition={stage === 'recording' ? { duration: 1.6, repeat: Infinity } : { type: 'spring', stiffness: 400, damping: 20 }}
                  style={{
                    width: 112, height: 112, borderRadius: '50%', border: 0, cursor: 'pointer',
                    background: '#fafafa', color: '#000', display: 'grid', placeItems: 'center',
                    boxShadow: '0 0 0 8px rgba(255,255,255,0.06), 0 20px 60px rgba(255,255,255,0.15)',
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={stage === 'ready' ? 'mic' : 'stop'}
                      initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      style={{ display: 'grid' }}
                    >
                      <IonIcon icon={stage === 'ready' ? mic : stop} style={{ fontSize: 42 }} />
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </div>

              <div style={{ height: 52 }}>
                <AnimatePresence mode="wait">
                  {stage === 'ready' ? (
                    <motion.div key="up" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <IonButton fill="clear" onClick={() => fileInput.current?.click()} style={{ '--color': '#a1a1aa' }}>
                        <IonIcon icon={cloudUploadOutline} slot="start" />Upload an audio file instead
                      </IonButton>
                      <input ref={fileInput} type="file" accept="audio/*" hidden onChange={onFile} />
                    </motion.div>
                  ) : (
                    <motion.div key="ctl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', gap: 12 }}>
                      <IonButton
                        fill="outline" style={{ '--color': '#fafafa', '--border-color': '#3f3f46' }}
                        onClick={() => { if (stage === 'recording') { recorder.current?.pause(); setStage('paused'); } else { recorder.current?.resume(); setStage('recording'); } }}
                      >
                        <IonIcon icon={stage === 'recording' ? pause : play} slot="start" />{stage === 'recording' ? 'Pause' : 'Resume'}
                      </IonButton>
                      <IonButton style={{ '--background': '#fafafa', '--color': '#000' }} onClick={finish}>
                        <IonIcon icon={stop} slot="start" />Stop & save
                      </IonButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ---------- Processing ---------- */}
          {stage === 'uploading' && (
            <motion.div key="up" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="page" style={{ paddingTop: 40 }}>
              <h1 className="h1" style={{ marginBottom: 8 }}><Shimmer>Making sense of it…</Shimmer></h1>
              <p className="lead" style={{ marginBottom: 28 }}>This takes a moment for longer consultations.</p>
              <div className="card">
                <Stepper
                  k={uploaded ? 2 : 1}
                  steps={[
                    { title: 'Audio received', note: 'Securely uploaded', state: uploaded ? 'done' : 'current' },
                    { title: 'Converting speech to text', note: 'Running locally with Whisper', state: uploaded ? 'current' : 'todo' },
                    { title: 'Transcript ready', note: 'With timestamps for every line', state: 'todo' },
                  ]}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </IonContent>
    </IonPage>
  );
}
