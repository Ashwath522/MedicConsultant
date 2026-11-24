import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar,
  useIonAlert, useIonRouter, useIonViewWillEnter,
} from '@ionic/react';
import { motion } from 'framer-motion';
import { sparklesOutline, trashOutline } from 'ionicons/icons';
import { useState } from 'react';
import { RouteComponentProps } from 'react-router';
import HelpButton from '../components/HelpButton';
import { api, Consultation, fmtTime } from '../services/api';
import { EASE, Item, Stagger, useEnterKey } from '../ui/motion';

const LANG: Record<string, string> = { en: 'English', hi: 'Hindi', kn: 'Kannada', ta: 'Tamil', te: 'Telugu' };

/** Transcript as a timeline. Week 4 adds the AI summary + extracted reminders above it. */
export default function ConsultationView({ match }: RouteComponentProps<{ id: string }>) {
  const [c, setC] = useState<Consultation | null>(null);
  const [alert] = useIonAlert();
  const router = useIonRouter();
  const k = useEnterKey();

  useIonViewWillEnter(() => {
    api<Consultation>(`/consultations/${match.params.id}`).then(setC).catch(() => {});
  });

  const remove = () =>
    alert({
      header: 'Delete this consultation?',
      message: 'The transcript will be permanently deleted.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await api(`/consultations/${match.params.id}`, { method: 'DELETE' });
            router.push(`/episodes/${c?.episode_id}`, 'back', 'pop');
          },
        },
      ],
    });

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={c ? `/episodes/${c.episode_id}` : '/episodes'} text="" /></IonButtons>
          <IonTitle>Consultation</IonTitle>
          <IonButtons slot="end"><IonButton onClick={remove} aria-label="Delete"><IonIcon icon={trashOutline} /></IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {!c && <div className="page" style={{ paddingTop: 20 }}>{[80, 60, 90, 70].map((w, i) => <div key={i} className="skeleton" style={{ height: 16, width: `${w}%`, marginBottom: 14 }} />)}</div>}
        {c && (
          <Stagger k={k} className="page">
            <Item>
              <h1 className="h1" style={{ marginTop: 8 }}>
                {new Date(c.recorded_at).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              </h1>
              <div className="chips" style={{ margin: '14px 0 6px' }}>
                <span className="chip tabular">{fmtTime(c.duration_sec)}</span>
                <span className="chip">{LANG[c.language] ?? c.language}</span>
                <span className="chip">{c.transcript.length} lines</span>
                {c.audio_deleted && <span className="chip">Audio deleted</span>}
              </div>
            </Item>

            <Item>
              <div className="card ink" style={{ marginTop: 14 }}>
                <div className="row">
                  <IonIcon icon={sparklesOutline} style={{ fontSize: 22 }} />
                  <div className="grow">
                    <div style={{ fontWeight: 650 }}>AI summary coming next</div>
                    <div className="muted" style={{ fontSize: 14 }}>Medicines, instructions and reminders, pulled from this transcript.</div>
                  </div>
                </div>
              </div>
            </Item>

            <Item><div className="eyebrow">Transcript</div></Item>
            <Item>
              <div style={{ position: 'relative', paddingLeft: 4 }}>
                {c.transcript.length === 0 && <p className="muted">No speech detected.</p>}
                {c.transcript.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.07, duration: 0.45, ease: EASE }}
                    style={{ display: 'flex', gap: 16, paddingBottom: 18 }}
                  >
                    <div className="tabular muted" style={{ width: 44, flex: 'none', fontSize: 13, fontWeight: 600, paddingTop: 3 }}>{fmtTime(s.start)}</div>
                    <div style={{ borderLeft: '2px solid var(--ck-border)', paddingLeft: 16, fontSize: 17, lineHeight: 1.5 }}>{s.text}</div>
                  </motion.div>
                ))}
              </div>
            </Item>
          </Stagger>
        )}
        <HelpButton />
      </IonContent>
    </IonPage>
  );
}
