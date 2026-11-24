import { motion } from 'framer-motion';
import { EASE } from './motion';

export interface Ring { label: string; value: number; goal: number; shade: string }

/** Concentric activity rings (monochrome). Each ring animates to value/goal; >100% keeps going. */
export default function Rings({ rings, size = 150, stroke = 14, k }: { rings: Ring[]; size?: number; stroke?: number; k?: number }) {
  const gap = 4;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} key={k} aria-hidden>
      {rings.map((r, i) => {
        const radius = size / 2 - stroke / 2 - i * (stroke + gap);
        const c = 2 * Math.PI * radius;
        const pct = r.goal > 0 ? Math.min(r.value / r.goal, 1) : 0;
        return (
          <g key={r.label}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={r.shade} strokeOpacity={0.14} strokeWidth={stroke} />
            <motion.circle
              cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={r.shade} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: c * (1 - pct) }}
              transition={{ duration: 1.4, delay: 0.2 + i * 0.15, ease: EASE }}
            />
          </g>
        );
      })}
    </svg>
  );
}
