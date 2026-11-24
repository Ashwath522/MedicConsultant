import {
  IonButton, IonContent, IonDatetime, IonDatetimeButton, IonHeader, IonInput, IonItem, IonLabel, IonList,
  IonListHeader, IonModal, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, useIonToast,
  useIonViewWillEnter,
} from '@ionic/react';
import { useState } from 'react';
import { api, Profile as P, setToken } from '../services/api';

const ROUTINE: [keyof P, string][] = [
  ['wake_time', 'Wake up'], ['breakfast_time', 'Breakfast'], ['lunch_time', 'Lunch'],
  ['dinner_time', 'Dinner'], ['bed_time', 'Bed time'],
];

const toList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export default function Profile() {
  const [p, setP] = useState<P | null>(null);
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [meds, setMeds] = useState('');
  const [toast] = useIonToast();

  useIonViewWillEnter(() => {
    api<P>('/profile').then((d) => {
      setP(d);
      setAllergies(d.allergies.join(', '));
      setConditions(d.chronic_conditions.join(', '));
      setMeds(d.regular_medicines.join(', '));
    }).catch(() => {});
  });

  if (!p) return <IonPage><IonContent /></IonPage>;
  const set = (k: keyof P, v: unknown) => setP({ ...p, [k]: v });

  const save = async () => {
    try {
      const body = {
        name: p.name, age: p.age, language: p.language,
        allergies: toList(allergies), chronic_conditions: toList(conditions), regular_medicines: toList(meds),
        ...Object.fromEntries(ROUTINE.map(([k]) => [k, p[k]])),
      };
      setP(await api<P>('/profile', { method: 'PUT', body }));
      toast({ message: 'Profile saved', duration: 1500, color: 'success' });
    } catch (e) {
      toast({ message: (e as Error).message, duration: 2500, color: 'danger' });
    }
  };

  const logout = () => { setToken(null); window.location.href = '/login'; };

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Profile</IonTitle></IonToolbar></IonHeader>
      <IonContent fullscreen>
        <IonList inset>
          <IonListHeader>About you</IonListHeader>
          <IonItem><IonInput label="Name" value={p.name} onIonInput={(e) => set('name', e.detail.value ?? '')} /></IonItem>
          <IonItem><IonInput label="Age" type="number" value={p.age ?? ''} onIonInput={(e) => set('age', e.detail.value ? Number(e.detail.value) : null)} /></IonItem>
          <IonItem>
            <IonSelect label="Language" value={p.language} onIonChange={(e) => set('language', e.detail.value)}>
              <IonSelectOption value="en">English</IonSelectOption>
              <IonSelectOption value="hi">Hindi</IonSelectOption>
              <IonSelectOption value="kn">Kannada</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Health profile (used for safety checks)</IonListHeader>
          <IonItem><IonInput label="Allergies" labelPlacement="stacked" placeholder="e.g. penicillin, sulfa" value={allergies} onIonInput={(e) => setAllergies(e.detail.value ?? '')} /></IonItem>
          <IonItem><IonInput label="Chronic conditions" labelPlacement="stacked" placeholder="e.g. BP, diabetes" value={conditions} onIonInput={(e) => setConditions(e.detail.value ?? '')} /></IonItem>
          <IonItem><IonInput label="Regular medicines" labelPlacement="stacked" placeholder="e.g. Amlodipine 5mg" value={meds} onIonInput={(e) => setMeds(e.detail.value ?? '')} /></IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Daily routine (reminders fit around this)</IonListHeader>
          {ROUTINE.map(([k, label]) => (
            <IonItem key={k}>
              <IonLabel>{label}</IonLabel>
              <IonDatetimeButton datetime={`dt-${k}`} slot="end" />
              <IonModal keepContentsMounted>
                <IonDatetime
                  id={`dt-${k}`} presentation="time" hourCycle="h12"
                  value={`2000-01-01T${p[k]}:00`}
                  onIonChange={(e) => { const v = String(e.detail.value ?? ''); set(k, v.slice(11, 16)); }}
                />
              </IonModal>
            </IonItem>
          ))}
        </IonList>

        <div className="ion-padding">
          <IonButton expand="block" onClick={save}>Save profile</IonButton>
          <IonButton expand="block" fill="outline" routerLink="/profile/contacts">Family & doctor contacts</IonButton>
          <IonButton expand="block" fill="clear" color="medium" onClick={logout}>Log out</IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}
