import { IonIcon } from '@ionic/react';
import { motion } from 'framer-motion';
import { checkmark, chevronForward } from 'ionicons/icons';
import { EASE } from './motion';

export type StepState = 'done' | 'current' | 'todo';
export interface Step {
  title: string;
  note?: string;
  state: StepState;
  onClick?: () => void;
}

/** Vertical progress stepper. The connecting line "draws" itself down to the current step,
 * each step cascades in, and the current step breathes. */
export default function Stepper({ steps, k }: { steps: Step[]; k?: number }) {
  return (
    <div style={{ position: 'relative' }} key={k}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const filled = s.state === 'done';
        return (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.5, ease: EASE }}
            onClick={s.onClick}
            style={{ display: 'flex', gap: 16, cursor: s.onClick ? 'pointer' : 'default', minHeight: last ? 0 : 76 }}
          >
            {/* Rail */}
            <div style={{ position: 'relative', width: 28, flex: 'none', display: 'flex', justifyContent: 'center' }}>
              {!last && (
                <>
                  <div style={{ position: 'absolute', top: 30, bottom: -2, width: 2, background: 'var(--ck-border)', borderRadius: 2 }} />
                  {filled && (
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.08 * i + 0.25, duration: 0.5, ease: EASE }}
                      style={{ position: 'absolute', top: 30, bottom: -2, width: 2, background: 'var(--ck-text)', borderRadius: 2, transformOrigin: 'top' }}
                    />
                  )}
                </>
              )}
              <motion.div
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.08 * i + 0.1, type: 'spring', stiffness: 500, damping: 22 }}
                style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', zIndex: 1,
                  background: filled ? 'var(--ck-ink)' : 'var(--ck-bg)',
                  color: filled ? 'var(--ck-on-ink)' : 'var(--ck-text)',
                  border: s.state === 'todo' ? '2px solid var(--ck-border)' : '2px solid var(--ck-text)',
                  fontSize: 12, fontWeight: 700,
                }}
              >
                {filled ? <IonIcon icon={checkmark} style={{ fontSize: 16 }} /> : i + 1}
              </motion.div>
              {s.state === 'current' && (
                <motion.div
                  animate={{ scale: [1, 1.7], opacity: [0.35, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  style={{ position: 'absolute', top: 0, width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--ck-text)' }}
                />
              )}
            </div>

            {/* Text */}
            <div style={{ flex: 1, paddingTop: 3, paddingBottom: last ? 0 : 20, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, opacity: s.state === 'todo' ? 0.45 : 1 }}>
                <div style={{ fontWeight: 650, fontSize: 16 }}>{s.title}</div>
                {s.note && <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{s.note}</div>}
              </div>
              {s.onClick && <IonIcon icon={chevronForward} style={{ color: 'var(--ck-faint)', marginTop: 4 }} />}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
