import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader,
  IonPage, IonTitle, IonToolbar, useIonViewWillEnter,
} from '@ionic/react';
import { useState } from 'react';
import HelpButton from '../components/HelpButton';
import { api, Episode, Profile } from '../services/api';

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [active, setActive] = useState<Episode[]>([]);

  useIonViewWillEnter(() => {
    api<Profile>('/profile').then(setProfile).catch(() => {});
    api<Episode[]>('/episodes?status=active').then(setActive).catch(() => {});
  });

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Home</IonTitle></IonToolbar></IonHeader>
      <IonContent fullscreen className="ion-padding">
        <h2>Hi {profile?.name?.split(' ')[0] ?? 'there'} 👋</h2>

        <IonCard>
          <IonCardHeader>
            <IonCardSubtitle>Today</IonCardSubtitle>
            <IonCardTitle>No reminders yet</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>Your medicine and check-in reminders will appear here once a care plan is set up.</IonCardContent>
        </IonCard>

        <h3>Active episodes</h3>
        {active.length === 0 ? (
          <div className="empty">
            <p>No active health issues.</p>
            <IonButton routerLink="/new">Start a new episode</IonButton>
          </div>
        ) : (
          active.map((e) => (
            <IonCard key={e.id} routerLink={`/episodes/${e.id}`} button>
              <IonCardHeader>
                <IonCardSubtitle>{e.category}</IonCardSubtitle>
                <IonCardTitle>{e.title}</IonCardTitle>
              </IonCardHeader>
            </IonCard>
          ))
        )}
        <HelpButton />
      </IonContent>
    </IonPage>
  );
}
