import { IonButton, IonContent, IonIcon, IonPage, IonRange, IonSpinner, useIonToast, useIonViewWillEnter } from '@ionic/react';
import { AnimatePresence, motion } from 'framer-motion';
import { add, arrowBack, female, male, maleFemale, remove } from 'ionicons/icons';
import { useState } from 'react';
import BlueprintView from '../components/BlueprintView';
import { api, Blueprint, Profile } from '../services/api';
import { Ambient } from '../ui/ambient';
import { EASE } from '../ui/motion';

type Sex = 'male' | 'female' | 'other';
type Activity = 'sedentary' | 'light' | 'moderate' | 'active';

const ACTIVITY: { v: Activity; title: string; note: string }[] = [
  { v: 'sedentary', title: 'Mostly sitting', note: 'Desk job, little walking' },
  { v: 'light', title: 'Lightly active', note: 'Walks, light chores, 1–3 days exercise' },
  { v: 'moderate', title: 'Active', note: 'Exercise 3–5 days a week' },
  { v: 'active', title: 'Very active', note: 'Hard exercise or physical job, 6–7 days' },
];
const GOALS = [
  'Recover from illness', 'Get fitter', 'Lose weight', 'Gain strength', 'Sleep better',
  'Manage BP', 'Manage diabetes', 'Eat healthier', 'Reduce stress', 'Stay on top of medicines',
];

const slide = {
  enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0, filter: 'blur(6px)' }),
  center: { x: 0, opacity: 1, filter: 'blur(0px)' },
  exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0, filter: 'blur(6px)' }),
};

function Stepper({ value, set, min, max, step = 1 }: { value: number; set: (n: number) => void; min: number; max: number; step?: number }) {
  const btn = { width: 52, height: 52, borderRadius: 16, border: 0, background: 'var(--ck-surface)', color: 'var(--ck-text)', display: 'grid', placeItems: 'center', fontSize: 22 } as const;
  return (
    <>
      <div className="row" style={{ justifyContent: 'center', gap: 20, marginTop: 8 }}>
        <motion.button whileTap={{ scale: 0.88 }} style={btn} onClick={() => set(Math.max(min, +(value - step).toFixed(1)))} aria-label="Decrease"><IonIcon icon={remove} /></motion.button>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={value}
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="tabular"
            style={{ fontSize: 76, fontWeight: 750, letterSpacing: '-0.05em', minWidth: 150, textAlign: 'center' }}
          >
            {step < 1 ? value.toFixed(1) : value}
          </motion.div>
        </AnimatePresence>
        <motion.button whileTap={{ scale: 0.88 }} style={btn} onClick={() => set(Math.min(max, +(value + step).toFixed(1)))} aria-label="Increase"><IonIcon icon={add} /></motion.button>
      </div>
      <IonRange min={min} max={max} step={step} value={value} onIonInput={(e) => set(Number(e.detail.value))} style={{ marginTop: 12 }} />
    </>
  );
}

export default function Onboarding() {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [sex, setSex] = useState<Sex | ''>('');
  const [age, setAge] = useState(30);
  const [height, setHeight] = useState(165);
  const [weight, setWeight] = useState(65);
  const [activity, setActivity] = useState<Activity>('light');
  const [goals, setGoals] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast] = useIonToast();

  useIonViewWillEnter(() => {
    api<Profile>('/profile').then((p) => {
      setName(p.name.split(' ')[0]);
      if (p.sex) setSex(p.sex as Sex);
      if (p.age) setAge(p.age);
      if (p.height_cm) setHeight(p.height_cm);
      if (p.weight_kg) setWeight(p.weight_kg);
      if (p.activity) setActivity(p.activity);
      if (p.goals?.length) setGoals(p.goals);
    }).catch(() => {});
  });

  const STEPS = ['sex', 'age', 'height', 'weight', 'activity', 'goals', 'blueprint'] as const;
  const step = STEPS[i];
  const go = (d: number) => { setDir(d); setI((x) => Math.max(0, Math.min(STEPS.length - 1, x + d))); };

  const finish = async () => {
    setSaving(true);
    try {
      await api('/profile', { method: 'PUT', body: { sex, age, height_cm: height, weight_kg: weight, activity, goals, onboarded: true } });
      setBp(await api<Blueprint>('/wellness/blueprint'));
      go(1);
    } catch (e) {
      toast({ message: (e as Error).message, duration: 2500, position: 'top' });
    } finally {
      setSaving(false);
    }
  };

  const ft = Math.floor(height / 30.48);
  const inch = Math.round((height / 2.54) % 12);
  const canNext = step !== 'sex' || !!sex;

  const sexCard = (v: Sex, label: string, icon: string, note: string) => (
    <motion.div
      key={v}
      whileTap={{ scale: 0.97 }}
      onClick={() => { setSex(v); setTimeout(() => go(1), 260); }}
      className={`card tap ${sex === v ? 'ink' : ''}`}
      style={{ display: 'flex', alignItems: 'center', gap: 16, transition: 'background 0.25s, color 0.25s' }}
    >
      <div className="mono" style={{ width: 52, height: 52, fontSize: 26 }}><IonIcon icon={icon} /></div>
      <div className="grow">
        <div style={{ fontWeight: 700, fontSize: 18 }}>{label}</div>
        <div className="muted" style={{ fontSize: 14 }}>{note}</div>
      </div>
    </motion.div>
  );

  return (
    <IonPage>
      <IonContent fullscreen>
        <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', padding: 'calc(env(safe-area-inset-top) + 16px) 22px calc(env(safe-area-inset-bottom) + 24px)' }}>
          {/* Header: back + progress */}
          <div className="row" style={{ gap: 12, marginBottom: 28 }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => go(-1)}
              style={{ visibility: i > 0 && step !== 'blueprint' ? 'visible' : 'hidden', border: 0, background: 'var(--ck-surface)', color: 'var(--ck-text)', width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center' }}
              aria-label="Back"
            >
              <IonIcon icon={arrowBack} />
            </motion.button>
            <div className="grow" style={{ display: 'flex', gap: 6 }}>
              {STEPS.slice(0, -1).map((s, j) => (
                <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--ck-border)', overflow: 'hidden' }}>
                  <motion.div initial={false} animate={{ width: j < i ? '100%' : j === i ? '50%' : '0%' }} transition={{ duration: 0.5, ease: EASE }} style={{ height: '100%', background: 'var(--ck-text)' }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45, ease: EASE }}>
                {step === 'sex' && (
                  <>
                    <h1 className="h1">{name ? `Hi ${name}. ` : ''}Let's build your health profile.</h1>
                    <p className="lead">First, your sex. Bodies differ in energy needs, healthy ranges and recommended check-ups.</p>
                    <div style={{ marginTop: 24 }}>
                      {sexCard('male', 'Male', male, 'Targets and check-ups for men')}
                      {sexCard('female', 'Female', female, 'Targets and check-ups for women')}
                      {sexCard('other', 'Prefer not to say', maleFemale, "We'll use balanced averages")}
                    </div>
                  </>
                )}

                {step === 'age' && (
                  <>
                    <h1 className="h1">How old are you?</h1>
                    <p className="lead">Sleep, activity and check-up advice changes with age.</p>
                    <div style={{ marginTop: 40 }}><Stepper value={age} set={setAge} min={18} max={100} /></div>
                    <p className="muted ion-text-center" style={{ fontSize: 14 }}>years · ConsultKeeper is for adults (18+)</p>
                  </>
                )}

                {step === 'height' && (
                  <>
                    <h1 className="h1">Your height</h1>
                    <p className="lead">Used for BMI and your healthy weight range.</p>
                    <div style={{ marginTop: 40 }}><Stepper value={height} set={setHeight} min={120} max={220} /></div>
                    <p className="muted ion-text-center" style={{ fontSize: 14 }}>cm · {ft} ft {inch} in</p>
                  </>
                )}

                {step === 'weight' && (
                  <>
                    <h1 className="h1">Your weight</h1>
                    <p className="lead">For energy needs, water target and BMI.</p>
                    <div style={{ marginTop: 40 }}><Stepper value={weight} set={setWeight} min={30} max={200} step={0.5} /></div>
                    <p className="muted ion-text-center" style={{ fontSize: 14 }}>kg</p>
                  </>
                )}

                {step === 'activity' && (
                  <>
                    <h1 className="h1">How active are you?</h1>
                    <p className="lead">On a typical week.</p>
                    <div style={{ marginTop: 20 }}>
                      {ACTIVITY.map((a, j) => (
                        <motion.div
                          key={a.v}
                          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: j * 0.06 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setActivity(a.v)}
                          className={`card tap ${activity === a.v ? 'ink' : ''}`}
                          style={{ transition: 'background 0.25s, color 0.25s' }}
                        >
                          <div className="row">
                            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 24 }}>
                              {[0, 1, 2, 3].map((b) => (
                                <span key={b} style={{ width: 5, height: 8 + b * 5, borderRadius: 2, background: 'currentColor', opacity: b <= j ? 1 : 0.2 }} />
                              ))}
                            </div>
                            <div className="grow">
                              <div style={{ fontWeight: 700 }}>{a.title}</div>
                              <div className="muted" style={{ fontSize: 14 }}>{a.note}</div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}

                {step === 'goals' && (
                  <>
                    <h1 className="h1">What do you want to build?</h1>
                    <p className="lead">Pick any. We'll shape tips and reminders around them.</p>
                    <div className="chips" style={{ marginTop: 20 }}>
                      {GOALS.map((g, j) => (
                        <motion.span
                          key={g}
                          className={`chip ${goals.includes(g) ? 'on' : ''}`}
                          style={{ padding: '10px 16px', fontSize: 15 }}
                          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: j * 0.03, type: 'spring', stiffness: 500, damping: 26 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setGoals((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]))}
                        >
                          {g}
                        </motion.span>
                      ))}
                    </div>
                  </>
                )}

                {step === 'blueprint' && bp && (
                  <>
                    <div className="hero" style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', background: '#000', color: '#fafafa', padding: '22px 20px', marginBottom: 16 }}>
                      <Ambient tone="dark" />
                      <div style={{ fontSize: 12, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a1a1aa' }}>Your health blueprint</div>
                      <h1 className="h1" style={{ marginTop: 6 }}>Built for you, {name || 'friend'}.</h1>
                      <p style={{ color: '#a1a1aa', margin: '6px 0 0' }}>
                        {sex === 'other' ? '' : sex === 'male' ? 'Male · ' : 'Female · '}{age} years · {height} cm · {weight} kg
                      </p>
                    </div>
                    <BlueprintView bp={bp} k={1} />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer action */}
          {step !== 'sex' && (
            <div style={{ paddingTop: 16 }}>
              {step === 'goals' ? (
                <IonButton expand="block" size="large" onClick={finish} disabled={saving}>
                  {saving ? <IonSpinner name="crescent" /> : 'Build my blueprint'}
                </IonButton>
              ) : step === 'blueprint' ? (
                <IonButton expand="block" size="large" onClick={() => { window.location.href = '/home'; }}>Start my journey</IonButton>
              ) : (
                <IonButton expand="block" size="large" onClick={() => go(1)} disabled={!canNext}>Continue</IonButton>
              )}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
