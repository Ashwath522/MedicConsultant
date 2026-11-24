import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar,
  useIonActionSheet, useIonRouter, useIonViewWillEnter,
} from '@ionic/react';
import { motion } from 'framer-motion';
import { add, arrowDown, arrowUp, documentTextOutline, ellipsisHorizontal, flaskOutline } from 'ionicons/icons';
import { useState } from 'react';
import { api, LabReportT, LabTrend, rangeText } from '../services/api';
import { Item, Stagger, useEnterKey } from '../ui/motion';

const fmt = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toString() : v.toFixed(v % 1 ? 1 : 0));

/** Mini chart across reports with the reference band. */
function LabSpark({ t }: { t: LabTrend }) {
  const W = 300, H = 70, P = 8;
  const vals = t.points.map((p) => p.value);
  const lo = Math.min(...vals, t.ref_low ?? Infinity), hi = Math.max(...vals, t.ref_high ?? -Infinity);
  const pad = (hi - lo) * 0.2 || 1;
  const y = (v: number) => P + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - 2 * P);
  const x = (i: number) => (t.points.length === 1 ? W / 2 : P + (i / (t.points.length - 1)) * (W - 2 * P));
  const bandTop = t.ref_high != null ? y(t.ref_high) : P, bandBot = t.ref_low != null ? y(t.ref_low) : H - P;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
      <rect x={0} y={bandTop} width={W} height={Math.max(2, bandBot - bandTop)} fill="currentColor" opacity={0.08} rx={4} />
      {t.points.length > 1 && <path d={'M' + t.points.map((p, i) => `${x(i)},${y(p.value)}`).join(' L')} fill="none" stroke="currentColor" strokeWidth={2} pathLength={1} className="logo-draw" style={{ animationDuration: '1s' }} />}
      {t.points.map((p, i) => (
        <motion.circle key={i} cx={x(i)} cy={y(p.value)} r={p.flag === 'normal' ? 3.5 : 5} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
          fill={p.flag === 'normal' ? 'var(--ck-bg)' : 'currentColor'} stroke="currentColor" strokeWidth={2} />
      ))}
    </svg>
  );
}

export default function Labs() {
  const [reports, setReports] = useState<LabReportT[] | null>(null);
  const [trends, setTrends] = useState<LabTrend[]>([]);
  const [sheet] = useIonActionSheet();
  const router = useIonRouter();
  const k = useEnterKey();

  const load = () => {
    api<LabReportT[]>('/labs').then(setReports).catch(() => setReports([]));
    api<LabTrend[]>('/labs/trends').then(setTrends).catch(() => {});
  };
  useIonViewWillEnter(load);

  const flagged = trends.filter((t) => t.flag !== 'normal');
  const more = (r: LabReportT) => sheet({ header: `${r.lab_name || 'Report'} · ${r.taken_on}`, buttons: [
    { text: 'Delete report', role: 'destructive', handler: async () => { await api(`/labs/${r.id}`, { method: 'DELETE' }); load(); } },
    { text: 'Cancel', role: 'cancel' }] });

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" text="" /></IonButtons>
          <IonTitle>Lab reports</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => router.push('/labs/new')}><IonIcon icon={add} /></IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <Stagger k={k} className="page">
          <Item>
            <div className="card ink beam" style={{ padding: 22, marginTop: 8 }}>
              <IonIcon icon={flaskOutline} style={{ fontSize: 28 }} />
              <div className="h2" style={{ marginTop: 10 }}>
                {reports?.length ? `${trends.length} tests tracked across ${reports.length} report${reports.length > 1 ? 's' : ''}` : 'Track your blood tests over time'}
              </div>
              <p style={{ color: '#d4d4d8', margin: '8px 0 14px', fontSize: 14 }}>
                {flagged.length ? `${flagged.length} outside the range printed on your report. Discuss these with your doctor.` : 'Upload a PDF or photo of a report. We read each test, you confirm, and we chart it.'}
              </p>
              <IonButton onClick={() => router.push('/labs/new')} style={{ '--background': '#fafafa', '--color': '#000' }}>
                <IonIcon icon={add} slot="start" />Add a report
              </IonButton>
            </div>
          </Item>

          {flagged.length > 0 && <Item><div className="eyebrow">Needs attention</div></Item>}
          {trends.map((t, i) => (
            <Item key={t.key}>
              {i === flagged.length && flagged.length > 0 && <div className="eyebrow">Within range</div>}
              <div className="card">
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{t.group} · range {rangeText(t.ref_low, t.ref_high)} {t.unit}{t.range_source === 'typical' ? ' (typical)' : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="tabular" style={{ fontSize: 22, fontWeight: 750 }}>{fmt(t.value)} <span className="muted" style={{ fontSize: 12 }}>{t.unit}</span></div>
                    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                      {t.change != null && t.change !== 0 && <span className="muted" style={{ fontSize: 12 }}><IonIcon icon={t.change > 0 ? arrowUp : arrowDown} /> {fmt(Math.abs(t.change))}</span>}
                      <span className={`chip ${t.flag !== 'normal' ? 'on' : ''}`} style={{ padding: '2px 8px', fontSize: 11 }}>{t.flag === 'normal' ? 'in range' : t.flag}</span>
                    </div>
                  </div>
                </div>
                <LabSpark t={t} />
                <div className="muted" style={{ fontSize: 11 }}>{t.points.length} report{t.points.length > 1 ? 's' : ''} · latest {new Date(t.points[t.points.length - 1].day).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            </Item>
          ))}

          {reports && reports.length > 0 && (
            <>
              <Item><div className="eyebrow">Reports</div></Item>
              {reports.map((r) => (
                <Item key={r.id}>
                  <div className="card row">
                    <div className="mono"><IonIcon icon={documentTextOutline} /></div>
                    <div className="grow">
                      <div style={{ fontWeight: 650 }}>{r.lab_name || 'Lab report'}</div>
                      <div className="muted" style={{ fontSize: 13 }}>{new Date(r.taken_on).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {r.count} tests · {r.flagged} flagged</div>
                    </div>
                    <IonButton fill="clear" onClick={() => more(r)} aria-label="More"><IonIcon icon={ellipsisHorizontal} /></IonButton>
                  </div>
                </Item>
              ))}
            </>
          )}
          <Item><p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>Flags use the range printed on your report. Not a diagnosis: always discuss results with your doctor.</p></Item>
        </Stagger>
      </IonContent>
    </IonPage>
  );
}
