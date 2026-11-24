import { motion } from 'framer-motion';
import { Ticker } from './ambient';

/** Single score ring 0–100 with the number in the middle. */
export default function ScoreRing({ value, label, size = 92, k }: { value: number | null; label: string; size?: number; k?: number }) {
  const s = 9, r = size / 2 - s / 2, c = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} key={k}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={s} />
          <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={s} strokeLinecap="round"
            strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 750 }}>
          {value == null ? '–' : <span><Ticker value={value} /><span style={{ fontSize: 12, opacity: 0.6 }}>%</span></span>}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 650, marginTop: 8 }}>{label}</div>
    </div>
  );
}
