import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, useIonViewWillEnter,
} from '@ionic/react';
import { motion } from 'framer-motion';
import { arrowDown, arrowUp, bulbOutline, remove } from 'ionicons/icons';
import { useState } from 'react';
import { api, MetricSummary, Trends as T } from '../services/api';
import { Item, Stagger, useEnterKey } from '../ui/motion';
import ScoreRing from '../ui/ScoreRing';
import TrendChart from '../ui/TrendChart';
import CalendarHeatmap from '../ui/CalendarHeatmap';
import WeekdayBars from '../ui/WeekdayBars';
import Scatter from '../ui/Scatter';
import { Ambient, EcgLine, Ticker } from '../ui/ambient';

const GROUPS: [string, string[]][] = [
  ['Recovery', ['recovery']],
  ['Heart', ['rhr', 'hrv', 'vo2max']],
  ['Sleep', ['sleep_h', 'sleep_score']],
  ['Activity', ['steps', 'activity']],
  ['Body', ['temp_dev', 'resp', 'spo2']],
  ['Habits', ['water_ml', 'mood']],
];
const PERIODS = [7, 30, 90] as const;
const INFO: Record<string, string> = {
  recovery: 'From your HRV, resting heart rate and sleep vs your own 28-day normal.',
  sleep_score: '70% hours vs your target, 30% how regular your sleep is.',
  activity: 'Steps vs your daily goal. Workout strain needs workout heart rate (coming later).',
  temp_dev: 'Difference from your normal skin temperature.',
  mood: '1 = low, 4 = great.',
  vo2max: 'Estimated from resting heart rate and age (Uth 2004). Rises as fitness improves. ±10–15 %.',
};

function Change({ m }: { m: MetricSummary }) {
  if (m.change == null || Math.abs(m.change_pct ?? 0) < 1) {
    return <span className="chip" style={{ padding: '3px 8px', fontSize: 12 }}><IonIcon icon={remove} /> steady</span>;
  }
  const up = m.change > 0;
  const good = m.higher_is_better == null ? null : up === m.higher_is_better;
  return (
    <span className={`chip ${good ? 'on' : ''}`} style={{ padding: '3px 8px', fontSize: 12 }}>
      <IonIcon icon={up ? arrowUp : arrowDown} /> {Math.abs(m.change_pct ?? 0).toFixed(0)}%
    </span>
  );
}

export default function Trends() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [t, setT] = useState<T | null>(null);
  const k = useEnterKey();

  const load = (d = days) => { setT(null); api<T>(`/trends?days=${d}`).then(setT).catch(() => {}); };
  useIonViewWillEnter(() => load());

  const latest = (key: string) => {
    const rows = t?.series ?? [];
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i][key] != null) return rows[i][key] as number;
    return null;
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/timeline" text="" /></IonButtons>
          <IonTitle>Trends</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="page" style={{ paddingTop: 10 }}>
          {/* Period switch with sliding pill */}
          <div style={{ position: 'relative', display: 'flex', background: 'var(--ck-surface)', borderRadius: 14, padding: 4, marginBottom: 18 }}>
            {PERIODS.map((p) => (
              <button key={p} onClick={() => { setDays(p); load(p); }}
                style={{ position: 'relative', flex: 1, padding: '9px 0', border: 0, background: 'transparent', zIndex: 1, fontWeight: 650, fontFamily: 'inherit', color: days === p ? 'var(--ck-text)' : 'var(--ck-muted)' }}>
                {days === p && <motion.span layoutId="period" transition={{ type: 'spring', stiffness: 500, damping: 38 }} style={{ position: 'absolute', inset: 0, background: 'var(--ck-bg)', borderRadius: 10, boxShadow: 'var(--ck-shadow)', zIndex: -1 }} />}
                {p}D
              </button>
            ))}
          </div>

          {!t && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 150, marginBottom: 12 }} />)}

          {t && Object.keys(t.summary).length === 0 && (
            <div className="empty">No data yet. Add readings on the Signals tab or load the demo data.</div>
          )}

          {t && Object.keys(t.summary).length > 0 && (
            <Stagger k={k + days}>
              {/* Hero overview */}
              {(() => {
                const rec = latest('recovery'); const avg = t.summary.recovery?.avg;
                const diff = rec != null && avg != null ? Math.round(rec - avg) : null;
                const stat = (key: string, label: string) => {
                  const m = t.summary[key]; if (!m) return null;
                  const d = m.latest - m.avg;
                  return (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                      <div className="tabular" style={{ fontSize: 20, fontWeight: 750 }}>{m.decimals ? m.latest.toFixed(1) : Math.round(m.latest).toLocaleString()}<span style={{ fontSize: 11, color: '#a1a1aa' }}> {m.unit}</span></div>
                      <div style={{ fontSize: 11, color: '#a1a1aa' }}>{d >= 0 ? '+' : ''}{m.decimals ? d.toFixed(1) : Math.round(d)} vs avg</div>
                    </div>
                  );
                };
                return (
                  <Item>
                    <div className="card ink beam" style={{ padding: 22 }}>
                      <Ambient tone="dark" dots={false} />
                      <div style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Today's recovery</div>
                      <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
                        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1 }}>{rec == null ? '–' : <Ticker value={rec} />}<span style={{ fontSize: 24 }}>%</span></div>
                        {diff != null && <div style={{ fontSize: 15, fontWeight: 650 }}>{diff >= 0 ? '▲' : '▼'} {Math.abs(diff)} pts vs your {days}-day avg</div>}
                      </div>
                      <p style={{ color: '#d4d4d8', margin: '8px 0 16px', fontSize: 14 }}>
                        {rec == null ? 'Needs 2 weeks of heart data to score recovery.' : rec >= 67 ? 'Well recovered. A good day to be active.' : rec >= 34 ? 'Moderately recovered. Keep the effort sensible.' : 'Low recovery. Your body may need rest. Check Signals if you feel unwell.'}
                      </p>
                      <div className="row" style={{ gap: 12 }}>{stat('rhr', 'Resting HR')}{stat('hrv', 'HRV')}{stat('sleep_h', 'Sleep')}</div>
                      <div style={{ margin: '14px -22px -22px' }}><EcgLine beats={5} height={40} color="#fafafa" speed={3} /></div>
                    </div>
                  </Item>
                );
              })()}

              {/* Today's scores */}
              <Item>
                <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: '18px 8px' }}>
                  <ScoreRing value={latest('recovery')} label="Recovery" k={k + days} />
                  <ScoreRing value={latest('sleep_score')} label="Sleep" k={k + days} />
                  <ScoreRing value={latest('activity')} label="Activity" k={k + days} />
                </div>
              </Item>

              {/* Patterns */}
              {t.patterns.length > 0 && (
                <>
                  <Item><div className="eyebrow">Patterns we noticed</div></Item>
                  {t.patterns.map((p) => (
                    <Item key={p.title}>
                      <div className={`card ${p.good ? '' : 'flat'} row`} style={{ alignItems: 'flex-start' }}>
                        <div className="mono"><IonIcon icon={bulbOutline} /></div>
                        <div className="grow">
                          <div style={{ fontWeight: 650 }}>{p.title}</div>
                          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{p.detail}</div>
                        </div>
                      </div>
                    </Item>
                  ))}
                </>
              )}

              {/* Calendar */}
              <Item><div className="eyebrow">90-day recovery calendar</div></Item>
              <Item><div className="card"><CalendarHeatmap cal={t.calendar} /></div></Item>

              {/* Weekly rhythm */}
              {Object.keys(t.weekdays).length > 0 && (
                <>
                  <Item><div className="eyebrow">Your weekly rhythm</div></Item>
                  <Item>
                    <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                      {t.weekdays.recovery && <WeekdayBars vals={t.weekdays.recovery} label="Recovery" unit="%" k={k + days} />}
                      {t.weekdays.rhr && <WeekdayBars vals={t.weekdays.rhr} label="Resting HR" unit="bpm" k={k + days} />}
                      {t.weekdays.sleep_h && <WeekdayBars vals={t.weekdays.sleep_h} label="Sleep" unit="h" decimals={1} k={k + days} />}
                      {t.weekdays.steps && <WeekdayBars vals={t.weekdays.steps} label="Steps" unit="" k={k + days} />}
                    </div>
                  </Item>
                </>
              )}

              {/* Heart connection */}
              {t.scatter.points.length > 0 && (
                <>
                  <Item><div className="eyebrow">How your heart signals move together</div></Item>
                  <Item><div className="card"><Scatter points={t.scatter.points} r={t.scatter.r} /></div></Item>
                </>
              )}

              {/* Every metric */}
              {GROUPS.map(([group, keys]) => {
                const have = keys.filter((key) => t.summary[key]);
                if (!have.length) return null;
                return (
                  <div key={group}>
                    <Item><div className="eyebrow">{group}</div></Item>
                    {have.map((key) => {
                      const m = t.summary[key];
                      return (
                        <Item key={key}>
                          <div className="card">
                            <div className="row" style={{ alignItems: 'flex-start', marginBottom: 6 }}>
                              <div className="grow">
                                <div style={{ fontWeight: 700 }}>{m.label}</div>
                                <div className="muted" style={{ fontSize: 13 }}>
                                  avg <b className="tabular" style={{ color: 'var(--ck-text)' }}>{m.decimals ? m.avg.toFixed(m.decimals) : Math.round(m.avg).toLocaleString()}</b> {m.unit}
                                  {' · '}range {m.decimals ? m.min.toFixed(m.decimals) : Math.round(m.min)}–{m.decimals ? m.max.toFixed(m.decimals) : Math.round(m.max)}
                                </div>
                              </div>
                              <Change m={m} />
                            </div>
                            <TrendChart rows={t.series} k={key} m={m} goal={key === 'sleep_h' ? t.goals.sleep_h : key === 'steps' ? t.goals.steps : undefined} />
                            {(INFO[key] || m.band) && (
                              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                                {m.band && 'Shaded = your normal range. '}{INFO[key]}
                              </div>
                            )}
                          </div>
                        </Item>
                      );
                    })}
                  </div>
                );
              })}
              <Item><p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>Arrows compare with the previous {days} days. Scores use published methods; not medical advice.</p></Item>
            </Stagger>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
