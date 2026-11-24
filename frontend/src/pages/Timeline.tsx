import {
  IonButton, IonContent, IonHeader, IonIcon, IonInput, IonPage, IonTitle, IonToolbar, useIonRouter, useIonToast,
  useIonViewWillEnter,
} from '@ionic/react';
import { motion } from 'framer-motion';
import { flaskOutline, phonePortraitOutline } from 'ionicons/icons';
import { useState } from 'react';
import HelpButton from '../components/HelpButton';
import { LEVEL } from '../components/SignalCard';
import { api, Signals } from '../services/api';
import { Ambient, EcgLine, HeartDot } from '../ui/ambient';
import { Item, Stagger, useEnterKey } from '../ui/motion';
import RhrChart from '../ui/RhrChart';

const TAGS: [string, string][] = [
  ['late_night', 'Late night'], ['alcohol', 'Alcohol'], ['hard_workout', 'Hard workout'],
  ['travel', 'Travel'], ['stress', 'Stress'], ['period', 'Period'],
];

/** Recovery tab = Body signals: the early-warning layer (spec 09). */
export default function Timeline() {
  const [s, setS] = useState<Signals | null>(null);
  const [rhr, setRhr] = useState('');
  const [temp, setTemp] = useState('');
  const [toast] = useIonToast();
  const router = useIonRouter();
  const k = useEnterKey();

  const load = () => api<Signals>('/signals/today').then(setS).catch(() => {});
  useIonViewWillEnter(() => { load(); });

  const tag = async (t: string) => {
    if (!s?.day) return;
    const cur = new Set(s.tags ?? []);
    cur.has(t) ? cur.delete(t) : cur.add(t);
    await api('/vitals/tags', { method: 'POST', body: { day: s.day, tags: [...cur] } });
    load();
  };

  const saveManual = async () => {
    const night: Record<string, unknown> = { source: 'manual' };
    if (rhr) night.rhr = Number(rhr);
    if (temp) night.temp_abs = Number(temp);
    try {
      await api('/vitals', { method: 'POST', body: { nights: [night] } });
      setRhr(''); setTemp('');
      toast({ message: 'Saved', duration: 1200, position: 'top' });
      load();
    } catch (e) {
      toast({ message: (e as Error).message, duration: 2500, position: 'top' });
    }
  };

  const demo = async () => { await api('/vitals/demo', { method: 'POST' }); load(); };

  const L = s ? LEVEL[s.level] : null;
  const loud = s?.level === 'check';

  return (
    <IonPage>
      <IonHeader translucent><IonToolbar><IonTitle>Body signals</IonTitle></IonToolbar></IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense"><IonToolbar><IonTitle size="large">Body signals</IonTitle></IonToolbar></IonHeader>
        <Stagger k={k} className="page">
          {/* Status hero */}
          <Item>
            <div className="card ink beam" style={{ padding: 22 }}>
              <Ambient tone="dark" dots={false} />
              <div className="row" style={{ gap: 8, fontSize: 13, fontWeight: 650, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <HeartDot color="#fafafa" /> {L?.label ?? 'Loading'}
              </div>
              <div className="h2" style={{ marginTop: 10, lineHeight: 1.3 }}>
                {loud ? 'A pattern worth checking.' : s?.level === 'normal' ? 'All within your normal.' : s?.level === 'watch' ? 'One signal is a little off.' : s?.level === 'learning' ? 'Getting to know your body.' : 'Add your first night.'}
              </div>
              <p style={{ color: '#d4d4d8', lineHeight: 1.5, margin: '10px 0 0', fontSize: 15 }}>{s?.message}</p>
              {loud && (
                <div className="row" style={{ gap: 8, marginTop: 14 }}>
                  <IonButton size="small" style={{ '--background': '#fafafa', '--color': '#000' }} onClick={() => router.push('/new')}>Start an episode</IonButton>
                  <IonButton size="small" fill="outline" style={{ '--color': '#fafafa', '--border-color': '#52525b' }} onClick={() => document.getElementById('manual')?.scrollIntoView({ behavior: 'smooth' })}>Log temperature</IonButton>
                </div>
              )}
              <div style={{ margin: '14px -22px -22px' }}><EcgLine beats={5} height={52} color="#fafafa" speed={loud ? 1.8 : 3.6} /></div>
            </div>
          </Item>

          {/* Chart */}
          {s && s.series.length > 1 && (
            <Item>
              <div className="eyebrow">Resting heart rate · last 30 nights</div>
              <div className="card">
                <RhrChart series={s.series} k={k} />
                <div className="row muted" style={{ gap: 16, fontSize: 12, marginTop: 6 }}>
                  <span className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 8, background: 'currentColor', opacity: 0.15, borderRadius: 2 }} /> Your normal range</span>
                  <span className="row" style={{ gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--ck-text)' }} /> Flagged night</span>
                </div>
              </div>
            </Item>
          )}

          {/* Latest numbers */}
          {s?.latest && (
            <Item>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                {[
                  ['Resting HR', s.latest.rhr != null ? `${Math.round(s.latest.rhr)}` : '–', 'bpm'],
                  ['HRV', s.latest.hrv != null ? `${Math.round(s.latest.hrv)}` : '–', 'ms'],
                  ['Temp', s.latest.temp_dev != null ? `${s.latest.temp_dev > 0 ? '+' : ''}${s.latest.temp_dev.toFixed(1)}` : s.latest.temp_abs != null ? s.latest.temp_abs.toFixed(1) : '–', '°C'],
                ].map(([label, v, unit], i) => (
                  <motion.div key={label} className="card" style={{ margin: 0, padding: 14 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
                    <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
                    <div className="tabular" style={{ fontSize: 24, fontWeight: 750, marginTop: 4 }}>{v}<span className="muted" style={{ fontSize: 12, fontWeight: 500 }}> {unit}</span></div>
                  </motion.div>
                ))}
              </div>
            </Item>
          )}

          {/* Context tags */}
          {s?.day && (
            <Item>
              <div className="eyebrow">Last night · anything that explains it?</div>
              <div className="chips">
                {TAGS.map(([v, l]) => (
                  <motion.span key={v} whileTap={{ scale: 0.92 }} className={`chip ${s.tags?.includes(v) ? 'on' : ''}`} onClick={() => tag(v)}>{l}</motion.span>
                ))}
              </div>
            </Item>
          )}

          {/* Manual entry */}
          <Item>
            <div className="eyebrow" id="manual">Add a reading</div>
            <div className="row" style={{ gap: 10 }}>
              <div className="field grow" style={{ marginBottom: 0 }}><IonInput type="number" label="Resting HR (bpm)" labelPlacement="floating" value={rhr} onIonInput={(e) => setRhr(e.detail.value ?? '')} /></div>
              <div className="field grow" style={{ marginBottom: 0 }}><IonInput type="number" label="Thermometer (°C)" labelPlacement="floating" value={temp} onIonInput={(e) => setTemp(e.detail.value ?? '')} /></div>
            </div>
            <IonButton expand="block" onClick={saveManual} disabled={!rhr && !temp} style={{ marginTop: 10 }}>Save reading</IonButton>
          </Item>

          {/* Connect */}
          <Item>
            <div className="eyebrow">Connect a wearable</div>
            <div className="card flat">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <IonIcon icon={phonePortraitOutline} style={{ fontSize: 22 }} />
                <div className="grow" style={{ fontSize: 14, lineHeight: 1.5 }}>
                  <b>iPhone (free):</b> any watch or ring that syncs to Apple Health works. Set up an Apple Shortcuts automation each morning: <i>Find Health Samples</i> (resting HR, HRV, wrist temperature, respiratory rate, steps) → <i>Get Contents of URL</i> → POST to <code>/vitals</code>.
                </div>
              </div>
            </div>
            <IonButton expand="block" fill="clear" color="medium" onClick={demo}>
              <IonIcon icon={flaskOutline} slot="start" />Load 60 nights of demo data
            </IonButton>
          </Item>

          <Item><p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: '8px 12px 0' }}>Compares you only with your own normal. Not a diagnosis: always confirm with a doctor.</p></Item>
        </Stagger>
        <HelpButton />
      </IonContent>
    </IonPage>
  );
}
