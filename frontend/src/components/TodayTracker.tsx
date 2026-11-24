import { IonIcon, useIonAlert } from '@ionic/react';
import { motion } from 'framer-motion';
import { bedOutline, footstepsOutline, waterOutline } from 'ionicons/icons';
import { api, Blueprint, DayLog } from '../services/api';
import { Ticker } from '../ui/ambient';
import Rings from '../ui/Rings';

/** Fitness side: activity rings for water, steps and sleep against personal targets. */
export default function TodayTracker({ bp, log, setLog, k }: { bp: Blueprint; log: DayLog; setLog: (l: DayLog) => void; k?: number }) {
  const [alert] = useIonAlert();
  const sleepGoal = bp.sleep_hours[0];
  const shades = ['var(--ck-text)', 'color-mix(in srgb, var(--ck-text) 65%, transparent)', 'color-mix(in srgb, var(--ck-text) 38%, transparent)'];

  const update = async (body: object) => setLog(await api<DayLog>('/wellness/today', { method: 'PUT', body }));

  const ask = (header: string, key: 'steps' | 'sleep_hours', current: number, placeholder: string) =>
    alert({
      header,
      inputs: [{ name: 'v', type: 'number', value: current || '', placeholder, min: 0 }],
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save', handler: (d) => { const n = Number(d.v); if (!Number.isNaN(n)) update({ [key]: n }); } }],
    });

  const rows = [
    { icon: waterOutline, label: 'Water', value: log.water_ml, goal: bp.water_ml, unit: 'ml', shade: shades[0], action: () => update({ add_water_ml: 250 }), cta: '+ Glass' },
    { icon: footstepsOutline, label: 'Steps', value: log.steps, goal: bp.steps, unit: '', shade: shades[1], action: () => ask('Steps today', 'steps', log.steps, 'e.g. 5400'), cta: 'Log' },
    { icon: bedOutline, label: 'Sleep', value: log.sleep_hours, goal: sleepGoal, unit: 'h', shade: shades[2], action: () => ask('Hours slept last night', 'sleep_hours', log.sleep_hours, 'e.g. 7.5'), cta: 'Log' },
  ];

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'center', gap: 18 }}>
        <Rings k={k} size={132} stroke={13} rings={rows.map((r) => ({ label: r.label, value: r.value, goal: r.goal, shade: r.shade }))} />
        <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((r) => {
            const pct = Math.round(Math.min(1, r.goal ? r.value / r.goal : 0) * 100);
            return (
              <div key={r.label} className="row" style={{ gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: 4, background: r.shade, flex: 'none' }} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 650 }}>{r.label} <span className="muted" style={{ fontWeight: 500 }}>{pct}%</span></div>
                  <div className="muted tabular" style={{ fontSize: 13 }}>
                    {r.label === 'Sleep' ? r.value : <Ticker value={r.value} />}{r.unit && ` ${r.unit}`} / {r.goal.toLocaleString()}{r.unit && ` ${r.unit}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
        {rows.map((r) => (
          <motion.button
            key={r.label}
            whileTap={{ scale: 0.92 }}
            onClick={r.action}
            style={{ border: 0, borderRadius: 14, padding: '10px 6px', background: 'var(--ck-surface)', color: 'var(--ck-text)', fontWeight: 650, fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <IonIcon icon={r.icon} />{r.cta}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
