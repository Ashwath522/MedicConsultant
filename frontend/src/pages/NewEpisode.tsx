import {
  IonButton, IonContent, IonHeader, IonIcon, IonInput, IonPage, IonSpinner, IonTextarea, IonTitle, IonToolbar,
  useIonRouter, useIonToast,
} from '@ionic/react';
import { AnimatePresence, motion } from 'framer-motion';
import { sparkles } from 'ionicons/icons';
import { useState } from 'react';
import { api, Episode } from '../services/api';
import { EASE, Item, Stagger, useEnterKey } from '../ui/motion';
import { Shimmer } from '../ui/ambient';

const CATEGORIES = [
  'Fever', 'Cold & Cough', 'Infection', 'Stomach', 'Injury', 'Surgery', 'Skin', 'Dental', 'Eye',
  'Heart & BP', 'Diabetes', "Women's Health", 'Mental Health', 'Checkup', 'Other',
];

/** Step 1: describe the issue → AI suggests category + title → user confirms. */
export default function NewEpisode() {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState<'describe' | 'thinking' | 'confirm'>('describe');
  const [saving, setSaving] = useState(false);
  const [toast] = useIonToast();
  const router = useIonRouter();
  const k = useEnterKey();

  const suggest = async () => {
    setPhase('thinking');
    try {
      const [s] = await Promise.all([
        api<{ category: string; title: string }>('/episodes/suggest', { method: 'POST', body: { description } }),
        new Promise((r) => setTimeout(r, 700)), // let the "thinking" moment read
      ]);
      setCategory(s.category);
      setTitle(s.title);
      setPhase('confirm');
    } catch (e) {
      setPhase('describe');
      toast({ message: (e as Error).message, duration: 2500, position: 'top' });
    }
  };

  const pick = (c: string) => {
    setTitle((t) => (t.startsWith(category) ? t.replace(category, c) : t));
    setCategory(c);
  };

  const save = async () => {
    setSaving(true);
    try {
      const e = await api<Episode>('/episodes', { method: 'POST', body: { title, category, issue_description: description } });
      setDescription(''); setCategory(''); setTitle(''); setPhase('describe');
      router.push(`/episodes/${e.id}`, 'forward', 'replace');
    } catch (err) {
      toast({ message: (err as Error).message, duration: 2500, position: 'top' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar><IonTitle>New episode</IonTitle></IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar><IonTitle size="large">New episode</IonTitle></IonToolbar>
        </IonHeader>

        <Stagger k={k} className="page">
          <Item><p className="lead" style={{ margin: '0 4px 20px' }}>Describe what you're feeling, in your own words. We'll organise everything around it.</p></Item>
          <Item>
            <div className="field" style={{ padding: '8px 16px' }}>
              <IonTextarea
                autoGrow rows={4} placeholder="e.g. High fever and body pain since yesterday"
                value={description}
                onIonInput={(e) => { setDescription(e.detail.value ?? ''); if (phase === 'confirm') setPhase('describe'); }}
                style={{ fontSize: 18, '--placeholder-color': 'var(--ck-faint)' }}
              />
            </div>
          </Item>

          <AnimatePresence mode="wait">
            {phase === 'describe' && (
              <motion.div key="go" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }}>
                <IonButton expand="block" size="large" onClick={suggest} disabled={description.trim().length < 3} style={{ marginTop: 12 }}>
                  Continue
                </IonButton>
              </motion.div>
            )}

            {phase === 'thinking' && (
              <motion.div key="thinking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card flat" style={{ marginTop: 12 }}>
                <div className="row">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <IonIcon icon={sparkles} style={{ fontSize: 22 }} />
                  </motion.div>
                  <div className="grow">
                    <div style={{ fontWeight: 650 }}><Shimmer>Organising your episode…</Shimmer></div>
                    <div className="skeleton" style={{ height: 10, marginTop: 10, width: '80%' }} />
                    <div className="skeleton" style={{ height: 10, marginTop: 8, width: '55%' }} />
                  </div>
                </div>
              </motion.div>
            )}

            {phase === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                <div className="eyebrow row" style={{ gap: 6 }}><IonIcon icon={sparkles} /> Suggested — tap to change</div>
                <div className="chips" style={{ marginBottom: 20 }}>
                  {CATEGORIES.map((c, i) => (
                    <motion.span
                      key={c}
                      className={`chip ${c === category ? 'on' : ''}`}
                      onClick={() => pick(c)}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.025, type: 'spring', stiffness: 500, damping: 26 }}
                      whileTap={{ scale: 0.92 }}
                    >
                      {c}
                    </motion.span>
                  ))}
                </div>
                <div className="field">
                  <IonInput label="Title" labelPlacement="floating" value={title} onIonInput={(e) => setTitle(e.detail.value ?? '')} />
                </div>
                <IonButton expand="block" size="large" onClick={save} disabled={saving || !title || !category} style={{ marginTop: 12 }}>
                  {saving ? <IonSpinner name="crescent" /> : 'Create episode'}
                </IonButton>
              </motion.div>
            )}
          </AnimatePresence>
        </Stagger>
      </IonContent>
    </IonPage>
  );
}
