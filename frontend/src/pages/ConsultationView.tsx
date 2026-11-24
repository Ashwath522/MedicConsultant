import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader,
  IonNote, IonPage, IonTitle, IonToolbar, useIonAlert, useIonRouter, useIonViewWillEnter,
} from '@ionic/react';
import { useState } from 'react';
import { RouteComponentProps } from 'react-router';
import HelpButton from '../components/HelpButton';
import { api, Consultation, fmtTime } from '../services/api';

const LANG: Record<string, string> = { en: 'English', hi: 'Hindi', kn: 'Kannada', ta: 'Tamil', te: 'Telugu' };

/** Transcript with timestamps. Week 4 adds the AI summary + extracted reminders above it. */
export default function ConsultationView({ match }: RouteComponentProps<{ id: string }>) {
  const [c, setC] = useState<Consultation | null>(null);
  const [alert] = useIonAlert();
  const router = useIonRouter();

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
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={c ? `/episodes/${c.episode_id}` : '/episodes'} /></IonButtons>
          <IonTitle>Consultation</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {c && (
          <>
            <div className="ion-padding">
              <p className="muted">
                {new Date(c.recorded_at).toLocaleString()} · {fmtTime(c.duration_sec)} · {LANG[c.language] ?? c.language}
                {c.audio_deleted && ' · audio deleted'}
              </p>
              <IonNote>AI summary and reminders arrive in the next update.</IonNote>
            </div>

            <IonList inset>
              <IonListHeader>Transcript</IonListHeader>
              {c.transcript.length === 0 && (
                <IonItem><IonLabel className="muted">No speech detected.</IonLabel></IonItem>
              )}
              {c.transcript.map((s, i) => (
                <IonItem key={i} lines="full">
                  <IonNote slot="start" style={{ minWidth: 48, fontVariantNumeric: 'tabular-nums' }}>{fmtTime(s.start)}</IonNote>
                  <IonLabel className="ion-text-wrap">{s.text}</IonLabel>
                </IonItem>
              ))}
            </IonList>

            <div className="ion-padding">
              <IonButton expand="block" fill="clear" color="danger" onClick={remove}>Delete consultation</IonButton>
            </div>
          </>
        )}
        <HelpButton />
      </IonContent>
    </IonPage>
  );
}
