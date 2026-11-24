import { motion } from 'framer-motion';
import { useState } from 'react';
import { Trends } from '../services/api';

/** 90-day recovery calendar (weeks as columns, Mon–Sun rows). Darker = better recovery.
 *  A ring marks nights the early-warning layer flagged (watch / check). */
export default function CalendarHeatmap({ cal }: { cal: Trends['calendar'] }) {
  const [sel, setSel] = useState<number | null>(null);
  const first = new Date(cal[0].day);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const cells = [...Array(offset).fill(null), ...cal];
  const weeks = Math.ceil(cells.length / 7);
  const cs = 13, gap = 3;
  const s = sel != null ? cal[sel] : null;
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, height: 20, marginBottom: 6 }}>
        <span className="muted">{s ? new Date(s.day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : 'Tap a day'}</span>
        <b>{s ? (s.recovery != null ? `Recovery ${s.recovery}%` : 'no data') + (s.level === 'check' ? ' · worth checking' : s.level === 'watch' ? ' · watch' : '') : ''}</b>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg width={weeks * (cs + gap) + 16} height={7 * (cs + gap) + 4}>
          {['M', '', 'W', '', 'F', '', 'S'].map((d, i) => <text key={i} x={0} y={i * (cs + gap) + cs - 2} fontSize="9" fill="currentColor" opacity={0.45}>{d}</text>)}
          {cells.map((c, i) => {
            if (!c) return null;
            const w = Math.floor(i / 7), d = i % 7, idx = i - offset;
            const o = c.recovery == null ? 0.06 : 0.15 + (c.recovery / 100) * 0.85;
            return (
              <motion.rect
                key={c.day} x={14 + w * (cs + gap)} y={d * (cs + gap)} width={cs} height={cs} rx={3.5}
                fill="currentColor" fillOpacity={o}
                stroke={c.level === 'check' ? 'currentColor' : c.level === 'watch' ? 'currentColor' : 'none'}
                strokeWidth={c.level === 'check' ? 2 : 1} strokeDasharray={c.level === 'watch' ? '2 2' : undefined}
                initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: sel === idx ? 1.25 : 1 }}
                transition={{ delay: w * 0.03, duration: 0.3 }}
                style={{ transformOrigin: `${14 + w * (cs + gap) + cs / 2}px ${d * (cs + gap) + cs / 2}px`, cursor: 'pointer' }}
                onClick={() => setSel(idx)}
              />
            );
          })}
        </svg>
      </div>
      <div className="row muted" style={{ gap: 14, fontSize: 11, marginTop: 6, flexWrap: 'wrap' }}>
        <span className="row" style={{ gap: 4 }}>Low {[0.2, 0.45, 0.7, 1].map((o) => <span key={o} style={{ width: 10, height: 10, borderRadius: 3, background: 'currentColor', opacity: o }} />)} High recovery</span>
        <span className="row" style={{ gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, border: '2px solid currentColor' }} /> Flagged</span>
      </div>
    </div>
  );
}
