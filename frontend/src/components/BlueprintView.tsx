import { IonIcon } from '@ionic/react';
import { motion } from 'framer-motion';
import { bedOutline, flameOutline, footstepsOutline, medkitOutline, waterOutline } from 'ionicons/icons';
import { Blueprint } from '../services/api';
import { Ticker } from '../ui/ambient';
import { EASE, Item, Stagger } from '../ui/motion';

/** BMI on a scale with an animated marker (Indian cut-offs). */
function BmiScale({ value }: { value: number }) {
  const min = 15, max = 35;
  const pos = Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;
  const marks = [
    { at: 18.5, label: '18.5' }, { at: 23, label: '23' }, { at: 25, label: '25' },
  ];
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ position: 'relative', height: 10, borderRadius: 10, background: 'linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0.9) 30%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0.25))' }}>
        <motion.div
          initial={{ left: '0%' }}
          animate={{ left: `${pos}%` }}
          transition={{ duration: 1.4, delay: 0.4, ease: EASE }}
          style={{ position: 'absolute', top: -5, width: 20, height: 20, marginLeft: -10, borderRadius: '50%', background: '#000', border: '3px solid #fafafa', boxShadow: '0 0 0 4px rgba(255,255,255,0.15)' }}
        />
      </div>
      <div style={{ position: 'relative', height: 18, marginTop: 6, fontSize: 11, color: '#a1a1aa' }}>
        {marks.map((m) => (
          <span key={m.at} style={{ position: 'absolute', left: `${((m.at - min) / (max - min)) * 100}%`, transform: 'translateX(-50%)' }}>{m.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function BlueprintView({ bp, k }: { bp: Blueprint; k?: number }) {
  const tiles = [
    { icon: flameOutline, value: bp.calories, unit: 'kcal / day', label: 'Energy needs' },
    { icon: waterOutline, value: bp.water_ml / 1000, unit: 'litres / day', label: 'Water', decimals: true },
    { icon: footstepsOutline, value: bp.steps, unit: 'steps / day', label: 'Movement' },
    { icon: bedOutline, value: null, text: `${bp.sleep_hours[0]}–${bp.sleep_hours[1]}`, unit: 'hours / night', label: 'Sleep' },
  ];
  return (
    <Stagger k={k}>
      <Item>
        <div className="card ink beam">
          <div className="muted" style={{ fontSize: 12, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Body mass index · {bp.bmi.scale}
          </div>
          <div className="row" style={{ alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <div style={{ fontSize: 44, fontWeight: 750, letterSpacing: '-0.04em' }} className="tabular">{bp.bmi.value}</div>
            <div style={{ fontSize: 18, fontWeight: 650 }}>{bp.bmi.category}</div>
          </div>
          <div className="muted" style={{ fontSize: 14 }}>
            Healthy range for your height: {bp.bmi.healthy_range_kg[0]}–{bp.bmi.healthy_range_kg[1]} kg
          </div>
          <BmiScale value={bp.bmi.value} />
        </div>
      </Item>

      <Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {tiles.map((t, i) => (
            <motion.div
              key={t.label}
              className="card"
              style={{ margin: 0 }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 300, damping: 24 }}
            >
              <IonIcon icon={t.icon} style={{ fontSize: 22 }} />
              <div style={{ fontSize: 26, fontWeight: 750, letterSpacing: '-0.03em', marginTop: 8 }} className="tabular">
                {t.text ?? (t.decimals ? (t.value as number).toFixed(1) : <Ticker value={t.value as number} />)}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>{t.unit}</div>
              <div style={{ fontSize: 13, fontWeight: 650, marginTop: 6 }}>{t.label}</div>
            </motion.div>
          ))}
        </div>
      </Item>

      <Item>
        <div className="card flat row">
          <div className="grow">
            <div style={{ fontWeight: 650 }}>Active minutes</div>
            <div className="muted" style={{ fontSize: 14 }}>Moderate activity, per week (WHO)</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 750 }} className="tabular">{bp.active_minutes_week}</div>
        </div>
      </Item>

      <Item><div className="eyebrow">Check-ups for your age · {bp.life_stage}</div></Item>
      {bp.checkups.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.06, duration: 0.45, ease: EASE }}
        >
          <div className="card row" style={{ alignItems: 'flex-start' }}>
            <div className="mono"><IonIcon icon={medkitOutline} /></div>
            <div className="grow">
              <div style={{ fontWeight: 650 }}>{c.name}</div>
              <div className="muted" style={{ fontSize: 14 }}>{c.why}</div>
            </div>
            <span className="chip" style={{ whiteSpace: 'nowrap' }}>{c.how_often}</span>
          </div>
        </motion.div>
      ))}

      <Item><p className="muted" style={{ fontSize: 13, textAlign: 'center', margin: '16px 8px' }}>{bp.disclaimer}</p></Item>
    </Stagger>
  );
}
