import { motion } from 'framer-motion';

/** HRV vs resting heart rate, one dot per night, with a least-squares trend line. */
export default function Scatter({ points, r }: { points: { rhr: number; hrv: number }[]; r: number | null }) {
  if (points.length < 7) return <div className="muted" style={{ fontSize: 13 }}>Needs a week of nights with both HRV and resting heart rate.</div>;
  const W = 320, H = 170, P = 26;
  const xs = points.map((p) => p.rhr), ys = points.map((p) => p.hrv);
  const [x0, x1] = [Math.min(...xs) - 1, Math.max(...xs) + 1], [y0, y1] = [Math.min(...ys) - 3, Math.max(...ys) + 3];
  const X = (v: number) => P + ((v - x0) / (x1 - x0)) * (W - P - 8);
  const Y = (v: number) => 8 + (1 - (v - y0) / (y1 - y0)) * (H - P - 8);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0 || 1);
  const strength = r == null ? '' : Math.abs(r) > 0.6 ? 'strong' : Math.abs(r) > 0.3 ? 'moderate' : 'weak';
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        <line x1={P} x2={W - 8} y1={H - P + 4} y2={H - P + 4} stroke="currentColor" strokeOpacity={0.2} />
        <line x1={P} x2={P} y1={8} y2={H - P + 4} stroke="currentColor" strokeOpacity={0.2} />
        <line x1={X(x0)} y1={Y(my + slope * (x0 - mx))} x2={X(x1)} y2={Y(my + slope * (x1 - mx))} stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.6} />
        {points.map((p, i) => (
          <motion.circle key={i} cx={X(p.rhr)} cy={Y(p.hrv)} r={4} fill="currentColor" fillOpacity={0.55}
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.015 }} />
        ))}
        <text x={W - 8} y={H - 4} fontSize="9" textAnchor="end" fill="currentColor" opacity={0.6}>Resting HR (bpm) →</text>
        <text x={4} y={14} fontSize="9" fill="currentColor" opacity={0.6}>HRV (ms)</text>
      </svg>
      {r != null && (
        <div className="muted" style={{ fontSize: 12 }}>
          Correlation r = <b style={{ color: 'var(--ck-text)' }}>{r}</b> ({strength}{r < 0 ? ', as resting HR goes up, HRV goes down: typical' : ''}).
        </div>
      )}
    </div>
  );
}
