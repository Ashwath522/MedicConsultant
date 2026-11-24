import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList,
  IonListHeader, IonNote, IonPage, IonTitle, IonToolbar, useIonAlert, useIonRouter, useIonViewWillEnter,
} from '@ionic/react';
import { camera, checkmarkCircle, documentText, mic, notifications, pulse } from 'ionicons/icons';
import { useState } from 'react';
import { RouteComponentProps } from 'react-router';
import HelpButton from '../components/HelpButton';
import { api, Consultation, Episode, fmtTime } from '../services/api';

// Workflow steps not built yet — enabled in later weeks.
const UPCOMING = [
  { icon: camera, title: 'Scan prescription', note: 'Week 5–6: OCR + medicine matching' },
  { icon: checkmarkCircle, title: 'Verify', note: 'Week 7: consultation vs prescription checks' },
  { icon: notifications, title: 'Care plan & reminders', note: 'Week 8' },
  { icon: pulse, title: 'Daily check-in', note: 'Week 9: symptoms + sleep' },
];

export default function EpisodeDetail({ match }: RouteComponentProps<{ id: string }>) {
  const id = match.params.id;
  const [ep, setEp] = useState<Episode | null>(null);
  const [consults, setConsults] = useState<Consultation[]>([]);
  const [alert] = useIonAlert();
  const router = useIonRouter();

  useIonViewWillEnter(() => {
    api<Episode>(`/episodes/${id}`).then(setEp).catch(() => {});
    api<Consultation[]>(`/episodes/${id}/consultations`).then(setConsults).catch(() => {});
  });

  const close = () =>
    alert({
      header: 'Feeling recovered?',
      message: 'Close this episode and move it to your health history?',
      buttons: [
        { text: 'Not yet', role: 'cancel' },
        { text: 'Close episode', handler: async () => { setEp(await api<Episode>(`/episodes/${id}/close`, { method: 'PATCH' })); } },
      ],
    });

  const remove = () =>
    alert({
      header: 'Delete episode?',
      message: 'This permanently deletes this episode and all its consultations.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: async () => { await api(`/episodes/${id}`, { method: 'DELETE' }); router.push('/episodes', 'back', 'pop'); } },
      ],
    });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/episodes" /></IonButtons>
          <IonTitle>{ep?.category ?? 'Episode'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        {ep && (
          <>
            <h2>{ep.title}</h2>
            <p className="muted">Started {new Date(ep.start_date).toLocaleDateString()} · {ep.status}</p>
            {ep.issue_description && <p>{ep.issue_description}</p>}

            {ep.status === 'active' && (
              <IonButton expand="block" routerLink={`/episodes/${id}/record`}>
                <IonIcon icon={mic} slot="start" />Record consultation
              </IonButton>
            )}

            <IonList inset>
              <IonListHeader>Consultations</IonListHeader>
              {consults.length === 0 && (
                <IonItem><IonLabel className="muted">None yet. Record one at your doctor's visit.</IonLabel></IonItem>
              )}
              {consults.map((c) => (
                <IonItem key={c.id} routerLink={`/consultations/${c.id}`} detail>
                  <IonIcon icon={documentText} slot="start" />
                  <IonLabel>
                    <h3>{new Date(c.recorded_at).toLocaleString()}</h3>
                    <p>{c.transcript[0]?.text ?? 'No speech detected'}</p>
                  </IonLabel>
                  <IonNote slot="end">{fmtTime(c.duration_sec)}</IonNote>
                </IonItem>
              ))}
            </IonList>

            <IonList inset>
              <IonListHeader>Coming next</IonListHeader>
              {UPCOMING.map((s) => (
                <IonItem key={s.title} disabled>
                  <IonIcon icon={s.icon} slot="start" />
                  <IonLabel><h3>{s.title}</h3><p>{s.note}</p></IonLabel>
                </IonItem>
              ))}
            </IonList>

            {ep.status === 'active' && <IonButton expand="block" fill="outline" onClick={close}>Close episode</IonButton>}
            <IonButton expand="block" fill="clear" color="danger" onClick={remove}>Delete episode</IonButton>
          </>
        )}
        <HelpButton />
      </IonContent>
    </IonPage>
  );
}
