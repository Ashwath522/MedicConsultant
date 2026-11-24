import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, useIonViewWillEnter } from '@ionic/react';
import { useState } from 'react';
import BlueprintView from '../components/BlueprintView';
import { api, Blueprint } from '../services/api';
import { useEnterKey } from '../ui/motion';

export default function BlueprintPage() {
  const [bp, setBp] = useState<Blueprint | null>(null);
  const k = useEnterKey();
  useIonViewWillEnter(() => { api<Blueprint>('/wellness/blueprint').then(setBp).catch(() => {}); });

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/profile" text="" /></IonButtons>
          <IonTitle>Health blueprint</IonTitle>
          <IonButtons slot="end"><IonButton routerLink="/onboarding">Update</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="page" style={{ paddingTop: 12 }}>
          {!bp ? <div className="skeleton" style={{ height: 200 }} /> : <BlueprintView bp={bp} k={k} />}
        </div>
      </IonContent>
    </IonPage>
  );
}
