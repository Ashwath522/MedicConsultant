import { useEffect, useRef, useState } from 'react';

const BARS = 36;

/** Live, scrolling audio waveform driven by the microphone level (0–1). */
export default function Waveform({ getLevel, active }: { getLevel: () => number; active: boolean }) {
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.04));
  const raf = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!active) return;
    const tick = (t: number) => {
      if (t - last.current > 55) {
        last.current = t;
        const v = Math.max(0.05, Math.min(1, getLevel()));
        setLevels((prev) => [...prev.slice(1), v]);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, getLevel]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 72 }}>
      {levels.map((v, i) => (
        <div
          key={i}
          style={{
            width: 4,
            borderRadius: 4,
            height: `${Math.round(8 + v * 64)}px`,
            background: '#fafafa',
            opacity: active ? 0.35 + (i / BARS) * 0.65 : 0.25,
            transition: 'height 90ms linear, opacity 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}
