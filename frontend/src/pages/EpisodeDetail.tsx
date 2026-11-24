import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList,
  IonListHeader, IonPage, IonTitle, IonToolbar, useIonAlert, useIonRouter, useIonViewWillEnter,
} from '@ionic/react';
import { camera, checkmarkCircle, mic, notifications, pulse } from 'ionicons/icons';
import { useState } from 'react';
import { RouteComponentProps } from 'react-router';
import HelpButton from '../components/HelpButton';
import { api, Episode } from '../services/api';

// Next steps of the workflow — each becomes live in later weeks.
const STEPS = [
  { icon: mic, title: 'Record consultation', note: 'Week 3–4: transcript + AI summary' },
  { icon: camera, title: 'Scan prescription', note: 'Week 5–6: OCR + medicine matching' },
  { icon: checkmarkCircle, title: 'Verify', note: 'Week 7: consultation vs prescription checks' },
  { icon: notifications, title: 'Care plan & reminders', note: 'Week 8' },
  { icon: pulse, title: 'Daily check-in', note: 'Week 9: symptoms + sleep' },
];

export default function EpisodeDetail({ match }: RouteComponentProps<{ id: string }>) {
  const [ep, setEp] = useState<Episode | null>(null);
  const [alert] = useIonAlert();
  const router = useIonRouter();

  useIonViewWillEnter(() => {
    api<Episode>(`/episodes/${match.params.id}`).then(setEp).catch(() => {});
  });

  const close = () =>
    alert({
      header: 'Feeling recovered?',
      message: 'Close this episode and move it to your health history?',
      buttons: [
        { text: 'Not yet', role: 'cancel' },
        { text: 'Close episode', handler: async () => { setEp(await api<Episode>(`/episodes/${match.params.id}/close`, { method: 'PATCH' })); } },
      ],
    });

  const remove = () =>
    alert({
      header: 'Delete episode?',
      message: 'This permanently deletes this episode and its data.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: async () => { await api(`/episodes/${match.params.id}`, { method: 'DELETE' }); router.push('/episodes', 'back', 'pop'); } },
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

            <IonList inset>
              <IonListHeader>Next steps</IonListHeader>
              {STEPS.map((s) => (
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
