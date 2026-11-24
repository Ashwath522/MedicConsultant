import { IonButton, IonIcon } from '@ionic/react';
import { AnimatePresence, motion } from 'framer-motion';
import { heart } from 'ionicons/icons';
import { createPortal } from 'react-dom';
import { Ambient, EcgLine } from './ambient';
import { EASE } from './motion';

const TIPS: Record<string, string[]> = {
  any: [
    'A glass of water first thing in the morning helps you start hydrated.',
    'Ten minutes of walking after meals helps keep blood sugar steady.',
    'Keeping the same bedtime every day improves sleep quality.',
    'Write down questions before a doctor visit, then record the answers here.',
    'Take medicines at the same time each day, linked to a meal or routine.',
  ],
  senior: ['Stand up and stretch every hour; it helps balance and circulation.', 'Keep a night light on the way to the bathroom to prevent falls.'],
  female: ['Iron-rich foods like spinach, dal and jaggery support energy levels.'],
  male: ['Check your blood pressure at least once a year, even if you feel fine.'],
};

export function tipFor(age?: number | null, sex?: string) {
  const pool = [...TIPS.any, ...(age && age >= 60 ? TIPS.senior : []), ...(sex === 'female' ? TIPS.female : sex === 'male' ? TIPS.male : [])];
  const day = Math.floor(Date.now() / 86_400_000);
  return pool[day % pool.length];
}

/** Full-screen "health check-in" pop-up shown once per app session after login. */
export default function WelcomeSplash({ open, name, tip, onClose }: { open: boolean; name?: string; tip: string; onClose: () => void }) {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', color: '#fafafa', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <Ambient tone="dark" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
            {/* Beating heart with ripples */}
            <div style={{ position: 'relative', width: 160, height: 160, display: 'grid', placeItems: 'center', marginBottom: 8 }}>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0.5, opacity: 0.5 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 2.4, delay: i * 0.8, repeat: Infinity, ease: 'easeOut' }}
                  style={{ position: 'absolute', inset: 30, borderRadius: '50%', border: '1.5px solid #fafafa' }}
                />
              ))}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.18, 1, 1.12, 1] }}
                transition={{ scale: { duration: 1.3, repeat: Infinity, ease: 'easeInOut', delay: 0.4 } }}
                style={{ width: 84, height: 84, borderRadius: '50%', background: '#fafafa', color: '#000', display: 'grid', placeItems: 'center', boxShadow: '0 0 60px rgba(255,255,255,0.35)' }}
              >
                <IonIcon icon={heart} style={{ fontSize: 40 }} />
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6, ease: EASE }} style={{ width: '100%' }}>
              <EcgLine beats={4} height={44} color="#fafafa" speed={2.6} />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.5, duration: 0.7, ease: EASE }}
              style={{ fontSize: 32, fontWeight: 750, letterSpacing: '-0.035em', margin: '18px 0 6px' }}
            >
              {greet}{name ? `, ${name}` : ''}.
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} style={{ color: '#a1a1aa', margin: 0 }}>
              Your health check-in is ready.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.6, ease: EASE }}
              style={{ marginTop: 28, padding: '16px 18px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'left', width: '100%', maxWidth: 420 }}
            >
              <div style={{ fontSize: 12, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a1a1aa' }}>Today's tip</div>
              <div style={{ marginTop: 6, lineHeight: 1.5 }}>{tip}</div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.5 }} style={{ padding: '0 24px calc(env(safe-area-inset-bottom) + 28px)', position: 'relative', zIndex: 1 }}>
            <IonButton expand="block" size="large" onClick={onClose} style={{ '--background': '#fafafa', '--color': '#000' }}>
              Let's go
            </IonButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
