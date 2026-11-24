import { motion } from 'framer-motion';

const D = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Small bar chart of averages by weekday; the highest day is solid. */
export default function WeekdayBars({ vals, label, unit, decimals = 0, k }: { vals: (number | null)[]; label: string; unit: string; decimals?: number; k?: number }) {
  const present = vals.filter((v): v is number => v != null);
  if (!present.length) return null;
  const max = Math.max(...present), min = Math.min(...present);
  const lo = min - (max - min) * 0.6 || 0;
  const top = vals.indexOf(max);
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 650 }}>{label}</div>
      <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>highest {D[top]}{top >= 5 ? ' (weekend)' : ''} · {decimals ? max.toFixed(decimals) : Math.round(max).toLocaleString()} {unit}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }} key={k}>
        {vals.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <motion.div
              initial={{ height: 0 }} animate={{ height: v == null ? 2 : `${Math.max(6, ((v - lo) / (max - lo || 1)) * 100)}%` }}
              transition={{ delay: i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: '100%', borderRadius: 5, background: 'currentColor', opacity: i === top ? 1 : 0.3 }}
            />
            <span style={{ fontSize: 10, opacity: 0.55 }}>{D[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
