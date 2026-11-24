import {
  IonButton, IonContent, IonDatetime, IonDatetimeButton, IonHeader, IonIcon, IonInput, IonModal, IonPage,
  IonTitle, IonToolbar, useIonRouter, useIonToast, useIonViewWillEnter,
} from '@ionic/react';
import { motion } from 'framer-motion';
import { bedOutline, bodyOutline, cafeOutline, chevronForward, moonOutline, peopleOutline, pulseOutline, restaurantOutline, sunnyOutline } from 'ionicons/icons';
import { useState } from 'react';
import { api, Profile as P, setToken } from '../services/api';
import { Item, Pressable, Stagger, useEnterKey } from '../ui/motion';

const ROUTINE: [keyof P, string, string][] = [
  ['wake_time', 'Wake up', sunnyOutline], ['breakfast_time', 'Breakfast', cafeOutline],
  ['lunch_time', 'Lunch', restaurantOutline], ['dinner_time', 'Dinner', moonOutline], ['bed_time', 'Bed time', bedOutline],
];
const LANGS = [['en', 'English'], ['hi', 'Hindi'], ['kn', 'Kannada']] as const;
const toList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const initials = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export default function Profile() {
  const [p, setP] = useState<P | null>(null);
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [meds, setMeds] = useState('');
  const [dirty, setDirty] = useState(false);
  const [toast] = useIonToast();
  const router = useIonRouter();
  const k = useEnterKey();

  useIonViewWillEnter(() => {
    api<P>('/profile').then((d) => {
      setP(d);
      setAllergies(d.allergies.join(', '));
      setConditions(d.chronic_conditions.join(', '));
      setMeds(d.regular_medicines.join(', '));
      setDirty(false);
    }).catch(() => {});
  });

  if (!p) return <IonPage><IonContent><div className="page" style={{ paddingTop: 80 }}><div className="skeleton" style={{ height: 120 }} /></div></IonContent></IonPage>;
  const set = (key: keyof P, v: unknown) => { setP({ ...p, [key]: v }); setDirty(true); };

  const save = async () => {
    try {
      const body = {
        name: p.name, language: p.language,
        allergies: toList(allergies), chronic_conditions: toList(conditions), regular_medicines: toList(meds),
        ...Object.fromEntries(ROUTINE.map(([key]) => [key, p[key]])),
      };
      setP(await api<P>('/profile', { method: 'PUT', body }));
      setDirty(false);
      toast({ message: 'Saved', duration: 1200, position: 'top' });
    } catch (e) {
      toast({ message: (e as Error).message, duration: 2500, position: 'top' });
    }
  };

  const logout = () => { setToken(null); window.location.href = '/login'; };

  return (
    <IonPage>
      <IonHeader translucent><IonToolbar><IonTitle>Profile</IonTitle></IonToolbar></IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense"><IonToolbar><IonTitle size="large">Profile</IonTitle></IonToolbar></IonHeader>

        <Stagger k={k} className="page">
          <Item>
            <div className="row" style={{ margin: '4px 4px 8px' }}>
              <motion.div
                initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                style={{ width: 68, height: 68, borderRadius: 22, background: 'var(--ck-ink)', color: 'var(--ck-on-ink)', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 700 }}
              >
                {initials(p.name || '?')}
              </motion.div>
              <div className="grow">
                <div className="h2">{p.name}</div>
                <div className="muted">{p.email}</div>
              </div>
            </div>
          </Item>

          <Item><div className="eyebrow">Body & goals</div></Item>
          <Item>
            <Pressable className="card tap" onClick={() => router.push('/blueprint')}>
              <div className="row">
                <div className="mono"><IonIcon icon={pulseOutline} /></div>
                <div className="grow">
                  <div style={{ fontWeight: 650 }}>Health blueprint</div>
                  <div className="muted" style={{ fontSize: 14 }}>
                    {p.sex ? `${p.sex === 'other' ? '' : p.sex[0].toUpperCase() + p.sex.slice(1) + ' · '}${p.age ?? '–'} yrs · ${p.height_cm ?? '–'} cm · ${p.weight_kg ?? '–'} kg` : 'Not set up yet'}
                  </div>
                </div>
                <IonIcon icon={chevronForward} style={{ color: 'var(--ck-faint)' }} />
              </div>
            </Pressable>
            <Pressable className="card tap" onClick={() => router.push('/onboarding')}>
              <div className="row">
                <div className="mono"><IonIcon icon={bodyOutline} /></div>
                <div className="grow">
                  <div style={{ fontWeight: 650 }}>Update body & goals</div>
                  <div className="muted" style={{ fontSize: 14 }}>Sex, age, height, weight, activity</div>
                </div>
                <IonIcon icon={chevronForward} style={{ color: 'var(--ck-faint)' }} />
              </div>
            </Pressable>
          </Item>

          <Item><div className="eyebrow">About you</div></Item>
          <Item>
            <div className="field"><IonInput label="Name" labelPlacement="floating" value={p.name} onIonInput={(e) => set('name', e.detail.value ?? '')} /></div>
            <div className="chips" style={{ margin: '6px 0 4px' }}>
              {LANGS.map(([v, l]) => (
                <motion.span key={v} whileTap={{ scale: 0.92 }} className={`chip ${p.language === v ? 'on' : ''}`} onClick={() => set('language', v)}>{l}</motion.span>
              ))}
            </div>
          </Item>

          <Item><div className="eyebrow">Health profile · used for safety checks</div></Item>
          <Item>
            <div className="field"><IonInput label="Allergies" labelPlacement="floating" placeholder="penicillin, sulfa" value={allergies} onIonInput={(e) => { setAllergies(e.detail.value ?? ''); setDirty(true); }} /></div>
            <div className="field"><IonInput label="Chronic conditions" labelPlacement="floating" placeholder="BP, diabetes" value={conditions} onIonInput={(e) => { setConditions(e.detail.value ?? ''); setDirty(true); }} /></div>
            <div className="field"><IonInput label="Regular medicines" labelPlacement="floating" placeholder="Amlodipine 5mg" value={meds} onIonInput={(e) => { setMeds(e.detail.value ?? ''); setDirty(true); }} /></div>
          </Item>

          <Item><div className="eyebrow">Daily routine · reminders fit around this</div></Item>
          <Item>
            <div className="card flat" style={{ padding: '4px 16px' }}>
              {ROUTINE.map(([key, label, icon], i) => (
                <div key={key} className="row" style={{ padding: '10px 0', borderBottom: i < ROUTINE.length - 1 ? '0.5px solid var(--ck-border)' : 0 }}>
                  <IonIcon icon={icon} style={{ fontSize: 20 }} />
                  <div className="grow" style={{ fontWeight: 550 }}>{label}</div>
                  <IonDatetimeButton datetime={`dt-${key}`} />
                  <IonModal keepContentsMounted>
                    <IonDatetime id={`dt-${key}`} presentation="time" hourCycle="h12" value={`2000-01-01T${p[key]}:00`}
                      onIonChange={(e) => set(key, String(e.detail.value ?? '').slice(11, 16))} />
                  </IonModal>
                </div>
              ))}
            </div>
          </Item>

          <Item>
            <Pressable className="card tap" style={{ marginTop: 20 }} onClick={() => router.push('/profile/contacts')}>
              <div className="row">
                <div className="mono"><IonIcon icon={peopleOutline} /></div>
                <div className="grow">
                  <div style={{ fontWeight: 650 }}>Family & doctor</div>
                  <div className="muted" style={{ fontSize: 14 }}>One-tap help contacts</div>
                </div>
                <IonIcon icon={chevronForward} style={{ color: 'var(--ck-faint)' }} />
              </div>
            </Pressable>
          </Item>

          <Item>
            <IonButton expand="block" fill="clear" color="medium" onClick={logout} style={{ marginTop: 8 }}>Log out</IonButton>
          </Item>
        </Stagger>

        {/* Floating save bar appears only when something changed */}
        <motion.div
          initial={false}
          animate={{ y: dirty ? 0 : 140, opacity: dirty ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(env(safe-area-inset-bottom) + 76px)', zIndex: 20 }}
        >
          <IonButton expand="block" size="large" onClick={save} style={{ boxShadow: 'var(--ck-shadow-lg)', borderRadius: 16 }}>Save changes</IonButton>
        </motion.div>
      </IonContent>
    </IonPage>
  );
}
