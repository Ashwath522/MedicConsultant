import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonPage, IonTitle, IonToggle,
  IonToolbar, useIonActionSheet, useIonToast, useIonViewWillEnter,
} from '@ionic/react';
import { AnimatePresence, motion } from 'framer-motion';
import { call, ellipsisHorizontal, medkitOutline, peopleOutline } from 'ionicons/icons';
import { useState } from 'react';
import { api, Contact } from '../services/api';
import { EASE, Item, Stagger, useEnterKey } from '../ui/motion';

const EMPTY = { type: 'family' as 'family' | 'doctor', name: '', phone: '', relation: '', caregiver_alerts: false };

export default function Contacts() {
  const [items, setItems] = useState<Contact[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [toast] = useIonToast();
  const [sheet] = useIonActionSheet();
  const k = useEnterKey();

  const load = () => api<Contact[]>('/contacts').then(setItems).catch(() => {});
  useIonViewWillEnter(() => { load(); });

  const add = async () => {
    try {
      await api('/contacts', { method: 'POST', body: form });
      setForm(EMPTY);
      load();
    } catch (e) {
      toast({ message: (e as Error).message, duration: 2500, position: 'top' });
    }
  };

  const options = (c: Contact) =>
    sheet({
      header: c.name,
      buttons: [
        { text: `Call ${c.phone}`, handler: () => { window.location.href = `tel:${c.phone}`; } },
        { text: 'Delete contact', role: 'destructive', handler: async () => { await api(`/contacts/${c.id}`, { method: 'DELETE' }); load(); } },
        { text: 'Cancel', role: 'cancel' },
      ],
    });

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/profile" text="" /></IonButtons>
          <IonTitle>Family & doctor</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <Stagger k={k} className="page">
          <Item><p className="lead" style={{ margin: '12px 4px 16px' }}>These people are one tap away from every screen.</p></Item>

          <AnimatePresence>
            {items.map((c) => (
              <motion.div key={c.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.4, ease: EASE }}>
                <div className="card row">
                  <div className="mono"><IonIcon icon={c.type === 'doctor' ? medkitOutline : peopleOutline} /></div>
                  <div className="grow">
                    <div style={{ fontWeight: 650 }}>{c.name}</div>
                    <div className="muted" style={{ fontSize: 14 }}>{[c.relation, c.phone].filter(Boolean).join(' · ')}</div>
                  </div>
                  <motion.a whileTap={{ scale: 0.88 }} href={`tel:${c.phone}`} aria-label={`Call ${c.name}`}
                    style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--ck-ink)', color: 'var(--ck-on-ink)', display: 'grid', placeItems: 'center' }}>
                    <IonIcon icon={call} />
                  </motion.a>
                  <IonButton fill="clear" onClick={() => options(c)} aria-label="More"><IonIcon icon={ellipsisHorizontal} /></IonButton>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <Item><div className="eyebrow">Add someone</div></Item>
          <Item>
            <div className="chips" style={{ marginBottom: 12 }}>
              {(['family', 'doctor'] as const).map((t) => (
                <motion.span key={t} whileTap={{ scale: 0.92 }} className={`chip ${form.type === t ? 'on' : ''}`} onClick={() => setForm({ ...form, type: t })}>
                  {t === 'family' ? 'Family' : 'Doctor'}
                </motion.span>
              ))}
            </div>
            <div className="field"><IonInput label="Name" labelPlacement="floating" value={form.name} onIonInput={(e) => setForm({ ...form, name: e.detail.value ?? '' })} /></div>
            <div className="field"><IonInput label="Phone" labelPlacement="floating" type="tel" value={form.phone} onIonInput={(e) => setForm({ ...form, phone: e.detail.value ?? '' })} /></div>
            <div className="field"><IonInput label={form.type === 'doctor' ? 'Clinic' : 'Relation'} labelPlacement="floating" value={form.relation} onIonInput={(e) => setForm({ ...form, relation: e.detail.value ?? '' })} /></div>
            <AnimatePresence>
              {form.type === 'family' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="card flat" style={{ padding: '14px 16px' }}>
                    <IonToggle checked={form.caregiver_alerts} onIonChange={(e) => setForm({ ...form, caregiver_alerts: e.detail.checked })} style={{ width: '100%' }}>
                      <div style={{ fontWeight: 600 }}>Alert if I miss doses</div>
                      <div className="muted" style={{ fontSize: 13 }}>Optional · off by default</div>
                    </IonToggle>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <IonButton expand="block" size="large" onClick={add} disabled={!form.name || form.phone.length < 5} style={{ marginTop: 12 }}>Add contact</IonButton>
          </Item>
        </Stagger>
      </IonContent>
    </IonPage>
  );
}
