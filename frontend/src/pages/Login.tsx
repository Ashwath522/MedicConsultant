import {
  IonButton, IonContent, IonHeader, IonInput, IonItem, IonList, IonPage, IonSegment, IonSegmentButton,
  IonLabel, IonTitle, IonToolbar, useIonToast,
} from '@ionic/react';
import { useState } from 'react';
import { api, setToken } from '../services/api';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast] = useIonToast();

  const submit = async () => {
    setBusy(true);
    try {
      const body = mode === 'signup' ? { name, email, password } : { email, password };
      const { token } = await api<{ token: string }>(`/auth/${mode}`, { method: 'POST', body });
      setToken(token);
      window.location.href = mode === 'signup' ? '/profile' : '/home';
    } catch (e) {
      toast({ message: (e as Error).message, duration: 2500, color: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>ConsultKeeper</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        <h2>Your doctor's advice, remembered.</h2>
        <p className="muted">Record consultations, check prescriptions and recover with confidence.</p>
        <IonSegment value={mode} onIonChange={(e) => setMode(e.detail.value as 'login' | 'signup')}>
          <IonSegmentButton value="login"><IonLabel>Log in</IonLabel></IonSegmentButton>
          <IonSegmentButton value="signup"><IonLabel>Sign up</IonLabel></IonSegmentButton>
        </IonSegment>
        <IonList inset>
          {mode === 'signup' && (
            <IonItem><IonInput label="Name" labelPlacement="stacked" value={name} onIonInput={(e) => setName(e.detail.value ?? '')} /></IonItem>
          )}
          <IonItem><IonInput type="email" label="Email" labelPlacement="stacked" value={email} onIonInput={(e) => setEmail(e.detail.value ?? '')} /></IonItem>
          <IonItem><IonInput type="password" label="Password (min 6)" labelPlacement="stacked" value={password} onIonInput={(e) => setPassword(e.detail.value ?? '')} /></IonItem>
        </IonList>
        <IonButton expand="block" onClick={submit} disabled={busy}>
          {mode === 'login' ? 'Log in' : 'Create account'}
        </IonButton>
        <p className="muted ion-text-center">ConsultKeeper does not give medical advice. Always confirm with your doctor.</p>
      </IonContent>
    </IonPage>
  );
}
