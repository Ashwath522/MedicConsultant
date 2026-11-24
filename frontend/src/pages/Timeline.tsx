import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import HelpButton from '../components/HelpButton';

export default function Timeline() {
  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Recovery Timeline</IonTitle></IonToolbar></IonHeader>
      <IonContent fullscreen>
        <div className="empty">
          <p>Your day-by-day recovery will show here: doses taken, symptoms, sleep and follow-ups.</p>
          <p className="muted">(Built in week 9.)</p>
        </div>
        <HelpButton />
      </IonContent>
    </IonPage>
  );
}
