import { IonButton, IonContent, IonInput, IonPage, IonSpinner, useIonToast } from '@ionic/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { api, setToken } from '../services/api';
import Logo from '../ui/Logo';
import { EASE } from '../ui/motion';

const WORDS = ['Your', "doctor's", 'advice,', 'remembered.'];

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast] = useIonToast();

  const submit = async () => {
    setBusy(true);
    try {
      const body = mode === 'signup' ? { name, email, password } : { email, password };
      const { token } = await api<{ token: string }>(`/auth/${mode}`, { method: 'POST', body });
      setToken(token);
      window.location.href = mode === 'signup' ? '/profile' : '/home';
    } catch (e) {
      toast({ message: (e as Error).message, duration: 2500, position: 'top' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen scrollY style={{ '--background': '#000' }}>
        {/* Black hero */}
        <div style={{ color: '#fafafa', padding: 'calc(env(safe-area-inset-top) + 36px) 28px 36px' }}>
          <Logo size={52} color="#fafafa" />
          <h1 style={{ fontSize: 34, fontWeight: 750, letterSpacing: '-0.04em', lineHeight: 1.05, margin: '22px 0 10px' }}>
            {WORDS.map((w, i) => (
              <motion.span
                key={w}
                initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.9 + i * 0.09, duration: 0.6, ease: EASE }}
                style={{ display: 'inline-block', marginRight: 10 }}
              >
                {w}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }}
            style={{ color: '#a1a1aa', fontSize: 16, lineHeight: 1.5, margin: 0 }}
          >
            Record the consultation. Check the prescription. Recover with confidence.
          </motion.p>
        </div>

        {/* White sheet slides up */}
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease: EASE }}
          style={{
            background: 'var(--ck-bg)', borderRadius: '32px 32px 0 0', padding: '24px 24px 40px',
            minHeight: '60vh', boxShadow: '0 -20px 60px rgba(0,0,0,0.3)',
          }}
        >
          {/* Mode switch with sliding pill */}
          <div style={{ position: 'relative', display: 'flex', background: 'var(--ck-surface)', borderRadius: 14, padding: 4, marginBottom: 24 }}>
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                data-mode={m}
                style={{
                  position: 'relative', flex: 1, padding: '10px 0', border: 0, background: 'transparent', zIndex: 1,
                  fontWeight: 650, fontSize: 15, color: mode === m ? 'var(--ck-text)' : 'var(--ck-muted)', fontFamily: 'inherit',
                }}
              >
                {mode === m && (
                  <motion.span
                    layoutId="pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    style={{ position: 'absolute', inset: 0, background: 'var(--ck-bg)', borderRadius: 10, boxShadow: 'var(--ck-shadow)', zIndex: -1 }}
                  />
                )}
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {mode === 'signup' && (
              <motion.div
                key="name"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                style={{ overflow: 'hidden' }}
              >
                <div className="field">
                  <IonInput label="Full name" labelPlacement="floating" value={name} onIonInput={(e) => setName(e.detail.value ?? '')} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="field">
            <IonInput type="email" label="Email" labelPlacement="floating" value={email} onIonInput={(e) => setEmail(e.detail.value ?? '')} />
          </div>
          <div className="field">
            <IonInput type="password" label="Password" labelPlacement="floating" value={password} onIonInput={(e) => setPassword(e.detail.value ?? '')} />
          </div>

          <motion.div whileTap={{ scale: 0.98 }} style={{ marginTop: 20 }}>
            <IonButton expand="block" size="large" onClick={submit} disabled={busy}>
              {busy ? <IonSpinner name="crescent" /> : mode === 'login' ? 'Continue' : 'Create account'}
            </IonButton>
          </motion.div>

          <p className="muted ion-text-center" style={{ fontSize: 13, marginTop: 24 }}>
            ConsultKeeper does not give medical advice.<br />Always confirm with your doctor.
          </p>
        </motion.div>
      </IonContent>
    </IonPage>
  );
}
