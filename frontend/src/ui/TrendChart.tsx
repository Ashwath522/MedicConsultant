import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { MetricSummary, TrendRow } from '../services/api';

const fmt = (v: number, d: number) => (d === 0 ? Math.round(v).toLocaleString() : v.toFixed(d));
const short = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Line (with personal normal band) or bar chart. Drag / tap to read any day. */
export default function TrendChart({ rows, k, m, height = 120 }: { rows: TrendRow[]; k: string; m: MetricSummary; height?: number }) {
  const [sel, setSel] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const W = 320, H = height, P = 6;
  const vals = rows.map((r) => (r[k] as number | null));
  const present = vals.filter((v): v is number => v != null);
  if (present.length < 2) return <div className="muted" style={{ fontSize: 13, padding: '16px 0' }}>Not enough data yet.</div>;

  const lo0 = Math.min(...present, ...(m.band ? [m.band[0]] : []));
  const hi0 = Math.max(...present, ...(m.band ? [m.band[1]] : []));
  const pad = (hi0 - lo0) * 0.15 || 1;
  const lo = m.chart === 'bar' ? 0 : lo0 - pad, hi = hi0 + pad;
  const n = rows.length;
  const x = (i: number) => P + (n === 1 ? 0.5 : i / (n - 1)) * (W - 2 * P);
  const y = (v: number) => P + (1 - (v - lo) / (hi - lo)) * (H - 2 * P - 14);
  const bw = Math.max(2, ((W - 2 * P) / n) * 0.62);

  // line path with gaps for missing days
  let d = '', pen = false;
  vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i)},${y(v)} `; pen = true; });

  const pick = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    const i = Math.round(((clientX - r.left) / r.width * W - P) / (W - 2 * P) * (n - 1));
    setSel(Math.max(0, Math.min(n - 1, i)));
  };
  const si = sel ?? [...vals.keys()].reverse().find((i) => vals[i] != null) ?? n - 1;
  const sv = vals[si];

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, height: 20 }}>
        <span className="muted">{short(rows[si].day)}{sel == null ? ' · latest' : ''}</span>
        <AnimatePresence mode="wait">
          <motion.b key={si} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="tabular">
            {sv == null ? 'no data' : `${fmt(sv, m.decimals)} ${m.unit}`}
          </motion.b>
        </AnimatePresence>
      </div>
      <svg
        ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ touchAction: 'pan-y', cursor: 'crosshair' }}
        onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setSel(null)}
      >
        {m.band && m.chart === 'line' && (
          <rect x={P} width={W - 2 * P} y={y(m.band[1])} height={Math.max(1, y(m.band[0]) - y(m.band[1]))} fill="currentColor" opacity={0.07} rx={4} />
        )}
        <line x1={P} x2={W - P} y1={y(m.avg)} y2={y(m.avg)} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="3 4" />
        {m.chart === 'bar'
          ? vals.map((v, i) => v == null ? null : (
              <motion.rect key={i} x={x(i) - bw / 2} width={bw} rx={bw / 2.5}
                initial={{ y: y(lo), height: 0 }} animate={{ y: y(v), height: Math.max(1, y(lo) - y(v)) }}
                transition={{ delay: i * (0.4 / n), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                fill="currentColor" opacity={i === si ? 1 : 0.35} />
            ))
          : <>
              <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="logo-draw" style={{ animationDuration: '1.2s' }} />
              {sv != null && <circle cx={x(si)} cy={y(sv)} r={4.5} fill="var(--ck-bg)" stroke="currentColor" strokeWidth={2} />}
            </>}
        <line x1={x(si)} x2={x(si)} y1={P} y2={H - 14} stroke="currentColor" strokeOpacity={sel == null ? 0 : 0.25} />
        <text x={P} y={H - 2} fontSize="9" fill="currentColor" opacity={0.5}>{short(rows[0].day)}</text>
        <text x={W - P} y={H - 2} fontSize="9" fill="currentColor" opacity={0.5} textAnchor="end">{short(rows[n - 1].day)}</text>
      </svg>
    </div>
  );
}
