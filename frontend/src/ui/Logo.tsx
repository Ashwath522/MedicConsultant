/** Animated mark: two arcs draw themselves (a "keeper" ring) around a heartbeat line.
 * Pure CSS stroke drawing (pathLength=1 normalises every path to length 1). */
export default function Logo({ size = 72, color = 'currentColor', animate = true }: { size?: number; color?: string; animate?: boolean }) {
  const paths = [
    { d: 'M32 6 A26 26 0 0 1 58 32', w: 3, delay: 0.1, duration: 1.1 },
    { d: 'M32 58 A26 26 0 0 1 6 32', w: 3, delay: 0.25, duration: 1.1 },
    { d: 'M14 33 h9 l4 -9 l6 18 l4 -9 h13', w: 3.2, delay: 0.6, duration: 1.2 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p) => (
        <path
          key={p.d}
          d={p.d}
          strokeWidth={p.w}
          pathLength={1}
          className={animate ? 'logo-draw' : undefined}
          style={animate ? { animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` } : undefined}
        />
      ))}
    </svg>
  );
}
