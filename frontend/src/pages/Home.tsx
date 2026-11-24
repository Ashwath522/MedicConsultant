import {
  IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, useIonRouter, useIonViewWillEnter,
} from '@ionic/react';
import { arrowForward, chevronForward, mic, notificationsOutline } from 'ionicons/icons';
import { useState } from 'react';
import HelpButton from '../components/HelpButton';
import { api, Blueprint, DayLog, Episode, Profile, Signals } from '../services/api';
import SignalCard from '../components/SignalCard';
import TodayTracker from '../components/TodayTracker';
import WelcomeSplash, { tipFor } from '../ui/WelcomeSplash';
import { Item, monogram, Pressable, Stagger, useEnterKey } from '../ui/motion';
import { EcgLine, HeartDot, Ticker } from '../ui/ambient';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const daysSince = (d: string) => Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) + 1);

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [active, setActive] = useState<Episode[] | null>(null);
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [log, setLog] = useState<DayLog | null>(null);
  const [splash, setSplash] = useState(false);
  const [signals, setSignals] = useState<Signals | null>(null);
  const k = useEnterKey();
  const router = useIonRouter();

  useIonViewWillEnter(() => {
    api<Profile>('/profile').then((p) => {
      setProfile(p);
      if (!p.onboarded) { router.push('/onboarding', 'root', 'replace'); return; }
      api<Blueprint>('/wellness/blueprint').then(setBp).catch(() => {});
      api<DayLog>('/wellness/today').then(setLog).catch(() => {});
      api<Signals>('/signals/today').then(setSignals).catch(() => {});
      try {
        if (!sessionStorage.getItem('ck_welcomed')) { setSplash(true); sessionStorage.setItem('ck_welcomed', '1'); }
      } catch { /* storage unavailable */ }
    }).catch(() => {});
    api<Episode[]>('/episodes?status=active').then(setActive).catch(() => setActive([]));
  });

  const first = profile?.name?.split(' ')[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar><IonTitle>Today</IonTitle></IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar><IonTitle size="large">Today</IonTitle></IonToolbar>
        </IonHeader>

        <Stagger k={k} className="page">
          <Item>
            <p className="muted" style={{ margin: '0 4px 4px', fontWeight: 500 }}>{today}</p>
            <h1 className="h1" style={{ margin: '0 4px 20px' }}>{greeting()}{first ? `, ${first}` : ''}.</h1>
          </Item>

          {signals && (
            <Item><SignalCard s={signals} onOpen={() => router.push('/timeline')} /></Item>
          )}

          {bp && log && (
            <Item>
              <div className="row" style={{ margin: '0 4px 10px', justifyContent: 'space-between' }}>
                <div className="eyebrow" style={{ margin: 0 }}>Today's health</div>
                <div className="row" style={{ gap: 6 }}><span className="chip" onClick={() => router.push('/trends')}>Trends</span><span className="chip" onClick={() => router.push('/labs')}>Labs</span><span className="chip" onClick={() => router.push('/blueprint')}>My blueprint</span></div>
              </div>
              <TodayTracker bp={bp} log={log} setLog={setLog} k={k} />
            </Item>
          )}

          {/* Hero card */}
          <Item>
            <div className="card ink beam">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <div className="muted" style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <HeartDot color="#fafafa" size={7} />&nbsp; Reminders
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 8 }}>
                    Nothing due right now
                  </div>
                  <div className="muted" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>
                    Medicine, water and check-in reminders appear here once your care plan is ready.
                  </div>
                </div>
                <IonIcon icon={notificationsOutline} style={{ fontSize: 26, opacity: 0.8 }} />
              </div>
              <div className="row" style={{ marginTop: 20, gap: 24 }}>
                <div>
                  <div className="tabular" style={{ fontSize: 28, fontWeight: 700 }}><Ticker value={active?.length ?? 0} /></div>
                  <div className="muted" style={{ fontSize: 13 }}>Active issues</div>
                </div>
                <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.15)' }} />
                <div>
                  <div className="tabular" style={{ fontSize: 28, fontWeight: 700 }}>0</div>
                  <div className="muted" style={{ fontSize: 13 }}>Doses today</div>
                </div>
              </div>
              <div style={{ margin: '16px -18px -18px', opacity: 0.9 }}>
                <EcgLine beats={4} height={44} color="#fafafa" />
              </div>
            </div>
          </Item>

          <Item><div className="eyebrow">Active episodes</div></Item>

          {active === null && (
            <Item>
              <div className="skeleton" style={{ height: 76, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 76 }} />
            </Item>
          )}

          {active?.length === 0 && (
            <Item>
              <Pressable className="card tap" onClick={() => router.push('/new')}>
                <div className="row">
                  <div className="mono" style={{ background: 'var(--ck-ink)', color: 'var(--ck-on-ink)' }}><IonIcon icon={mic} /></div>
                  <div className="grow">
                    <div style={{ fontWeight: 650 }}>Seeing a doctor soon?</div>
                    <div className="muted" style={{ fontSize: 14 }}>Start an episode and record the visit.</div>
                  </div>
                  <IonIcon icon={arrowForward} />
                </div>
              </Pressable>
            </Item>
          )}

          {active?.map((e) => (
            <Item key={e.id}>
              <Pressable className="card tap" onClick={() => router.push(`/episodes/${e.id}`)}>
                <div className="row">
                  <div className="mono">{monogram(e.category)}</div>
                  <div className="grow">
                    <div className="ellipsis" style={{ fontWeight: 650 }}>{e.title}</div>
                    <div className="muted" style={{ fontSize: 14 }}>Day {daysSince(e.start_date)} · {e.category}</div>
                  </div>
                  <IonIcon icon={chevronForward} style={{ color: 'var(--ck-faint)' }} />
                </div>
              </Pressable>
            </Item>
          ))}
        </Stagger>
        <HelpButton />
      </IonContent>
      <WelcomeSplash open={splash} name={first} tip={tipFor(profile?.age, profile?.sex)} onClose={() => setSplash(false)} />
    </IonPage>
  );
}
