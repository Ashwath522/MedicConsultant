import {
  IonButton, IonContent, IonHeader, IonInput, IonItem, IonList, IonNote, IonPage, IonSelect, IonSelectOption,
  IonTextarea, IonTitle, IonToolbar, useIonRouter, useIonToast,
} from '@ionic/react';
import { useState } from 'react';
import { api, Episode } from '../services/api';

const CATEGORIES = [
  'Fever', 'Cold & Cough', 'Infection', 'Stomach', 'Injury', 'Surgery', 'Skin', 'Dental', 'Eye',
  'Heart & BP', 'Diabetes', "Women's Health", 'Mental Health', 'Checkup', 'Other',
];

/** Step 1 of the workflow: describe the issue → AI suggests category + title → user confirms. */
export default function NewEpisode() {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [suggested, setSuggested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast] = useIonToast();
  const router = useIonRouter();

  const suggest = async () => {
    setBusy(true);
    try {
      const s = await api<{ category: string; title: string }>('/episodes/suggest', { method: 'POST', body: { description } });
      setCategory(s.category);
      setTitle(s.title);
      setSuggested(true);
    } catch (e) {
      toast({ message: (e as Error).message, duration: 2500, color: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const e = await api<Episode>('/episodes', { method: 'POST', body: { title, category, issue_description: description } });
      setDescription(''); setCategory(''); setTitle(''); setSuggested(false);
      router.push(`/episodes/${e.id}`, 'forward', 'replace');
    } catch (err) {
      toast({ message: (err as Error).message, duration: 2500, color: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>New Episode</IonTitle></IonToolbar></IonHeader>
      <IonContent fullscreen className="ion-padding">
        <p className="muted">Describe what you're experiencing. We'll organise it for you.</p>
        <IonList inset>
          <IonItem>
            <IonTextarea
              label="What's the issue?" labelPlacement="stacked" autoGrow rows={3}
              placeholder="e.g. Fever and body pain since yesterday"
              value={description} onIonInput={(e) => { setDescription(e.detail.value ?? ''); setSuggested(false); }}
            />
          </IonItem>
        </IonList>

        {!suggested ? (
          <IonButton expand="block" onClick={suggest} disabled={busy || description.trim().length < 3}>
            Continue
          </IonButton>
        ) : (
          <>
            <IonNote className="ion-padding-start">Suggested — please check and edit if needed.</IonNote>
            <IonList inset>
              <IonItem>
                <IonSelect label="Category" labelPlacement="stacked" value={category} onIonChange={(e) => setCategory(e.detail.value)}>
                  {CATEGORIES.map((c) => <IonSelectOption key={c} value={c}>{c}</IonSelectOption>)}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonInput label="Title" labelPlacement="stacked" value={title} onIonInput={(e) => setTitle(e.detail.value ?? '')} />
              </IonItem>
            </IonList>
            <IonButton expand="block" onClick={save} disabled={busy || !title || !category}>
              Create episode
            </IonButton>
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
