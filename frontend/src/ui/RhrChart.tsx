import { motion } from 'framer-motion';
import { SignalPoint } from '../services/api';

/** 30-night resting-HR line over the personal normal band (baseline ± 2 × spread). */
export default function RhrChart({ series, height = 150, k }: { series: SignalPoint[]; height?: number; k?: number }) {
  const pts = series.filter((p) => p.rhr != null);
  if (pts.length < 2) return null;
  const W = 320, H = height, P = 8;
  const vals = pts.flatMap((p) => [p.rhr as number, ...(p.baseline != null ? [p.baseline - 2 * (p.spread ?? 0), p.baseline + 2 * (p.spread ?? 0)] : [])]);
  const lo = Math.floor(Math.min(...vals) - 2), hi = Math.ceil(Math.max(...vals) + 2);
  const x = (i: number) => P + (i / (series.length - 1)) * (W - 2 * P);
  const y = (v: number) => P + (1 - (v - lo) / (hi - lo)) * (H - 2 * P);
  const idx = (p: SignalPoint) => series.indexOf(p);

  const band = series.filter((p) => p.baseline != null);
  const bandPath = band.length > 1
    ? 'M' + band.map((p) => `${x(idx(p))},${y((p.baseline as number) + 2 * (p.spread ?? 0))}`).join(' L') +
      ' L' + [...band].reverse().map((p) => `${x(idx(p))},${y((p.baseline as number) - 2 * (p.spread ?? 0))}`).join(' L') + ' Z'
    : '';
  const line = 'M' + pts.map((p) => `${x(idx(p))},${y(p.rhr as number)}`).join(' L');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} key={k} role="img" aria-label="Resting heart rate, last 30 nights, against your normal range">
      {bandPath && <motion.path d={bandPath} fill="currentColor" fillOpacity={0.08} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />}
      {band.length > 1 && (
        <path d={'M' + band.map((p) => `${x(idx(p))},${y(p.baseline as number)}`).join(' L')} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeDasharray="3 4" strokeWidth={1.2} />
      )}
      <path d={line} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round"
        pathLength={1} className="logo-draw" style={{ animationDuration: '1.4s' }} />
      {pts.map((p, i) => (
        <motion.circle key={p.day} cx={x(idx(p))} cy={y(p.rhr as number)}
          r={p.level === 'check' ? 4.5 : p.level === 'watch' ? 3.5 : 2}
          fill={p.level === 'check' || p.level === 'watch' ? 'currentColor' : 'var(--ck-bg)'}
          stroke="currentColor" strokeWidth={1.5}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 + i * 0.02 }} />
      ))}
      <text x={W - P} y={y(hi - 1)} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.5}>{hi} bpm</text>
      <text x={W - P} y={y(lo + 1)} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.5}>{lo}</text>
    </svg>
  );
}
