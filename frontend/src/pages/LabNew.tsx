import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonPage, IonSpinner, IonTextarea,
  IonTitle, IonToolbar, useIonAlert, useIonRouter, useIonViewWillLeave,
} from '@ionic/react';
import { AnimatePresence, motion } from 'framer-motion';
import { checkmarkCircle, closeCircleOutline, cloudUploadOutline, documentTextOutline } from 'ionicons/icons';
import { useRef, useState } from 'react';
import { api, LabResultT, rangeText, upload } from '../services/api';
import { Shimmer } from '../ui/ambient';
import { EASE } from '../ui/motion';

type Extracted = { taken_on: string; method: string; results: LabResultT[] };

const flagOf = (v: number, lo: number | null, hi: number | null) => (lo != null && v < lo ? 'low' : hi != null && v > hi ? 'high' : 'normal');

/** Add a lab report: upload/paste → we read it → you review & confirm → saved. */
export default function LabNew() {
  const [stage, setStage] = useState<'pick' | 'reading' | 'review'>('pick');
  const [paste, setPaste] = useState('');
  const [data, setData] = useState<Extracted | null>(null);
  const [lab, setLab] = useState('');
  const [saving, setSaving] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const [alert] = useIonAlert();
  const router = useIonRouter();

  useIonViewWillLeave(() => { setStage('pick'); setPaste(''); setData(null); setLab(''); });

  const read = async (f?: File) => {
    setStage('reading');
    const form = new FormData();
    if (f) form.append('file', f); else form.append('text', paste);
    try {
      const [out] = await Promise.all([upload<Extracted>('/labs/extract', form), new Promise((r) => setTimeout(r, 900))]);
      setData(out); setStage('review');
    } catch (e) {
      setStage('pick');
      alert({ header: "Couldn't read that", message: (e as Error).message, buttons: ['OK'] });
    }
  };

  const edit = (i: number, v: string) => {
    if (!data) return;
    const results = [...data.results];
    const value = Number(v);
    results[i] = { ...results[i], value, flag: Number.isNaN(value) ? results[i].flag : flagOf(value, results[i].ref_low, results[i].ref_high) };
    setData({ ...data, results });
  };
  const remove = (i: number) => data && setData({ ...data, results: data.results.filter((_, j) => j !== i) });

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await api('/labs', { method: 'POST', body: { taken_on: data.taken_on, lab_name: lab, method: data.method, results: data.results } });
      router.push('/labs', 'back', 'pop');
    } catch (e) {
      alert({ header: 'Save failed', message: (e as Error).message, buttons: ['OK'] });
    } finally { setSaving(false); }
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/labs" text="" /></IonButtons>
          <IonTitle>{stage === 'review' ? 'Check the results' : 'Add a lab report'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="page" style={{ paddingTop: 12 }}>
          <AnimatePresence mode="wait">
            {stage === 'pick' && (
              <motion.div key="pick" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ease: EASE }}>
                <motion.div whileTap={{ scale: 0.98 }} className="card ink tap" style={{ padding: 26, textAlign: 'center' }} onClick={() => file.current?.click()}>
                  <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity }}><IonIcon icon={cloudUploadOutline} style={{ fontSize: 42 }} /></motion.div>
                  <div className="h2" style={{ marginTop: 10 }}>Upload a report</div>
                  <p style={{ color: '#d4d4d8', fontSize: 14, margin: '6px 0 0' }}>PDF from the lab works best. Photos need a Gemini key on the server.</p>
                </motion.div>
                <input ref={file} type="file" accept="application/pdf,image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ''; }} />
                <div className="eyebrow">Or paste the report text</div>
                <div className="field" style={{ padding: '8px 16px' }}>
                  <IonTextarea autoGrow rows={5} value={paste} onIonInput={(e) => setPaste(e.detail.value ?? '')} placeholder={'Haemoglobin 13.5 g/dL 13.0 - 17.0\nHbA1c 5.9 % 4.0 - 5.6\n…'} />
                </div>
                <IonButton expand="block" onClick={() => read()} disabled={paste.trim().length < 5}>
                  <IonIcon icon={documentTextOutline} slot="start" />Read text
                </IonButton>
                <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>Nothing is saved until you confirm. We read: blood count, sugar & HbA1c, lipids, thyroid, kidney, liver, vitamins, electrolytes, CRP/ESR.</p>
              </motion.div>
            )}

            {stage === 'reading' && (
              <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="empty">
                <IonSpinner name="crescent" />
                <h2 style={{ marginTop: 16 }}><Shimmer>Reading your report…</Shimmer></h2>
                {[70, 55, 80, 45].map((w, i) => <div key={i} className="skeleton" style={{ height: 12, width: `${w}%`, margin: '12px auto' }} />)}
              </motion.div>
            )}

            {stage === 'review' && data && (
              <motion.div key="review" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}>
                <div className="card flat row" style={{ alignItems: 'flex-start' }}>
                  <IonIcon icon={checkmarkCircle} style={{ fontSize: 22 }} />
                  <div className="grow" style={{ fontSize: 14 }}>
                    Found <b>{data.results.length} tests</b>. Check each value against your report and fix anything we misread before saving.
                  </div>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <div className="field grow"><IonInput label="Lab name" labelPlacement="floating" value={lab} onIonInput={(e) => setLab(e.detail.value ?? '')} /></div>
                  <div className="field grow"><IonInput type="date" label="Report date" labelPlacement="floating" value={data.taken_on} onIonInput={(e) => setData({ ...data, taken_on: e.detail.value ?? data.taken_on })} /></div>
                </div>
                {data.results.map((r, i) => (
                  <motion.div key={r.key} className="card" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} style={{ padding: '12px 14px' }}>
                    <div className="row" style={{ gap: 10 }}>
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 650 }}>{r.name}</div>
                        <div className="muted ellipsis" style={{ fontSize: 12 }}>
                          range {rangeText(r.ref_low, r.ref_high)} {r.unit}{r.range_source === 'typical' ? ' (typical, not on report)' : ''}
                        </div>
                      </div>
                      <div className="field" style={{ width: 92, margin: 0, padding: '0 10px' }}>
                        <IonInput type="number" value={r.value} onIonInput={(e) => edit(i, e.detail.value ?? '')} aria-label={`${r.name} value`} />
                      </div>
                      <span className={`chip ${r.flag !== 'normal' ? 'on' : ''}`} style={{ padding: '3px 8px', fontSize: 11, minWidth: 50, justifyContent: 'center' }}>{r.flag === 'normal' ? 'ok' : r.flag}</span>
                      <IonButton fill="clear" size="small" onClick={() => remove(i)} aria-label="Remove"><IonIcon icon={closeCircleOutline} /></IonButton>
                    </div>
                  </motion.div>
                ))}
                <IonButton expand="block" size="large" onClick={save} disabled={saving || !data.results.length} style={{ marginTop: 12 }}>
                  {saving ? <IonSpinner name="crescent" /> : `Confirm & save ${data.results.length} results`}
                </IonButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </IonContent>
    </IonPage>
  );
}
