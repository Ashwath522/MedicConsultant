import {
  IonBadge, IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonSegment, IonSegmentButton,
  IonTitle, IonToolbar, useIonViewWillEnter,
} from '@ionic/react';
import { useState } from 'react';
import HelpButton from '../components/HelpButton';
import { api, Episode } from '../services/api';

export default function Episodes() {
  const [status, setStatus] = useState<'active' | 'closed'>('active');
  const [items, setItems] = useState<Episode[]>([]);

  const load = (s = status) => api<Episode[]>(`/episodes?status=${s}`).then(setItems).catch(() => {});
  useIonViewWillEnter(() => { load(); });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar><IonTitle>Episodes</IonTitle></IonToolbar>
        <IonToolbar>
          <IonSegment value={status} onIonChange={(e) => { const s = e.detail.value as 'active' | 'closed'; setStatus(s); load(s); }}>
            <IonSegmentButton value="active"><IonLabel>Active</IonLabel></IonSegmentButton>
            <IonSegmentButton value="closed"><IonLabel>History</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {items.length === 0 ? (
          <div className="empty">No {status === 'active' ? 'active episodes' : 'past episodes'}.</div>
        ) : (
          <IonList inset>
            {items.map((e) => (
              <IonItem key={e.id} routerLink={`/episodes/${e.id}`} detail>
                <IonLabel>
                  <h2>{e.title}</h2>
                  <p>{e.issue_description || '—'}</p>
                </IonLabel>
                <IonBadge slot="end" color="light">{e.category}</IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}
        <HelpButton />
      </IonContent>
    </IonPage>
  );
}
