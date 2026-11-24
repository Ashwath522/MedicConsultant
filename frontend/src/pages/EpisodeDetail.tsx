import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar,
  useIonActionSheet, useIonAlert, useIonRouter, useIonViewWillEnter,
} from '@ionic/react';
import { chevronForward, documentTextOutline, ellipsisHorizontal } from 'ionicons/icons';
import { useState } from 'react';
import { RouteComponentProps } from 'react-router';
import HelpButton from '../components/HelpButton';
import { api, Consultation, Episode, fmtTime } from '../services/api';
import { Item, monogram, Pressable, Stagger, useEnterKey } from '../ui/motion';
import Stepper, { Step } from '../ui/Stepper';
import { EcgLine } from '../ui/ambient';

const daysSince = (d: string) => Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) + 1);

export default function EpisodeDetail({ match }: RouteComponentProps<{ id: string }>) {
  const id = match.params.id;
  const [ep, setEp] = useState<Episode | null>(null);
  const [consults, setConsults] = useState<Consultation[]>([]);
  const [alert] = useIonAlert();
  const [sheet] = useIonActionSheet();
  const router = useIonRouter();
  const k = useEnterKey();

  useIonViewWillEnter(() => {
    api<Episode>(`/episodes/${id}`).then(setEp).catch(() => {});
    api<Consultation[]>(`/episodes/${id}/consultations`).then(setConsults).catch(() => {});
  });

  const close = () =>
    alert({
      header: 'Feeling recovered?',
      message: 'Close this episode and move it to your health history?',
      buttons: [
        { text: 'Not yet', role: 'cancel' },
        { text: 'Close episode', handler: async () => { setEp(await api<Episode>(`/episodes/${id}/close`, { method: 'PATCH' })); } },
      ],
    });

  const remove = () =>
    alert({
      header: 'Delete episode?',
      message: 'This permanently deletes this episode and all its consultations.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: async () => { await api(`/episodes/${id}`, { method: 'DELETE' }); router.push('/episodes', 'back', 'pop'); } },
      ],
    });

  const more = () =>
    sheet({
      buttons: [
        ...(ep?.status === 'active' ? [{ text: 'Close episode', handler: close }] : []),
        { text: 'Delete episode', role: 'destructive', handler: remove },
        { text: 'Cancel', role: 'cancel' },
      ],
    });

  const active = ep?.status === 'active';
  const recorded = consults.length > 0;
  const steps: Step[] = [
    { title: 'Episode created', note: ep ? new Date(ep.start_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '', state: 'done' },
    {
      title: 'Record consultation',
      note: recorded ? `${consults.length} recorded · tap to add another` : 'Capture what the doctor says',
      state: recorded ? 'done' : 'current',
      onClick: active ? () => router.push(`/episodes/${id}/record`) : undefined,
    },
    { title: 'Scan prescription', note: 'Read & match medicines', state: recorded ? 'current' : 'todo' },
    { title: 'Verify', note: 'Consultation vs prescription', state: 'todo' },
    { title: 'Care plan', note: 'Reminders around your routine', state: 'todo' },
    { title: 'Recover', note: 'Daily check-ins, sleep, follow-ups', state: 'todo' },
  ];

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/episodes" text="" /></IonButtons>
          <IonTitle>{ep?.category ?? ''}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={more}><IonIcon icon={ellipsisHorizontal} /></IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {ep && (
          <Stagger k={k} className="page" >
            <Item>
              <div className="card ink beam" style={{ marginTop: 8 }}>
                <div className="row">
                  <div className="mono">{monogram(ep.category)}</div>
                  <div className="grow">
                    <div className="muted" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {active ? `Day ${daysSince(ep.start_date)}` : 'Closed'} · {ep.category}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 2 }}>{ep.title}</div>
                  </div>
                </div>
                {ep.issue_description && <p className="muted" style={{ margin: '14px 0 0', lineHeight: 1.5 }}>"{ep.issue_description}"</p>}
                {active && <div style={{ margin: '12px -18px -18px' }}><EcgLine beats={3} height={36} color="#fafafa" speed={2.8} /></div>}
              </div>
            </Item>

            <Item><div className="eyebrow">Your path</div></Item>
            <Item>
              <div className="card"><Stepper steps={steps} k={k} /></div>
            </Item>

            {recorded && (
              <>
                <Item><div className="eyebrow">Consultations</div></Item>
                {consults.map((c) => (
                  <Item key={c.id}>
                    <Pressable className="card tap" onClick={() => router.push(`/consultations/${c.id}`)}>
                      <div className="row">
                        <div className="mono"><IonIcon icon={documentTextOutline} /></div>
                        <div className="grow">
                          <div style={{ fontWeight: 650 }}>
                            {new Date(c.recorded_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                            <span className="muted tabular" style={{ fontWeight: 500 }}> · {fmtTime(c.duration_sec)}</span>
                          </div>
                          <div className="muted ellipsis" style={{ fontSize: 14 }}>{c.transcript[0]?.text ?? 'No speech detected'}</div>
                        </div>
                        <IonIcon icon={chevronForward} style={{ color: 'var(--ck-faint)' }} />
                      </div>
                    </Pressable>
                  </Item>
                ))}
              </>
            )}
          </Stagger>
        )}
        <HelpButton />
      </IonContent>
    </IonPage>
  );
}
