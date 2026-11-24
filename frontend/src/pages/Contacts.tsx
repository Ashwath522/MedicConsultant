import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonItemOption, IonItemOptions,
  IonItemSliding, IonLabel, IonList, IonListHeader, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToggle,
  IonToolbar, useIonToast, useIonViewWillEnter,
} from '@ionic/react';
import { useState } from 'react';
import { api, Contact } from '../services/api';

const EMPTY = { type: 'family' as 'family' | 'doctor', name: '', phone: '', relation: '', caregiver_alerts: false };

export default function Contacts() {
  const [items, setItems] = useState<Contact[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [toast] = useIonToast();

  const load = () => api<Contact[]>('/contacts').then(setItems).catch(() => {});
  useIonViewWillEnter(() => { load(); });

  const add = async () => {
    try {
      await api('/contacts', { method: 'POST', body: form });
      setForm(EMPTY);
      load();
    } catch (e) {
      toast({ message: (e as Error).message, duration: 2500, color: 'danger' });
    }
  };

  const remove = async (id: string) => { await api(`/contacts/${id}`, { method: 'DELETE' }); load(); };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/profile" /></IonButtons>
          <IonTitle>Contacts</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonList inset>
          <IonListHeader>Your support contacts</IonListHeader>
          {items.length === 0 && <IonItem><IonLabel className="muted">None yet</IonLabel></IonItem>}
          {items.map((c) => (
            <IonItemSliding key={c.id}>
              <IonItem href={`tel:${c.phone}`}>
                <IonLabel>
                  <h2>{c.type === 'doctor' ? '🩺' : '👨‍👩‍👧'} {c.name}</h2>
                  <p>{c.relation} · {c.phone}</p>
                </IonLabel>
              </IonItem>
              <IonItemOptions side="end">
                <IonItemOption color="danger" onClick={() => remove(c.id)}>Delete</IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>

        <IonList inset>
          <IonListHeader>Add contact</IonListHeader>
          <IonItem>
            <IonSegment value={form.type} onIonChange={(e) => setForm({ ...form, type: e.detail.value as 'family' | 'doctor' })}>
              <IonSegmentButton value="family"><IonLabel>Family</IonLabel></IonSegmentButton>
              <IonSegmentButton value="doctor"><IonLabel>Doctor</IonLabel></IonSegmentButton>
            </IonSegment>
          </IonItem>
          <IonItem><IonInput label="Name" value={form.name} onIonInput={(e) => setForm({ ...form, name: e.detail.value ?? '' })} /></IonItem>
          <IonItem><IonInput label="Phone" type="tel" value={form.phone} onIonInput={(e) => setForm({ ...form, phone: e.detail.value ?? '' })} /></IonItem>
          <IonItem><IonInput label={form.type === 'doctor' ? 'Clinic' : 'Relation'} value={form.relation} onIonInput={(e) => setForm({ ...form, relation: e.detail.value ?? '' })} /></IonItem>
          {form.type === 'family' && (
            <IonItem>
              <IonToggle checked={form.caregiver_alerts} onIonChange={(e) => setForm({ ...form, caregiver_alerts: e.detail.checked })}>
                Alert if I miss doses (opt-in)
              </IonToggle>
            </IonItem>
          )}
        </IonList>
        <div className="ion-padding">
          <IonButton expand="block" onClick={add} disabled={!form.name || form.phone.length < 5}>Add contact</IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}
