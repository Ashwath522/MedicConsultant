import { IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { motion } from 'framer-motion';
import { pulseOutline } from 'ionicons/icons';
import HelpButton from '../components/HelpButton';
import { Item, Stagger, useEnterKey } from '../ui/motion';

export default function Timeline() {
  const k = useEnterKey();
  return (
    <IonPage>
      <IonHeader translucent><IonToolbar><IonTitle>Recovery</IonTitle></IonToolbar></IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense"><IonToolbar><IonTitle size="large">Recovery</IonTitle></IonToolbar></IonHeader>
        <Stagger k={k} className="page">
          <Item>
            <div className="card ink" style={{ padding: 24 }}>
              <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.6, repeat: Infinity }} style={{ display: 'inline-block' }}>
                <IonIcon icon={pulseOutline} style={{ fontSize: 34 }} />
              </motion.div>
              <div className="h2" style={{ marginTop: 12 }}>Your recovery, day by day.</div>
              <p className="muted" style={{ lineHeight: 1.5 }}>Doses taken, symptoms, sleep and follow-ups will build a timeline here once your care plan is running.</p>
            </div>
          </Item>
          {['Medicine adherence', 'Symptom trend', 'Sleep', 'Upcoming follow-ups'].map((t) => (
            <Item key={t}>
              <div className="card flat row">
                <div className="grow" style={{ fontWeight: 600 }}>{t}</div>
                <div className="skeleton" style={{ width: 90, height: 10 }} />
              </div>
            </Item>
          ))}
        </Stagger>
        <HelpButton />
      </IonContent>
    </IonPage>
  );
}
