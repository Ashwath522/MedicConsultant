import {
  IonBackButton, IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonIcon, IonItem, IonList,
  IonNote, IonPage, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar, useIonAlert, useIonRouter,
  useIonViewWillLeave,
} from '@ionic/react';
import { cloudUpload, mic, pause, play, stop } from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { Consultation, fmtTime, upload } from '../services/api';
import { extFor, Recorder } from '../services/recorder';

type Stage = 'consent' | 'ready' | 'recording' | 'paused' | 'uploading';

/** Step 2 of the workflow: consent → record (or upload a file) → transcript. */
export default function RecordConsultation({ match }: RouteComponentProps<{ id: string }>) {
  const episodeId = match.params.id;
  const [stage, setStage] = useState<Stage>('consent');
  const [agreed, setAgreed] = useState(false);
  const [language, setLanguage] = useState('');
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<Recorder | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [alert] = useIonAlert();
  const router = useIonRouter();

  // Timer while recording
  useEffect(() => {
    if (stage !== 'recording') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  useIonViewWillLeave(() => { recorder.current?.cancel(); });

  const send = async (blob: Blob, filename: string) => {
    setStage('uploading');
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
      alert({ header: 'Microphone blocked', message: 'Allow microphone access in your browser/phone settings and try again.', buttons: ['OK'] });
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
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={`/episodes/${episodeId}`} /></IonButtons>
          <IonTitle>Record consultation</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        {stage === 'consent' && (
          <>
            <h2>Before you start</h2>
            <p>Please ask your doctor for permission to record. Start the recording by capturing their spoken "yes".</p>
            <IonList inset>
              <IonItem>
                <IonCheckbox checked={agreed} onIonChange={(e) => setAgreed(e.detail.checked)} labelPlacement="end" justify="start">
                  My doctor has agreed to be recorded
                </IonCheckbox>
              </IonItem>
              <IonItem>
                <IonSelect label="Language" value={language} onIonChange={(e) => setLanguage(e.detail.value)}>
                  <IonSelectOption value="">Auto-detect (best for mixed)</IonSelectOption>
                  <IonSelectOption value="en">English</IonSelectOption>
                  <IonSelectOption value="hi">Hindi</IonSelectOption>
                  <IonSelectOption value="kn">Kannada</IonSelectOption>
                </IonSelect>
              </IonItem>
            </IonList>
            <IonNote className="ion-padding-start">Audio is deleted right after it's converted to text.</IonNote>
            <IonButton expand="block" className="ion-margin-top" disabled={!agreed} onClick={() => setStage('ready')}>
              Continue
            </IonButton>
          </>
        )}

        {(stage === 'ready' || stage === 'recording' || stage === 'paused') && (
          <div className="ion-text-center" style={{ paddingTop: 40 }}>
            <div style={{ fontSize: 56, fontVariantNumeric: 'tabular-nums', fontWeight: 300 }}>{fmtTime(seconds)}</div>
            <p className="muted">
              {stage === 'ready' && 'Tap the mic to start. Keep the screen on.'}
              {stage === 'recording' && <span className="rec-live">● Recording…</span>}
              {stage === 'paused' && 'Paused'}
            </p>

            {stage === 'ready' ? (
              <IonButton shape="round" size="large" onClick={start} style={{ width: 96, height: 96 }} aria-label="Start recording">
                <IonIcon icon={mic} slot="icon-only" />
              </IonButton>
            ) : (
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                {stage === 'recording' ? (
                  <IonButton shape="round" fill="outline" onClick={() => { recorder.current?.pause(); setStage('paused'); }}>
                    <IonIcon icon={pause} slot="start" />Pause
                  </IonButton>
                ) : (
                  <IonButton shape="round" fill="outline" onClick={() => { recorder.current?.resume(); setStage('recording'); }}>
                    <IonIcon icon={play} slot="start" />Resume
                  </IonButton>
                )}
                <IonButton shape="round" color="danger" onClick={finish}>
                  <IonIcon icon={stop} slot="start" />Stop & save
                </IonButton>
              </div>
            )}

            {stage === 'ready' && (
              <>
                <p className="muted" style={{ marginTop: 40 }}>Already have a recording?</p>
                <IonButton fill="clear" onClick={() => fileInput.current?.click()}>
                  <IonIcon icon={cloudUpload} slot="start" />Upload audio file
                </IonButton>
                <input ref={fileInput} type="file" accept="audio/*" hidden onChange={onFile} />
              </>
            )}
          </div>
        )}

        {stage === 'uploading' && (
          <div className="empty">
            <IonSpinner name="crescent" />
            <h3>Converting speech to text…</h3>
            <p className="muted">This can take a minute for longer consultations.</p>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}

