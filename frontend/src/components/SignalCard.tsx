import { IonIcon } from '@ionic/react';
import { motion } from 'framer-motion';
import { alertCircle, checkmarkCircle, chevronForward, eyeOutline, hourglassOutline, pulseOutline } from 'ionicons/icons';
import { Signals } from '../services/api';
import { EcgLine, HeartDot } from '../ui/ambient';
import { Pressable } from '../ui/motion';

export const LEVEL = {
  no_data: { label: 'No data yet', icon: pulseOutline },
  learning: { label: 'Learning your normal', icon: hourglassOutline },
  normal: { label: 'Within your normal', icon: checkmarkCircle },
  watch: { label: 'Keeping an eye', icon: eyeOutline },
  check: { label: 'Worth checking', icon: alertCircle },
} as const;

/** Home card: today's body-signal level. "check" turns the card black and pulses. */
export default function SignalCard({ s, onOpen }: { s: Signals; onOpen: () => void }) {
  const L = LEVEL[s.level];
  const loud = s.level === 'check';
  return (
    <Pressable className={`card tap ${loud ? 'ink beam' : ''}`} onClick={onOpen}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <motion.div
          className="mono"
          animate={loud ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 1.3, repeat: Infinity }}
        >
          <IonIcon icon={L.icon} style={{ fontSize: 22 }} />
        </motion.div>
        <div className="grow">
          <div className="row" style={{ gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Body signals</span>
            <span className="chip" style={loud ? { background: 'rgba(255,255,255,0.15)', color: '#fafafa' } : undefined}>
              {loud && <HeartDot color="#fafafa" size={6} />} {L.label}
            </span>
          </div>
          <div className="muted" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>
            {s.level === 'check' && s.reasons?.length ? s.reasons.join(' · ') : s.message}
          </div>
          {s.latest?.rhr != null && (
            <div className="row" style={{ gap: 16, marginTop: 10, fontSize: 13 }}>
              <span><b className="tabular">{Math.round(s.latest.rhr)}</b> <span className="muted">bpm rest</span></span>
              {s.baseline?.rhr != null && <span><b className="tabular">{Math.round(s.baseline.rhr)}</b> <span className="muted">your normal</span></span>}
              {s.latest.temp_dev != null && <span><b className="tabular">{s.latest.temp_dev > 0 ? '+' : ''}{s.latest.temp_dev.toFixed(1)}°</b> <span className="muted">temp</span></span>}
            </div>
          )}
        </div>
        <IonIcon icon={chevronForward} style={{ color: 'var(--ck-faint)', marginTop: 4 }} />
      </div>
      {loud && <div style={{ margin: '12px -18px -18px' }}><EcgLine beats={4} height={34} color="#fafafa" speed={1.8} /></div>}
    </Pressable>
  );
}
