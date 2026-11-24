/**
 * Always-on, health-themed ambient motion. All CSS-driven (GPU-friendly, battery-light)
 * and switched off automatically when the user enables "Reduce Motion".
 *
 * Patterns inspired by open-source animated UI kits (Magic UI's BorderBeam / NumberTicker /
 * AnimatedShinyText and Aceternity's background effects), rebuilt for this design system.
 */
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CSSProperties, useEffect } from 'react';

/* ---------- ECG heartbeat line that keeps tracing ---------- */
const BEAT = 'L6 0 L10 -8 L14 0 L20 0 L24 4 L28 -24 L32 20 L36 0 L44 0 L52 -6 L60 0';
const ecgPath = (beats: number, gap = 40) => {
  let d = 'M0 28';
  let x = 0;
  for (let i = 0; i < beats; i++) {
    x += gap;
    d += ` H${x}`;
    // relative beat shape, converted to absolute coordinates
    d += ' ' + BEAT.split(' L').map((p, j) => {
      const [dx, dy] = p.replace('L', '').split(' ').map(Number);
      return `${j === 0 ? 'L' : 'L'}${x + dx} ${28 + dy}`;
    }).join(' ');
    x += 60;
  }
  return d + ` H${x + gap}`;
};

export function EcgLine({
  beats = 3, height = 56, color = 'currentColor', speed = 3.2, style, glow = true,
}: { beats?: number; height?: number; color?: string; speed?: number; style?: CSSProperties; glow?: boolean }) {
  const d = ecgPath(beats);
  const width = beats * 100 + 40;
  return (
    <svg viewBox={`0 0 ${width} 56`} preserveAspectRatio="none" width="100%" height={height} style={style} fill="none" aria-hidden>
      <path d={d} stroke={color} strokeOpacity={0.14} strokeWidth={1.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path
        d={d} stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" pathLength={1}
        className="ecg-run" vectorEffect="non-scaling-stroke"
        style={{ animationDuration: `${speed}s`, filter: glow ? `drop-shadow(0 0 4px ${color})` : undefined }}
      />
    </svg>
  );
}

/* ---------- Drifting light orbs + dot grid ---------- */
export function Ambient({ tone = 'light', dots = true }: { tone?: 'light' | 'dark'; dots?: boolean }) {
  return (
    <div className={`ambient ${tone}`} aria-hidden>
      <span className="orb o1" />
      <span className="orb o2" />
      <span className="orb o3" />
      {dots && <span className="dots" />}
    </div>
  );
}

/* ---------- Capsules floating upward (medical particles) ---------- */
const PILLS = [
  { left: '8%', delay: 0, dur: 14, size: 1 }, { left: '22%', delay: 5, dur: 18, size: 0.7 },
  { left: '38%', delay: 2, dur: 16, size: 0.85 }, { left: '55%', delay: 8, dur: 20, size: 0.6 },
  { left: '70%', delay: 3.5, dur: 15, size: 0.9 }, { left: '84%', delay: 10, dur: 19, size: 0.75 },
  { left: '93%', delay: 6.5, dur: 17, size: 0.55 },
];
export function FloatingPills({ color = 'rgba(255,255,255,0.22)' }: { color?: string }) {
  return (
    <div className="pills" aria-hidden>
      {PILLS.map((p, i) => (
        <span
          key={i}
          className={`pill ${i % 3 === 0 ? 'plus' : ''}`}
          style={{ left: p.left, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `scale(${p.size})`, color, borderColor: color }}
        />
      ))}
    </div>
  );
}

/* ---------- Number that springs to its value ---------- */
export function Ticker({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 70, damping: 18 });
  const shown = useTransform(spring, (v) => Math.round(v));
  useEffect(() => { mv.set(value); }, [value, mv]);
  return <motion.span className="tabular">{shown}</motion.span>;
}

/* ---------- Text with a light sweeping across ---------- */
export function Shimmer({ children, as: Tag = 'span', className = '' }: { children: React.ReactNode; as?: 'span' | 'h1' | 'div'; className?: string }) {
  return <Tag className={`shimmer-text ${className}`}>{children}</Tag>;
}

/* ---------- Beating heart dot ---------- */
export function HeartDot({ color = 'currentColor', size = 8 }: { color?: string; size?: number }) {
  return <span className="heart-dot" style={{ width: size, height: size, background: color }} aria-hidden />;
}
